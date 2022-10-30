import {
  LinterGetOffensesFunction,
  LinterGetIgnoreEolPragmaFunction,
  LinterOffenseSeverity,
  LinterParseFixOutputFunction,
} from "vscode-linter-api";

import stripAnsi from "strip-ansi";

export interface ValaLintOffense {
  code: string;
  severity: string;
  message: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

const offenseSeverity: { [key: string]: LinterOffenseSeverity } = {
  warn: LinterOffenseSeverity.warning,
  error: LinterOffenseSeverity.error,
};

export const getOffenses: LinterGetOffensesFunction = ({ uri, stdout }) => {
  let strippedStdout = stripAnsi(stdout);
  const valaLintRegex =
    /^\s*(?<line>\d+)\.(?<column>\d+)\s*-\s*(?<endLine>\d+)\.(?<endColumn>\d+)\s*(?<severity>error|warn)\s*(?<message>(?:.\S{1,})+)\s*(?<code>(?:.\S{1,})+)/gm;

  return strippedStdout
    .split("\n")
    .map((errorLine) => {
      let matches = valaLintRegex.exec(errorLine);
      return matches;
    })
    .filter((matches) => {
      return matches?.groups !== undefined;
    })
    .map((matches) => {
      let fields: unknown = matches?.groups;
      let offense = <ValaLintOffense>fields;

      const lineStart = offense.line - 1;
      const columnStart = offense.column - 1;

      const lineEnd = (offense.endLine ?? offense.line) - 1;
      const columnEnd = (offense.endColumn ?? offense.column) - 1;

      return {
        uri,
        lineStart,
        columnStart,
        lineEnd,
        columnEnd,
        code: offense.code,
        message: offense.message,
        source: "vala-lint",
        correctable: true,
        severity: offenseSeverity[offense.severity],
        docsUrl: "",
      };
    });
};
