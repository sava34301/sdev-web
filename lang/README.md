# `lang/` — SDEV Self-Hosted Language Core

This directory contains the core source code for the **SDEV programming language**.

> **Self-Hosting Status: 100% Pure SDEV**
>
> The SDEV language is completely self-hosted. There are **zero foreign programming language source files** (`.js`, `.mjs`, `.ts`, `.py`, `.wat`, `.s`) in `lang/`. Every compiler stage, virtual machine, operating system kernel, standard library module, paradigm expansion, linter, and translator is authored exclusively in pure `.sdev` files.
> Host bridges and test harnesses reside outside this directory in `src/lang-bridge/` and `scripts/`.

---

## Directory Overview

```
lang/
├── compiler/              # Self-hosted compiler toolchain
│   ├── lexer.sdev         # Tokenizer: splits SDEV v2 source code into tokens
│   ├── parser.sdev        # Recursive-descent AST parser (SDEV v2)
│   ├── codegen.sdev       # Bytecode generator: AST -> bytecode & string pool (SDEV v2)
│   ├── driver.sdev        # Compiler driver: compiles SDEV v2 source to runnable bytecode
│   ├── v1_lexer.sdev      # SDEV v1 tokenizer (digits/hex/bin/oct, f-strings, ::/;;, words)
│   ├── v1_parser.sdev     # SDEV v1 recursive-descent RPN parser
│   ├── v1_codegen.sdev    # SDEV v1 -> Seed VM bytecode & string pool compiler
│   ├── v1_driver.sdev     # SDEV v1 standalone compiler driver
│   ├── v1_self.sdev       # Self-compiling SDEV v1 compiler authored 100% in SDEV v1 (Stage 2 == Stage 3)
│   └── v1_ir.sdev         # SDEV v1 high-level stack IR compiler, disassembler & VM
├── bootstrap/             # Stage-0 bootstrap & VM bytecode emitter
│   ├── seed_vm.sdev       # WebAssembly bytecode emitter & LEB128 encoding
│   └── bootstrap.sdev     # Stage-0 bootstrap bytecode compiler
│   ├── native/                # Native x86-64 code generation & linking
│   │   ├── build.sdev         # Standalone native build driver (`sdev-vm native`)
│   │   ├── codegen_x64.sdev   # x86-64 machine code instruction generator
│   │   ├── runtime_x64.sdev   # System V AMD64 runtime generator
│   │   ├── link.sdev          # Standalone ELF linker driver
│   │   ├── pe_x64.sdev        # Windows PE/COFF (`.exe`) emitter
│   │   └── README.md          # Native backend documentation
│   ├── runtime/               # Virtual Machine, OS Kernel, Notebooks & WASI
│   │   ├── vm.sdev            # Stack-based bytecode virtual machine & disassembler
│   │   ├── kernel.sdev        # Virtual OS Kernel: VFS, process scheduler, pipes, syscalls
│   │   ├── notebook.sdev      # Self-hosted notebook execution helpers
│   │   └── wasi.sdev          # WASI 0.2 runtime & component helpers
│   ├── stdlib/                # Standard Library
│   │   ├── v2/                # Core v2 pure-SDEV standard library (21 modules)
│   │   │   ├── bits.sdev      # Bitwise shifts, bitmask tests, popcount, hex
│   │   │   ├── buffer.sdev    # Byte buffer operations
│   │   │   ├── func.sdev      # Functional combinators, take, drop, compose
│   │   │   ├── graphics.sdev  # Canvas 2D drawing primitives
│   │   │   ├── json.sdev      # JSON serialization and escape sequences
│   │   │   ├── list.sdev      # List manipulation, fold, filter, map, sorting
│   │   │   ├── math.sdev      # Math utilities, gcd/lcm, primes, stats, clamp
│   │   │   ├── matrix.sdev    # Matrix and linear algebra helpers
│   │   │   ├── mem.sdev       # Byte-addressed linear arena memory (used by OCE)
│   │   │   ├── oce.sdev       # Ontological Causal Engine core
│   │   │   ├── pyparity.sdev  # Python parity helpers
│   │   │   ├── random.sdev    # Linear Congruential PRNG
│   │   │   ├── regex.sdev     # Pure-SDEV pattern matching helpers
│   │   │   ├── sql.sdev       # SQL query helpers
│   │   │   ├── text.sdev      # String manipulation, padding, reversal, v1 aliases
│   │   │   ├── time.sdev      # Time calculations, leap years, duration formatting
│   │   │   ├── tome.sdev      # Key-value map/dictionary operations
│   │   │   ├── turtle.sdev    # Turtle graphics primitives
│   │   │   ├── types.sdev     # Dynamic type checking, conversions, coalesce
│   │   │   ├── ui.sdev        # App widget DSL helpers
│   │   │   └── web.sdev       # Web DOM/HTML DSL helpers
│   │   ├── ml/                # Machine learning standard library
│   │   │   ├── tensor.sdev    # N-dimensional tensor operations
│   │   │   ├── autograd.sdev  # Reverse-mode automatic differentiation
│   │   │   ├── nn.sdev        # Neural network layers (dense, activation, loss)
│   │   │   ├── transformer.sdev # Attention and transformer architectures
│   │   │   ├── train.sdev     # Optimizers, training loops, checkpoints
│   │   │   ├── data.sdev      # Datasets, tokenization, batching
│   │   │   ├── cuda.sdev      # Hardware accelerator dispatch
│   │   │   ├── self_modify.sdev # Code introspection & self-modification
│   │   │   └── auto_evolve.sdev # Automated code evolution & benchmarking
│   │   ├── ffi.sdev           # Foreign Function Interface bindings
│   │   ├── testkit.sdev       # Unit test assertion framework
│   │   └── webgpu.sdev        # WebGPU shader & compute dispatch
│   ├── web/                   # Self-hosted website & UI toolkit
│   │   ├── html.sdev          # HTML element builders & SSR renderer
│   │   ├── css.sdev           # Utility & component stylesheet builders
│   │   ├── themes.sdev        # Design tokens & theme presets
│   │   ├── icons.sdev         # SVG icon helpers
│   │   ├── components.sdev    # Composite web components
│   │   ├── transpiler.sdev    # Site bundle / TSX-to-SDEV helpers
│   │   └── sdev-website.sdev  # Self-hosted sdev documentation/website builder
│   ├── dialect/               # Personal SDEV dialect definitions & rules
│   │   └── dialect.sdev       # `!#dialect` / `!#ext` / `!#sig` canonicalizer helpers
│   ├── formatter/             # Source code formatter
│   │   └── formatter.sdev     # Pure-SDEV canonical formatting rules
│   ├── registry/              # Canonical API registry mirror
│   │   └── registry.sdev      # Pure-SDEV API registry index & lookup helpers
│   ├── paradigms/             # Multi-paradigm extensions
│   │   ├── functional.sdev    # Algebraic Data Types (`Option`, `Result`) and pattern matching
│   │   ├── systems.sdev       # Linear memory arenas, pointers, structs, peek/poke
│   │   ├── data.sdev          # DataFrames, columnar tables, CSV & Markdown serialization
│   │   └── hardware.sdev      # Microcontroller hardware transpiler (Arduino / C++)
│   ├── translator/            # Natural language keyword translation
│   │   └── translator.sdev    # 26-language keyword translator & script detector
│   ├── legacy/                # Compatibility frontends
│   │   └── v1_frontend.sdev   # Full SDEV v1-to-v2 syntax & expression transpiler (`v1_transpile_expr`, `v1_transpile_line`, `v1_to_v2_source`)
│   ├── linter/                # Diagnostic linter
│   │   └── linter.sdev        # Levenshtein distance, spelling corrections, linting rules
│   ├── agent/                 # SDEV Understander, local reasoning & dialect agents
│   │   ├── ai-dialect.sdev    # `!#ai` conversational dialect translator
│   │   ├── blocks.sdev        # Block delimiter analyzer & balancer (`board`, `js`, blocks)
│   │   ├── brain.sdev         # Agent reasoning helpers
│   │   ├── math.sdev          # Agent math evaluation helpers
│   │   ├── memory.sdev        # Agent conversation/context memory helpers
│   │   ├── parser_eval.sdev   # AST evaluation engine in SDEV
│   │   ├── project.sdev       # Multi-file project indexer & resolver
│   │   ├── tasks.sdev         # Agent task planning helpers
│   │   └── understander.sdev  # Rule-first canonical SDEV code understander
│   └── parity/                # Parity test tracking
│       ├── agent.sdev         # Parity validation agent in pure SDEV
│       ├── features.json      # 209 language features across v1, v2, and native tracks
│       └── report.json        # Auto-generated verification report (0 missing required features)
```

---

## Toolchain & Compilation Architecture

### 1. Stage-0 Bootstrap & Seed VM (`lang/bootstrap/`)
The foundation begins with a minimal 8KB WebAssembly execution seed (`src/lang-bridge/seed/seed.wat`). The seed VM implements a compact bytecode instruction set. `lang/bootstrap/seed_vm.sdev` provides the complete specification of bytecode opcodes, LEB128 variable-length integer encoding, and binary WebAssembly generation in pure SDEV. `lang/bootstrap/bootstrap.sdev` compiles stage-0 AST nodes into runnable bytecode.

### 2. Self-Hosted Compiler (`lang/compiler/`)
The self-hosted compiler is structured into three clean stages:
- **`lexer.sdev`**: Scans SDEV source text into a stream of typed tokens (`INT`, `STR`, `IDENT`, `OP`, `KW`).
- **`parser.sdev`**: Recursive-descent parser that constructs the structured Abstract Syntax Tree (AST).
- **`codegen.sdev`**: Walks the AST to generate compact bytecode instructions and an interned string pool table.
- **`driver.sdev`**: Standalone compiler driver that compiles SDEV source files directly into self-contained bytecode bundles.

Fixed-point self-compilation is verified by compiling the compiler with itself:
$$\text{Compiler}_{\text{self}}(\text{Compiler}_{\text{src}}) \equiv \text{Compiler}_{\text{oracle}}(\text{Compiler}_{\text{src}})$$
Producing byte-identical bytecode across all stages (`bc=19214, pool=737`).

### 3. Native x86-64 Backend (`lang/native/`)
The native compiler produces bare-metal x86-64 machine code:
- **`codegen_x64.sdev`**: Emits System V AMD64 instructions (`mov`, `push`, `pop`, `add`, `sub`, `imul`, `idiv`, `cmp`, `jmp`, `call`, `syscall`).
- **`runtime_x64.sdev`**: Generates the minimal standalone runtime containing `_start`, memory allocators, string formatting, and Linux syscall wrappers (`write`, `exit`, `clock_gettime`).
- **`link.sdev`**: Drives standard native linkers (`ld`, `ld.lld`, `gcc`) to generate static or dynamic ELF executables.

### 4. Virtual Machine & Operating System Kernel (`lang/runtime/`)
- **`vm.sdev`**: Stack-based bytecode virtual machine capable of stepping, disassembling, and executing SDEV bytecode with full call-frame management and arithmetic/control-flow opcode dispatch.
- **`kernel.sdev`**: Virtual operating system kernel with an in-memory Virtual File System (VFS), process table, round-robin scheduler, inter-process pipes, environment variables, and POSIX-like system calls (`sys_read`, `sys_write`, `sys_spawn`, `sys_open`).
- **`notebook.sdev`** & **`wasi.sdev`**: Self-hosted notebook execution and WASI 0.2 component model support.

### 5. Standard Library & Website Toolkit (`lang/stdlib/v2/`, `lang/web/`)
Modular pure-SDEV v2 standard library covering strings (`text.sdev`), lists (`list.sdev`), associative dictionaries (`tome.sdev`), math (`math.sdev`), bitwise logic (`bits.sdev`), arena memory (`mem.sdev`), the Ontological Causal Engine (`oce.sdev`), calendar/clock calculations (`time.sdev`), functional combinators (`func.sdev`), JSON (`json.sdev`), runtime types (`types.sdev`), PRNG (`random.sdev`), regex, SQL, matrices, graphics, turtle, UI, Web, and Python parity helpers. `lang/web/` adds a self-hosted HTML/CSS/theming/SVG website builder (`sdev-website.sdev`).

See the full structured documentation index in [`docs/README.md`](../docs/README.md), including [Compiler & VM Internals](../docs/06-compiler-and-internals/compiler-and-vm-internals.md) and [Self-Hosted v2 Stdlib & Website Toolkit](../docs/03-standard-library/v2-stdlib-and-web-toolkit.md).

---

## Test Verification

The entire language toolchain is tested using the SDEV host environment (`node bin/sdevhost.mjs scripts/test-all.sdev` runs all 22 suites):

| Test Suite | Command | Description |
| :--- | :--- | :--- |
| **Unified Harness** | `node bin/sdevhost.mjs scripts/test-all.sdev` | Runs all 22 self-hosted compiler, stdlib, agent & subsystem suites |
| **Toolchain** | `npm run test:toolchain` | Lexer, parser, and codegen self-compilation |
| **Driver** | `npm run test:driver` | Standalone driver artifact verification |
| **v1 Compiler** | `npm run test:self-v1` | Self-hosted v1 lexer, parser, codegen, `v1_self` Stage 2 == Stage 3 fixed point, IR, and frontend |
| **Fixed-Point** | `npm run test:fixed-point` | Shim and bootstrap fixed-point parity |
| **WASM Runtime** | `node scripts/test-wasm-runtime.mjs` | Seed VM bytecode execution suite |
| **Native x86-64** | `node scripts/test-native.mjs` | Bare-metal Linux ELF / Windows PE generation & execution |
| **Self-Hosted Stdlib** | `node bin/sdevhost.mjs scripts/test-selfhosted-stdlib.sdev` | Core v2 stdlib modules |
| **Self-Hosted Subsystems** | `node bin/sdevhost.mjs scripts/test-selfhosted-subsystems.sdev` | VM, Kernel, Translator, Frontend, Paradigms, Linter |
| **OCE Parity** | `npm run test:oce-parity` | Dual-runtime parity across Seed VM, JS builtins & Python interpreter |
| **Parity Gate** | `npm run test:parity` | 209 features across 3 tracks (`lang/parity/features.json`) |

---

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Subfolders

| Subfolder | Purpose |
| :--- | :--- |
| [`agent/`](./agent/) | Pure-SDEV rule-first Code Understander (`understander.sdev`), `!#ai` dialect translator (`ai-dialect.sdev`), block closer (`blocks.sdev`), self-hosted parser/evaluator (`parser_eval.sdev`), natural-language math/task solvers, memory, and AI brain helpers. |
| [`bootstrap/`](./bootstrap/) | Stage-0 bootstrap bytecode compiler (`bootstrap.sdev`) and WebAssembly Seed VM opcode/LEB128 specification (`seed_vm.sdev`). |
| [`bridge/`](./bridge/) | Pure-SDEV WebAssembly `.wasm`/`.wat` binary seed emitter (`wasm_seed_emitter.sdev`) and self-compiler host bridge (`self_bridge.sdev`). |
| [`builtins/`](./builtins/) | Pure-SDEV implementations of higher-order list & functional builtins (`functional_list.sdev`), JSON/tome helpers (`json_dict.sdev`), and time/I/O/host primitives (`time_io_host.sdev`). |
| [`compiler/`](./compiler/) | Self-hosted SDEV v2 compiler (`lexer.sdev`, `parser.sdev`, `codegen.sdev`, `driver.sdev`) and self-hosted SDEV v1 compiler toolchain (`v1_lexer.sdev`, `v1_parser.sdev`, `v1_codegen.sdev`, `v1_driver.sdev`, `v1_ir.sdev`, and the 100% pure-v1 fixed-point compiler `v1_self.sdev`). |
| [`core/`](./core/) | Pure-SDEV core language primitives: v1/v2 keywords & AST structures (`keywords_ast.sdev`), live scratchpad evaluator (`interpreter_live.sdev`), module linker & micro-benchmarker (`linker_bench.sdev`), and CRDT collaborative room engine (`collab_room.sdev`). |
| [`dialect/`](./dialect/) | Pure-SDEV Personal Dialect engine (`dialect.sdev`), 46-word catalog (`spec_catalog.sdev`), built-in presets (`presets.sdev`), `#⟨sdev⟩` file signatures (`signature.sdev`), living docs generator (`docs.sdev`), and library/extension registry (`extensions_registry.sdev`). |
| [`formatter/`](./formatter/) | Pure-SDEV canonical code formatter (`formatter.sdev`) normalizing block indentation, comments, strings, and whitespace. |
| [`hardware/`](./hardware/) | Pure-SDEV microcontroller support: 30-board database (`board_db.sdev`), Arduino API catalogue (`arduino_api.sdev`), `board` block stripper (`strip.sdev`), natural-language hardware reader (`understand.sdev`), `.ino` C++ transpiler (`transpile.sdev`), virtual breadboard simulator (`simulator.sdev`), and STK500/UF2/Intel HEX protocol engine (`serial_cloud.sdev`). |
| [`ide/`](./ide/) | Pure-SDEV IDE intelligence helpers (`intelligence.sdev`) and 3D scene/router logic (`scene_router.sdev`). |
| [`legacy/`](./legacy/) | Pure-SDEV v1-to-v2 source transpiler (`v1_frontend.sdev`) converting classic `forge`/`conjure`/`::`/`;;` syntax into canonical SDEV v2. |
| [`linter/`](./linter/) | Pure-SDEV static diagnostic linter (`linter.sdev`) with Levenshtein distance suggestions and diagnostic rules. |
| [`mcp/`](./mcp/) | Pure-SDEV Model Context Protocol (MCP) JSON-RPC 2.0 server and tool definitions (`mcp_server.sdev`). |
| [`native/`](./native/) | Pure-SDEV native x86-64 backend: System V AMD64 GAS assembly codegen (`codegen_x64.sdev`), assembly runtime generator (`runtime_x64.sdev`), ELF linker driver (`link.sdev`), standalone build driver (`build.sdev`), and Windows PE32+ `.exe` emitter (`pe_x64.sdev`). |
| [`paradigms/`](./paradigms/) | Pure-SDEV multi-paradigm modules: functional ADTs (`Option`/`Result` in `functional.sdev`), Feature-Oriented Programming & SPL feature models (`feature.sdev`), low-level memory arenas (`systems.sdev`), relational tables & CSV/Markdown export (`data.sdev`), and embedded Arduino C++ transpilation (`hardware.sdev`). |
| [`parity/`](./parity/) | Cross-track feature parity registry (`features.json`), pure-SDEV parity audit agent (`agent.sdev`), and machine-verified report (`report.json`) tracking 209 features across v1, v2 WASM, and native x86-64. |
| [`registry/`](./registry/) | Pure-SDEV mirror of the Canonical API Registry and `SDEV001`–`SDEV015` diagnostic catalogue (`registry.sdev`). |
| [`runtime/`](./runtime/) | Pure-SDEV stack bytecode virtual machine (`vm.sdev`), virtual OS kernel with VFS/processes/syscalls (`kernel.sdev`), literate notebook engine (`notebook.sdev`), and WASI 0.2 component generator (`wasi.sdev`). |
| [`server/`](./server/) | Pure-SDEV cloud edge function handlers and OpenAI-compatible AI provider router (`edge_functions.sdev`). |
| [`stdlib/`](./stdlib/) | Top-level SDEV standard library directory containing `v2/` core modules, `ml/` machine learning modules, C ABI Foreign Function Interface (`ffi.sdev`), WebGPU compute (`webgpu.sdev`), and the self-hosted test assertion kit (`testkit.sdev`). |
| [`studio/`](./studio/) | Pure-SDEV Time-Travel Chrono step debugger and Live Lens variable/loop state tracer (`time_travel.sdev`). |
| [`tools/`](./tools/) | Pure-SDEV release manifest & documentation generator (`release_docs.sdev`) and 1:1 repository mirror engine (`mirror_1to1.sdev`). |
| [`translator/`](./translator/) | Pure-SDEV 26-language natural keyword translator and Unicode script detector (`translator.sdev`). |
| [`web/`](./web/) | Pure-SDEV Website Building Toolkit (`html.sdev`, `css.sdev`, `themes.sdev`, `icons.sdev`, `components.sdev`, `transpiler.sdev`) and the self-hosted sdev website (`sdev-website.sdev`). |

### Files

| File | Purpose |
| :--- | :--- |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |

<!-- FOLDER_INVENTORY_END -->
