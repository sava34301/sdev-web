# SDEV Internals — the self-hosted compiler

This is a contributor document. If you just want to write SDEV, read
`SDEV_V2_DOCUMENTATION.md` instead.

## Two backends, one language

SDEV ships **two** code-generators from the same parser:

| Target        | Backend                     | Runs where                | Emits              |
| ------------- | --------------------------- | ------------------------- | ------------------ |
| **Web IDE**   | `lang/bootstrap/` (WAT seed VM) | Any browser              | WebAssembly bytecode |
| **Desktop**   | `lang/native/codegen-x64.mjs` | Linux/macOS CLI          | x86-64 GAS assembly → ELF |

The browser can only execute JS and WASM, so the web IDE stays on
WebAssembly — the browser's *native* assembly. For an actual on-disk
executable you can `objdump -d` and `strace`, use the native backend
(`node scripts/sdev-native.mjs prog.sdev -o prog`). Both backends share
the same lexer, parser, and language semantics.


## Where we are today

**Milestone 1 (launch) — shipped:**
- `lang/runtime/v2.js` — full v2 language in pure JavaScript (zero TypeScript
  in the language execution path).

**Milestone 2 (WASM stage-0) — shipped:**
- `lang/bootstrap/seed.wat` — hand-written WebAssembly Text stack VM,
  compiled to `public/wasm/sdev-seed.wasm`.
- `lang/bootstrap/compile.mjs` — bootstrap compiler: SDEV v2 source → VM
  bytecode.
- `src/lang-bridge/wasm-runtime.ts` — browser loader with automatic JS
  fallback for out-of-subset features.

**Milestone 3 (call frames + recursion) — shipped:**
- Seed VM expanded with five new opcodes: `CALL`, `RET`, `ENTER`,
  `LOAD_LOC`, `STORE_LOC`. Proper call-stack with per-frame return IP,
  saved FP, and per-frame locals — full recursion and mutual recursion.
- Bootstrap compiler upgraded to a two-pass emitter with a symbol table
  (globals vs locals), function decls (`to name with p1 p2 … end`),
  `return`, and both `fn(a, b)` and `fn with a b` call forms.

**Milestone 4 (heap, lists, string manipulation) — shipped:**
- Seed VM memory grown to 4 pages (256 KiB) with a bump-pointer heap at
  `0x10000..0x40000`. New opcodes: `POP`, `ALLOC`, `NEWLIST`, `LGET`,
  `LSET`, `LEN`, `STRCAT`. Lists are heap blocks laid out as
  `[u32 length | u32 items…]`; dynamic strings use the same
  `[u32 length | utf-8 bytes]` shape as the interned pool, so `SAY_STR`
  handles both transparently.
- Bootstrap compiler grew list literals `[a, b, c]`, index reads
  `xs[i]`, index assignment `set xs[i] to v`, per-scope type tracking,
  and two polymorphic builtins: `length(x)` (lists or strings) and
  `concat(a, b)`. The `+` operator promotes to `STRCAT` when either
  operand is string-typed.
- `scripts/test-wasm-runtime.mjs` now covers 10 programs including
  list-sum loops, in-place mutation, and multi-way string concat. All
  pass entirely inside WAT-authored WebAssembly.

**Milestone 5a (byte-level string primitives) — shipped:**
- Seed VM gained three opcodes: `SGET` (byte read), `CHR` (byte → 1-char
  string on the heap), `I2S` (int → decimal-string on the heap). Together
  with `LEN` and `STRCAT` this is the minimum surface a self-hosted lexer
  needs to slice source text.
- Bootstrap compiler exposes them as builtins `ord(s, i)`, `chr(n)`, and
  `str(n)`. Builtins now carry a `ret` type so scope typing propagates
  string-ness through nested calls (e.g. `"n=" + str(7)` promotes `+` to
  `STRCAT`).
- Regression suite grew to 13 programs, including a byte-level uppercase
  loop that only uses `ord` + `chr` + `+` to build the result.

**Milestone 5b (self-hosted lexer) — shipped:**
- `lang/compiler/lexer.sdev` is written entirely in SDEV. It tokenizes
  integers, identifiers, string literals, single-char punctuation, and
  newlines by walking a source string byte-by-byte with `ord`/`chr`/`str`.
- New seed opcode `LNEW` (allocate zeroed n-cell list) landed in
  `seed.wat` — the parser milestone will use it for a growable token
  buffer; the lexer itself streams tokens with `say` for now.
- `scripts/test-self-lexer.mjs` runs the SDEV lexer through the WAT VM
  on 6 sample programs and diffs the token stream against a JS reference
  implementation of the same rules. All 6 match byte-for-byte. No lexer
  logic remains in JavaScript.

**Milestone 5c (self-hosted expression parser) — shipped:**
- `lang/compiler/parser.sdev` is a mutually-recursive precedence-climbing
  parser written in SDEV. It reads tokens from global buffers (`tk_kind`,
  `tk_num`, `tk_count`) that a top-level lex loop fills, and streams the
  parse in reverse-Polish form via `say`. Handles `+ - * /`, parenthesized
  sub-expressions, and correct left-associativity.
- `scripts/test-self-parser.mjs` diffs the SDEV parser's RPN against a JS
  reference on 7 expression shapes (single atom, precedence, nested
  parens, mixed operators). All match byte-for-byte.
