# sdev for Visual Studio Code

Official VS Code support for the **sdev** programming language — both tracks:

- **v1** — the tree-walking interpreter (`forge`, `conjure`, `ponder`, graphics, web, Leaflet)
- **v2** — the self-hosted compiler (`say`, `set … to`, `to … with … end`) running on the seed VM

## Features

- 🎨 **Syntax highlighting** for `.sdev` and `.sdv` — v1 *and* v2 keywords, lists, tomes, floats,
  operators, classes, functions, blocks
- 🧬 **Embedded JavaScript** — `js { … }` blocks are highlighted as real JavaScript
- 🔌 **Hardware sketches** — `board "uno" { … }` blocks highlighted, with a ready-made snippet
- 🧠 **ML / LLM stdlib** highlighting — tensors, autograd, transformers, training, self-evolution,
  plus the FFI / CUDA / WebGPU accelerators
- 🧩 **34 snippets** across both dialects
- ⚡ **Run File** — `Ctrl+Enter` / `Cmd+Enter` (targets the dialect set in `sdev.dialect`)
- 🚀 **Run with v2** — `Ctrl+Alt+Enter` compiles with the self-hosted compiler and runs the bytecode
  on the bundled seed VM (with `read_file`, `write_file` and `http_get` wired to the host)
- 🛠 **Build Native Executable** — emits x86-64 GNU assembly and links a static binary
- ✂️ **Run selection** — `Ctrl+Shift+Enter` / `Cmd+Shift+Enter`
- 📦 **Everything bundled** — v1 JS interpreter, v1 Python interpreter, the v2 seed VM (`.wasm`),
  the self-hosted compiler driver, and the unified CLI (`bin/sdev.mjs` synced by `node scripts/release.mjs` from `release.json`). Only Node.js is required.
- 🌐 **Playground & docs** commands (opens `/docs`, backed by [`docs/`](../docs/README.md))

See also: [Desktop App, VS Code & MCP](../docs/05-ide-and-tooling/desktop-vscode-and-mcp.md).

## Commands

| Command                                    | Default keybinding                     |
| ------------------------------------------ | -------------------------------------- |
| `sdev: Run File`                            | `Ctrl+Enter` / `Cmd+Enter`             |
| `sdev: Run File with v2`                    | `Ctrl+Alt+Enter` / `Cmd+Alt+Enter`     |
| `sdev: Run Selection`                       | `Ctrl+Shift+Enter` / `Cmd+Shift+Enter` |
| `sdev: Build Native Executable (x86-64)`    | (Command Palette)                      |
| `sdev: Open Online Playground`              | (Command Palette)                      |
| `sdev: Open Documentation`                  | (Command Palette)                      |

## Settings

| Setting                  | Default   | Description                                                        |
| ------------------------ | --------- | ------------------------------------------------------------------ |
| `sdev.dialect`           | `v1`      | Which track `Run File` targets (`v1` interpreter or `v2` toolchain) |
| `sdev.runner`            | `bundled` | v1 runtime: `bundled`, `node`, or `python`                          |
| `sdev.nodePath`          | `node`    | Path to the `node` executable                                       |
| `sdev.pythonPath`        | `python3` | Path to the Python executable (`python` runner)                     |
| `sdev.native.assembler`  | `as`      | Assembler for native builds                                         |
| `sdev.native.linker`     | `ld`      | Linker for native builds                                            |
| `sdev.native.outputDir`  | *(empty)* | Output folder for native builds (empty = next to the source)        |

## Quickstart

### v1

```sdev
forge message be "Hello, World!"
speak(message)

conjure greet(name) ::
  yield "Hello, " + name + "!"
;;

speak(greet("sdev"))
```

### v2

```sdev
to fib with n
  if n < 2
    return n
  end
  return fib(n - 1) + fib(n - 2)
end

set scores to { "alice": 3, "bob": 5 }
for each name in keys(scores)
  say concat(concat(name, " = "), str(scores[name]))
end

say fib(10)
```

Press `Ctrl+Alt+Enter` to compile and run it on the seed VM, or run
**sdev: Build Native Executable** to produce a static x86-64 binary.

## Installation (manual / `.vsix`)

```
code --install-extension SDEV-language-5.1.0.vsix
```

...or download/package via `node scripts/release.mjs` (which bundles `bin/sdev.mjs` and aligns the version with `release.json`), or in VS Code: **Extensions panel -> `...` menu -> Install from VSIX...**

## License

MIT

---

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Subfolders

| Subfolder | Purpose |
| :--- | :--- |
| [`interpreter/`](./interpreter/) | Bundled runtime artifacts shipped inside the VS Code extension: the unified Node CLI (`sdev-cli.mjs`), Python interpreter (`sdev-interpreter.py`), WebAssembly Seed VM (`sdev-seed.wasm`), and x86-64 assembly runtime (`runtime.s`). |
| [`snippets/`](./snippets/) | VS Code code snippets (`sdev.json`) covering SDEV v1, SDEV v2, UI widgets, and hardware `board` blocks. |
| [`syntaxes/`](./syntaxes/) | TextMate grammar (`sdev.tmLanguage.json`) for `.sdev` and `.sdv` syntax highlighting in VS Code. |
| [`vsix-meta/`](./vsix-meta/) | OpenVSIX packaging manifests (`extension.vsixmanifest` and `[Content_Types].xml`) used by `scripts/release.mjs` to build `sdev-language.vsix`. |

### Files

| File | Purpose |
| :--- | :--- |
| `.vscodeignore` | Project file (`.vscodeignore`). |
| `CHANGELOG.md` | Changelog |
| `extension.js` | sdev VS Code extension — main entry point. |
| `icon.png` | Project file (`icon.png`). |
| `language-configuration.json` | JSON configuration or data artifact (`language-configuration.json`). |
| `LICENSE.txt` | Project file (`LICENSE.txt`). |
| `package.json` | Node.js package manifest, dependencies, and npm scripts. |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |

<!-- FOLDER_INVENTORY_END -->
