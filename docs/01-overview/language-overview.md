# sdev — The Complete Documentation

Everything sdev is, in one document: the language, both runtimes, the
self-hosted compiler, the native assembly backend, the desktop IDE, the
machine-learning stack, the acceleration layers, and the autonomous
evolution loop.

Created by **Sava Milanov**. This document is the single source of truth
that ties together all of the focused guides:

| Focused guide | Covers |
| --- | --- |
| [v1 Language Reference](../02-language/v1-reference.md) | v1 classic/mystic syntax, OOP, stdlib |
| [v2 "Prism" Guide](../02-language/v2-prism-guide.md) | v2 plain-English syntax, diagnostics, modules |
| [AI Syntax Reference](../02-language/ai-syntax-reference.md) | Compact `!#ai` dialect for LLMs |
| [Personal SDEV](../02-language/personal-dialects-and-libraries.md) | Custom dialects, extensions, `#⟨sdev⟩` signatures, `@user/lib` |
| [v2 Stdlib & Web Toolkit](../03-standard-library/v2-stdlib-and-web-toolkit.md) | 21 pure-SDEV v2 stdlib modules & `lang/web/` |
| [ML & LLM Stdlib](../03-standard-library/ml-and-llm-stdlib.md) | Tensors, autograd, nn, transformers, data, M15 checkpoints |
| [FFI & Native Acceleration](../03-standard-library/ffi-and-native-accel.md) | Native library binding & BLAS dispatch |
| [WebGPU Acceleration](../03-standard-library/webgpu-acceleration.md) | Browser WGSL GPU compute |
| [CUDA Fast Path](../03-standard-library/cuda-fast-path.md) | cuBLAS fast path |
| [Autonomous Evolution](../03-standard-library/autonomous-evolution.md) | Gated self-modification loop |
| [Understanding Agent & Local AI](../04-ai-and-causal-engine/understanding-agent-and-local-brain.md) | SDEV understander, Micro-Brain, WebLLM & local servers |
| [OCE Library & Dev Guide](../04-ai-and-causal-engine/oce-library-reference.md) | Weightless 64 KB Ontological Causal Engine |
| [IDE & Debugging Tools](../05-ide-and-tooling/ide-and-debugging-tools.md) | Time-Travel Debugger, Scratchpad, Notebooks, Classroom |
| [Compiler & VM Internals](../06-compiler-and-internals/compiler-and-vm-internals.md) | Self-hosted v1/v2 compilers, Seed VM, kernel |
| [Zero-Host Native & Windows PE](../06-compiler-and-internals/zero-host-native-and-pe.md) | `bin/sdev-vm`, `bin/sdev-driver`, ELF & `.exe` |
| [Hardware & Boards](../07-domains/hardware-and-boards.md) | 30 MCUs, simulator, 10,232 Arduino libs, 7 uploaders |
| [Leaflet & GIS](../07-domains/leaflet-and-gis.md) | Mapping / GIS DSL |

---

## 1. What sdev is

sdev is a programming language with a deliberately unfamiliar surface
syntax. It does not borrow keywords from Python, JavaScript, Go, or C.
Declaration is `forge`, assignment is `be`, functions are `conjure`,
returning is `yield`, blocks open with `::` and close with `;;`.

```sdev
conjure fib(n) ::
    either n < 2 :: yield n ;;
    yield fib(n - 1) + fib(n - 2)
;;

forge i be 0
cycle i < 10 ::
    speak(fib(i))
    be i be i + 1
;;
```

There are four ways people write SDEV, all compiling to the same underlying runtimes:

- **v1 (Classic / Mystic)** — the full professional language (`forge`, `conjure`, `::`/`;;`,
  classes with `essence`/`extend`/`super`, dict "tomes", the whole standard library).
- **v2 "Prism"** — a beginner-first English surface (`set … to`, `say`,
  `if/else/end`, `for each … in … end`) compiled by the **100% pure-SDEV self-hosted
  compiler** (`lang/compiler/*.sdev`) onto the WebAssembly Seed VM, zero-host native VM (`bin/sdev-vm`),
  or native machine code (Linux x86-64 ELF & Windows PE `.exe`).
