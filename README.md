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

---

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Subfolders

| Subfolder | Purpose |
| :--- | :--- |
| [`AI/`](./AI/) | Evidence and traceability artifacts for the Bulgarian National Olympiad in Information Technologies (NOIT) AI declaration (Appendix 5 / Приложение 5). |
| [`bin/`](./bin/) | Compiled command-line executables, the SDEV WebAssembly host runner (`sdevhost.mjs`), the bundled unified CLI (`sdev.mjs`), the 32-bit WebAssembly Seed VM (`sdev-seed.wasm`), and the x86-64 System V assembly runtime (`runtime.s`). |
| [`cli/`](./cli/) | TypeScript source for the unified `sdev` command-line interface (`bin/sdev.mjs`), sharing the exact language core, dialect engine, understander, and cloud sync pipeline as the web IDE. |
| [`docs/`](./docs/) | Structured documentation hub for the SDEV programming language, organized into numbered topic folders (`01-overview` through `09-project`) plus the `noit/` Olympiad declaration folder. |
| [`drizzle/`](./drizzle/) | Database schema definitions and SQL migrations for user handles, Personal SDEV dialects, libraries, extensions, cloud workspace files, and gists. |
| [`electron/`](./electron/) | Electron desktop application shell (`main.cjs` and `preload.cjs`) wrapping the SDEV IDE with native file dialogs and out-of-browser x86-64 native binary compilation. |
| [`examples/`](./examples/) | Runnable example SDEV programs demonstrating language subsystems across runtimes. |
| [`extension/`](./extension/) | Official Visual Studio Code extension (`sdev-language`) providing syntax highlighting, snippets, and integrated execution/compilation commands powered by the bundled `sdev` CLI and Python interpreter. |
| [`lang/`](./lang/) | 100% pure-SDEV self-hosted language core: compilers (v2 & v1), virtual machines, native x86-64 & Windows PE code generators, v2 standard library, ML stack, website builder, understander agent, dialect engine, linter, formatter, translator, and parity auditor. |
| [`public/`](./public/) | Static web assets served at the root URL, including standalone JS/Python/compiler bundles, downloadable books (PDF), Arduino library index, ESP32 bootloader firmware, sample programs, and the WebAssembly Seed VM. |
| [`remotion-pitch/`](./remotion-pitch/) | Remotion programmatic video project used to render the sdev launch and architecture pitch video. |
| [`scripts/`](./scripts/) | Build, release, documentation-generation, and verification test scripts for the entire SDEV toolchain. |
| [`sdev-zero/`](./sdev-zero/) | 100% pure-SDEV zero-host standalone distribution containing native Linux ELF & Windows PE32+ binaries and 1:1 `.sdev` mirrors of the entire repository. |
| [`src/`](./src/) | Frontend React + TypeScript application source, layered language runtime (`src/lang/`), self-hosted compiler bridge (`src/lang-bridge/`), IDE state modules (`src/ide/`), and visual debugging studio (`src/studio/`). |
| [`supabase/`](./supabase/) | Supabase backend configuration (`config.toml`), Deno Edge Functions (`functions/`), and PostgreSQL schema migrations (`migrations/`). |
| [`tools/`](./tools/) | Standalone local companion tools and development servers. |

### Files

| File | Purpose |
| :--- | :--- |
| `.env.example` | Template showing public Vite configuration environment variables. |
| `.gitignore` | Git ignore rules for build outputs, caches, and temporary artifacts. |
| `AGENTS.md` | Project-wide architecture rules and behavioral invariants. |
| `bun.lock` | Bun package lockfile. |
| `components.json` | shadcn/ui component configuration. |
| `drizzle.config.ts` | Drizzle ORM kit configuration pointing to `drizzle/schema.ts`. |
| `eslint.config.js` | ESLint flat configuration for TypeScript and React hooks. |
| `index.html` | Root HTML entry point for the Vite React web application. |
| `package-lock.json` | Locked npm dependency tree. |
| `package.json` | Node.js package manifest, dependencies, and npm scripts. |
| `postcss.config.js` | PostCSS configuration enabling Tailwind CSS and Autoprefixer. |
| `Prilozhenie_5_Deklaracia_II_sdev.pdf` | Official NOIT Appendix 5 declaration (PDF). |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `release.json` | Single source of truth for the project version (`IDE`, `CLI`, `VS Code extension`, and `desktop app`). |
| `sdev.docx` | Project documentation document (Word `.docx`). |
| `skills-lock.json` | Locked agent skill metadata. |
| `tailwind.config.ts` | Tailwind CSS theme, custom color tokens, fonts, and animation configuration. |
| `tsconfig.app.json` | TypeScript compiler configuration (`tsconfig.app.json`). |
| `tsconfig.json` | TypeScript compiler configuration (`tsconfig.json`). |
| `tsconfig.node.json` | TypeScript compiler configuration (`tsconfig.node.json`). |
| `vite.config.ts` | Vite bundler configuration (aliases, `/documentation/` static serving, code-splitting). |

<!-- FOLDER_INVENTORY_END -->