- Together with the M5b lexer, the front-end for arithmetic expressions
  now lives entirely in SDEV — the JS bootstrap only bytes-compiles it.

**Milestone 5d (self-hosted codegen — first end-to-end) — shipped:**
- `lang/compiler/codegen.sdev` is a compiler pass written in SDEV. It
  emits real seed-VM bytecode (PUSH_I32, ADD/SUB/MUL/DIV, SAY_I32, HALT)
  into a global `bc` buffer, using `bc[0]` as the byte count so the whole
  compiler can update the count via list mutation from inside functions
  without needing global writes.
- `scripts/test-self-codegen.mjs` runs the SDEV compiler through the seed
  WASM VM on 6 source programs, harvests the emitted bytes, executes them
  in a *fresh* seed WASM instance, and diffs the output against what the
  JS bootstrap compiler produces for the same source. All 6 match.
- Bootstrap compiler tweak: `set x[i] to v` is now correctly treated as a
  mutation of an existing binding (never introduces a shadowing local),
  which unblocks self-hosted compiler passes that write into global heap
  buffers from inside functions.

**Milestone 5e (variables in the self-hosted compiler) — shipped:**
- `codegen.sdev` grew a symbol table: `sym_names` is a list whose cell 0
  holds the interned-name count and whose cells 1..count hold the names.
  A new `intern_name(name)` function returns the u8 slot index the seed VM
  uses for `LOAD` / `STORE`, adding the name on first sight. All mutation
  goes through index-assignment on `sym_names` so it survives the
  bootstrap's "plain `set` inside a function creates a fresh local" rule.
- Parser: identifier atoms emit `LOAD <slot>`; the driver recognises
  `set NAME to EXPR` and emits the expression followed by `STORE <slot>`.
- `scripts/test-self-codegen.mjs` now runs 10 cases including
  `set + read`, reused reads, an in-place accumulator, and multi-var
  expressions. Self-compiled output matches the JS bootstrap byte-for-byte
  on every one.

**Milestone 5f (control flow + comparisons) — shipped:**
- `codegen.sdev` gained a real `parse_stmt` / `parse_block` mutual-recursion
  pair. Statements now cover `say`, `set NAME to EXPR`, `if EXPR … end`,
  `if EXPR … else … end`, and `while EXPR … end`. Blocks nest arbitrarily.
- The expression grammar grew a `parse_cmp` layer: `is`, `is not`, `<`,
  `>`, `<=`, `>=` emit `EQ`/`NE`/`LT`/`GT`/`LE`/`GE`. The driver's inline
  lexer now peeks one byte ahead to fold `<=` / `>=` into single tokens
  (sentinel punctuation codes 300 / 301).
- Two new SDEV helpers, `placeholder16` and `patch_i16`, handle forward
  and backward `JZ`/`JMP` offsets — including proper two's-complement
  encoding for negative offsets that back-edges of `while` loops need.
- `scripts/test-self-codegen.mjs` grew to 21 cases: comparisons in every
  direction, `if`/`else` with both branches, `while` counting and
  summation, and nested `if` inside `while` (a fizzbuzz-flavoured shape).
  Every case matches the JS bootstrap byte-for-byte.

**Milestone 5g (functions in the self-hosted compiler) — shipped:**
- `codegen.sdev` gained function declarations (`to NAME with p1 p2 …
  end`), `return EXPR?`, and call-syntax atoms (`NAME(a, b)`).
- Function bodies are emitted inline, bracketed by a `JMP` that skips
  over them so top-level flow doesn't fall in. Each body's byte offset,
  arity, and name go into three parallel global tables
  (`fn_names` / `fn_offsets` / `fn_arities`) so subsequent `CALL` sites
  resolve directly — no patch pass yet, so callers must appear after
  their callee. Recursive `fact` / `fib` work because a function can
  call itself once its own offset has been recorded.
- Locals get their own scope: a per-function `loc_names` list is reset
  on every `to`, params occupy slots 0..n-1, and any `set NAME` inside
  the body allocates a fresh local slot. `emit_load_ident` /
  `emit_store_ident` dispatch to `LOAD_LOC` / `STORE_LOC` while
  `in_func[0]` is 1 and fall back to the global table otherwise.
- Six builtins compile to single opcodes: `length` → `LEN`,
  `concat` → `STRCAT`, `ord` → `SGET`, `chr` → `CHR`, `str` → `I2S`,
  `mklist` → `LNEW`.
- `scripts/test-self-codegen.mjs` grew to 31 cases covering zero/one/two
  argument functions, functions using locals + `while` loops, functions
  calling other functions, recursive factorial, recursive `fib(10)`, and
  the `mklist`/`length` builtins. Every case matches the JS bootstrap
  byte-for-byte.

**Milestone 5h (strings, lists, and indexing in the self-hosted compiler) — shipped:**
- `codegen.sdev` grew expression-type tracking: a global `expr_type[0]`
  set by every parse_* to 0 (int) or 1 (str). Two parallel tables,
  `sym_types` and `loc_types`, remember the type of every stored global
  and local so later loads restore it. `say` now picks `SAY_I32` vs
  `SAY_STR` from `expr_type[0]`, and `+` promotes to `STRCAT` when
  either operand is string-typed.
