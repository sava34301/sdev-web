# sdev

**sdev** is a multi-paradigm, multilingual, self-hosting programming language, browser & desktop IDE, CLI toolchain, and AI-assisted development environment (`v5.1.0` — see [`release.json`](./release.json)).

It unites three complementary writing styles under one toolchain:

- **sdev v1 (Classic / Keyword Syntax)** — readable, expressive prose-like syntax (`forge`, `be`, `conjure`, `speak`, `essence`, `window`/`endwindow`, 25 spoken-language translations).
- **sdev v2 "Prism"** — concise indentation-based syntax (`set`, `fn`, `say`, `make`/`kind`/`has`, typed lists, lambdas) compiled by a **self-hosted compiler written in sdev** targeting the 32-bit WebAssembly Seed VM (`src/lang-bridge/seed/seed.wat`), zero-host native VM/driver binaries (`bin/sdev-vm`, `bin/sdev-driver`), native x86-64 Linux ELF & Windows PE `.exe`, and WASI 0.2 components.
- **`sdev:ai` (`!#ai`) & Personal SDEV (`!#dialect` / `!#ext` / `!#sig`)** — intent-first coding interpreted deterministically by `lang/agent/understander.sdev` and user-defined dialects, with an offline-first 3-tier AI brain (WebGPU WebLLM in the browser -> local model server -> cloud fallback).

---

## Key Capabilities

- **Self-Hosting Toolchain (`lang/`)**: 3-stage self-hosting v1 compiler (`v1_self.sdev`), self-hosted v2 compiler on the WASM Seed VM, pure-SDEV website toolkit (`lang/web/`), pure-SDEV v2 standard library (`lang/stdlib/v2/`), and automated parity across `lang/parity/features.json` (209 features across 3 tracks).
- **Native Zero-Host & WASI 0.2 Compilation**: Emit standalone x86-64 Linux ELF binaries, Windows PE/COFF `.exe` executables (`pe.mjs`, `pe_x64.sdev`), native x86-64 zero-host VM executables (`bin/sdev-vm`), and portable WebAssembly WASI 0.2 components (`src/lang/wasi-component.ts`, `WasiComponentDialog`).
- **Ontological Causal Engine (OCE)**: Pure-SDEV `bits`, `mem`, `ring`, and `oce` modules running identically on the Seed VM, v1 TypeScript builtins (`src/lang/builtins/oce.ts`), and Python interpreter (`public/sdev-interpreter.py`).
- **ML, WebGPU & CUDA Stdlib**: Autograd tensors, attention/Transformer layers, batched M15 forward passes (`linear_forward_batch`, `sequential_forward_batch`, `gpt_forward_batch`), `SDEVML01` binary checkpoints, `best_matmul` dispatch, FFI, WebGPU compute, and CUDA helpers.
- **Canonical API Registry & Linter**: 881 canonical API entries across 16 modules and 15 static diagnostics (`SDEV001`–`SDEV015`), driving IDE hover/autocomplete, linter, formatter, and compiler pre-flight checks.
- **Web & Desktop IDE, CLI, VS Code & MCP**: Time-Travel Debugger, Runtime Explorer, Live Classroom, In-Browser Hardware Simulator (30 boards, 10,232 Arduino libraries, WebUSB/UF2 & firmware compilation), `sdev edit` terminal editor, Electron desktop app, VS Code extension, and Model Context Protocol (MCP) server.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start the Web IDE & documentation viewer (Vite dev server on port 8080)
npm run dev

# Build the production bundle (serves docs at /documentation/ in dist/)
npm run build

