# `scripts/`

Build, release, documentation-generation, and verification test scripts for the entire SDEV toolchain.

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Files

| File | Purpose |
| :--- | :--- |
| `build-arduino-library-index.py` | Python script (`build-arduino-library-index.py`). |
| `build-book-content.py` | UI Toolkit deep dive (windows, buttons, inputs, layout, customization). |
| `build-book-pdf.py` | Python script (`build-book-pdf.py`). |
| `build-book.ts` | Generates the giant sdev Book in English and Bulgarian. |
| `build-cli.mjs` | Bundle the sdev CLI into bin/sdev.mjs. |
| `build-compiler.ts` | Bundles the sdev compiler + VM + interpreter into a single Node.js CLI. |
| `build-driver.mjs` | Bake the self-hosted driver bytecode. |
| `build-seed-wasm.mjs` | Build the seed VM: lang/bootstrap/seed.wat → public/wasm/sdev-seed.wasm. |
| `build-ultimate-docs.mjs` | Builds docs/01-overview/ultimate-reference.md — the single, complete sdev. |
| `gen-hardware-docs.ts` | Generate docs/07-domains/hardware-and-boards.md from. |
| `probe-self-codegen.sdev` | Probe — compile lang/compiler/codegen.sdev through the self-hosted shim and |
| `probe-self-lexer.sdev` | Probe — compile a toolchain source through the self-hosted shim and the |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `release.mjs` | One command keeps every sdev tool current:. |
| `run-ts.mjs` | Bundle and run a TypeScript script using esbuild + Node. |
| `sdev-native.mjs` | SDEV native compiler CLI. |
| `sdev-runtime-launcher.ts` | TypeScript module (`sdev-runtime-launcher.ts`). |
| `test-agent-fallback.sdev` | Pure-SDEV test suite for the understander brain, math, tasks,. |
| `test-agent.ts` | The understanding agent: rules, memory, directives and dialect promotion. |
| `test-all.sdev` | SDEV Self-Hosted Language Core Test Runner — authored in SDEV |
| `test-beginner.ts` | The beginner path: five first programs, written the way someone who has. |
| `test-bg.ts` | TypeScript module (`test-bg.ts`). |
| `test-board-db.ts` | TypeScript module (`test-board-db.ts`). |
| `test-brain-sanitizer.ts` | 1. Missing !#ai header restoration. |
| `test-brain.ts` | Free-form requests through the whole agent, including the online AI brain. |
| `test-compiler-features.ts` | Test Suite for Compiler Internals: Python/Kotlin/Rust Features in v2 Bytecode. |
| `test-dialect.ts` | Golden tests for the dialect layer. |
| `test-driver-artifact.sdev` | The checked-in driver artifact must stay honest — authored in SDEV. |
| `test-expansion-features.ts` | Comprehensive Test Suite for the 5 Expansion Features (`scripts/test-expansion-features.ts`). |
| `test-fop-fp.ts` | TypeScript module (`test-fop-fp.ts`). |
| `test-formatter.sdev` | SDEV Formal Formatter Test Suite — authored in SDEV. |
| `test-formatter.ts` | Formal Formatter Test Suite (Roadmap Phase 5, Item 33). |
| `test-ide-loading.ts` | Follow real static dependencies, not comments or dynamic imports. A new. |
| `test-linker.ts` | TypeScript module (`test-linker.ts`). |
| `test-local-brain.ts` | Test Suite for Local Model Server (LM Studio, Ollama, llama.cpp, LocalAI). |
| `test-math.ts` | TypeScript module (`test-math.ts`). |
| `test-matrix.ts` | TypeScript module (`test-matrix.ts`). |
| `test-mcp-deployment.mjs` | JavaScript/Node module (`test-mcp-deployment.mjs`). |
| `test-micro-brain-benchmarks.ts` | TypeScript module (`test-micro-brain-benchmarks.ts`). |
| `test-ml-stdlib.ts` | Milestone 13 & 15 — ML stdlib execution harness. |
| `test-multi-language-features.sdev` | Multi-Language Parity Suite — authored in SDEV. |
| `test-multi-language-features.ts` | Comprehensive Multi-Language Parity & Roadmap Test Suite. |
| `test-native-pe.ts` | Test Suite for Native Windows PE/COFF (.exe) Generator. |
| `test-native.mjs` | Regression suite for the native x86-64 backend. |
| `test-new-features-tdd.ts` | TypeScript module (`test-new-features-tdd.ts`). |
| `test-oce-classic.sdev` | OCE regression suite — classic sdev, for the browser and Python runtimes. |
| `test-oce-parity.ts` | OCE parity gate: the causal engine must give the same answers everywhere. |
| `test-oce.sdev` | OCE regression suite — authored in SDEV. |
| `test-parity.ts` | Parity gate — runs the sdev-written parity agent. |
| `test-parser-literals.ts` | Parser rules for words and strings that must stay as written. |
| `test-preset-dialect.ts` | The shipped dialects are real: they validate, their sample program. |
| `test-registry.ts` | Verification Suite for Workstream 4:. |
| `test-sdev-engine.ts` | The self-hosted understander (lang/agent/understander.sdev) and. |
| `test-self-codegen.sdev` | Self-hosted codegen end-to-end test — authored in SDEV. |
| `test-self-lexer.sdev` | Self-hosted lexer test — authored in SDEV. |
| `test-self-parser.sdev` | Self-hosted expression parser test — authored in SDEV. |
| `test-self-toolchain.sdev` | Self-hosted toolchain round-trip — authored in SDEV. |
| `test-self-v1-compiler.sdev` | Self-hosted SDEV v1 compiler & toolchain verification — authored in SDEV. |
| `test-selfhosted-features.sdev` | SDEV Self-Hosted Complete Feature Suite — authored in SDEV |
| `test-selfhosted-stdlib.sdev` | SDEV Self-Hosted Stdlib Test Suite — authored in SDEV. |
| `test-selfhosted-subsystems.sdev` | SDEV Self-Hosted Subsystems Test Suite — authored in SDEV. |
| `test-selfhosted-web.sdev` | SDEV Self-Hosted Website Builder Test Suite — authored in SDEV |
| `test-shim-fixed-point.sdev` | Milestone 5l / Milestone A+B gate — shim fixed-point verification in SDEV. |
| `test-strip.ts` | TypeScript module (`test-strip.ts`). |
| `test-tasks.ts` | TypeScript module (`test-tasks.ts`). |
| `test-translator.ts` | TypeScript module (`test-translator.ts`). |
| `test-transpile.ts` | TypeScript module (`test-transpile.ts`). |
| `test-ui.ts` | TypeScript module (`test-ui.ts`). |
| `test-understander-docs.ts` | Gate: the understander must never change what a working documented program does. |
| `test-v2-diagnostics.mjs` | SDEV v2 compiler rules added for the OCE work. |
| `test-vm.ts` | TypeScript module (`test-vm.ts`). |
| `test-wasm-runtime.mjs` | Standalone Node harness: compile + run via the seed WASM. No browser. |
| `test-web.ts` | Comprehensive Verification Suite for the SDEV Website Building Toolkit:. |

<!-- FOLDER_INVENTORY_END -->
