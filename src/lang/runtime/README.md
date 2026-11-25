# `src/lang/runtime/`

Execution engines for SDEV: core tree-walking interpreter with trace hook (`interpreter-core.ts`), full stdlib-bound interpreter (`interpreter.ts`), bytecode instruction set & disassembler (`bytecode.ts`), bytecode compiler (`compiler.ts`), stack VM (`vm.ts`), unified v1/v2/understander executor (`executor.ts`), lazy pure-SDEV module runner (`sdev-module.ts`), and WASI 0.2 Component Model binary emitter (`wasi-component.ts`).

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Files

| File | Purpose |
| :--- | :--- |
| `bytecode.ts` | sdev Bytecode / IR Definition. |
| `compiler.ts` | sdev AST → Bytecode Compiler (v2 - OS-capable). |
| `executor.ts` | TypeScript module (`executor.ts`). |
| `interpreter-core.ts` | TypeScript module (`interpreter-core.ts`). |
| `interpreter.ts` | TypeScript module (`interpreter.ts`). |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `sdev-module.ts` | TypeScript module (`sdev-module.ts`). |
| `vm.ts` | sdev Bytecode Virtual Machine (v2 - OS-capable). |
| `wasi-component.ts` | SDEV WASI 0.2 Component Model Exporter (`src/lang/wasi-component.ts`). |

<!-- FOLDER_INVENTORY_END -->
