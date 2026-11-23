# SDEV Zero-Host Architecture & Pure-SDEV Distribution

SDEV runs **zero-host** on native OS processes without Node.js, V8, or a WebAssembly runtime, while keeping the React Web IDE, browser WebAssembly runner, and TypeScript language engine intact.

---

## Path A — Standalone Native SDEV VM (`bin/sdev-vm`)

"Our own Node for SDEV."

- **Source:** [src/lang-bridge/native/sdev-vm.c](../../src/lang-bridge/native/sdev-vm.c) + [src/lang-bridge/native/driver-embedded.h](../../src/lang-bridge/native/driver-embedded.h)
- **Binary:** [bin/sdev-vm](../../bin/sdev-vm) (native executable)
- **What it contains:**
  1. Native implementation of the full SDEV v2 Seed VM instruction set (arithmetic, comparisons, control flow, `CALL`/`RET`/`CALLV`, closures, lists, tomes, IEEE-754 floats, `try`/`throw`, string/math builtins, and dynamically growing heap up to 1 GiB).
  2. The baked self-hosted compiler ([lang/compiler/driver.sdev](../../lang/compiler/driver.sdev)) embedded directly in the binary, plus on-demand compilation of the self-hosted v1 compiler ([lang/compiler/v1_driver.sdev](../../lang/compiler/v1_driver.sdev) & [lang/compiler/v1_self.sdev](../../lang/compiler/v1_self.sdev)).
  3. Native OS host bridge over the `sdev:` virtual path protocol (`sdev:args`, `sdev:ls:<dir>`, `sdev:exec:<cmd>`, `sdev:compile:self|stage2|boot|v1|v1-self|v1-self-stage2:<path>`, `sdev:driver:baked|fresh|v1|v1-self|v1-self-stage2`, `sdev:append:<path>`, `sdev:err`, `sdev:exit:<code>`, plus direct filesystem I/O).

### Usage

```bash
# Run an SDEV program directly (zero Node, zero JS, zero Wasm)
./bin/sdev-vm program.sdev [args...]
./bin/sdev-vm run program.sdev [args...]

# Compile to an SDEVC4 bytecode container and execute it
./bin/sdev-vm compile program.sdev -o program.sdevc
./bin/sdev-vm run-bc program.sdevc [args...]

# Compile to a standalone native x86-64 ELF binary via pure SDEV
./bin/sdev-vm native program.sdev -o program
```

### Rebuilding `bin/sdev-vm`

```bash
gcc -O2 -Wall -Wextra -o bin/sdev-vm src/lang-bridge/native/sdev-vm.c -lm
```

---

## Path B — Native x86-64 Self-Compiled Toolchain (`lang/native/`)

True C++-style zero-host: SDEV's own compiler and native backend compiled to standalone static Linux x86-64 ELF executables with **zero libc** and direct Linux syscalls.

### Components

1. **Compiler Driver ([lang/compiler/driver.sdev](../../lang/compiler/driver.sdev)):**
   - Compiled to native x86-64 machine code and linked against [bin/runtime.s](../../bin/runtime.s) / [src/lang-bridge/native/runtime.s](../../src/lang-bridge/native/runtime.s).
   - Reads the target source file from `argv[1]` (or `<stdin>`), resolves `use "..."` modules directly via `sys_open`/`sys_read`, and emits the bytecode + string pool stream.
2. **Pure-SDEV Bytecode → x86-64 Codegen ([lang/native/codegen_x64.sdev](../../lang/native/codegen_x64.sdev)):**
   - `x64_compile_bytecode(bc, pool)` translates compiled SDEV v2 bytecode and string pool into standalone System V AMD64 GAS assembly (`sdev_main`).
3. **Pure-SDEV Native Build Driver ([lang/native/build.sdev](../../lang/native/build.sdev)):**
   - Orchestrates compilation (`sdev:compile:self:<path>`), native assembly emission (`x64_compile_bytecode`), and assembling/linking (`as` + `ld`) into a static ELF executable.
4. **Native Runtime ([src/lang-bridge/native/runtime.s](../../src/lang-bridge/native/runtime.s) & [lang/native/runtime_x64.sdev](../../lang/native/runtime_x64.sdev)):**
   - Provides `_start`, `sdev_alloc` (512 MiB `MAP_NORESERVE` `sys_mmap` arena), string/list/tome/float primitives, `attempt`/`rescue`/`throw`, and direct syscall wrappers for `read_file`, `write_file`, `append_file`, `file_exists`, `args`, `env`, `exit`, `now_ms`, `sleep_ms`, and the `sdev:` host protocol (`<stdin>`, `sdev:args`, `sdev:ls:`, `sdev:exec:`, `sdev:err`, `sdev:exit:`, `sdev:append:`).
