# `src/lang-bridge/native/`

Native executable backends: x86-64 GAS assembly codegen (`codegen-x64.mjs`), System V AMD64 syscall runtime (`runtime.s`), binutils ELF linker (`link.mjs`), zero-dependency Windows PE32+ `.exe` generator (`pe.mjs`), standalone C Seed VM (`sdev-vm.c`), and baked C driver header (`driver-embedded.h`).

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Files

| File | Purpose |
| :--- | :--- |
| `codegen-x64.mjs` | SDEV → x86-64 GAS assembly (AT&T syntax, Linux SysV ABI). |
| `driver-embedded.h` | Auto-generated from driver-artifact.mjs. |
| `link.mjs` | Assemble + link a generated .s into a Linux x86-64 static ELF. |
| `pe.mjs` | SDEV Native Windows PE/COFF (.exe) Generator. |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `runtime.s` | SDEV native runtime — hand-written x86-64 assembly (Linux SysV). |
| `sdev-vm.c` | sdev-vm — Standalone Zero-Host Native SDEV Virtual Machine & Compiler Host. |

<!-- FOLDER_INVENTORY_END -->
