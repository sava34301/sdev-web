# `src/lang/`

Layered TypeScript implementation of the SDEV language runtime, builtins, code understander agent, Personal SDEV dialect engine, microcontroller hardware toolchain, API registry, and developer tools.

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Subfolders

| Subfolder | Purpose |
| :--- | :--- |
| [`agent/`](./agent/) | The SDEV Code Understander (syntax-free SDEV): executes `lang/agent/understander.sdev` first via `sdev-engine.ts`, falls back to deterministic TypeScript rules (`repair.ts`, `sense.ts`, `vocabulary.ts`), isolates hardware `board` blocks (`boards.ts`), and connects to the 3-tier AI brain (`micro-brain.ts`, `browser-brain.ts` WebLLM, local model server, and online edge function). |
| [`builtins/`](./builtins/) | Core SDEV v1 built-in function modules (21 files) covering I/O, types, math, lists, tomes/dicts, strings, text, regex (with ReDoS guard), time, JSON, functional programming, Feature-Oriented Programming, byte buffers, host I/O, SQL, and the Ontological Causal Engine (`oce.ts`). |
| [`collab/`](./collab/) | Conflict-free Replicated Data Type (CRDT) document state and real-time multiplayer classroom / pair-programming room session engine (`live-room.ts`). |
| [`core/`](./core/) | Foundational SDEV language layer with zero upward dependencies: token definitions (`tokens.ts`), keyword tables (`keywords.ts`), lexer (`lexer.ts`), AST node types (`ast.ts`), recursive-descent parser (`parser.ts`), lexical environment (`environment.ts`), runtime value types (`runtime-values.ts`), formatting (`format.ts`), and error classes (`errors.ts`). |
| [`dialect/`](./dialect/) | Personal SDEV deterministic dialect system: `.dialect.sdev` parser/serializer (`sdev-format.ts`), directive resolver (`resolve.ts`), canonicalizer & dialect-to-dialect translator (`canonicalize.ts`), 46-word catalog (`catalog.ts`), presets (`presets.ts`), `#⟨sdev⟩` file signatures & compact translation recipes (`signature.ts`), extensions (`extensions.ts`), `@user/lib` registry (`registry.ts`), offline cache (`library-cache.ts`), and living docs generator (`docs.ts`). |
| [`hardware/`](./hardware/) | Microcontroller & Arduino toolchain: 30-board database (`board-db.ts`), Arduino core & library catalogue (`arduino-api.ts`), `board` block stripper (`strip.ts`), natural-language hardware reader (`understand.ts`), sdev-to-Arduino `.ino` C++ transpiler (`transpile.ts`), zero-install cloud/local firmware compiler (`cloud-compile.ts`), 7-protocol Web Serial / WebUSB / UF2 flasher (`web-serial.ts`), and virtual breadboard simulator (`simulator.ts`). |
| [`registry/`](./registry/) | Single source of truth for SDEV language intelligence: zero-dependency keyword/builtin/snippet documentation (`builtin-docs.ts`) and the 941-entry Canonical API Registry + `SDEV001`–`SDEV015` diagnostic catalogue (`api-registry.ts`). |
| [`runtime/`](./runtime/) | Execution engines for SDEV: core tree-walking interpreter with trace hook (`interpreter-core.ts`), full stdlib-bound interpreter (`interpreter.ts`), bytecode instruction set & disassembler (`bytecode.ts`), bytecode compiler (`compiler.ts`), stack VM (`vm.ts`), unified v1/v2/understander executor (`executor.ts`), lazy pure-SDEV module runner (`sdev-module.ts`), and WASI 0.2 Component Model binary emitter (`wasi-component.ts`). |
| [`stdlib/`](./stdlib/) | Domain standard library modules bound into the interpreter: 2D Canvas & Turtle graphics (`graphics.ts`), virtual OS kernel (`kernel.ts`), linear algebra & matrices (`matrix.ts`), Python parity builtins (`pyparity.ts`), declarative UI widgets (`ui.ts`), and full-stack HTML5/CSS3/JS Website Building Toolkit (`web.ts`). |
| [`tools/`](./tools/) | Developer tooling written against the core language layer: micro-benchmarking & latency profiler (`benchmark.ts`), code formatter (`formatter.ts`), multi-file `link` bundler (`linker.ts`), static diagnostic linter (`linter.ts`), literate markdown notebook engine (`notebook.ts`), and 26-language natural keyword translators (`translator.ts`, `translator-v2.ts`). |

### Files

| File | Purpose |
| :--- | :--- |
| `index.ts` | TypeScript module (`index.ts`). |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |

<!-- FOLDER_INVENTORY_END -->