- String literals `"…"` are compiled without a shared string pool
  (the self-hosted bytecode runs in a fresh WASM instance with an empty
  pool). Each literal is built at runtime as `LNEW(0)` + one
  `PUSH_I32 c; CHR; STRCAT` per byte, yielding a heap-string block that
  `SAY_STR` handles transparently. Empty strings compile to a bare
  `LNEW(0)`.
- List literals `[a, b, c]` emit each element then `NEWLIST <u16 n>`.
  Postfix indexing `x[i]` chains any number of `LGET`s after an atom via
  a new `parse_postfix` helper wired into `parse_mul`. Index assignment
  `set xs[i] to v` emits `LOAD xs; expr(i); expr(v); LSET`.
- Driver upgrades in `scripts/test-self-codegen.mjs`: the inline lexer
  now tokenizes `"…"` as string tokens (kind 3), and the driver seeds
  the new type tables. The suite grew from 31 to 43 test cases, adding
  literals, concat, `chr`/`ord`, list literals + reads, in-place list
  mutation via `set xs[i] to v`, and string-aware `+` — all match the
  JS bootstrap's output byte-for-byte.

**Milestone 5i (forward references + return types) — shipped:**
- `codegen.sdev` gained a pending-calls patch table: unresolved `CALL`s
  now emit a zero u16 target and record the patch position in two
  parallel globals (`pend_names` / `pend_pos`). After the whole program
  parses, `resolve_pending_calls` walks the table and back-patches every
  site once all `fn_offsets` are known. Forward references and mutual
  recursion (`is_even ↔ is_odd`) compile without reordering.
- Function return types are tracked in a new `fn_ret_types` table
  parallel to `fn_names`. Every `return EXPR` inside a body upgrades the
  current function's slot to `str` if the returned expression is
  string-typed; `emit_call` writes that recorded type into
  `expr_type[0]` so `say greet("world")` picks `SAY_STR` and
  `"hi " + greet(name)` promotes to `STRCAT`.
- The JS bootstrap now runs a matching fixed-point return-type inference
  pass (`inferReturnTypeOf`) before emitting bodies, so its `call`
  emitter agrees with the self-hosted compiler on every case in the
  suite — 50/50 tests pass byte-for-byte.
- `scripts/test-self-codegen.mjs` grew seven new cases: forward calls,
  forward calls inside expressions, mutual `is_even`/`is_odd` recursion,
  zero-arg string-returning fns, string-fn concat, string-fn with a
  string parameter, and a fn returning `str` down every branch.

**Milestone 5j (semantic fixed-point self-compile) — shipped:**
- `scripts/test-self-codegen.mjs` now diffs the self-hosted compiler
  against the JS bootstrap on two axes: (1) runtime output equivalence
  and (2) byte-for-byte bytecode identity. All 50/50 cases achieve
  output equivalence — the self-hosted codegen is a semantic fixed point
  of the JS bootstrap.
- Byte-for-byte identity currently holds on 2/50 trivial cases. Two
  architectural divergences account for every remaining mismatch, both
  semantics-preserving:
  - **String encoding.** The JS bootstrap folds every string literal
    into a shared string pool and emits `LSTR` (opcode `0x02`) with a
    pool index. The self-hosted compiler has no pool: literals compile
    to `LNEW(0)` plus one `LI32/CHR/STRCAT` per byte.
  - **Function placement.** The JS bootstrap pre-scans and lifts every
    `to …` definition ahead of top-level code, so a program that calls
    a function before defining it produces the same layout as one that
    defines it first. The self-hosted compiler emits in source order,
    with a `JMP` over each body where it appears; forward references
    are patched by `resolve_pending_calls` (see Milestone 5i).
- Both divergences are tracked as the "byte-identity cleanup" pass that
  precedes deletion of the JS bootstrap. Reaching byte identity requires
  either teaching the self-hosted compiler to build a string pool +
  hoist function definitions, or removing those features from the JS
  bootstrap. Milestone 5k will pick one direction and land it.

**Milestone 5k (byte-identity fixed point) — shipped:**
- `lang/compiler/codegen.sdev` now converges on the JS bootstrap's exact
  wire format. All 50/50 test cases produce byte-identical bytecode **and**
  a byte-identical string pool. The `≡` marker replaces `~` across the
  entire suite.
- Four architectural pieces landed together:
  - **Two-pass compilation.** `emit_byte` is gated on `emit_enabled[0]`.
    Pass 1 runs `parse_stmt` twice with emit disabled: it registers each
    function (name, arity, body-start token index, extras count) and lets
    `return EXPR` statements populate `fn_ret_types[i]` to fixed point.
    Pass 2 resets globals and emits for real.
  - **Function hoisting.** Pass 2 emits a leading `JMP → main`
    placeholder, then walks the registered functions in registration
    order — each body is re-parsed from `fn_body_start[i]` and emitted
    contiguously. The leading `JMP` is back-patched once every body is
    laid down, then main is emitted with `skip_fn_defs[0]=1` so
    `parse_stmt` silently consumes any `to … end` block it encounters.
  - **ENTER elision.** `fn_extras[i]` is measured during pass 1 by
    reading `loc_names[0] - n_params` after the walk. Pass 2 emits
    `ENTER extras` only when `extras > 0`, matching the JS bootstrap's
    zero-locals shortcut.
  - **Shared string pool.** New helper `intern_str(s)` builds a pool
    matching the bootstrap's `[u32 len][utf8…]` records. `parse_atom`'s
    string branch now emits `PUSH_STR` (`0x02`) + u16 pool offset
    instead of the runtime `LNEW/CHR/STRCAT` sequence. The test driver
    ingests the pool from a trailing `say` dump and installs it at
    memory offset 0 for execution.
