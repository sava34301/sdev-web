# `sdev-zero/` — 100% Pure-SDEV Zero-Host Standalone Distribution

`sdev-zero/` is the self-contained, zero-host SDEV distribution. It contains **zero JavaScript (`.js`, `.mjs`), zero TypeScript (`.ts`), and zero WebAssembly (`.wasm`) files**. Every compiler stage, virtual machine, native x86-64 code generator, Windows PE32+ executable builder, standard library, linter, formatter, 26-language translator, website builder, CLI, and test suite is authored in pure `.sdev` files and runs directly on native OS executables.

---

## Directory Layout

```text
sdev-zero/
├── bin/
│   ├── sdev          # Native Zero-Host SDEV VM + Embedded Self-Hosted Compiler (v2 & v1)
│   ├── sdev-driver   # 74 KB Static Linux x86-64 ELF v2 Compiler (compiled from driver.sdev, zero libc)
│   ├── sdev-v1-driver# Static Linux x86-64 ELF v1 Compiler (compiled from pure-v1 v1_self.sdev, zero libc)
│   ├── sdev-cli      # Static Linux x86-64 ELF CLI (compiled from cli/sdev.sdev by pure SDEV, zero libc)
│   ├── sdev-win.exe  # 2 KB Standalone Windows x86-64 PE32+ Console Executable (built by pure-SDEV pe_x64.sdev)
│   └── runtime.s     # System V AMD64 Linux syscall assembly runtime (zero libc)
├── cli/
│   ├── sdev.sdev        # 100% Pure-SDEV Unified Command-Line Interface
│   ├── store_env.sdev   # Local dialect/config store, semver comparator & update checker
│   ├── auth_cloud.sdev  # CLI session manager, cloud dialect publish protocol & prompts
│   ├── editor.sdev      # Full-screen terminal text editor buffer & ANSI viewport renderer
│   └── pipeline.sdev    # End-to-end CLI execution pipeline (signatures -> dialects -> agent -> hardware)
├── lang/                # 100% Pure-SDEV Language Core (112 .sdev modules, 0 foreign files)
│   ├── compiler/        # Self-hosted v2 & v1 lexers, parsers, codegens, and drivers
│   ├── native/          # Pure-SDEV x86-64 assembly codegen, runtime generator, ELF linker, and Windows PE32+ emitter
│   ├── runtime/         # Pure-SDEV bytecode VM, disassembler, VFS OS kernel, WASI, and notebook engine
│   ├── bridge/          # Pure-SDEV WebAssembly (.wasm & .wat) seed emitter & self-compiler bridge
│   ├── core/            # Pure-SDEV v1/v2 keywords, tokens, AST, live scratchpad evaluator, linker, benchmarks & CRDT collab room
│   ├── builtins/        # Pure-SDEV JSON serializer/parser, dict ops, higher-order list/functional builtins, regex guard, time & host I/O
│   ├── studio/          # Pure-SDEV Time-Travel Chrono Debugger & Live Lens step tracer
│   ├── mcp/             # Pure-SDEV Model Context Protocol (MCP) JSON-RPC 2.0 server & tools
│   ├── server/          # Pure-SDEV cloud edge functions & OpenAI-compatible AI provider router
│   ├── ide/             # Pure-SDEV IDE autocomplete, symbol outline, workspace search, problems aggregator, 3D scene math & router
│   ├── tools/           # Pure-SDEV release manifest generator, hardware reference generator, SDEV Book builder & 1:1 mirror engine
│   ├── hardware/        # Pure-SDEV board DB, Arduino API catalogue, block stripper, understander, .ino transpiler, MCU simulator & STK500/HEX
│   ├── stdlib/          # v2 stdlib (text, list, tome, math, bits, mem, oce, matrix, regex, sql, ui, web, graphics, test) + ML
│   ├── paradigms/       # Functional (Option/Result), systems arenas, data tables, hardware (Arduino/C++) transpiler
│   ├── agent/           # Pure-SDEV natural English code understander, full pipeline, directives, math, tasks, memory, and brain
│   ├── dialect/         # Pure-SDEV 46-word catalog, spec validator, presets, invisible signatures, docs generator, and offline cache
│   ├── formatter/       # Pure-SDEV code formatter
│   ├── linter/          # Pure-SDEV diagnostic linter (SDEV001..SDEV015)
│   ├── translator/      # Pure-SDEV 26-language keyword translator & script detector
│   ├── legacy/          # Pure-SDEV v1 mystical syntax -> v2 canonical syntax transpiler
│   ├── registry/        # Pure-SDEV canonical API & diagnostic registry
│   └── web/             # Pure-SDEV website & interactive Web IDE builder
├── src/                 # Exact 1:1 .sdev counterparts for all 247 files in src/ (src/lang, src/lang-bridge, src/components, src/pages, src/hooks, src/lib, src/studio)
├── supabase/functions/  # Exact 1:1 .sdev counterparts for all 28 cloud edge functions & email templates
├── extension/           # Exact 1:1 .sdev counterparts for the VS Code extension
├── public/              # Exact 1:1 .sdev counterparts for public compiler & interpreter scripts
├── remotion-pitch/      # Exact 1:1 .sdev counterparts for all 13 remotion video scenes
├── drizzle/             # Exact 1:1 .sdev counterpart for database schema (drizzle/schema.sdev)
├── tools/ & AI/         # Exact 1:1 .sdev counterparts for repository tools & AI helpers
├── *.config.sdev        # Exact 1:1 .sdev counterparts for vite, tailwind, eslint, postcss, and drizzle configs
└── scripts/             # 100% Pure-SDEV Test, Build & Verification Suites (31 suites + 1:1 script mirrors)
    └── test-all.sdev    # Master zero-host test runner
```

---

## CLI Commands

Run from inside `sdev-zero/`:

```bash
# Verify zero-foreign-file purity (.js / .mjs / .ts / .wasm = 0) & toolchain health
./bin/sdev doctor

# Verify Stage-1 == Stage-2 == Stage-3 self-compilation fixed points (v2 & v1)
./bin/sdev bootstrap
./bin/sdev bootstrap --v1

# Run all zero-host pure-SDEV test suites
./bin/sdev test

# Run any SDEV v2 or v1 program, or evaluate an inline snippet
./bin/sdev run program.sdev
./bin/sdev run --v1 classic_program.sdev
./bin/sdev eval [--v1] "say 6 * 7"

# Compile to a standalone static Linux x86-64 ELF binary (via pure-SDEV codegen_x64.sdev)
./bin/sdev native [--v1] program.sdev -o program
./program

# Compile to an SDEVC4 bytecode container and run it
./bin/sdev compile [--v1] program.sdev -o program.sdevc
./bin/sdev run-bc program.sdevc

# Emit a standalone 2 KB Windows x86-64 PE32+ Console Executable (.exe) in pure SDEV
./bin/sdev pe bin/sdev-win.exe "Hello from pure-SDEV Windows PE32+!" 0

# Scaffold a new pure-SDEV project
./bin/sdev new my_app

# Inspect, lint, format, translate, canonicalize dialects, or transpile
./bin/sdev check [--v1] program.sdev
./bin/sdev disasm [--v1] program.sdev
./bin/sdev lint program.sdev
./bin/sdev fmt program.sdev -w
./bin/sdev translate program.sdev
./bin/sdev dialect bg program_bg.sdev
./bin/sdev v1 classic_program.sdev
./bin/sdev api mat_mul
./bin/sdev explain SDEV001

# Build the complete SDEV website in pure SDEV
./bin/sdev web
```