- **`sdev:ai` (`!#ai`)** — a compact brace-delimited dialect optimized for AI generation,
  translated to canonical SDEV by `lang/agent/ai-dialect.sdev`.
- **Personal Dialects** — custom user-defined keywords, operators, and scripts authored
  as data via Dialect Studio (`/dialects`).

Pick per file with a shebang, or globally with
`localStorage.sdev_runtime = "v2"`:

```
#!sdev v1
forge x be 10
speak(x)
```

```
#!sdev v2
set x to 10
say x
```

All TypeScript host bridges live in `src/lang-bridge/`, leaving `lang/` 100% pure `.sdev` source code.

---

## 2. Language reference (v1)

### 2.1 Values

| Kind | Literal | Notes |
| --- | --- | --- |
| Number | `42`, `3.14`, `1e-9` | IEEE-754 doubles |
| String | `"hello"` | Immutable, `+` concatenates and coerces |
| Boolean | `yep` / `nope` | |
| Nothing | `void` | Missing tome keys also read as `void` |
| List | `[1, 2, 3]` | Reference type |
| Tome (dict) | `{ a: 1, "b": 2 }` | `{ }` is *only* dict literals |
| Function | `conjure` / `(x) -> expr` | Closures capture lexically |
| Class instance | `new Name(args)` | |

### 2.2 Statements

```sdev
forge x be 10            // declare
be x be x + 1            // assign (stdlib dialect)
set x to 11              // assign (alternate form)
set tome["k"] to 5       // index assign
set obj.field to 5       // member assign
```

### 2.3 Control flow

```sdev
either cond ::
    speak("yes")
;; otherwise ::
    speak("no")
;;

ponder cond :: ... ;;            // classic if
cycle i < 10 :: ... ;;           // while
iterate i through 0, 10 :: ... ;;// counted for
each item in list :: ... ;;      // for-each
```

`either` doubles as the short-circuit OR operator inside an expression;
as a statement head it is a guard. `also` is AND, `isnt` is NOT,
`equals` / `differs` are deep equality.

### 2.4 Functions and classes

```sdev
conjure area(w, h) :: yield w * h ;;
forge double be (x) -> x * 2

class Point ::
    forge x be 0
    forge y be 0
    conjure move(self, dx, dy) ::
        set self.x to self.x + dx
        set self.y to self.y + dy
    ;;
;;

forge p be new Point(1, 2)
p.move(3, 4)
```

### 2.5 Operator precedence (low → high)

ternary `? :` → `either` → `also` → equality (`equals`, `differs`, `<>`)
→ comparison → additive → multiplicative → power `^` (right-assoc) →
unary (`-`, `isnt`) → call / index / member → primary.

### 2.6 Modules

```sdev
link "math.sdev"                 // inline
link "math.sdev" as math         // inline + prefix names with math_
link add, sub from "math.sdev"   // sugar for the inline form
summon "GIST_ID"                 // fetch a GitHub Gist package
```

The linker resolves names case-insensitively, supports nesting, and
reports cycles with a clear error.

### 2.7 Standard library highlights

- **I/O** — `speak`, `whisper`, `shout`, `input`
- **Types** — `essence`, `morph`, `str`
- **Math** — `root`, `ground`, `elevate`, `magnitude`, `ln`, `exp`,
  `cos`, `rand`, `PI`, `TAU`, `E`, `INFINITY`
- **Collections** — `measure`, `gather`, `pluck`, `sort`, `sift`, `each`,
  `fold`, `find`, `sum`, `reverse`, `unique`, `join`, `split`,
  `tome_keys`
- **Strings/bytes** — `ord(s, i)`, `chr(n)`, regex, base conversion
- **Host** — `read_file`, `write_file`, `http_get`
- **Graphics** — canvas + turtle (`canvas`, `rect`, `circle`, `hue`, …)
- **UI** — `app`, `button`, `slider`, `label`, …
- **Web** — one builtin per HTML5 tag, `style`, `on`, `page()`
- **Matrix** — transpose, multiply, determinant, inverse
- **FFI/GPU** — see sections 6–8