- One `emit_call` refinement was needed for byte identity: mutually
  recursive calls (like `is_even ↔ is_odd`) can hit a callee whose
  offset is not yet set even though its name resolves. `emit_call` now
  treats any `fn_offsets[idx+1] == 0` as a deferred call and records a
  patch site; `resolve_pending_calls` fills in the u16 target after
  every body is emitted.
- `scripts/test-self-codegen.mjs` was reworked to (a) receive both a
  bytecode stream and a string pool from the codegen, (b) diff both
  against the JS bootstrap, and (c) fail on any mismatch. Its summary
  now reports `bytecode: 50/50` and `pool: 50/50`.

**Milestone 5l (self-hosted compile module surface) — shipped:**
- Introduced `lang/compiler/compile-self.mjs`, a Node module that exposes
  the SDEV-authored codegen as a plain `compile(source) -> { bytecode,
  stringPool }` function — the same shape the JS bootstrap offers. Internally
  it drives `lang/compiler/codegen.sdev` through the seed WASM VM (with the
  bootstrap used once, in-memory, only to compile the driver harness itself).
- New gate `scripts/test-shim-fixed-point.mjs` re-runs the codegen suite
  through the new module surface and asserts byte-identity against the JS
  bootstrap. Result: **43/43 cases byte-identical.**
- The JS bootstrap remains the ground truth for `test-self-lexer.mjs`,
  `test-self-parser.mjs`, and `wasm-runtime.ts` until the shim can compile
  the entire toolchain. Widening the self-hosted codegen to cover
  `lexer.sdev` / `parser.sdev` / `codegen.sdev` is Milestone 5m; only
  after that can `compile.mjs` be deleted and the runtime path fully
  rewired.

**Milestone 5m (toolchain round-trip through the shim) — partial:**
- Added a `#`-comment branch to the inline lexer in `compile-self.mjs`.
  With that single fix, the self-hosted codegen now compiles the real
  `lang/compiler/lexer.sdev` **byte-identically** to the JS bootstrap
  (`bc=746, pool=41`) and the real `lang/compiler/parser.sdev`
  **byte-identically** (`bc=380, pool=38`).
- New gate `scripts/test-self-toolchain.mjs` diffs each toolchain source
  through the shim and hard-fails on required-target mismatches. Current
  status: **lexer ✓, parser ✓, codegen ⚠** — the third one throws
  `string pool overflow` inside the JS bootstrap that compiles the shim
  driver, because embedding `codegen.sdev` itself as a `set src to "…"`
  string literal blows past the seed VM's 8 KiB pool region.
- Probe script `scripts/probe-self-lexer.mjs` reports the first diverging
  bytecode / pool offset for any input, making the next regression easy
  to bisect.

**Milestone 5n (widen seed pool / driver plumbing) — shipped:**
- Bumped `seed.wat` memory layout: string pool grew from 8 KiB to
  **64 KiB** (0x00000..0x0FFFF), and every downstream region moved up in
  lockstep — `VAR_BASE=0x10000`, `STACK_BASE=0x14000`,
  `CALL_BASE=0x18000`, `CODE_BASE=0x1C000`, `HEAP_BASE=0x30000`. Linear
  memory grew from 4 → 32 pages (256 KiB → 2 MiB) so the heap has room
  for the driver's larger scratch lists. u16 `PUSH_STR` offsets still
  fit (max 0xFFFF) so no opcode changes.
- Bumped the bootstrap emitter's compile-time pool buffer in lockstep
  (`lang/bootstrap/compile.mjs`: `0x2000 → 0x10000`) so it can intern
  the ~21 KiB `codegen.sdev` source literal that the shim driver embeds.
- Widened the driver's inline scratch lists in `compile-self.mjs`
  (`tk_kind/tk_num/tk_txt` 2000 → 20000, `bc` 16384 → 65536,
  `pool_bytes` 8192 → 32768) so the self-hosted codegen can process a
  20 KiB+ source without silently overflowing heap allocations.
- Result: `test-self-toolchain.mjs` now runs codegen.sdev through the
  shim end-to-end without throwing. Lexer + parser still byte-identical
  (`bc=746/pool=41`, `bc=380/pool=38`); codegen.sdev now diverges
  *semantically* (self=486B / ref=5620B) — function bodies aren't being
  emitted — instead of failing at the seed VM boundary. That's the
  Milestone 5o gap, not 5n's.

