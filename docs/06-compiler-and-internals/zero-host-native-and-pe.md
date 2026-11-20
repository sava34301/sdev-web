# SDEV Zero-Host Architecture

SDEV runs **zero-host** on native OS processes without Node.js, V8, or a WebAssembly runtime. Both paths are implemented and verified in this repository.

---

## Path A — Standalone Native SDEV VM (`bin/sdev-vm`)

"Our own Node for SDEV."

- **Source:** [src/lang-bridge/native/sdev-vm.c](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/src/lang-bridge/native/sdev-vm.c) + [src/lang-bridge/native/driver-embedded.h](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/src/lang-bridge/native/driver-embedded.h)
- **Binary:** [bin/sdev-vm](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/bin/sdev-vm) (59 KB native executable)
- **What it contains:**
  1. A native implementation of the full SDEV v2 Seed VM instruction set (arithmetic, comparisons, control flow, `CALL`/`RET`/`CALLV`, closures, lists, tomes, IEEE-754 floats, `try`/`throw`, string/math builtins, and dynamically growing heap up to 1 GiB).
  2. The baked self-hosted compiler ([lang/compiler/driver.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/lang/compiler/driver.sdev)) embedded directly in the binary.
  3. Native OS host bridge over the `sdev:` virtual path protocol (`sdev:args`, `sdev:ls:<dir>`, `sdev:exec:<cmd>`, `sdev:compile:self:<path>`, `sdev:driver:baked`, `sdev:append:<path>`, `sdev:err`, `sdev:exit:<code>`, plus direct filesystem I/O).

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

## Path B — Native x86-64 Self-Compiled Toolchain (`bin/sdev-driver`)

True C++-style zero-host: SDEV's own compiler and native backend compiled to standalone static Linux x86-64 ELF executables with **zero libc** and direct Linux syscalls.

### Components

1. **Native Compiler Driver ([bin/sdev-driver](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/bin/sdev-driver)):**
   - [lang/compiler/driver.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/lang/compiler/driver.sdev) compiled to native x86-64 machine code and linked against [bin/runtime.s](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/bin/runtime.s) / [src/lang-bridge/native/runtime.s](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/src/lang-bridge/native/runtime.s).
   - Reads the target source file from `argv[1]` (or `<stdin>`), resolves `use "..."` modules directly via `sys_open`/`sys_read`, and emits the bytecode + string pool stream.
2. **Pure-SDEV Bytecode → x86-64 Codegen ([lang/native/codegen_x64.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/lang/native/codegen_x64.sdev)):**
   - `x64_compile_bytecode(bc, pool)` translates compiled SDEV v2 bytecode and string pool into standalone System V AMD64 GAS assembly (`sdev_main`).
3. **Pure-SDEV Native Build Driver ([lang/native/build.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/lang/native/build.sdev)):**
   - Orchestrates compilation (`sdev:compile:self:<path>`), native assembly emission (`x64_compile_bytecode`), and assembling/linking (`as` + `ld`) into a static ELF executable.
4. **Native Runtime ([src/lang-bridge/native/runtime.s](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/src/lang-bridge/native/runtime.s) & [lang/native/runtime_x64.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/lang/native/runtime_x64.sdev)):**
   - Provides `_start`, `sdev_alloc` (512 MiB `MAP_NORESERVE` `sys_mmap` arena), string/list/tome/float primitives, `attempt`/`rescue`/`throw`, and direct syscall wrappers for `read_file`, `write_file`, `append_file`, `file_exists`, `args`, `env`, `exit`, `now_ms`, `sleep_ms`, and the `sdev:` host protocol (`<stdin>`, `sdev:args`, `sdev:ls:`, `sdev:exec:`, `sdev:err`, `sdev:exit:`, `sdev:append:`).
5. **Pure-SDEV Bytecode VM ([lang/runtime/vm.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/lang/runtime/vm.sdev)):**
   - Extended with `PUSH_STR`, `LOAD`/`STORE`, `CALL`/`RET`/`ENTER`, `LOAD_LOC`/`STORE_LOC`, `JMP`/`JZ`, comparisons, string ops (`LEN`, `SGET`, `I2S`, `CHR`, `STREQ`, `STRCAT`, `UPPER`, `LOWER`, `TRIM`, `SUBSTR`, `FIND`), host I/O, and `vm_from_driver_stream`.

### Native Fixed-Point Self-Compilation

```bash
# Compile driver.sdev natively using pure SDEV (zero JS/Node)
./bin/sdev-vm native lang/compiler/driver.sdev -o sdev-driver-s2

# Run the natively compiled compiler on its own source
./sdev-driver-s2 lang/compiler/driver.sdev
```

The resulting bytecode (20,933 bytes) and string pool (1,123 bytes) match the baked self-hosted driver byte-for-byte.

---

## Path C — Zero-Cost Windows x86-64 PE/COFF (`.exe`) Emitter

On Windows, SDEV generates standalone 64-bit console executables (`PE32+`) directly from raw machine code without Visual Studio, MSVC, MinGW/GCC, or paid EV/OV signing certificates:

- **Host Emitter:** `src/lang-bridge/native/pe.mjs` — generates DOS stub, `PE\0\0` signature, COFF AMD64 (`0x8664`) header, PE32+ Optional Header (`0x020B`, CUI subsystem `3`), `.text` section (Win64 ABI 16-byte stack alignment + 32-byte shadow space), and `.rdata` import table (`KERNEL32.dll`: `GetStdHandle`, `WriteFile`, `ExitProcess`).
- **Pure-SDEV PE Emitter:** `lang/native/pe_x64.sdev` (`pe_build_minimal_exe`, `pe_verify_header`).

```bash
node scripts/sdev-native.mjs program.sdev -o program.exe --target windows --format pe
.\program.exe
```

Verified by `node scripts/run-ts.mjs scripts/test-native-pe.ts` (10 cases) and `npm run test:native` (81 Linux ELF cases via WSL).
