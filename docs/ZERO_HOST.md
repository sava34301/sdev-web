# SDEV Zero-Host Architecture & Pure-SDEV Standalone Distribution

SDEV supports **zero-host execution** on native OS processes without Node.js, V8, TypeScript, or a WebAssembly runtime, while keeping the root React Web IDE, browser WebAssembly runner, and TypeScript language engine intact and working.

---

## 1. Standalone 100% Pure-SDEV Distribution (`sdev-zero/`)

[sdev-zero/](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/sdev-zero/README.md) is the self-contained, zero-host SDEV distribution directory:

- **0 foreign language files** (`0` `.js`, `.mjs`, `.ts`, `.tsx`, `.py`, `.wat`, or `.wasm` files — verified automatically by `./bin/sdev doctor`).
- **Exact 1:1 `.sdev` Mirror of Every Repository File (370 / 370 files + 112 core `lang/` modules = 480+ `.sdev` files):** Every `.ts`, `.tsx`, `.mjs`, `.js`, `.py`, and `.wat` file across `bin/`, `cli/`, `src/` (247 files), `scripts/` (54 files), `supabase/functions/` (28 files), `remotion-pitch/` (13 files), `extension/` (4 files), `public/` (4 files), `drizzle/`, `tools/`, `AI/`, and root config files (`vite.config.sdev`, `tailwind.config.sdev`, `eslint.config.sdev`, `postcss.config.sdev`, `drizzle.config.sdev`) has a 1:1 compilable `.sdev` counterpart at the matching path inside `sdev-zero/`.
- **112+ pure-SDEV language & CLI core modules** in `sdev-zero/lang/` and `sdev-zero/cli/` covering:
  - **Self-Hosted Compilers (`lang/compiler/`)**: v2 and v1 lexers, parsers, codegens, and 3-stage fixed-point compiler drivers.
  - **Native x86-64 & Windows PE32+ Backend (`lang/native/`)**: Bytecode → System V AMD64 GAS assembly compiler (`codegen_x64.sdev`), native syscall runtime generator (`runtime_x64.sdev`), static ELF build driver (`build.sdev`), and 64-bit Windows PE32+ `.exe` console executable builder (`pe_x64.sdev`).
  - **Language Bridge & Wasm Seed Emitter (`lang/bridge/`)**: Pure-SDEV binary WebAssembly (`.wasm`) & WAT seed module emitter (`wasm_seed_emitter.sdev`) and self-compiler bridge (`self_bridge.sdev`).
  - **Core Engine & Multiplayer Collab (`lang/core/`)**: v1/v2 keyword tables, tokens, AST nodes, structured error formatter (`keywords_ast.sdev`), live line-by-line scratchpad evaluator (`interpreter_live.sdev`), multi-file module linker & benchmark suite (`linker_bench.sdev`), and Lamport-clock CRDT multiplayer live room (`collab_room.sdev`).
  - **Hardware & Embedded Subsystem (`lang/hardware/`)**: 13-board MCU database & USB VID/PID lookup (`board_db.sdev`), Arduino core API & library catalogue (`arduino_api.sdev`), newline-preserving board block stripper (`strip.sdev`), natural-English hardware reader (`understand.sdev`), Arduino C++ `.ino` transpiler (`transpile.sdev`), virtual MCU & breadboard simulator (`simulator.sdev`), and STK500v1 packet framer + Intel HEX encoder (`serial_cloud.sdev`).
  - **Dialect Subsystem (`lang/dialect/`)**: 46-keyword catalog, spec validator, inheritance & cross-dialect translator (`spec_catalog.sdev`), ready-made presets (`presets.sdev`), invisible `#⟨sdev⟩` file signature codec & checksum verifier (`signature.sdev`), Markdown documentation generator (`docs.sdev`), and offline `@user/slug` library cache (`extensions_registry.sdev`).
  - **Understander Agent Pipeline (`lang/agent/`)**: Full end-to-end pipeline (`pipeline.sdev`) combining `!#` directive scanning, `!#ai` translation, board block protection, natural-English normalization, unclosed block auto-closing, and learned-word dialect promotion.
  - **Builtins Subsystem (`lang/builtins/`)**: JSON serializer/parser & dictionary operations (`json_dict.sdev`), higher-order list & functional builtins + regex backtracking guard (`functional_list.sdev`), and time/type/host I/O helpers (`time_io_host.sdev`).
  - **Studio Time-Travel Chrono Debugger (`lang/studio/`)**: Step-by-step execution tracer, variable snapshot timeline, and Live Lens annotations (`time_travel.sdev`).
  - **MCP Server & Cloud Edge Functions (`lang/mcp/` & `lang/server/`)**: Model Context Protocol JSON-RPC server (`mcp_server.sdev`) and server-side AI provider router + `sdev-agent`, `sdev-fix`, and `compile-firmware` edge handlers (`edge_functions.sdev`).
  - **IDE Intelligence, 3D Compiler Scene & App Router (`lang/ide/`)**: Autocomplete, symbol outline extractor, workspace search, and problems aggregator (`intelligence.sdev`), plus protocol-aware `HashRouter`/`BrowserRouter` selection, homepage 3D compiler scene scroll-progress math, launch gate, and calendar link builder (`scene_router.sdev`).
  - **Release Pipeline, Book Builder, Hardware Docs & 1:1 Mirror Engine (`lang/tools/`)**: Single-version `releases.json` manifest builder, hardware reference generator, SDEV Book builder (`release_docs.sdev`), and 1:1 repository path mapper & declaration transpiler (`mirror_1to1.sdev`).
  - **Unified Pure-SDEV CLI (`sdev-zero/cli/`)**: `sdev.sdev`, local config/dialect store & semver updater (`store_env.sdev`), auth & cloud registry publisher (`auth_cloud.sdev`), terminal text editor buffer & ANSI viewport (`editor.sdev`), and unified execution pipeline (`pipeline.sdev`).
