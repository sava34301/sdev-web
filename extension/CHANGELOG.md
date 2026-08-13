# Changelog

## 1.2.0 — v2 track, native builds, hardware & ML

- **sdev v2 support**: highlighting for `say`, `set … to`, `to … with … end`, `if / else if / else`,
  `while`, `for each … in`, `break`, `continue`, `return`, `match`, `true` / `false` / `nothing`,
  `is` / `not` / `and` / `or` / `more` / `less`
- **New command `sdev: Run File with v2`** (`Ctrl+Alt+Enter`) — compiles with the self-hosted sdev
  compiler and executes the bytecode on the bundled seed VM (WASM), with host file I/O and HTTP
- **New command `sdev: Build Native Executable (x86-64)`** — emits GNU assembly and links a static
  binary through the bundled native backend (`as` / `ld` configurable)
- **`sdev.dialect` setting** — point the default Run command at the v1 interpreter or the v2 toolchain
- **Embedded JavaScript** — `js { … }` blocks are highlighted as real JavaScript
- **Hardware** — `board "uno" { … }` sketch highlighting plus a `board` snippet
- **New builtins highlighted**: lists, tomes (`keys`, `values`, `has`), string primitives
  (`ord`, `chr`, `str`, `concat`, `length`), floats, `read_file` / `write_file` / `http_get`,
  the ML/LLM stdlib and the FFI / CUDA / WebGPU acceleration layers
- **18 new snippets** covering v2 syntax, tomes, file & HTTP I/O, JS interop, hardware sketches,
  tensors, training loops and self-evolution
- Bundled interpreters refreshed to the current v1 JS/Python runtimes
- `sdev: Open Documentation` command

## 1.0.0 — Initial release

- Syntax highlighting for `.sdev` / `.sdv`
- 16 snippets covering every language construct
- Run File / Run Selection commands with Ctrl+Enter keybindings
- Bundled JavaScript interpreter (no external install required)
- Optional Python runner
- Auto-closing `:: ;;` blocks, smart indentation, folding
- Bracket matching for `( )`, `[ ]`, and the `:: ;;` block markers