# Run the unified CLI / REPL / native toolchain
node bin/sdev.mjs --help
node bin/sdevhost.mjs path/to/program.sdev
```

---

## Test & Verification Commands

| Command | Purpose |
|---|---|
| `npm test` | Run Vitest unit & compiler test suite |
| `npm run test:registry` | Verify canonical API registry & static linter (`SDEV001`–`SDEV015`) |
| `npm run test:understander-docs` | Verify documented `sdev` code blocks preserve `asWritten()` invariants |
| `npm run test:parity` | Run `lang/parity/agent.sdev` and update the Track Parity Matrix |
| `npm run test:oce-parity` | Verify byte-identical OCE/bits/mem/ring output across JS, Python & Seed VM |
| `npm run test:wasm` | Run the WASM Seed VM instruction suite |
| `npm run test:driver` | Verify `bin/sdev-driver` artifact integrity |
| `npm run test:self` | Run self-hosting fixed-point compiler verification |
| `node bin/sdevhost.mjs scripts/test-all.sdev` | Run the 22-suite self-hosted SDEV test harness |
| `npm run docs:hardware` | Regenerate hardware documentation from `board-db.ts` & `library-index.json` |
| `node scripts/build-ultimate-docs.mjs` | Regenerate the single-file Ultimate Reference compendium |
| `npm run lint` | Run ESLint across the web & IDE codebase |

---

## Structured Documentation Index

All project documentation is organized under [`docs/`](./docs/README.md) (and browsable in the Web IDE at `/docs`, served from `/documentation/`):

### 01 — Overview & Compendia
- [Documentation Hub Index](./docs/README.md)
- [Language Overview](./docs/01-overview/language-overview.md)
- [Ultimate Reference (Single-File Compendium)](./docs/01-overview/ultimate-reference.md)
- [The sdev Book (EN)](./docs/01-overview/the-sdev-book-en.md) · [PDF](./public/sdev-book-en.pdf)
- [Книгата за sdev (BG)](./docs/01-overview/the-sdev-book-bg.md) · [PDF](./public/sdev-book-bg.pdf)

### 02 — Language Guides & Personal SDEV
- [sdev v1 Language Reference](./docs/02-language/v1-reference.md)
- [sdev v2 "Prism" Guide](./docs/02-language/v2-prism-guide.md)
- [sdev:ai Syntax Reference](./docs/02-language/ai-syntax-reference.md)
- [Personal SDEV (Dialects, Extensions, Signatures & `@user/lib`)](./docs/02-language/personal-dialects-and-libraries.md)
- [Multi-Paradigm Parity (SQL, Kotlin, Rust, C++)](./docs/02-language/multi-paradigm-parity.md)
- [Python Parity Reference](./docs/02-language/python-parity-reference.md)

### 03 — Standard Library & Acceleration
- [Self-Hosted v2 Stdlib & Website Toolkit (`lang/web/`)](./docs/03-standard-library/v2-stdlib-and-web-toolkit.md)
- [ML & LLM Standard Library](./docs/03-standard-library/ml-and-llm-stdlib.md)
- [FFI & Native Acceleration](./docs/03-standard-library/ffi-and-native-accel.md)
- [WebGPU Acceleration](./docs/03-standard-library/webgpu-acceleration.md)
- [CUDA Fast Path](./docs/03-standard-library/cuda-fast-path.md)
- [Autonomous Evolution](./docs/03-standard-library/autonomous-evolution.md)

### 04 — AI & Causal Engine
- [Understanding Agent & Local AI Brain](./docs/04-ai-and-causal-engine/understanding-agent-and-local-brain.md)
- [OCE Library Reference](./docs/04-ai-and-causal-engine/oce-library-reference.md)
- [OCE Developer Guide](./docs/04-ai-and-causal-engine/oce-developer-guide.md)

### 05 — IDE, CLI & Tooling
- [Web IDE & Debugging Tools](./docs/05-ide-and-tooling/ide-and-debugging-tools.md)
- [CLI Toolchain & Terminal Editor (`sdev edit`)](./docs/05-ide-and-tooling/cli-and-terminal-editor.md)
- [Canonical API Registry & Static Linter](./docs/05-ide-and-tooling/api-registry-and-linter.md)
- [Desktop App, VS Code Extension & MCP Server](./docs/05-ide-and-tooling/desktop-vscode-and-mcp.md)

### 06 — Compiler, VM & Target Backends
- [Compiler & VM Internals](./docs/06-compiler-and-internals/compiler-and-vm-internals.md)
- [Zero-Host Native x86-64 & Windows PE `.exe`](./docs/06-compiler-and-internals/zero-host-native-and-pe.md)
- [WASI 0.2 Component Model](./docs/06-compiler-and-internals/wasi-component-model.md)
- [Track Parity Matrix](./docs/06-compiler-and-internals/track-parity-matrix.md)

### 07 — Domain Guides
- [Hardware, Boards & Simulator (30 Boards, 10,232 Libraries)](./docs/07-domains/hardware-and-boards.md)
- [Leaflet & GIS Reference](./docs/07-domains/leaflet-and-gis.md)

### 08 — Operations & Contributing
- [Contributing Guide](./docs/08-operations/contributing-guide.md)
- [Environment Variables Reference](./docs/08-operations/environment-variables.md)
- [Operations Runbook](./docs/08-operations/operations-runbook.md)

### 09 — Project History & Releases
- [Complete Project History](./docs/09-project/complete-project-history.md)
- [Launch Materials](./docs/09-project/launch/)

### Component READMEs
- [Language & Self-Hosted Toolchain (`lang/README.md`)](./lang/README.md)
- [Native x86-64 Backend (`lang/native/README.md`)](./lang/native/README.md)
- [CLI Package (`cli/README.md`)](./cli/README.md)
- [Electron Desktop App (`electron/README.md`)](./electron/README.md)
- [VS Code Extension (`extension/README.md`)](./extension/README.md)
- [Local Arduino Build Server (`tools/arduino-build-server/README.md`)](./tools/arduino-build-server/README.md)