**Milestone 5o (self-hosted codegen self-compile) — shipped:**
- Diagnosed the 486 B divergence: `codegen.sdev`'s own parser was
  missing two things it needed to parse itself. First, `parse_mul` did
  not recognize `%` (MOD, opcode `0x14`), so `emit_i32`'s body — which
  chains `v % 256` twice — halted mid-function. Second, `parse_stmt`
  had no expression-statement fallthrough, so bare calls like
  `emit_byte(x)` (used ~200 times throughout the compiler) fell through
  every keyword branch and returned `pos` unchanged, stopping the pass-1
  walk at the first such call.
- Fixed both: `parse_mul` now emits opcode `0x14` on `%`, and
  `parse_stmt` finishes with an "identifier ⇒ parse expression + POP"
  branch that mirrors `exprStmt` in the JS bootstrap. Both changes are
  strict supersets — no existing case regresses.
- Result: `test-self-toolchain.mjs` now reports **codegen.sdev
  byte-identical (bc=5730, pool=136)** through the shim. All three
  toolchain sources (lexer, parser, codegen) round-trip byte-for-byte
  through the self-hosted compiler.

(Milestone 5p — retiring the JS bootstrap — is documented after Milestone 14,
in milestone order.)



**Milestone 6 (floats + math opcodes) — shipped:**
- **Representation:** boxed f64. A float lives on the heap as an 8-byte
  cell; the stack cell holds the pointer. Existing i32 opcodes are
  untouched, so int-only programs pay zero cost.
- **New seed opcodes** (`seed.wat`):
  `PUSH_F64 0xA0` (with 8-byte little-endian payload),
  `FADD/FSUB/FMUL/FDIV 0xA1..0xA4`,
  `FLT/FGT/FEQ 0xA5..0xA7` (result is i32 boolean),
  `I2F/F2I 0xA8..0xA9`, `FNEG/FABS/FSQRT 0xAA..0xAC`,
  `SAY_F64 0xAD`, and `FMATH 0xAE <u8 op>` for transcendentals
  (`0 sin, 1 cos, 2 tan, 3 exp, 4 log, 5 pow`).
- **Two new host imports:** `env.host_say_f64(f64)` and
  `env.host_fmath(op:i32, a:f64, b:f64) -> f64`. Every wrapper
  (`wasm-runtime.ts`, all test scripts, and `compile-self.mjs`) provides
  them; the JS side delegates to `Math.sin/cos/tan/exp/log/pow`.
- **Compiler (`compile.mjs`):**
  - Tokenizer now flags any number containing `.` as `isFloat`; the
    bootstrap parser turns those into `fnum` AST nodes and emits
    `PUSH_F64` with the correct 8-byte payload.
  - Mixed-type arithmetic requires an explicit `i2f()` / `f2i()`
    coercion — codegen is single-pass, so we can't retroactively
    promote the already-emitted left operand. If BOTH sides are
    `float`, `+ - * /` become `FADD/FSUB/FMUL/FDIV` and `< > is`
    become `FLT/FGT/FEQ`.
  - `say <float>` picks `SAY_F64` automatically via the same
    type-tracking used for `SAY_STR`.
  - `inferReturnTypeOf` learned about `float`, so a function that
    returns `2.5 + x` propagates its float type across call sites.
- **New builtins:** `i2f, f2i, fneg, fabs, fsqrt` (single-opcode) and
  `fsin, fcos, ftan, fexp, flog, fpow` (via `FMATH`).
- **Tests:** `test-wasm-runtime.mjs` grew 5 float cases (literals +
  arithmetic; `fsqrt/fabs/fneg`; `i2f/f2i` round-trip; comparisons;
  transcendentals). Full self-hosted toolchain still 100%
  byte-identical — 50/50 codegen, 6/6 lexer, 7/7 parser.
- **Why boxed and not stack-widened:** every existing opcode
  (LOAD/STORE, JZ, CALL frames, list cells, string handles, etc.)
  assumes 4-byte stack slots. Widening the operand stack to 8 bytes
  would touch every dispatch arm and every codegen path in
  `lang/compiler/codegen.sdev`. Boxing pays one heap allocation per
  produced float in exchange for a strictly additive change — this
  is the correct trade-off for a bootstrap VM. If tensor math shows
  it's a bottleneck, the ML stdlib will store contiguous `f64`
  buffers directly on the heap (as list-of-bytes) and index them via
  new `TENSOR_*` opcodes, bypassing per-value boxing entirely.

**Milestone 7 (file I/O + networking) — shipped:**
- Host imports for `read_file`, `write_file`, and `http_get(url) → text`.
- In the browser these are stubs (sync HTTP is unavailable in-page) and
  return `void`; the Node/Electron and Native tracks do the real work.
- This is what lets the ML stack read a corpus, write checkpoints, and
  crawl training data without leaving sdev.

**Milestone 8 (ML stdlib — tensors + autograd) — shipped:**
- `lang/stdlib/ml/tensor.sdev`: flat `data` + `shape` tensors, element-wise
  ops, `matmul`, `transpose`, `softmax`, `cross_entropy`.
- `lang/stdlib/ml/autograd.sdev`: reverse-mode AD over a global tape
  (`record` / `backward`), rules for `add`, `mul`, `matmul`, `relu`, `mse`.
- `lang/stdlib/ml/nn.sdev`: `linear`, `sequential`, parameter collection,
  `sgd_step`.

