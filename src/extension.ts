import * as vscode from "vscode";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const LANGUAGE_ID = "vala";
const DIAGNOSTIC_SOURCE = "vala-lint";
const CONFIG_FILE_NAMES = ["vala-lint.conf", ".vala-lint.conf"];
const DEBOUNCE_MS = 300;
const FIX_ALL_COMMAND = "vala-lint.fixAll";
const FIX_ALL_TITLE = "Vala-Lint: Fix All Auto-Fixable Problems";
const MIN_VERSION_MESSAGE =
  "Vala-Lint: this version of the extension requires a vala-lint build with --stdin support. " +
  'The binary at "%s" doesn\'t appear to have it. Please install the latest vala-lint, or, ' +
  "if you can't upgrade, use version 1.0.1 of the Vala-Lint extension instead.";

export interface ValaLintFixPosition {
  line: number;
  column: number;
}

export interface ValaLintFix {
  replacement: string;
  start: ValaLintFixPosition;
  end: ValaLintFixPosition;
}

export interface ValaLintMistake {
  filename: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  level: string;
  message: string;
  ruleId: string;
  fix: ValaLintFix | null;
}

export interface ValaLintOutput {
  mistakes: ValaLintMistake[];
}

interface ResolvedFix {
  replacement: string;
  range: vscode.Range;
}

interface ValaLintDiagnostic extends vscode.Diagnostic {
  fix?: ResolvedFix;
}

interface FixAllCodeAction extends vscode.CodeAction {
  documentUri?: vscode.Uri;
}

const severityMap: { [key: string]: vscode.DiagnosticSeverity } = {
  error: vscode.DiagnosticSeverity.Error,
  warn: vscode.DiagnosticSeverity.Warning,
};

let diagnosticCollection: vscode.DiagnosticCollection;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const stdinSupportCache = new Map<string, boolean>();
const warnedBinaries = new Set<string>();

export function activate(context: vscode.ExtensionContext): void {
  diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
  context.subscriptions.push(diagnosticCollection);

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(LANGUAGE_ID, new ValaLintCodeActionProvider(), {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, vscode.CodeActionKind.SourceFixAll],
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(FIX_ALL_COMMAND, async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== LANGUAGE_ID) {
        return;
      }

      const edit = await computeFixAllEdit(editor.document.uri);
      if (edit) {
        await vscode.workspace.applyEdit(edit);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(lintDocument),
    vscode.workspace.onDidSaveTextDocument(lintDocument),
    vscode.workspace.onDidChangeTextDocument((event) => scheduleLint(event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => {
      clearScheduledLint(document);
      diagnosticCollection.delete(document.uri);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("vala-lint.path")) {
        stdinSupportCache.clear();
        warnedBinaries.clear();
      }
    }),
  );

  vscode.workspace.textDocuments.forEach(lintDocument);
}

export function deactivate(): void {
  debounceTimers.forEach((timer) => clearTimeout(timer));
  debounceTimers.clear();
}

function clearScheduledLint(document: vscode.TextDocument): void {
  const key = document.uri.toString();
  const timer = debounceTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(key);
  }
}

function scheduleLint(document: vscode.TextDocument): void {
  if (document.languageId !== LANGUAGE_ID) {
    return;
  }

  const key = document.uri.toString();
  clearScheduledLint(document);
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      lintDocument(document);
    }, DEBOUNCE_MS),
  );
}

/**
 * Checks whether the configured vala-lint binary supports --stdin, warning the user (once
 * per binary path) if it doesn't. This extension's linting and fix support are built
 * entirely on --stdin, which isn't available in older vala-lint releases.
 */
function ensureStdinSupport(binary: string): boolean {
  let supported = stdinSupportCache.get(binary);
  if (supported === undefined) {
    const result = spawnSync(binary, ["--help"], { encoding: "utf8" });
    supported = !result.error && typeof result.stdout === "string" && result.stdout.includes("--stdin");
    stdinSupportCache.set(binary, supported);
  }

  if (!supported && !warnedBinaries.has(binary)) {
    warnedBinaries.add(binary);
    vscode.window.showErrorMessage(MIN_VERSION_MESSAGE.replace("%s", binary));
  }

  return supported;
}

function lintDocument(document: vscode.TextDocument): void {
  if (document.languageId !== LANGUAGE_ID) {
    return;
  }

  const config = vscode.workspace.getConfiguration("vala-lint", document.uri);

  if (!config.get<boolean>("enable", true)) {
    diagnosticCollection.delete(document.uri);
    return;
  }

  const binary = config.get<string>("path", "io.elementary.vala-lint");

  if (!ensureStdinSupport(binary)) {
    diagnosticCollection.delete(document.uri);
    return;
  }

  const configFile = config.get<string | null>("configFile", null) ?? findConfigFile(document.uri);

  const args = ["--stdin", "--stdin-filename", document.uri.fsPath, "--json-output", "--print-end"];
  if (configFile) {
    args.push("--config", configFile);
  }

  const result = spawnSync(binary, args, {
    input: document.getText(),
    encoding: "utf8",
    cwd: path.dirname(document.uri.fsPath),
  });

  if (result.error) {
    diagnosticCollection.delete(document.uri);
    return;
  }

  let output: ValaLintOutput;
  try {
    output = JSON.parse(result.stdout);
  } catch {
    diagnosticCollection.delete(document.uri);
    return;
  }

  diagnosticCollection.set(
    document.uri,
    (output.mistakes ?? []).map((mistake) => mistakeToDiagnostic(document, mistake)),
  );
}