---

## 3. Architecture: execution tracks

sdev runs across independent execution tracks from a single pure-SDEV language core:

```text
          ┌──────────────── Track A: Browser & WASM ────────────────┐
source ─► understander ─► v1 lexer/parser/interpreter/bytecode VM
                      └─► v2 self-hosted compiler (.sdev) ─► seed VM (WASM)

          ┌──────────────── Track B: Zero-Host & Native ────────────┐
source ─► bin/sdev-vm (native C Seed VM + embedded driver, no Node/Wasm)
       └─► codegen_x64 (.sdev/.mjs) / pe.mjs ─► Linux ELF or Windows .exe
```

**Track A (Browser IDE & WASM):** Runs the v1 TypeScript interpreter/bytecode VM and the self-hosted v2 compiler on the hand-written WebAssembly Seed VM (`src/lang-bridge/seed/seed.wat` → `public/wasm/sdev-seed.wasm`).

**Track B (Zero-Host & Native):**
- `bin/sdev-vm` (`src/lang-bridge/native/sdev-vm.c` + `driver-embedded.h`) runs `.sdev` and `.sdevc` programs with zero Node.js or WebAssembly runtime.
- `bin/sdev-driver` + `lang/native/codegen_x64.sdev` / `build.sdev` / `src/lang-bridge/native/codegen-x64.mjs` / `runtime.s` emit static x86-64 Linux ELF binaries with zero libc.
- `src/lang-bridge/native/pe.mjs` + `lang/native/pe_x64.sdev` emit zero-cost 64-bit Windows PE/COFF (`.exe`) executables directly without MSVC/GCC/Clang.

```bash
node scripts/sdev-native.mjs program.sdev -o program
./program
# Or zero-host on Linux:
./bin/sdev-vm native program.sdev -o program
```

---

## 4. The seed VM and bootstrap compiler

The seed VM is a small stack machine written by hand in WebAssembly text
format. It grew milestone by milestone:

| Milestone | Capability added |
| --- | --- |
| M1–M2 | Arithmetic, globals, jumps |
| M3 | Call frames and recursion — `CALL`, `RET`, `ENTER`, `LOAD_LOC`, `STORE_LOC` |
| M4 | Heap, lists, strings — `ALLOC`, `NEWLIST`, `LGET`, `LSET`, `LEN`, `STRCAT` |
| M5a | Byte primitives — `ord`, `chr`, `str` |
| M5b | `LNEW` + `mklist` builtin |
| M6 | Boxed `f64` floats — 15 float opcodes plus host math imports |
| M7 | Host-mediated I/O — `READFILE`, `WRITEFILE`, `HTTPGET` |
| M5n | Widened VM and constant-pool regions for large sources |
| M5q–M5x | `FBYTE`, `TRY`/`ENDTRY`/`THROW`, `S2F`, `CALLV`, `CLOSURE`, `STREQ` (`0x90`) |

The bootstrap compiler `src/lang-bridge/oracle/compile.mjs` serves strictly as a build-time differential oracle. Both `lang/compiler/*.sdev` (v2) and `lang/compiler/v1_self.sdev` (v1) self-compile to byte-identical fixed points.

Host I/O is provided by the embedder: Node uses `fs` and `curl`; the
browser falls back to `localStorage` and `XMLHttpRequest`.

---

## 5. The self-hosted compiler

sdev compiles sdev. `lang/compiler/` contains the pipeline written
entirely in sdev:

- `lexer.sdev` — tokenizer
- `parser.sdev` — precedence-climbing parser producing the AST
- `codegen.sdev` — two-pass bytecode emitter with a shared string pool
- `compile-self.mjs` — Node shim that drives the sdev codegen through the
  seed VM

### 5.1 Fixed point

The milestone sequence 5c → 5n drove the compiler to a **byte-identical
fixed point**: compiling the compiler with itself produces the exact same
bytes as the JavaScript bootstrap.