**Milestone 9 (FFI) — shipped:**
- `lang/stdlib/ffi.sdev` plus a host bridge in `src/lang/builtins.ts`:
  `ffi_buf`, `ffi_write_f64`, `ffi_read_f64` are pure JS (`DataView`) so
  they work in the browser; `ffi_open` / `ffi_sym` / `ffi_call` /
  `ffi_close` are gated to native hosts and degrade gracefully.
- Targets OpenBLAS and cuBLAS symbol signatures for `matmul` fast paths.

**Milestone 10 (WebGPU) — shipped:**
- `lang/stdlib/webgpu.sdev` dispatches tensor kernels through
  `navigator.gpu` when present, falling back to the scalar path otherwise.

**Milestone 11 (CUDA) — shipped:**
- `lang/stdlib/ml/cuda.sdev` binds cuBLAS through the M9 FFI layer.
  `cuda_device_default()` reports availability instead of crashing, so the
  same program runs on a laptop and on a GPU box.

**Milestone 12 (transformers, data, self-modification) — shipped:**
- `transformer.sdev`: `embedding`, `layer_norm`, `attention_head`,
  `transformer_block`, `gpt(vocab, dim, hidden, layers)`, `generate`.
- `data.sdev`: `char_vocab` / `encode` / `decode`, corpus loading, web
  crawling, and teacher-model distillation helpers.
- `self_modify.sdev` + `auto_evolve.sdev`: the model can read the real
  source tree and propose patches, but every write goes through a review
  hook and a path whitelist — both off by default.

**Milestone 13 (ML host bindings) — shipped:**
- `src/lang/builtins.ts` gained `ord(s, i)`, `rand`, `ln`, `read_file`,
  `write_file`, `http_get`, and the FFI buffer family.
- `executeIndex` in `src/lang/interpreter.ts` now yields `void` (not
  `undefined`) for a missing tome key, so `tome[k] equals void` holds.
- `scripts/test-ml-stdlib.ts` runs the whole ML stack on the v1
  interpreter as a regression gate.

**Milestone 14 (end-to-end LM training) — shipped:**
- `autograd.sdev`: `d_softmax_ce(logits, targets)` with its `bw_sce`
  backward rule (row-wise softmax, then `probs − onehot` scaled by the
  batch size), `zero_grads`, `clip_grads(params, max_norm)` global-norm
  clipping, and `adam_new` / `adam_step` with bias correction.
- `lang/stdlib/ml/train.sdev` (new): `lm_batches` sliding-window pairs,
  `lm_step`, `lm_fit(model, ids, block, epochs, lr)`, `lm_loss`,
  `perplexity`, `sample_topk(logits, temperature, k)`, `lm_generate`,
  `lm_complete`, and plain-text `save_checkpoint` / `load_checkpoint`
  (`shape|values`, one parameter tensor per line).
- Tests: cross-entropy gradient checked against the analytic rule,
  `lm_fit` must lower loss on a repeating corpus, top-1 sampling must
  never leak, checkpoints must round-trip. 15/15 ML checks green with the
  self-hosted toolchain still byte-identical.

**Milestone 5p (retire the JS bootstrap from the runtime path) — shipped:**
- The driver program is now **source-independent**: instead of embedding the
  user program as a string literal, it does `set src to read_file("<stdin>")`
  and the host answers with the program bytes via `alloc_str`.
- Because the driver no longer varies per input, its bytecode is compiled
  **once** by `scripts/build-driver.mjs` and checked in as
  `lang/compiler/driver-artifact.mjs` (base64, bc=7741, pool=147).
  `compile-self.mjs` imports that artifact and no longer imports the
  bootstrap at all.
- `src/lang-bridge/wasm-runtime.ts` now compiles through the self-hosted
  shim (`setSeedLoader` lets the browser hand it a `fetch`-based loader).
  `src/lang-bridge/bootstrap.d.ts` is deleted; `compile-self.d.ts` replaces it.
- `scripts/test-wasm-runtime.mjs` runs on the shim too. Cases tagged
  `compiler: 'bootstrap'` (floats + host I/O) are the honest remainder —
  see 5q.
- New gate: `node scripts/test-driver-artifact.mjs` re-derives the driver
  from the bootstrap oracle and fails if the checked-in bytes drift, then
  compiles four programs through the bootstrap-free shim.
- The JS bootstrap now exists **only** as a build/test-time oracle
  (`build-driver.mjs`, `test-self-codegen.mjs`, `test-self-toolchain.mjs`,
  and the float/I/O cases in `test-wasm-runtime.mjs`).

**Milestone 5q (floats + host I/O in the self-hosted codegen) — next:**
- `codegen.sdev` and the inline lexer only know integers, strings, and lists,
  so `PUSH_F64`, `FADD…FMATH`, `READFILE`, `WRITEFILE`, and `HTTPGET` are
  still emitted only by the bootstrap.
- The browser bridge detects those constructs (`NOT_YET_SELF_HOSTED`) and
  falls back to the JS reference runtime rather than emitting a silently
  wrong program.
- 5q adds float literal lexing, the `float` type in the codegen's
  type-tracking, and the three I/O builtins — after which the bootstrap can
  be deleted outright.

**Milestone 15 (training at scale) — planned:**
- Batched (multi-sequence) forward passes instead of one context at a time.
- Route `matmul` through the M10/M11 accelerators inside the training loop.
- Binary checkpoints (length-prefixed f64 blocks) to replace the text format.