/**
 * vala-lint reports columns as UTF-8 byte offsets (Vala's lexer operates on the raw byte
 * stream), while VS Code positions are UTF-16 code-unit offsets. The two only diverge on
 * lines containing multi-byte characters, so every reported column must be re-mapped
 * against the actual line text before it can be used to build a Position.
 */
function byteColumnToCharacterIndex(lineText: string, oneIndexedByteColumn: number): number {
  const bytes = Buffer.from(lineText, "utf8");
  const byteOffset = Math.max(0, Math.min(oneIndexedByteColumn - 1, bytes.length));
  return bytes.subarray(0, byteOffset).toString("utf8").length;
}

function lineTextAt(document: vscode.TextDocument, lineIndex: number): string {
  if (lineIndex < 0 || lineIndex >= document.lineCount) {
    return "";
  }

  return document.lineAt(lineIndex).text;
}

function positionFromByteColumn(document: vscode.TextDocument, line: number, byteColumn: number): vscode.Position {
  const lineIndex = line - 1;
  return new vscode.Position(lineIndex, byteColumnToCharacterIndex(lineTextAt(document, lineIndex), byteColumn));
}

function mistakeToDiagnostic(document: vscode.TextDocument, mistake: ValaLintMistake): ValaLintDiagnostic {
  const start = positionFromByteColumn(document, mistake.line, mistake.column);
  const end = positionFromByteColumn(document, mistake.endLine ?? mistake.line, mistake.endColumn ?? mistake.column);

  const diagnostic: ValaLintDiagnostic = new vscode.Diagnostic(
    new vscode.Range(start, end),
    mistake.message,
    severityMap[mistake.level] ?? vscode.DiagnosticSeverity.Warning,
  );

  diagnostic.source = DIAGNOSTIC_SOURCE;
  diagnostic.code = mistake.ruleId;

  if (mistake.fix) {
    diagnostic.fix = {
      replacement: mistake.fix.replacement,
      range: new vscode.Range(
        positionFromByteColumn(document, mistake.fix.start.line, mistake.fix.start.column),
        positionFromByteColumn(document, mistake.fix.end.line, mistake.fix.end.column),
      ),
    };
  }

  return diagnostic;
}

function hasFixableDiagnostics(uri: vscode.Uri): boolean {
  const diagnostics = diagnosticCollection.get(uri);
  return Boolean(diagnostics?.some((diagnostic) => (diagnostic as ValaLintDiagnostic).fix));
}

async function computeFixAllEdit(uri: vscode.Uri): Promise<vscode.WorkspaceEdit | undefined> {
  const document = await vscode.workspace.openTextDocument(uri);
  const config = vscode.workspace.getConfiguration("vala-lint", uri);

  if (!config.get<boolean>("enable", true)) {
    return undefined;
  }

  const binary = config.get<string>("path", "io.elementary.vala-lint");

  if (!ensureStdinSupport(binary)) {
    return undefined;
  }

  const configFile = config.get<string | null>("configFile", null) ?? findConfigFile(uri);

  const args = ["--stdin", "--stdin-filename", uri.fsPath, "--fix"];
  if (configFile) {
    args.push("--config", configFile);
  }

  const originalText = document.getText();
  const result = spawnSync(binary, args, {
    input: originalText,
    encoding: "utf8",
    cwd: path.dirname(uri.fsPath),
  });

  if (result.error || typeof result.stdout !== "string" || result.stdout === originalText) {
    return undefined;
  }

  const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(originalText.length));

  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, fullRange, result.stdout);
  return edit;
}

function findConfigFile(uri: vscode.Uri): string | undefined {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const stopAt = workspaceFolder ? workspaceFolder.uri.fsPath : path.parse(uri.fsPath).root;

  let dir = path.dirname(uri.fsPath);

  for (;;) {
    for (const name of CONFIG_FILE_NAMES) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    if (dir === stopAt) {
      return undefined;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }

    dir = parent;
  }
}

class ValaLintCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const wantsSourceFixAll = !context.only || context.only.contains(vscode.CodeActionKind.SourceFixAll);
    if (wantsSourceFixAll && hasFixableDiagnostics(document.uri)) {
      const fixAllAction: FixAllCodeAction = new vscode.CodeAction(
        FIX_ALL_TITLE,
        vscode.CodeActionKind.SourceFixAll,
      );
      fixAllAction.documentUri = document.uri;
      actions.push(fixAllAction);
    }

    const wantsQuickFix = !context.only || context.only.contains(vscode.CodeActionKind.QuickFix);
    if (wantsQuickFix) {
      for (const diagnostic of context.diagnostics as ValaLintDiagnostic[]) {
        if (diagnostic.source !== DIAGNOSTIC_SOURCE || !diagnostic.fix) {
          continue;
        }

        const fix = diagnostic.fix;
        const action = new vscode.CodeAction(`Fix: ${diagnostic.message}`, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diagnostic];
        action.isPreferred = true;

        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, fix.range, fix.replacement);
        action.edit = edit;

        actions.push(action);
      }
    }

    return actions;
  }

  async resolveCodeAction(
    codeAction: FixAllCodeAction,
    _token: vscode.CancellationToken,
  ): Promise<vscode.CodeAction> {
    if (codeAction.documentUri) {
      codeAction.edit = await computeFixAllEdit(codeAction.documentUri);
    }

    return codeAction;
  }
}
