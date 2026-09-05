# Vala-Lint For Visual Studio Code Extension

This extension adds Vala language support to Visual Studio Code's native diagnostics and code action APIs using [vala-lint](https://github.com/vala-lang/vala-lint).

## Installation

Visual Studio Code Marketplace: https://marketplace.visualstudio.com/items?itemName=ColinKiama.linter-vala

Manual Instructions: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#packaging-extensions

## Requirements

- A build of the [vala-lint linter program](https://github.com/vala-lang/vala-lint) with `--stdin` support

## Setup Guide


### Install Vala Lint

First, you need to install the [vala-lint](https://github.com/vala-lang/vala-lint) linter program. It's recommeded that you install it using [meson](https://github.com/mesonbuild/meson) and [ninja](https://github.com/ninja-build/ninja).

To verify that you've installed the Vala Lint program, in your terminal, enter the following command:

```sh
io.elementary.vala-lint --version
```

The terminal should then output the following line:

```
Version: version_number
```

If you don't see the line above then you did not install the Vala lint program properly. Please ensure that the directory of `io.elementary.vala-lint` has been added to the PATH environment variable. `io.elementary.vala-lint` is what the Visual Studio Extension is looking for.

### Install The Vala-Lint Visual Studio Code Extension

You can either:
- Search for "Vala-Lint" in the Extensions section of the Visual Studio Code side bar
- Follow the installation instructions from the extension's page in the Visual Studio Code Marketplace: https://marketplace.visualstudio.com/items?itemName=ColinKiama.linter-vala
- Install the extension manually from the source code: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#packaging-extensions

### Verify That The Vala-Lint Visual Studio Code Extension Is Working

The extension reports problems using Visual Studio Code's native diagnostics API, so no separate linter output channel needs to be selected.

To verify that the extension is working:
1. Open a Vala source code file in Visual Studio Code (has a `.vala` file extension) that contains a lint issue, for example a line that violates one of [vala-lint's rules](https://github.com/vala-lang/vala-lint).
2. The issue should be underlined directly in the editor.
3. Open the Problems panel (`View > Problems`, or `Ctrl+Shift+M` on Windows/Linux, `Cmd+Shift+M` on Mac). The issue should be listed there with "vala-lint" as its source.

If you don't see any diagnostics from vala-lint:
- Ensure the file's language mode is set to "Vala" (bottom-right of the window).
- Ensure the `vala-lint.enable` setting is `true` and, if you've set a custom `vala-lint.path`, that it points to a valid vala-lint binary.
- If the configured vala-lint binary doesn't support the `--stdin` option, an error notification appears in the bottom-right corner of the window asking you to upgrade vala-lint (or use version 1.0.1 of this extension). This extension requires a build of vala-lint with `--stdin` support.
- Try running vala-lint directly from the terminal with the same options the extension uses, to rule out a problem with the vala-lint installation itself:

  ```sh
  io.elementary.vala-lint --stdin --stdin-filename path/to/your/file.vala --json-output --print-end < path/to/your/file.vala
  ```

  This should print a JSON object listing any `mistakes` found in the file. If this command fails, the vala-lint program has not been installed properly; ensure that the directory containing `io.elementary.vala-lint` has been added to the `PATH` environment variable.
- For deeper debugging of the extension itself, run it from source in the Extension Development Host (press `F5` in this repository) and check the Debug Console, or use the "Developer: Toggle Developer Tools" command in a normal Visual Studio Code window and check the Console tab.

## Contributing

Refer to the [Visual Studio Code extension API docs](https://code.visualstudio.com/api) and the [vala-lint linter program source code](https://github.com/vala-lang/vala-lint).

It's recommended that you create an issue or check if it already exists first before starting any work.

Create a pull request when you are ready to submit your changes to the project. Your changes should go into the `main` branch.

**Enjoy!**