## Where we're going (Milestone 2 — post-launch)

Three-stage bootstrap. Every stage builds the next; the seed is only
needed once, to rebuild from absolute zero.

```
lang/bootstrap/seed.wat        (hand-written WebAssembly Text)
        │  wat2wasm
        ▼
lang/bootstrap/seed.wasm       runs sdev-min
        │
        │  compiles lang/compiler/*.sdev (written in sdev-min)
        ▼
lang/bootstrap/stage1.wasm     runs full SDEV, emits WASM
        │
        │  compiles lang/compiler/*.sdev (written in full SDEV)
        ▼
dist/sdev-core.wasm            self-hosting. Recompiles itself, byte-identical.
```

### Sub-language `sdev-min`

The stage-0 seed only understands a strict subset:

- Integers, strings, booleans, `nothing`.
- Lists (indexed, appendable). No dicts.
- `set … to`, `if / else / end`, `while / end`, `to / end` (no `for each`).
- Function calls, `return`.
- One built-in call table: `print`, `read_file`, `write_file`, `error`,
  and the WASM emit primitives (`emit_byte`, `emit_u32`, `emit_leb128`,
  `patch_u32`).

That's enough to write a lexer, a parser, and a WASM code generator.

### WASM ABI

`sdev-core.wasm` exports:

| export                    | signature                             | purpose                    |
| ------------------------- | ------------------------------------- | -------------------------- |
| `sdev_version`            | `() -> i32`                           | ABI + language version     |
| `sdev_compile`            | `(src_ptr, src_len) -> module_handle` | source → WASM module bytes |
| `sdev_run`                | `(module_handle) -> exit_code`        | execute a compiled module  |
| `sdev_step`               | `(module_handle) -> state`            | single-step (for the IDE)  |
| `sdev_emit_graphics`      | `(handle) -> cmd_buffer`              | drain graphics commands    |
| `sdev_translate`          | `(src_ptr, lang_code) -> out`         | run the 26-language translator |
| `sdev_transpile_board`    | `(src_ptr) -> ino_bytes`              | board { } → Arduino .ino   |

Memory layout: linear memory starts with a 64 KB scratch region, then a
freelist-managed heap. Strings are UTF-8, length-prefixed.

## Repository layout

```
lang/
  bootstrap/
    seed.wat            # hand-written WAT (stage 0 source)
    seed.wasm           # built artifact — CI regenerates via wat2wasm
    stage1.wasm         # built artifact — CI regenerates by running seed
  compiler/             # .sdev sources: lexer, parser, codegen + compile-self.mjs
  native/               # Track B: x86-64 GAS codegen, runtime.s, linker
  stdlib/
    ffi.sdev            # M9 — native library binding
    webgpu.sdev         # M10 — browser GPU compute
    ml/
      tensor.sdev       # M8 — tensors + shape ops
      autograd.sdev     # M8/M14 — reverse-mode AD, losses, Adam
      nn.sdev           # M8 — layers, parameter collection
      transformer.sdev  # M12 — decoder-only GPT
      train.sdev        # M14 — LM training, sampling, checkpoints
      data.sdev         # M12 — tokenizers, crawling, distillation
      cuda.sdev         # M11 — cuBLAS fast paths
      self_modify.sdev  # M12 — gated source rewriting
      auto_evolve.sdev  # M12 — whitelisted evolution loop
  runtime/
    v2.js               # Milestone 1 reference runtime (pure JS)
    vm.sdev             # Milestone 2 VM
    kernel.sdev         # tasks, syscalls, GC
  paradigms/            # functional, systems, data, hardware — .sdev
  translator/           # 26-language keyword tables + engine — .sdev
  legacy/
    v1_frontend.sdev    # refine mode: parses forge/conjure/:: /;; into v2 AST

electron/               # desktop IDE shell (Track B host: build + run native)

src/lang-bridge/        # thin TS glue — the ONLY TS in the exec path
  bridge.ts             # picks runtime and dispatches
  v2.d.ts               # ambient types for lang/runtime/v2.js

dist/
  sdev-core.wasm        # shipped artifact (Milestone 2)
```


## Verification

The gates that run today:

1. `node scripts/test-self-toolchain.mjs` — `lexer.sdev`, `parser.sdev`, and
   `codegen.sdev` must all round-trip **byte-identical** through the
   self-hosted compiler (currently bc=746/380/5730).
2. `node scripts/test-shim-fixed-point.mjs` — the compile shim reaches a
   fixed point against the JS bootstrap oracle.
3. `node scripts/test-wasm-runtime.mjs` — seed VM opcode suite (ints, call
   frames, heap/lists, strings, floats + transcendentals).
4. `node scripts/test-driver-artifact.mjs` — the checked-in driver bytecode
   matches a fresh bootstrap build, and the bootstrap-free shim compiles.
5. `node scripts/test-native.mjs` — Track B x86-64 emission and linking.
6. `bun run scripts/test-ml-stdlib.ts` — 15 checks across tensors, autograd,
   tokenizers, transformer shapes, LM training, sampling, checkpoints, and
   accelerator fallback.
7. `bun run scripts/test-translator.ts` — 26-language keyword translation.

