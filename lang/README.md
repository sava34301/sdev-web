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
├── runtime/               # Virtual Machine & OS Kernel
│   ├── vm.sdev            # Stack-based bytecode virtual machine & disassembler
│   └── kernel.sdev        # Virtual OS Kernel: VFS, process scheduler, pipes, syscalls
├── native/                # Native x86-64 code generation & linking
│   ├── codegen_x64.sdev   # x86-64 machine code instruction generator
│   ├── runtime_x64.sdev   # System V AMD64 runtime generator
│   ├── link.sdev          # Standalone ELF linker driver
│   └── README.md          # Native backend documentation
├── stdlib/                # Standard Library
│   ├── v2/                # Core v2 modular standard library
│   │   ├── text.sdev      # String manipulation, padding, reversal, v1 aliases
│   │   ├── list.sdev      # List manipulation, fold, filter, map, sorting
│   │   ├── tome.sdev      # Key-value map/dictionary operations
│   │   ├── math.sdev      # Math utilities, gcd/lcm, primes, stats, clamp
│   │   ├── bits.sdev      # Bitwise shifts, bitmask tests, popcount, hex
│   │   ├── time.sdev      # Time calculations, leap years, duration formatting
│   │   ├── func.sdev      # Functional combinators, take, drop, compose
│   │   ├── json.sdev      # JSON serialization and escape sequences
│   │   ├── types.sdev     # Dynamic type checking, conversions, coalesce
│   │   └── random.sdev    # Linear Congruential PRNG
│   ├── ml/                # Machine learning standard library
│   │   ├── tensor.sdev    # N-dimensional tensor operations
│   │   ├── autograd.sdev  # Reverse-mode automatic differentiation
│   │   ├── nn.sdev        # Neural network layers (dense, activation, loss)
│   │   ├── transformer.sdev # Attention and transformer architectures
│   │   ├── train.sdev     # Optimizers, training loops, checkpoints
│   │   ├── data.sdev      # Datasets, tokenization, batching
│   │   ├── cuda.sdev      # Hardware accelerator dispatch
│   │   ├── self_modify.sdev # Code introspection & self-modification
│   │   └── auto_evolve.sdev # Automated code evolution & benchmarking
│   ├── ffi.sdev           # Foreign Function Interface bindings
│   ├── testkit.sdev       # Unit test assertion framework
│   └── webgpu.sdev        # WebGPU shader & compute dispatch
├── paradigms/             # Multi-paradigm extensions
│   ├── functional.sdev    # Algebraic Data Types (`Option`, `Result`) and pattern matching
│   ├── systems.sdev       # Linear memory arenas, pointers, structs, peek/poke
│   ├── data.sdev          # DataFrames, columnar tables, CSV & Markdown serialization
│   └── hardware.sdev      # Microcontroller hardware transpiler (Arduino / C++)
├── translator/            # Natural language keyword translation
│   └── translator.sdev    # 26-language keyword translator & script detector
├── legacy/                # Compatibility frontends
│   └── v1_frontend.sdev   # Full SDEV v1-to-v2 syntax & expression transpiler (`v1_transpile_expr`, `v1_transpile_line`, `v1_to_v2_source`)
├── linter/                # Diagnostic linter
│   └── linter.sdev        # Levenshtein distance, spelling corrections, linting rules
├── agent/                 # SDEV Understander & dialect agents
│   ├── ai-dialect.sdev    # AI conversational dialect translator
│   ├── blocks.sdev        # Block delimiter analyzer & balancer
│   ├── parser_eval.sdev   # AST evaluation engine in SDEV
│   ├── project.sdev       # Multi-file project indexer & resolver
│   └── understander.sdev  # Natural English to canonical SDEV code understander
└── parity/                # Parity test tracking
    ├── agent.sdev         # Parity validation agent in pure SDEV
    ├── features.json      # 209 language features across v1, v2, and native tracks
    └── report.json        # Auto-generated verification report (0 missing required features)
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

### 5. Standard Library (`lang/stdlib/v2/`)
Modular, high-performance standard library components covering strings (`text.sdev`), lists (`list.sdev`), associative dictionaries (`tome.sdev`), advanced arithmetic & prime testing (`math.sdev`), bitwise manipulation (`bits.sdev`), calendar/clock calculations (`time.sdev`), functional combinators (`func.sdev`), JSON encoding (`json.sdev`), runtime type introspection (`types.sdev`), and pseudo-random number generation (`random.sdev`).

---

## Test Verification

The entire language toolchain is tested using the SDEV host environment:

| Test Suite | Command | Description |
| :--- | :--- | :--- |
| **Toolchain** | `npm run test:toolchain` | Lexer, parser, and codegen self-compilation |
| **Driver** | `npm run test:driver` | Standalone driver artifact verification |
| **Lexer** | `npm run test:self-lexer` | Self-hosted lexer tokenizer suite |
| **Parser** | `npm run test:self-parser` | Self-hosted AST parser suite |
| **Codegen** | `npm run test:self-codegen` | 52/52 bytecode emission test cases |
| **v1 Compiler** | `npm run test:self-v1` | Self-hosted v1 lexer, parser, codegen, `v1_self` fixed point, IR, and frontend |
| **Fixed-Point** | `npm run test:fixed-point` | Shim and bootstrap fixed-point parity |
| **WASM Runtime** | `node scripts/test-wasm-runtime.mjs` | Seed VM bytecode execution (73/73 passed) |
| **Native x86-64** | `wsl node scripts/test-native.mjs` | Bare-metal Linux ELF generation (81/81 passed) |
| **Self-Hosted Stdlib** | `node bin/sdevhost.mjs scripts/test-selfhosted-stdlib.sdev` | All 10 v2 stdlib modules |
| **Self-Hosted Subsystems** | `node bin/sdevhost.mjs scripts/test-selfhosted-subsystems.sdev` | VM, Kernel, Translator, Frontend, Paradigms, Linter |
| **Parity Gate** | `node scripts/run-ts.mjs scripts/test-parity.ts` | 209 features across 3 tracks (0 missing required) |
