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
  the self-hosted compiler driver and the native backend. Only Node.js is required.
- 🌐 **Playground & docs** commands

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
code --install-extension sdev-language-1.2.0.vsix
```

…or in VS Code: **Extensions panel → ⋯ menu → Install from VSIX…**

## License

MIT
