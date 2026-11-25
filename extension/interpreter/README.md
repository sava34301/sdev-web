# `extension/interpreter/`

Bundled runtime artifacts shipped inside the VS Code extension: the unified Node CLI (`sdev-cli.mjs`), Python interpreter (`sdev-interpreter.py`), WebAssembly Seed VM (`sdev-seed.wasm`), and x86-64 assembly runtime (`runtime.s`).

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Files

| File | Purpose |
| :--- | :--- |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `runtime.s` | SDEV native runtime — hand-written x86-64 assembly (Linux SysV). |
| `sdev-cli.mjs` | JavaScript/Node module (`sdev-cli.mjs`). |
| `sdev-interpreter.py` | Python script (`sdev-interpreter.py`). |
| `sdev-seed.wasm` | Compiled WebAssembly binary (`sdev-seed.wasm`). |

<!-- FOLDER_INVENTORY_END -->
