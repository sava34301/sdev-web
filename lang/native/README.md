# lang/native — SDEV native x86-64 assembly backend

The **browser IDE** runs SDEV on WebAssembly (see `lang/bootstrap/seed_vm.sdev` and `src/lang-bridge/seed/`).
This directory is the **desktop** backend: it compiles SDEV to real x86-64 assembly (GAS/AT&T syntax) and links it into a static Linux ELF without libc.

## Files

- `codegen_x64.sdev` — SDEV-authored x86-64 GAS assembly codegen and feature catalogue.
- `runtime_x64.sdev` — SDEV-authored System V AMD64 assembly runtime generator (`_start`, `sdev_say_int`, `sdev_say_str`, syscalls).
- `link.sdev` — SDEV-authored native ELF assembler and linker driver.

The host bridge and pre-built asm runtime live under `src/lang-bridge/native/` and `bin/runtime.s`.

## Usage (CLI)

```bash
node scripts/sdev-native.mjs prog.sdev -o prog
./prog
```

The compiler will:
1. Parse `prog.sdev`,
2. Emit `prog.s` next to `prog`,
3. Assemble + link into `prog` (static ELF, no libc, ~1 KB).