```bash
npm test                                                # 22 pure-SDEV core suites via scripts/test-all.sdev
# Individual suites:
node bin/sdevhost.mjs scripts/test-self-toolchain.sdev  # byte-identity across the toolchain
node bin/sdevhost.mjs scripts/test-self-v1-compiler.sdev # 3-stage v1 self-hosted compiler fixed point
node bin/sdevhost.mjs scripts/test-shim-fixed-point.sdev # 88-case fixed-point suite
```

Reaching that point required forward references, return-type tracking,
modulo, expression-statements, and a shared string pool between passes.

---

## 6. Machine learning stack

Every module below is written in sdev and runs on sdev. Nothing is
implemented in TypeScript or Python.

### 6.1 `tensor.sdev` — the core

A tensor is a tome:
`{ data: [f64…], shape: [int…], grad: [f64…] | void, requires_grad: bool }`.

| Function | Purpose |
| --- | --- |
| `tensor(data, shape)` / `tensor_grad(data, shape)` | Construct |
| `zeros(shape)` / `ones(shape)` / `randn(shape)` | Fill (Box–Muller normals) |
| `t_add` `t_sub` `t_mul` `t_scale` | Element-wise |
| `matmul(a, b)` | 2-D matrix multiply |
| `relu` `sigmoid` `softmax` | Activations |
| `mse` `cross_entropy` | Losses |

```sdev
link "stdlib/ml/tensor.sdev"
forge a be tensor([1.0, 2.0, 3.0, 4.0, 5.0, 6.0], [2, 3])
forge b be tensor([1.0, 0.0, 0.0, 1.0, 1.0, 1.0], [3, 2])
speak(matmul(a, b).data)      // 4, 5, 10, 11
```

### 6.2 `autograd.sdev` — reverse-mode differentiation

A global tape records differentiable ops. `backward(y)` walks it in
reverse and accumulates into each tensor's `grad`.

```sdev
tape_reset()
forge x be tensor_grad([3.0], [1, 1])
forge y be d_mul(x, x)
backward(y)
speak(x.grad[0])              // 6
```

### 6.3 `nn.sdev` — layers and training

`linear(in, out)`, `relu_layer()`, `sequential(layers)`,
`seq_forward(layers, x)`, `train_step(model, x, y, lr)`,
`fit(model, xs, ys, epochs, lr)`.

```sdev
forge model be sequential([linear(4, 16), relu_layer(), linear(16, 1)])
fit(model, xs, ys, 100, 0.01)
```

### 6.4 `transformer.sdev` — decoder-only LMs

`embedding`, `layer_norm`, `attention_head`, `attn_forward`,
`transformer_block`, `gpt(vocab, dim, hidden, layers)`, `gpt_forward`,
`sample_next(logits)`, `generate(model, prompt_ids, max_new)`.

```sdev
forge m be gpt(256, 64, 128, 2)
forge out be generate(m, encode(vocab, "hello"), 64)
speak(decode(vocab, out))
```

### 6.5 `data.sdev` — datasets, the web, distillation

`load_text` / `save_text`, `char_vocab(text)`, `encode` / `decode`,
`crawl(url)` / `crawl_many(urls)`, `teacher_query(endpoint, key, prompt)`,
`distill_batch(endpoint, key, prompts)`, `save_model(path, model)`.

`teacher_query` lets a stronger model (for example through an OpenAI-compatible
gateway) generate the supervision signal for a local sdev model.

---

## 7. FFI and native acceleration

`lang/stdlib/ffi.sdev` binds C-ABI shared libraries.

```sdev
link "stdlib/ffi.sdev"
forge lib be library("/usr/lib/libopenblas.so")
forge gemm be bind(lib, "cblas_dgemm", "void", ["i32", "ptr", "ptr", "ptr"])
invoke(gemm, [ ... ])
```