5. **Pure-SDEV Bytecode VM ([lang/runtime/vm.sdev](../../lang/runtime/vm.sdev)):**
   - Extended with `PUSH_STR`, `LOAD`/`STORE`, `CALL`/`RET`/`ENTER`, `LOAD_LOC`/`STORE_LOC`, `JMP`/`JZ`, comparisons, string ops (`LEN`, `SGET`, `I2S`, `CHR`, `STREQ`, `STRCAT`, `UPPER`, `LOWER`, `TRIM`, `SUBSTR`, `FIND`), host I/O, and `vm_from_driver_stream`.

### Native Fixed-Point Self-Compilation

```bash
# Compile driver.sdev natively using pure SDEV (zero JS/Node)
./bin/sdev-vm native lang/compiler/driver.sdev -o sdev-driver-s2

# Run the natively compiled compiler on its own source
./sdev-driver-s2 lang/compiler/driver.sdev
```

---

## Path C — Zero-Cost Windows x86-64 PE/COFF (`.exe`) Emitter

On Windows, SDEV generates standalone 64-bit console executables (`PE32+`) directly from raw machine code without Visual Studio, MSVC, MinGW/GCC, or paid EV/OV signing certificates:

- **Host Emitter:** [src/lang-bridge/native/pe.mjs](../../src/lang-bridge/native/pe.mjs) — generates DOS stub, `PE\0\0` signature, COFF AMD64 (`0x8664`) header, PE32+ Optional Header (`0x020B`, CUI subsystem `3`), `.text` section (Win64 ABI 16-byte stack alignment + 32-byte shadow space), and `.rdata` import table (`KERNEL32.dll`: `GetStdHandle`, `WriteFile`, `ExitProcess`).
- **Pure-SDEV PE Emitter:** [lang/native/pe_x64.sdev](../../lang/native/pe_x64.sdev) (`pe_build_minimal_exe`, `pe_verify_header`).

```bash
node scripts/tools/sdev-native.mjs program.sdev -o program.exe --target windows --format pe
.\program.exe
```

Verified by `node scripts/run-ts.mjs tests/ts/test-native-pe.ts` and `npm run test:native` (via WSL).

---

## Path D — Standalone 100% Pure-SDEV Distribution (`sdev-zero/`)

[sdev-zero/](../../sdev-zero/README.md) is the self-contained, zero-host SDEV distribution directory:

- **0 foreign language files** (`0` `.js`, `.mjs`, `.ts`, `.tsx`, `.py`, `.wat`, or `.wasm` files — verified automatically by `./bin/sdev doctor`).
- **Exact 1:1 `.sdev` Mirror of Repository Source & Core `lang/` Modules:** Mirrors every source file across `bin/`, `cli/`, `src/`, `scripts/`, `supabase/functions/`, `remotion-pitch/`, `extension/`, `public/`, `drizzle/`, `tools/`, `AI/`, and config files, alongside pure-SDEV language & CLI modules in `sdev-zero/lang/` and `sdev-zero/cli/`.
- **Zero-host test runner** ([sdev-zero/scripts/test-all.sdev](../../sdev-zero/scripts/test-all.sdev)) executing without Node.js or WebAssembly.

### Commands (`cd sdev-zero`)

```bash
./bin/sdev doctor                         # Audit 0 foreign files & toolchain health
./bin/sdev bootstrap [--v1]               # Verify Stage-1 == Stage-2 == Stage-3 fixed points (v2 & v1)
./bin/sdev test                           # Run all zero-host pure-SDEV test suites
./bin/sdev run program.sdev               # Run an SDEV v2 program
./bin/sdev run --v1 classic.sdev          # Run an SDEV v1 program
./bin/sdev eval [--v1] "<code>"           # Evaluate an inline v2/v1 snippet
./bin/sdev native [--v1] prog.sdev -o bin # Compile v2 or v1 to a static Linux x86-64 ELF binary
./bin/sdev compile [--v1] p.sdev -o a.sdevc # Compile v2 or v1 to an SDEVC4 bytecode container
./bin/sdev run-bc a.sdevc                 # Execute an SDEVC4 bytecode container
./bin/sdev pe app.exe 0                   # Emit a standalone Windows x86-64 PE32+ (.exe)
./bin/sdev check [--v1] program.sdev      # Validate syntax, arity, and symbols
./bin/sdev disasm [--v1] program.sdev     # Disassemble compiled v2/v1 bytecode
./bin/sdev-v1-driver lang/compiler/v1_self.sdev # Bare-metal pure-v1 ELF compiler driver
./bin/sdev lint program.sdev              # Run pure-SDEV static linter (SDEV001..SDEV015)
./bin/sdev fmt program.sdev -w            # Format SDEV source code
./bin/sdev translate program.sdev         # Translate localized keywords across 26 human languages
./bin/sdev v1 classic.sdev                # Transpile SDEV v1 mystical syntax to canonical v2
./bin/sdev web                            # Build the complete SDEV website in pure SDEV
```