- **31 zero-host test suites** ([sdev-zero/scripts/test-all.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/sdev-zero/scripts/test-all.sdev)) running with zero Node.js and zero WebAssembly.

### Commands (`cd sdev-zero`)

```bash
./bin/sdev doctor                         # Audit 0 foreign files & toolchain health
./bin/sdev bootstrap [--v1]               # Verify Stage-1 == Stage-2 == Stage-3 fixed points (v2 & v1)
./bin/sdev test                           # Run all zero-host pure-SDEV test suites
./bin/sdev run program.sdev               # Run an SDEV v2 program
./bin/sdev run --v1 classic.sdev          # Run an SDEV v1 program
./bin/sdev eval [--v1] "<code>"           # Evaluate an inline v2/v1 snippet
./bin/sdev native [--v1] prog.sdev -o bin # Compile v2 or v1 to a static Linux x86-64 ELF binary
./bin/sdev compile [--v1] p.sdev -o a.sdevc # Compile v2 or v1 to an SDEVC4 container
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

---

## 2. Path A — Standalone Native SDEV VM (`bin/sdev-vm` & `sdev-zero/bin/sdev`)

"Our own Node for SDEV."

- **Source:** [src/lang-bridge/native/sdev-vm.c](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/src/lang-bridge/native/sdev-vm.c) + [src/lang-bridge/native/driver-embedded.h](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/src/lang-bridge/native/driver-embedded.h)
- **What it contains:**
  1. Native x86-64 implementation of the complete SDEV Seed VM instruction set with a dynamically growing heap up to 1 GiB.
  2. The baked self-hosted v2 compiler ([lang/compiler/driver.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/lang/compiler/driver.sdev)) embedded directly in the binary, plus on-demand compilation of the self-hosted v1 compiler ([lang/compiler/v1_driver.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/lang/compiler/v1_driver.sdev) & [lang/compiler/v1_self.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/lang/compiler/v1_self.sdev)).
  3. Full `sdev:` host protocol (`sdev:args`, `sdev:ls:`, `sdev:exec:`, `sdev:compile:self|stage2|boot|v1|v1-self|v1-self-stage2:`, `sdev:driver:baked|fresh|v1|v1-self|v1-self-stage2`, `sdev:append:`, `sdev:err`, `sdev:exit:`).

---

## 3. Path B — Native x86-64 Self-Compiled Toolchain (`bin/sdev-driver`)

True C++-style zero-host: SDEV's compiler and native backend compiled to standalone static Linux x86-64 ELF executables with **zero libc** and direct Linux syscalls.

- **Native Compiler Driver ([bin/sdev-driver](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/bin/sdev-driver)):** [lang/compiler/driver.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/lang/compiler/driver.sdev) compiled to native x86-64 machine code and linked against [bin/runtime.s](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/bin/runtime.s).
- **Pure-SDEV Bytecode → x86-64 Codegen ([lang/native/codegen_x64.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/lang/native/codegen_x64.sdev)):** `x64_compile_bytecode(bc, pool)` translates SDEV v2 bytecode and string pool into standalone System V AMD64 GAS assembly (`sdev_main`).
- **Pure-SDEV Native Build Driver ([lang/native/build.sdev](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/lang/native/build.sdev)):** Compiles `.sdev` files with the self-hosted compiler, emits x86-64 assembly via `x64_compile_bytecode`, and links static ELF binaries via `as` + `ld`.
