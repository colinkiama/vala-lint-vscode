# Vala-Lint For Visual Studio Code Extension

This extension adds Vala language support to the [vscode-linter extension](https://github.com/fnando/vscode-linter) using [vala-lint](https://github.com/vala-lang/vala-lint).

## Installation

Visual Studio Code Marketplace: https://marketplace.visualstudio.com/items?itemName=ColinKiama.linter-vala

Manual Instructions: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#packaging-extensions

## Requirements

- [vscode-linter extension](https://github.com/fnando/vscode-linter)
- [vala-lint linter program](https://github.com/vala-lang/vala-lint)

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

When you install the "Vala-Lint" extension, you will also be installing the "vscode-linter" extension which is what the Vala-Lint extension uses to help implement its functionality.

### Verify That The Vala-Lint Visual Studio Code Extension Is Working 

To verify that the extension is working:
1. Open a Vala source code file in Visual Studio Code (Has `.vala` file extension)
2. Open the Output View (Toggle with: `CTRL + K`, `CTRL + H`)
3. Swith the selected item in the dropdown to "linter"

Now you should see text like the following (Note: in this example, the file that is opened is called "Result.vala"):

```
Vala-Lint's command took 14ms
Language id: vala
Matching linters: [
  "vala"
]
Reading from cache? false
Linter config: {
  "capabilities": [],
  "command": [
    "io.elementary.vala-lint",
    "--print-end",
    [
      "$config",
      "--config",
      "$config"
    ],
    "$file"
  ],
  "configFiles": [
    "vala-lint.conf",
    ".vala-lint.conf"
  ],
  "enabled": true,
  "languages": [
    "vala"
  ],
  "name": "Vala-Lint",
  "url": "https://github.com/vala-lang/vala-lint",
  "importPath": "/home/username/.vscode/extensions/colinkiama.linter-vala-1.0.0/dist/extension.js"
}
Args: {
  "$rootDir": "/home/username/sources/astral",
  "$file": "/home/username/sources/astral/subprojects/result/lib/Result.vala",
  "$extension": ".vala",
  "$extensionBare": "vala",
  "$config": "",
  "$debug": false,
  "$lint": true,
  "$language": "vala",
  "$shebang": ""
}
{
  "rootDir": "/home/username/sources/astral",
  "configFile": "",
  "command": [
    "io.elementary.vala-lint",
    "--print-end",
    "/home/username/sources/astral/subprojects/result/lib/Result.vala"
  ]
}
```
If you don't have an output like what is listed above then you probably have not installed the extension properly.

If you did not install the Vala Lint program properly, you may see a message like this in the Output View with "linter" selected in the dropdown:

```
Searched for any of io.elementary.vala-lint; couldn't be found within $PATH: [
    "/home/username/.local/bin",
    "...",
]
```

As we've stated above, ensure that directory where `io.elementary.vala-lint` is located is available on the $PATH enviornment variable.

## Contributing

Refer to [vscode-linter's Creating Linters Guide](https://github.com/fnando/vscode-linter/blob/main/docs/creating-linters.md) and the [vala-lint linter program source code](https://github.com/vala-lang/vala-lint).

It's recommended that you create an issue or check if it already exists first before starting any work.

Create a pull request when you are ready to submit your changes to the project. Your changes should go into the `main` branch.

**Enjoy!**
