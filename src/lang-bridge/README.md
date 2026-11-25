# `src/lang-bridge/`

JavaScript/TypeScript bridge between the host environment (Browser or Node.js) and the self-hosted SDEV v2 compiler + WebAssembly Seed VM.

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Subfolders

| Subfolder | Purpose |
| :--- | :--- |
| [`native/`](./native/) | Native executable backends: x86-64 GAS assembly codegen (`codegen-x64.mjs`), System V AMD64 syscall runtime (`runtime.s`), binutils ELF linker (`link.mjs`), zero-dependency Windows PE32+ `.exe` generator (`pe.mjs`), standalone C Seed VM (`sdev-vm.c`), and baked C driver header (`driver-embedded.h`). |
| [`oracle/`](./oracle/) | Reference SDEV v2 bytecode compiler (`compile.mjs`) used for pre-flight diagnostics (arity, unknown symbols, list `+` checks) and differential fixed-point verification against `lang/compiler/driver.sdev`. |
| [`seed/`](./seed/) | Hand-written 32-bit WebAssembly text source (`seed.wat`) for the minimal SDEV Seed Virtual Machine. |

### Files

| File | Purpose |
| :--- | :--- |
| `compile-self.d.ts` | TypeScript module (`compile-self.d.ts`). |
| `compile-self.mjs` | Host loader for the self-hosted SDEV compiler. |
| `driver-artifact.mjs` | Bytecode for the self-hosted SDEV driver (lang/compiler/driver.sdev). |
| `prelink.mjs` | Source-to-source `use "path"` module prelinker. |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `seed-vm.d.ts` | TypeScript module (`seed-vm.d.ts`). |
| `seed-vm.mjs` | Shared WASM Seed VM host primitives (float math and linear-memory string/blob marshaling). |
| `v2-lexer.mjs` | SDEV v2 "Prism" — shared lexer and error class. |
| `v2-parser.mjs` | Shared SDEV v2 parser and `kind` desugarer used by both the bytecode oracle and native backend. |
| `v2-types.mjs` | Shared scope/type-collection helpers used by both the bytecode oracle and native backend. |
| `wasm-runtime.ts` | WASM stage-0 runtime for SDEV v2. |

<!-- FOLDER_INVENTORY_END -->
