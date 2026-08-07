# sdev — The Complete Documentation

Everything sdev is, in one document: the language, both runtimes, the
self-hosted compiler, the native assembly backend, the desktop IDE, the
machine-learning stack, the acceleration layers, and the autonomous
evolution loop.

Created by **Sava Milanov**. This document is the single source of truth
that ties together all of the focused guides:

| Focused guide | Covers |
| --- | --- |
| `SDEV_DOCUMENTATION.md` | v1 language reference |
| `SDEV_V2_DOCUMENTATION.md` | v2 "Prism" beginner surface |
| `SDEV_INTERNALS.md` | Compiler, VM, bootstrap, native backend |
| `SDEV_ML_DOCUMENTATION.md` | Tensors, autograd, nn, transformers, data |
| `SDEV_FFI_DOCUMENTATION.md` | Native library binding |
| `SDEV_WEBGPU_DOCUMENTATION.md` | Browser GPU compute |
| `SDEV_CUDA_DOCUMENTATION.md` | cuBLAS fast path |
| `SDEV_AUTOEVOLVE_DOCUMENTATION.md` | Self-modification loop |
| `SDEV_LEAFLET_DOCUMENTATION.md` | Mapping / GIS DSL |
| `SDEV_HARDWARE_DOCUMENTATION.md` | Boards and firmware |

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

There are two surface dialects:

- **v1** — the full professional language (`forge`, `conjure`, `::`/`;;`,
  classes, dict "tomes", the whole standard library). Everything in the
  ML stack is written in v1.
- **v2 "Prism"** — a beginner-first surface (`set … to`, `say`,
  `if/else/end`, `for each … in … end`) implemented in
  `lang/runtime/v2.js` as dependency-free plain JavaScript.

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

`src/lang-bridge/bridge.ts` is the only TypeScript left in the v2
execution path; it chooses the runtime and delegates.

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

## 3. Architecture: two tracks

sdev deliberately runs on two independent execution tracks.

```text
          ┌──────────────── Track A: browser ────────────────┐
source ─► lexer ─► parser ─► interpreter ──────► IDE panels
                         └─► compiler ─► bytecode ─► seed VM (WASM)

          ┌──────────────── Track B: native ─────────────────┐
source ─► lexer ─► parser ─► codegen-x64 ─► .s ─► as/ld ─► binary
```

**Track A (browser IDE)** runs entirely on WebAssembly. The hand-written
seed VM lives in `lang/bootstrap/seed.wat`, and `lang/bootstrap/compile.mjs`
is the bootstrap compiler that feeds it.

**Track B (native)** emits real x86-64 GAS/AT&T assembly — not WASM —
for Linux and macOS:

- `lang/native/codegen-x64.mjs` — instruction selection and emission
- `lang/native/runtime.s` — the assembly runtime (entry, syscalls, heap)
- `lang/native/link.mjs` — assembles and links with the system toolchain
- `scripts/sdev-native.mjs` — the CLI driver
- `scripts/test-native.mjs` — the regression suite

```bash
node scripts/sdev-native.mjs build program.sdev -o program
./program
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

The bootstrap compiler `lang/bootstrap/compile.mjs` is a two-pass emitter
(pass 1 resolves labels and symbol tables, pass 2 emits bytes) producing a
`{ bytecode, stringPool }` pair.

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
node scripts/test-self-toolchain.mjs
# ✓ lang/compiler/lexer.sdev:   byte-identical  (bc=746,  pool=41)
# ✓ lang/compiler/parser.sdev:  byte-identical  (bc=380,  pool=38)
# ✓ lang/compiler/codegen.sdev: byte-identical  (bc=5730, pool=136)

node scripts/test-shim-fixed-point.mjs
# ✓ shim fixed-point: 43/43 cases byte-identical
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

`teacher_query` lets a stronger model (for example through the Lovable AI
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

Routing: `parse*` → `parser.sdev`, `lex*` → `lexer.sdev`, `doc*` →
`SDEV_DOCUMENTATION.md`, everything else → `nn.sdev`.

```sdev
link "stdlib/ml/auto_evolve.sdev"
set_review_hook(conjure(path, body) :: yield confirm("Apply " + path + "?") ;;)
evolve_forever(model, sources, "https://ai.gateway.lovable.dev/v1/chat", "$KEY", 24)
```

Two independent barriers: the path whitelist runs *before* the hook, and
the hook must explicitly return `yep`.

---

## 10. Tooling and distribution

| Surface | Where |
| --- | --- |
| Browser IDE | `src/pages/IDE.tsx` — editor, terminal, canvas, app and web preview, problems panel, command palette |
| Playground | `src/pages/Index.tsx` — shareable `?code=` links |
| Desktop IDE | `electron/main.cjs` + `preload.cjs`, with Build Native / Run Native IPC |
| VS Code extension | `extension/` — grammar, snippets, bundled interpreter |
| npm CLI | published via `.github/workflows/npm-publish.yml` |
| Windows installer | standalone batch installer with bundled editor |
| Single-file HTML | `public/sdev-interpreter.js` |
| Gist packages | `summon "GIST_ID"` |
| 26-language keyword translator | `src/lang/translator.ts`, 500+ mappings |

---

## 11. Test suites

```bash
node scripts/test-wasm-runtime.mjs      # seed VM opcodes
node scripts/test-native.mjs            # x86-64 backend
node scripts/test-self-lexer.mjs        # self-hosted lexer vs JS reference
node scripts/test-self-parser.mjs       # self-hosted parser
node scripts/test-self-codegen.mjs      # self-hosted codegen
node scripts/test-self-toolchain.mjs    # byte-identity across the toolchain
node scripts/test-shim-fixed-point.mjs  # 43-case fixed-point suite
bunx tsx scripts/test-ml-stdlib.ts      # ML stack executed end to end
bunx tsx scripts/test-translator.ts     # 26-language translation
```

`test-ml-stdlib.ts` runs real programs — matmul, the gradient of x²,
a linear layer whose loss must decrease, tokenizer round-trip, softmax
summing to 1, a GPT forward pass with the right logits shape, generation
length, the self-modification gate, the evolution whitelist, and graceful
accelerator fallback.

---

## 12. Milestone history

| # | Milestone |
| --- | --- |
| 1 | v2 "Prism" runtime in pure JS; lang-bridge |
| 2 | Bootstrap scaffolding: seed WASM, compiler skeleton |
| 3 | Call frames and recursion in the seed VM |
| 4 | Heap, lists, string concatenation |
| 5a–5b | Byte primitives; `mklist`; self-hosted lexer |
| 5c–5g | Self-hosted parser, codegen, globals, control flow, functions |
| 5h–5n | Semantic then byte-identical fixed point; compile-self shim; widened regions |
| 6 | Boxed f64 floating point |
| 7 | Host file I/O and networking |
| 8 | ML stdlib: tensor, autograd, nn, transformer, data, self_modify |
| 9 | FFI with BLAS/cuBLAS wrappers |
| 10 | WebGPU acceleration |
| 11 | CUDA fast path |
| 12 | Autonomous evolution loop |
| 13 | ML host bindings; the stack actually executes on the interpreter |
| 14 | LM training: softmax cross-entropy autograd, Adam + clipping, top-k sampling, checkpoints (`train.sdev`) |

Alongside those: the native x86-64 track, the Electron desktop IDE, the
launch site and carousel, and the two-minute Remotion pitch video.

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