Host primitives: `ffi_open`, `ffi_sym`, `ffi_call`, `ffi_close`,
`ffi_buf`, `ffi_read_f64` / `ffi_write_f64`, `ffi_read_i32` /
`ffi_write_i32`. Typed buffers (`buf_f64`) shuttle large arrays without
per-element heap boxing.

Buffers work everywhere, including the browser. Library loading requires
a native host; without one `ffi_open` returns `void`, so guarded sdev code
falls back to the pure-sdev path instead of crashing.

Convenience wrappers: `blas_matmul(...)` and `open_cuda(...)`.

---

## 8. GPU acceleration

### 8.1 WebGPU (browser)

`lang/stdlib/webgpu.sdev` wraps the host `__wgpu_*` calls: adapter
probing, device init, buffer upload/download, a WGSL shader cache, and
tuned `matmul`, `add`, and `relu` kernels. A heartbeat detects device
loss and falls back to CPU.

### 8.2 CUDA (native)

`lang/stdlib/ml/cuda.sdev` rides the FFI layer onto cudart + cuBLAS:
`cuda_device(...)`, `cuda_device_default()`, `cuda_alloc`, `cuda_upload`,
`cuda_download`, `cuda_matmul` (via `cublasDgemm`), `cuda_report`.

`best_matmul(dev, blas, a, b)` picks the fastest available path:

```text
CUDA  →  BLAS  →  pure-sdev CPU
```

When no driver is present, `cuda_device_default().ok` is `nope` and the
chain degrades silently.

---

## 9. Self-modification and autonomous evolution

### 9.1 `self_modify.sdev`

Gated APIs for a model to read and rewrite sdev's own source:
`self_read(path)`, `self_propose(path, body)`, `set_review_hook(fn)`,
plus feature-demand mining and weight surgery.

**Writes are refused until a review hook is installed.** That is the one
gate protecting the entire pipeline.

### 9.2 `auto_evolve.sdev`

The loop: mine demand → draft a patch → review → apply → fine-tune.

| Function | Purpose |
| --- | --- |
| `is_allowed(path)` | Whitelist check against `SDEV_SOURCE_FILES` |
| `make_proposal(path, old, new_body, reason)` | Patch record |
| `apply_proposal(p)` | Route through the review hook and write |
| `draft_from_demand(model, demand, path)` | Model rewrites a file toward the top topic |
| `evolve_weights(model, url, key, prompts, epochs, lr)` | Distill and SGD-step |
| `evolve_tick(...)` / `evolve_forever(...)` | One tick / long-running driver |

Routing: `parse*` → `lang/compiler/parser.sdev`, `lex*` → `lang/compiler/lexer.sdev`, `doc*` →
`docs/02-language/v1-reference.md`, everything else → `lang/stdlib/ml/nn.sdev`.

```sdev
link "stdlib/ml/auto_evolve.sdev"
set_review_hook(conjure(path, body) :: yield confirm("Apply " + path + "?") ;;)
evolve_forever(model, sources, "https://api.openai.com/v1/chat", "$KEY", 24)
```

Two independent barriers: the path whitelist runs *before* the hook, and
the hook must explicitly return `yep`.

---

## 10. Ecosystem, Subsystems & Tooling