Planned additions: `test-v2-goldens.mjs` (docs examples diffed against a
recorded transcript), `test-v1-parity.mjs`, `test-hardware.mjs` (`board`
blocks vs. checked-in `.ino` snapshots), and a Playwright smoke test that
opens `/ide`, runs `blink.sdev`, and verifies the canvas + output panels.


## Why not just keep the TypeScript interpreter?

Because SDEV wants to be a real language, not a project's DSL. Every serious
language is written in itself. Self-hosting proves the design is complete
enough to describe itself, and gives the community a single artifact
(`sdev-core.wasm`) that runs the same anywhere WebAssembly runs — browser,
Node, Deno, Bun, wasmtime, a microcontroller with a WASM interpreter.

## Parity matrix

Generated by `lang/parity/agent.sdev`. Do not edit by hand.

<!-- PARITY:BEGIN -->

| Feature | Area | sdev v1 (TypeScript interpreter) | sdev v2 (self-hosted compiler on the seed VM) | native x86-64 backend |
| --- | --- | --- | --- | --- |
| `say` | io | `speak` | `say` | `say` |
| `length` | core | `measure` | `length` | gap (should) |
| `concat` | text | `etch` | `concat` | gap (should) |
| `ord` | text | `ord` | `ord` | gap (should) |
| `chr` | text | `chr` | `chr` | gap (should) |
| `str` | text | `str` | `str` | `str` |
| `int` | types | `int` | gap (should) | gap (should) |
| `num` | types | `num` | gap (should) | — |
| `list_new` | list | `gather` | `mklist` | gap (should) |
| `list_get` | list | `pluck` | `mklist` | gap (should) |
| `upper` | text | `upper` | gap (should) | — |
| `lower` | text | `lower` | gap (should) | — |
| `trim` | text | `trim` | gap (should) | — |
| `contains` | text | `contains` | gap (should) | — |
| `replace` | text | `replace` | gap (should) | — |
| `split` | text | `shatter` | gap (should) | — |
| `join` | text | `weave` | gap (should) | — |
| `abs` | math | `abs` | `fabs` | gap (should) |
| `min` | math | `least` | gap (should) | — |
| `max` | math | `greatest` | gap (should) | — |
| `floor` | math | `ground` | `f2i` | — |
| `ceil` | math | `elevate` | gap (should) | — |
| `round` | math | `nearby` | gap (should) | — |
| `sqrt` | math | `root` | `fsqrt` | — |
| `pow` | math | `pow` | `fpow` | — |
| `sin` | math | `sin` | `fsin` | — |
| `cos` | math | `cos` | `fcos` | — |
| `exp` | math | `exp` | `fexp` | — |
| `log` | math | `ln` | `flog` | — |
| `random` | math | `rand` | gap (should) | — |
| `range` | list | `range` | gap (should) | — |
| `sum` | list | `sum` | gap (should) | — |
| `keys` | tome | `tome_keys` | gap (should) | — |
| `read_file` | io | `read_file` | `read_file` | — |
| `write_file` | io | `write_file` | `write_file` | — |
| `http_get` | net | `http_get` | `http_get` | — |
| `var_decl` | syntax | `forge` | `set` | `set` |
| `assign` | syntax | `be` | `set` | `set` |
| `if` | syntax | `either` | `if` | `if` |
| `else` | syntax | `otherwise` | `else` | `else` |
| `while` | syntax | `cycle` | `while` | `while` |
| `for_each` | syntax | `iterate` | gap (should) | — |
| `break` | syntax | `yeet` | gap (should) | gap (should) |
| `continue` | syntax | `skip` | gap (should) | gap (should) |
| `function` | syntax | `conjure` | `to` | `call` |
| `return` | syntax | `yield` | `return` | `return` |
| `params` | syntax | `conjure` | `with` | `call` |
| `recursion` | syntax | `conjure` | `to` | `call` |
| `lambda` | syntax | `ARROW` | gap (should) | — |
| `class` | oop | `essence` | gap (should) | — |
| `inherit` | oop | `extend` | gap (should) | — |
| `self` | oop | `self` | gap (should) | — |
| `super` | oop | `super` | gap (should) | — |
| `instantiate` | oop | `new` | gap (should) | — |
| `try_catch` | errors | `attempt` | gap (should) | — |
| `rescue` | errors | `rescue` | gap (should) | — |
| `throw` | errors | `throw` | gap (should) | — |
| `logic_and` | syntax | `also` | gap (should) | gap (should) |
| `logic_or` | syntax | `within` | gap (should) | gap (should) |
| `logic_not` | syntax | `nope` | `not` | `un` |
| `equality` | syntax | `equals` | `is` | `is` |
| `inequality` | syntax | `differs` | `not` | `isnot` |
| `bool_true` | types | `yep` | gap (should) | gap (should) |
| `bool_false` | types | `nope` | gap (should) | gap (should) |
| `nothing` | types | `void` | `none` | gap (should) |
| `list_literal` | types | `gather` | `mklist` | gap (should) |
| `tome_literal` | types | `tome_keys` | gap (should) | — |
| `import` | modules | `summon` | gap (should) | — |
| `float` | types | `num` | `i2f` | — |
| `string` | types | `str` | `str` | `str` |

<!-- PARITY:END -->
