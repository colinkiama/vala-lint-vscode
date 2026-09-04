# Change Log

All notable changes to the "linter-vala" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release

## [2.0.0]

- **Breaking:** dropped the `fnando.linter` dependency; the extension now lints and applies fixes natively.
- **Breaking:** requires a `vala-lint` build with `--stdin`/`--stdin-filename` support. If your `vala-lint` doesn't support `--stdin`, you'll see a warning and no diagnostics — install a newer `vala-lint`, or stay on version 1.0.1 of this extension if you can't upgrade.
- Diagnostics now update as you type, instead of only on save.
- Added a "Fix All" source action (`vala-lint.fixAll`), usable from the Command Palette, the editor's Source Action menu, or via `editor.codeActionsOnSave`.
- Fixed inline quick fixes being misaligned on lines containing multi-byte characters.