| Surface | Where |
| --- | --- |
| Browser IDE | `src/pages/IDE.tsx` — editor, Time-Travel Debugger, Live Scratchpad, Notebooks, Benchmarking, Live Classroom, Hardware Simulator, Runtime Explorer (`F1`), Run without Understanding (`Ctrl+Shift+Enter`) |
| Playground | `src/pages/Index.tsx` — scroll-driven 3D compiler scene, shareable `?code=` links |
| Personal SDEV | `/dialects`, `/extensions`, `/libraries`, `/explore`, `/my` — `#⟨sdev⟩` signatures & `@user/lib` registry |
| Self-Hosted Stdlib & Web | `lang/stdlib/v2/*` (21 modules), `lang/web/*` (HTML5/CSS3/client-JS rendering `sdev-website.sdev`), `lang/stdlib/v2/oce.sdev` (OCE Causal Engine) |
| Understanding Agent | `lang/agent/*` — SDEV-first understanding rules, `sdev:ai` (`!#ai`), Micro-Brain, WebLLM, Ollama/LM Studio, `sdev-agent` |
| API Registry & Linter | `src/lang/registry/api-registry.ts` (881 APIs), `src/lang/linter.ts` (`SDEV001`–`SDEV015`), `lang/formatter/formatter.sdev` |
| Zero-Host & Native | `bin/sdev-vm` (native C Seed VM), `bin/sdev-driver` (self-compiled ELF), `pe.mjs` / `pe_x64.sdev` (Windows `.exe`), WASI 0.2 `.wit`/`.wasm` |
| Desktop, VS Code, CLI & MCP | `electron/`, `extension/` (`sdev-language.vsix`), `cli/` (`bin/sdev.mjs`), `supabase/functions/mcp/` |
| Single-file JS/Python | `public/sdev-interpreter.js`, `public/sdev-interpreter.py` |
| 26-language keyword translator | `lang/translator/translator.sdev`, `src/lang/translator.ts` |

---

## 11. Test suites

```bash
npm test                                 # 22 pure-SDEV suites (scripts/test-all.sdev)
npm run test:oce-parity                  # OCE parity across v2 VM, native, classic, Python (8/8)
npm run test:v2-diagnostics              # v2 pre-flight diagnostics & list + checks
npm run test:registry                    # 881 APIs, SDEV001..SDEV015, Studio & Chrono (93 checks)
npm run test:tdd-features                # Live Scratchpad, Benchmarking, Literate Notebooks
npm run test:understander-docs           # Regression gate over all documented examples
npm run test:ml                          # ML stack & M15 checkpoints executed end to end
npm run test:native                      # x86-64 Linux ELF backend (81/81 via WSL)
```

---

## 12. Milestone history

| # | Milestone |
| --- | --- |
| 1–4 | v2 "Prism" design, Stage-0 seed WASM, call frames & recursion, heap/lists/strings |
| 5a–5n | Byte primitives; self-hosted lexer, parser, codegen; byte-identical fixed point |
| 5q–5x | `FBYTE`, `TRY`/`ENDTRY`/`THROW`, `S2F`, `CALLV`, `CLOSURE`, `STREQ` (`0x90`) |
| 6–7 | Boxed f64 floating point; host file I/O and networking |
| 8–15 | Full ML/LLM stdlib: tensor, autograd, nn, transformer, FFI, WebGPU, CUDA, auto-evolve, M14 LM training, M15 batched ops & `SDEVML01` checkpoints |
| Parity & Multi-Paradigm | 209-feature parity agent (`lang/parity/agent.sdev`), Python parity, SQL/Kotlin/Rust/C++ paradigms |
| Self-Hosted Core & Web | 100% pure-SDEV `lang/` core, `lang/web/*` toolkit & `sdev-website.sdev`, 21 v2 stdlib modules, `v1_self.sdev` 3-stage fixed point |
| OCE & Diagnostics | 64 KB Ontological Causal Engine (`oce.sdev`) across all runtimes, website `use` loading, v2 pre-flight error channel |
| Zero-Host & IDE Tools | `bin/sdev-vm`, self-compiled `bin/sdev-driver`, Windows PE `.exe`, WASI 0.2, Time-Travel Debugger, Scratchpad, Notebooks, Live Classroom, Hardware Simulator, Run without Understanding |

---

## 13. Design principles

1. **Radically unique syntax.** `forge`, `be`, `conjure`, `::`/`;;`.
   Never converge on Python or JavaScript spelling.
2. **Two runtimes, strict parity.** Browser WASM and native assembly must
   behave identically.
3. **Self-hosting is the proof.** Byte-identical fixed point or it does
   not count.
4. **Written in sdev.** The ML stack, the compiler, and the evolution loop
   are sdev programs — not host-language libraries with an sdev veneer.
5. **Degrade, never crash.** Absent GPU, driver, network, or file system,
   every layer falls back to a pure-sdev path.
6. **Self-modification is gated by default.** Whitelist first, human
   review hook second.
