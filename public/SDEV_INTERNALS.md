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
- `scripts/test-wasm-runtime.mjs` runs on the shim too.
- New gate: `node scripts/test-driver-artifact.mjs` re-derives the driver
  from the bootstrap oracle and fails if the checked-in bytes drift, then
  compiles four programs through the bootstrap-free shim.
- The JS bootstrap now exists **only** as a build/test-time oracle
  (`build-driver.mjs`, `test-self-codegen.mjs`, `test-self-toolchain.mjs`).

**Milestone 5q (floats + host I/O in the self-hosted codegen) — shipped:**
- **New seed opcode** `0xB4 FBYTE`: pops an index `0..7` and a boxed float,
  pushes that little-endian IEEE-754 byte. This is the one primitive the
  self-hosted codegen needed to materialise a `PUSH_F64` operand without
  bitwise integer ops in the source language. Exposed to programs as the
  builtin `fbyte(x, i)` (bootstrap and self-hosted alike).
- **Lexer**: the inline driver lexer now recognises `123.456`, emitting
  token kind `6` with the mantissa in `tk_num` and the fractional-digit
  count in the new `tk_num2` table. The value is reconstructed as
  `i2f(mantissa) / i2f(10^scale)` — a single correctly-rounded IEEE
  division, so it lands on exactly the double the JS oracle parses.
- **Codegen**: `expr_type` grew a third state (`0` int, `1` str, `2` float).
  `both_float()` gates `FADD/FSUB/FMUL/FDIV` and `FEQ/FLT/FGT`; `say` picks
  `SAY_F64`; mixed int/float still requires an explicit `i2f`, matching the
  oracle. `emit_call` learned `i2f`, `f2i`, `fneg`, `fabs`, `fsqrt`,
  `fsin/fcos/ftan/fexp/flog/fpow`, `fbyte`, `read_file`, `write_file`,
  and `http_get`.
- The browser bridge's `NOT_YET_SELF_HOSTED` carve-out is **deleted**: every
  v2 program in the IDE, floats and host I/O included, compiles through the
  self-hosted codegen running on the seed VM.
- All float and I/O cases in `test-wasm-runtime.mjs` now run self-hosted, and
  float programs compile **byte-identically** to the bootstrap oracle.

**Milestone 5r (booleans, `not`, unary minus, `true`/`false`/`nothing`) — shipped:**
- **New expression tiers in `codegen.sdev`**: `parse_expr → parse_or →
  parse_and → parse_not → parse_cmp`. Every former `parse_cmp` entry point
  (statements, call arguments, list items, parenthesised groups, index
  expressions) now enters at `parse_expr`, so boolean operators are legal
  anywhere an expression is.
- **Short-circuiting** mirrors the oracle byte-for-byte: `a and b` emits
  `a`, `JZ →end`, `b`; `a or b` emits `a`, `NOT`, `JZ →end`, `b`. Both tiers
  are left-associative loops and always yield an int.
- **`not x`** is right-recursive (`not not x` is legal) and emits `NOT`.
- **Unary minus** got its own tier between `mul` and the atom/postfix pair:
  `-x` emits `PUSH_I32 0`, the operand, then `SUB`, exactly as the bootstrap
  does. Postfix indexing still binds tighter, so `-xs[0]` negates the element.
- **`true` / `false` / `nothing`** lower to plain integers (`1` / `0` / `0`)
  in both the self-hosted codegen and the bootstrap oracle, keeping the two
  emitters identical. The oracle's `canStartAtom` accepts them too, so they
  work as arguments in the `f with a b` call form.
- Three new cases in `scripts/test-wasm-runtime.mjs` cover short-circuiting,
  unary minus, and the literals; the byte-identity, shim fixed-point, and
  driver-artifact gates all stay green (driver artifact rebuilt: bc=9739).
- Parity registry updated: `logic_and`, `logic_or`, `bool_true`, `bool_false`
  and `nothing` are no longer v2 gaps, and the native track now declares the
  shared bootstrap parser among its sources.



**Milestone 5s (`break`, `continue`, `for each … in`, `else if`) — shipped:**
- **`for each NAME in EXPR ... end`** is desugared, in both emitters, to an
  index loop over two hidden variables named after the loop's lexical
  foreach-nesting depth (`_fe_l1` / `_fe_i1`, `_fe_l2` / `_fe_i2`, …). Depth
  naming is what lets the single-pass self-hosted compiler pick the same
  names as the AST-based oracle without a desugaring pass:

  ```text
  EXPR ; STORE _fe_lD ; PUSH_I32 0 ; STORE _fe_iD
  top: LOAD _fe_iD ; LOAD _fe_lD ; LEN ; LT ; JZ →exit
       LOAD _fe_lD ; LOAD _fe_iD ; LGET ; STORE NAME
       <body>
  cont: LOAD _fe_iD ; PUSH_I32 1 ; ADD ; STORE _fe_iD ; JMP →top
  exit:
  ```

  The bootstrap's `collectSets` registers the two hidden bindings and the
  loop variable in exactly that order, so local slot numbers agree.
- **`break` / `continue`** emit a `JMP` with an unresolved target. The
  self-hosted codegen records `(placeholder, loop_depth)` in the `brk_*` /
  `cnt_*` tables and resolves them in `patch_breaks` / `patch_conts` when the
  enclosing loop closes (breaks → loop exit, continues → the `while` header
  or the foreach increment). The oracle does the same with a loop-context
  stack on the emitter. Both keywords lex as plain identifiers, so they are
  matched ahead of the expression-statement fallback.
- **`else if`** chains: after `else`, a following `if` is parsed as a nested
  statement that consumes its own `end`, so the outer level does not eat one.
  Emission order (`cond, JZ, then, JMP, patch JZ, else-branch, patch JMP`) is
  unchanged, which keeps chains byte-identical to the oracle.
- Six new cases in `scripts/test-wasm-runtime.mjs` and six more in
  `scripts/test-shim-fixed-point.mjs` (now 49/49 byte-identical). Driver
  artifact rebuilt: bc=11215, pool=383. Toolchain, driver-artifact, native
  and parity gates all green; `for_each`, `break` and `continue` are no
  longer v2 parity gaps.



**Milestone 5t (tomes — string-keyed dictionaries) — shipped:**
- **Heap shape.** A tome is a 16-byte header `[MAGIC | count | cap |
  entriesPtr]` plus a separate entries block of `cap` `(keyPtr, value)` i32
  pairs, so growth reallocates only the entries block and every existing
  handle to the tome stays valid. `MAGIC` is `0x7FED10E5` — a length no list
  can legitimately have — which lets the VM recognise a tome from its
  pointer alone.
- **New seed opcodes** (`lang/bootstrap/seed.wat`): `TNEW (0x8A) <u16 cap>`,
  `TSET (0x8B)` (pops value + key, leaves the tome on the stack so a literal
  is a single expression), `TGET (0x8C)`, `THAS (0x8D)`, `TKEYS (0x8E)` and
  `TVALS (0x8F)`. Lookup is a linear scan with byte-wise key comparison
  (`$streq`); note that pool offset 0 is a legal string handle, so a zero
  pointer must not be read as "absent".
- **Run-time dispatch.** `LGET`, `LSET` and `LEN` check the magic word first:
  on a tome they perform a key read / key write / entry count, on anything
  else the original list behaviour. That is what makes a tome passed into a
  function work without a type annotation, since the single-pass compiler
  types parameters as opaque ints.
- **Compile-time kinds.** Both emitters extend the kind lattice with
  `tome` (int-valued), `tomestr` (string-valued) and `liststr` (the list
  `keys()` returns), so `say t[k]`, `k + "="` and `for each v in values(t)`
  pick `SAY_STR` / `STRCAT` correctly. The self-hosted codegen encodes them
  as 3, 4 and 5 alongside 0/1/2 for int/str/float. Because TNEW's count
  operand precedes the entries in the byte stream, the streaming compiler
  reserves the u16 and back-patches it once the literal closes.
- **Syntax.** `{ "k": v, name: v2 }`, with newlines allowed between entries;
  a bare identifier key is sugar for the string of the same name, matching
  v1's `{name: "x"}` form.
- Nine new cases in `scripts/test-wasm-runtime.mjs` and ten more in
  `scripts/test-shim-fixed-point.mjs` (now 59/59 byte-identical). Driver
  artifact rebuilt: bc=12261, pool=408. The seed VM is now built by
  `scripts/build-seed-wasm.mjs` (wabt, no system toolchain). Toolchain,
  driver-artifact, native and parity gates all green; `tome_literal`,
  `keys`, `values` and `has` are no longer v2 parity gaps.

**Milestone 5u (string + numeric standard library) — shipped:**
- **New seed opcodes** (`lang/bootstrap/seed.wat`): `UPPER (0x92)`,
  `LOWER (0x93)`, `TRIM (0x94)`, `SUBSTR (0x95)`, `FIND (0x96)`,
  `SPLIT (0x97)`, `JOIN (0x98)`, `REPLACE (0x99)`, `S2I (0x9A)`,
  `IABS (0x9B)`, `IMIN (0x9C)`, `IMAX (0x9D)`, `RANGE (0x9E)`,
  `SUM (0x9F)`, `FCEIL (0xB5)`, `FFLOOR (0xB6)`, `FROUND (0xB7)` and
  `RANDINT (0xB8)`.
- **All results are ordinary blobs.** Every string op allocates a fresh
  `[len|bytes]` blob with the same shape the string pool uses, so computed
  strings and literals are indistinguishable downstream. `split` returns a
  regular list of blobs, which means `for each p in split(s, ",")` and
  `length(split(...))` work with no extra machinery; `replace` is literally
  `join(split(s, old), new)` inside the VM.
- **No new host imports.** `ceil`/`floor`/`round` use the WebAssembly
  `f64.ceil` / `f64.floor` / `f64.nearest` instructions, and `random(n)` is a
  deterministic in-VM xorshift32 so every host (browser, Node, extension)
  observes the same sequence. That keeps the four host functions of Milestone
  7 as the complete host surface.
- **Both compilers.** The bootstrap oracle gains a `BUILTINS` entry per call
  and the self-hosted `emit_call` in `lang/compiler/codegen.sdev` gains the
  matching opcode branch plus its result kind, so `say upper(x)` still picks
  `SAY_STR` and `split()` is typed `liststr`. `contains(h, n)` is sugar,
  emitted as `FIND; PUSH_I32 0; GE`.
- Seven new fixed-point cases (66/66 byte-identical) and seven new runtime
  cases (45/45 passing). Driver artifact rebuilt: bc=13070, pool=575.
  `upper`, `lower`, `trim`, `contains`, `replace`, `split`, `join`, `int`,
  `abs`, `min`, `max`, `ceil` and `round` are no longer v2 parity gaps; only
  `num`, closures/classes, exceptions and `import` remain.

**Milestone 5v (error handling + `num`) — shipped:**
- **New seed opcodes**: `TRY (0xC0) <i16 rel>`, `ENDTRY (0xC1)`,
  `THROW (0xC2)` and `S2F (0xC3)`.
- **Handler stack.** A 16-byte record `[handler_ip | sp | fp | csp]` is pushed
  by `TRY` into a dedicated region at `0x13000` (between the global slots and
  the operand stack). `ENDTRY` pops it. `THROW` pops the message handle,
  unwinds to the newest record — restoring the operand stack, frame pointer
  and call-stack tip — and re-pushes the message so the handler can bind it.
  A throw with no live handler prints the message and halts the program.
- **Surface syntax**: `attempt … rescue [err] … end` and `throw EXPR`. The
  rescue binding is an ordinary local (typed `str`); `rescue` with no name
  drops the message with a `POP`. Because the unwind restores `fp`/`csp`, a
  `throw` from arbitrarily deep inside nested calls lands in the right handler.
- **`num(s)`** parses `[+-]?digits[.digits]` into a boxed f64 via `S2F`,
  mirroring `int(s)`: unparseable input yields `0.0`.
- **Both compilers.** The bootstrap oracle parses `attempt`/`rescue`/`throw`
  as plain identifiers (no new lexer keywords, so `lexer.sdev` is untouched),
  and `codegen.sdev` gained the same emitter plus a `rescue` block terminator.
- Five new fixed-point cases (71/71 byte-identical) and six new runtime cases
  (51/51 passing). Driver artifact rebuilt: bc=13431, pool=612. `try_catch`,
  `rescue`, `throw` and `num` are no longer v2 parity gaps; only
  closures/classes and `import` remain.



**Milestone 5w (first-class function values) — shipped:**
- **New seed opcode**: `CALLV (0xC4) <u8 n_args>` — identical to `CALL`
  except the target code offset is popped off the operand stack instead of
  read from a u16 immediate, so the frame/arg-copy path is shared.
- **Surface syntax**: `ref NAME` evaluates to a function value (the callee's
  byte offset, an ordinary int), and `call TARGET(args)` invokes one. Both
  words stay plain identifiers, so the lexer is untouched.
- **Patching.** `ref` emits `PUSH_I32` with a zero placeholder; forward and
  mutually-recursive references reuse the existing pending-call table. The
  resolver distinguishes the two site shapes by reading the opcode byte in
  front of the patch position: `0x60` → u16 target, otherwise `0x01` → i32.
- Function values are plain ints, so they compose with everything: store them
  in lists and tomes, pass them to functions, build dispatch tables. There is
  no capture — a `ref` closes over nothing, which keeps the calling
  convention identical to a direct `CALL`.
- Three new fixed-point cases (74/74 byte-identical) and four new runtime
  cases (55/55 passing). Driver artifact rebuilt: bc=14025, pool=627.

**Milestone 5x (lambdas + closures) — shipped:**
- **New seed opcodes**: `CLOSURE (0xC5) <u16 code_off> <u8 ncaps>` pops
  `ncaps` values and allocates a heap blob
  `[CLOS_MAGIC 0x7FC105E5][code_off][ncaps][cap0..capN]`; `CALLV (0xC4)`
  now inspects its target — a raw offset (from `ref`) calls directly, a
  closure handle first copies the captured values into the new frame right
  after the arguments, so captures are just trailing locals.
- **Surface syntax**: `make [with p1 p2…] [capture c1 c2…]` NL body `end`.
  Both words stay plain identifiers; the lexer is untouched.
- **Emission order** (identical in `compile.mjs` and `codegen.sdev`):
  load each capture in the *enclosing* scope → `JMP` over the body →
  body at `body_off` with a fresh local scope (params, then captures, then
  the body's own `set`s, sized by an `ENTER`) → `PUSH_I32 0` + `RET` →
  patch the jump → `CLOSURE body_off ncaps`.
- The self-hosted codegen counts the body's extra locals with a
  non-emitting pre-pass over `parse_block`, mirroring the bootstrap's
  `collectSets`, which is what keeps the two byte-identical.
- Capture is by value at creation time. `make` bodies do not nest yet.
- Four new fixed-point cases (78/78 byte-identical) and five new runtime
  cases (60/60 passing). Driver artifact rebuilt: bc=15085, pool=646.
- Parity registry updated: `lambda` is now present on v2 as `make`.

**Milestone 5y (kinds — objects and methods) — shipped:**
- **No VM change.** A kind is pure compiler sugar over tomes + function
  values, so `seed.wat` is byte-for-byte the same as after 5x.
- **Desugaring pre-pass** (`desugarKinds` in `compile.mjs`, `desugar_kinds`
  in `codegen.sdev`, run identically from `compile-self.mjs`): the
  `kind Name` header and its closing `end` are blanked out, and each nested
  `to m with self …` becomes a top-level function `Name_m`. Line count is
  preserved so error lines stay accurate. The pass records, per class, the
  ordered list of `(method key, mangled function name)` pairs.
- **`new Name`** (parentheses optional) emits `TNEW` sized to the method
  count, then one `PUSH_STR key` + function-value push + `TSET` per method.
  An instance is therefore an ordinary tome; fields are keys created on
  first write.
- **Member access**: `obj.f` → `PUSH_STR "f"` + `TGET`; `set obj.f to v` →
  `TSET`; `obj.m(a, b)` → receiver, args, then receiver + `PUSH_STR "m"` +
  `TGET` and `CALLV nargs+1`, so the receiver is the implicit first
  argument.
- **Return typing**: the receiver's class is not tracked statically, so a
  method call is string-typed when *any* declared method of that name
  returns a string (`methodRetType` / `method_ret_type`). Both compilers
  apply the identical rule, which is what keeps them byte-identical.
- Five new fixed-point cases (83/83 byte-identical) and four new runtime
  cases (64/64 passing). Driver artifact rebuilt: bc=17153, pool=666.
  `codegen.sdev` still compiles itself byte-identically.
- Parity registry: `class` → `kind`, `instantiate` → `new` on v2; `self` is
  marked n/a there because it is a plain parameter, not a keyword.
  `inherit` / `super` remain the open v2 OOP gaps.

**Milestone 6b (inheritance — `extends` + `super`) — shipped:**
- **No VM change.** Inheritance, like kinds, is compiler sugar over tomes.
- **Desugaring**: `kind Child extends Parent` blanks the two extra header
  tokens and records the parent index. After the child's own methods are
  collected, the parent's entries are merged in: every parent method the
  child does not override is copied under its own key, and each one also
  gets a class-qualified alias `super_<Child>_<key>` bound to the parent's
  mangled function. Aliases inherited from grandparents are copied verbatim,
  so a `C → B → A` chain carries `super_C_tag` and `super_B_tag`.
- **`super.m(...)`** is rewritten at the token level to
  `self.super_<Class>_m(...)` — three tokens in, three tokens out, so no
  insertion is needed and both compilers stay in lockstep. Because the key
  is qualified with the *lexical* class, super is statically bound and deep
  chains terminate instead of recursing on the receiver's override.
- Registry arrays gained `mth_sup` (alias flag) in `compile-self.mjs`, and
  the JS oracle's method records gained the matching `sup` field.
- Four new fixed-point cases (87/87 byte-identical) and four new runtime
  cases. Driver artifact rebuilt: bc=18576, pool=721.
- Parity registry: `inherit` → `extends` on v2; the v2 OOP column is now
  complete.

**Milestone 6c (native strings, lists and builtins) — shipped:**
- **Heap.** `runtime.s` gained `sdev_alloc`: a bump allocator over one 64 MiB
  anonymous `mmap` region, no free (native runs are short-lived). Two heap
  shapes share a header word: a string is `[i64 byte-len][bytes]` and a list
  is `[i64 count][i64 words]`, so `length(x)` is one load either way.
- **New runtime entry points**: `sdev_concat` (joins two strings into a fresh
  allocation), `sdev_chr` (one-byte string), `sdev_str_int` (decimal text for
  an int64, sign included).
- **Static value kinds** in `codegen-x64.mjs` (`typeOf` + `inferFnTypes`):
  every word is classified `int` / `str` / `list` at compile time, mirroring
  the WASM codegen's rule set. `say` picks `sdev_say_str` vs `sdev_say_int`
  from the inferred kind instead of "is this a literal", `+` lowers to
  `sdev_concat` when either operand is text (ints are coerced through
  `sdev_str_int`), and user function return kinds are inferred in two passes
  so `to greet with n / return "hi " + str(n)` prints as text.
- **Builtins**: `length`, `abs`, `ord(s, i)`, `chr(n)`, `str(v)`,
  `list_new(n)` / `mklist(n)`, plus list literals `[a, b, c]`, indexing
  `xs[i]` and indexed assignment `set xs[i] to v` — all emitted inline.
- Eleven new cases in `scripts/test-native.mjs` (17/17 passing against real
  `as` + `ld` ELFs).
- Parity registry: the eight remaining native `should` gaps are closed —
  **must gaps 0, should gaps 0 across all three tracks.**

**Milestone 6e (native floats and math) — shipped:**
- **Representation.** A float is the raw IEEE-754 bit pattern in a 64-bit
  word — no tag, no box. The compiler already tracks kinds statically, so
  `float` simply joins `int` / `str` / `list` / `tome` and decides which
  instruction family to emit. Float literals become `movabsq $<bits>, %rax`.
- **Arithmetic.** `+ - * /` and all six comparisons emit SSE2
  (`addsd`/`subsd`/`mulsd`/`divsd`, `ucomisd` + `seta/setb/...`) whenever
  either operand's kind is `float`; integer operands are widened inline with
  `cvtsi2sdq`, so `1 + 0.5` and `3.0 * 2` work without explicit casts.
  Unary minus flips the sign bit rather than calling `negq`.
- **Printing.** `sdev_str_float` formats a double by hand: sign extraction,
  `cvttsd2si` for the integer part, ×10^6 + rounding for the fraction,
  trailing-zero trimming (always at least one digit, so `3.0` prints as
  `3.0`), then reuse of `sdev_str_int` / `sdev_concat` / `sdev_chr`.
  `say` dispatches to `sdev_say_float`, and `"pi=" + 3.25` coerces through
  the same formatter.
- **Math in assembly.** `sqrt` is `sqrtsd`; `floor` / `ceil` / `round` are
  built from `cvttsd2si` plus a correction step (no SSE4.1 dependency);
  `sin` / `cos` use x87 `fsin` / `fcos`; `log` is `fldln2` + `fyl2x`; `exp`
  and `pow` share the classic `frndint` / `f2xm1` / `fscale` sequence.
  `random()` is the same xorshift32 generator the seed VM uses, divided by
  2^32 to land in `[0, 1)`. `num("3.5")` is a hand-written decimal parser and
  `int(x)` truncates toward zero.
- **Parameter kinds from call sites.** `inferFnTypes` now walks every call in
  the program and records `@param:<fn>:<i>`, so `to half with n / return n /
  2.0` compiles `n` as a float when it is only ever called with floats.
- Fifteen new cases in `scripts/test-native.mjs` (47/47 passing against real
  `as` + `ld` ELFs); 87/87 fixed-point cases still byte-identical.
- Parity registry: twelve former native `n/a` entries (`num`, `floor`,
  `ceil`, `round`, `sqrt`, `pow`, `sin`, `cos`, `exp`, `log`, `random`,
  `float`) became `should` and are satisfied — **must gaps 0, should gaps 0
  across all three tracks.**

**Milestone 6d (native strings, tomes and for-each) — shipped:**
- **Runtime (`lang/native/runtime.s`)** gained a hand-written string library:
  `sdev_str_eq`, `sdev_index_of`, `sdev_contains`, `sdev_substr`,
  `sdev_upper`, `sdev_lower`, `sdev_trim`, `sdev_replace`, `sdev_split`
  (returns a heap list of pieces), `sdev_join` and `sdev_empty`. `replace`
  and `split` are built out of `index_of` + `substr` + `concat`, so there is
  one matching algorithm rather than three.
- **Tomes natively.** A tome is `[i64 count][i64 cap][cap × (key-ptr, value)]`
  with `cap = 64`, so `length(t)` still reads the header word exactly like
  strings and lists. `sdev_tnew` / `sdev_tfind` / `sdev_tset` / `sdev_tget` /
  `sdev_thas` / `sdev_tkeys` / `sdev_tvals` implement association-list
  lookup keyed by `sdev_str_eq` (value equality, not pointer equality).
- **Codegen (`codegen-x64.mjs`)**: tome literals `{ k: v }` lower to `tnew`
  plus one `tset` per pair; `t["k"]` and `set t["k"] to v` dispatch to
  `tget`/`tset` when the container's inferred kind is `tome`, and stay
  list-indexing otherwise. `is` / `is not` compare text by value when either
  side is a string.
- **Kind inference widened**: a fourth kind `tome` joins `int` / `str` /
  `list`; per-key value kinds are remembered as `@tome:<var>:<key>` and list
  element kinds as `@elem:<var>`, so `say parts[1]` after `split` prints
  text instead of a pointer.
- **`for each x in xs … end`** is lowered natively to a counted index loop
  over two hidden slots named by the loop's foreach depth (`@fe_i<d>`,
  `@fe_s<d>`, sanitised for asm labels); iterating a tome walks its keys.
  Local frames grew from 16 to 32 slots to make room.
- **Builtins added**: `upper`, `lower`, `trim`, `contains`, `index_of`,
  `substring`, `replace`, `split`, `join`, `min`, `max`, `tome_new`, `keys`,
  `values`, `has`.
- Fifteen new cases in `scripts/test-native.mjs` (32/32 passing against real
  `as` + `ld` ELFs); 87/87 fixed-point cases still byte-identical.
- Parity registry: fourteen former native `n/a` entries became `should` and
  are satisfied — **must gaps 0, should gaps 0 across all three tracks.**

**Milestone 6f (native closures, objects, errors, break/continue) — shipped:**
- **Codegen** now parses through `parseWithKinds()` (exported from
  `lang/bootstrap/compile.mjs`), so the x86-64 backend sees the same
  desugared kind/method registry as the WASM track.
- **Function values.** `ref f` allocates a 16-byte block
  `[code-ptr][ncaps]`; `make with p… capture c… end` allocates
  `[code-ptr][ncaps][cap₀…]` and stores each captured value from the
  enclosing frame. `call f(args)` pushes arguments right→left, loads the
  closure pointer into `%r10`, and does `call *(%r10)`; the callee copies
  params from `16(%rbp)…` and captures from `16(%r10)…` into local slots.
  Lambda bodies are emitted after `sdev_main` from a pending queue, so
  nested lambdas are handled by index growth during the emit loop.
- **Objects.** `new K` builds a tome and binds each method as a closure;
  `o.field` and `o.field to v` compile to `sdev_tget`/`sdev_tset`, and
  `o.m(...)` loads the method closure and binds the receiver in `%r10`.
  Inheritance and `super` come for free from the shared desugaring.
- **Errors.** `runtime.s` gained a 64-deep handler stack of
  `(handler, %rsp, %rbp)` triples with `sdev_try_push`, `sdev_try_pop` and
  `sdev_throw`; a throw restores the saved stack registers and jumps to the
  handler with the message pointer in `%rax`. Uncaught throws print
  `uncaught: <msg>` and exit 1.
- **Control flow.** `break`/`continue` use a loop-label stack in the emit
  context; `continue` in `for each` targets the index increment.
- **Return-kind tracking** for function values: `@fnval:<var>` records what
  a `ref`/lambda bound to a variable returns, so `say call f(x)` selects
  `sdev_say_str` vs `sdev_say_int` correctly.
- Tests: 62/62 in `scripts/test-native.mjs`; 87/87 fixed-point cases still
  byte-identical.



**Milestone 6g (native host I/O and modules) — shipped:**
- **`runtime.s`** gained a small POSIX layer, all direct syscalls, no libc:
  `sdev_cstr` (NUL-terminated copy of a length-prefixed string),
  `sdev_read_file` (open/lseek/read loop, returns `""` on any error),
  `sdev_write_file` (`O_WRONLY|O_CREAT|O_TRUNC`, mode 0644, returns 1/0),
  `sdev_file_exists` (`access(F_OK)`), and `sdev_input`
  (byte-at-a-time read from stdin up to a newline, 4088-byte cap).
- **Codegen**: `read_file`/`input` join the string-typed builtins,
  `write_file`/`file_exists` the int-typed ones, so `say read_file(p)`
  selects `sdev_say_str` automatically.
- **Modules**: `generateAsm(source, { readModule })` threads a resolver into
  the shared `prelink` pass; `scripts/sdev-native.mjs` resolves `use "path"`
  relative to the importing file first, then the CWD.
- Tests: six new cases (68/68 in `scripts/test-native.mjs`, run in a temp
  cwd with stdin piped); 87/87 fixed-point cases still byte-identical.
- Parity: `read_file` / `write_file` moved from `n/a` to `should` on the
  native track — **must gaps 0, should gaps 0.**

**Milestone 5z (modules — `use "path"`) — shipped:**
- **No VM change.** Modules are a source→source prelink pass that runs
  before lexing, so the seed VM is untouched since 5x.
- **Pass**: `prelink()` in `lang/bootstrap/compile.mjs` and
  `prelink_source` in `lang/compiler/codegen.sdev` implement the identical
  algorithm — walk the source line by line, and when a trimmed line is
  exactly `use "path"`, splice in the recursively prelinked text of that
  file followed by a newline; every other line is copied verbatim with its
  newline. Include-once is tracked by path (a `Set` in JS, a `|`-delimited
  global string in sdev), so diamond dependencies emit a module once.
- **Resolution is the host's job**: the self-hosted compiler reads modules
  with `read_file(path)`. `compile-self.mjs` now answers `<stdin>` with the
  program under compilation and any other path from an optional module map,
  falling back to disk under Node. The driver program gained a single line,
  `set src to prelink_source(src)`, between the codegen and the inline
  lexer.
- **Bootstrap API**: `compile(source, { readModule })`; `setModuleReader()`
  lets a host (browser IDE) override resolution globally.
- Two new runtime cases (66/66 passing), 83/83 fixed-point cases still
  byte-identical, driver artifact rebuilt: bc=17475, pool=683.
- Parity: `import` on v2 is now `use`; `inherit` / `super` are the last two
  v2 gaps in the registry.

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
| `length` | core | `measure` | `length` | `length` |
| `concat` | text | `etch` | `concat` | `concat` |
| `ord` | text | `ord` | `ord` | `ord` |
| `chr` | text | `chr` | `chr` | `chr` |
| `str` | text | `str` | `str` | `str` |
| `int` | types | `int` | `int` | `int` |
| `num` | types | `num` | `num` | `num` |
| `list_new` | list | `gather` | `mklist` | `list_new` |
| `list_get` | list | `pluck` | `mklist` | `index` |
| `upper` | text | `upper` | `upper` | `upper` |
| `lower` | text | `lower` | `lower` | `lower` |
| `trim` | text | `trim` | `trim` | `trim` |
| `contains` | text | `contains` | `contains` | `contains` |
| `replace` | text | `replace` | `replace` | `replace` |
| `split` | text | `shatter` | `split` | `split` |
| `join` | text | `weave` | `join` | `join` |
| `abs` | math | `abs` | `fabs` | `abs` |
| `min` | math | `least` | `min` | `min` |
| `max` | math | `greatest` | `max` | `max` |
| `floor` | math | `ground` | `f2i` | `floor` |
| `ceil` | math | `elevate` | `fceil` | `ceil` |
| `round` | math | `nearby` | `fround` | `round` |
| `sqrt` | math | `root` | `fsqrt` | `sqrt` |
| `pow` | math | `pow` | `fpow` | `pow` |
| `sin` | math | `sin` | `fsin` | `sin` |
| `cos` | math | `cos` | `fcos` | `cos` |
| `exp` | math | `exp` | `fexp` | `exp` |
| `log` | math | `ln` | `flog` | `log` |
| `random` | math | `rand` | `random` | `random` |
| `range` | list | `range` | `range` | — |
| `sum` | list | `sum` | `sum` | — |
| `keys` | tome | `tome_keys` | `keys` | `keys` |
| `read_file` | io | `read_file` | `read_file` | `read_file` |
| `write_file` | io | `write_file` | `write_file` | `write_file` |
| `http_get` | net | `http_get` | `http_get` | — |
| `var_decl` | syntax | `forge` | `set` | `set` |
| `assign` | syntax | `be` | `set` | `set` |
| `if` | syntax | `either` | `if` | `if` |
| `else` | syntax | `otherwise` | `else` | `else` |
| `while` | syntax | `cycle` | `while` | `while` |
| `for_each` | syntax | `iterate` | `each` | `foreach` |
| `break` | syntax | `yeet` | `break` | `break` |
| `continue` | syntax | `skip` | `continue` | `continue` |
| `function` | syntax | `conjure` | `to` | `call` |
| `return` | syntax | `yield` | `return` | `return` |
| `params` | syntax | `conjure` | `with` | `call` |
| `recursion` | syntax | `conjure` | `to` | `call` |
| `lambda` | syntax | `ARROW` | `make` | — |
| `class` | oop | `essence` | `kind` | — |
| `inherit` | oop | `extend` | `extends` | — |
| `self` | oop | `self` | — | — |
| `super` | oop | `super` | `super` | — |
| `instantiate` | oop | `new` | `new` | — |
| `try_catch` | errors | `attempt` | `attempt` | — |
| `rescue` | errors | `rescue` | `rescue` | — |
| `throw` | errors | `throw` | `throw` | — |
| `logic_and` | syntax | `also` | `and` | `and` |
| `logic_or` | syntax | `within` | `or` | `or` |
| `logic_not` | syntax | `nope` | `not` | `un` |
| `equality` | syntax | `equals` | `is` | `is` |
| `inequality` | syntax | `differs` | `not` | `isnot` |
| `bool_true` | types | `yep` | `true` | `true` |
| `bool_false` | types | `nope` | `false` | `false` |
| `nothing` | types | `void` | `nothing` | `nothing` |
| `list_literal` | types | `gather` | `mklist` | `list` |
| `tome_literal` | types | `tome_keys` | `tome_literal` | `tome` |
| `import` | modules | `summon` | `use` | — |
| `float` | types | `num` | `i2f` | `float` |
| `string` | types | `str` | `str` | `str` |
| `values` | tome | `values` | `values` | `values` |
| `has` | tome | `has` | `has` | `has` |
| `py_print` | python | `print` | — | — |
| `py_str` | python | `str` | — | — |
| `py_repr` | python | `repr` | — | — |
| `py_int` | python | `int` | — | — |
| `py_float` | python | `float` | — | — |
| `py_bool` | python | `bool` | — | — |
| `py_complexish` | python | `complexish` | — | — |
| `py_bytes` | python | `bytes` | — | — |
| `py_list` | python | `list` | — | — |
| `py_tuple` | python | `tuple` | — | — |
| `py_set` | python | `set` | — | — |
| `py_frozenset` | python | `frozenset` | — | — |
| `py_dict` | python | `dict` | — | — |
| `py_len` | python | `len` | — | — |
| `py_range` | python | `range` | — | — |
| `py_enumerate` | python | `enumerate` | — | — |
| `py_zip` | python | `zip` | — | — |
| `py_zip_longest` | python | `zip_longest` | — | — |
| `py_map` | python | `map` | — | — |
| `py_filter` | python | `filter` | — | — |
| `py_any` | python | `any` | — | — |
| `py_all` | python | `all` | — | — |
| `py_sorted` | python | `sorted` | — | — |
| `py_reversed` | python | `reversed` | — | — |
| `py_min` | python | `min` | — | — |
| `py_max` | python | `max` | — | — |
| `py_sum` | python | `sum` | — | — |
| `py_abs` | python | `abs` | — | — |
| `py_round` | python | `round` | — | — |
| `py_pow` | python | `pow` | — | — |
| `py_divmod` | python | `divmod` | — | — |
| `py_bin` | python | `bin` | — | — |
| `py_oct` | python | `oct` | — | — |
| `py_hex` | python | `hex` | — | — |
| `py_type` | python | `type` | — | — |
| `py_isinstance` | python | `isinstance` | — | — |
| `py_issubclass` | python | `issubclass` | — | — |
| `py_getattr` | python | `getattr` | — | — |
| `py_setattr` | python | `setattr` | — | — |
| `py_hasattr` | python | `hasattr` | — | — |
| `py_delattr` | python | `delattr` | — | — |
| `py_vars` | python | `vars` | — | — |
| `py_dir` | python | `dir` | — | — |
| `py_callable` | python | `callable` | — | — |
| `py_id` | python | `id` | — | — |
| `py_hash` | python | `hash` | — | — |
| `py_format` | python | `format` | — | — |
| `py_iter` | python | `iter` | — | — |
| `py_next` | python | `next` | — | — |
| `py_send` | python | `send` | — | — |
| `py_close` | python | `close` | — | — |
| `py_collect` | python | `collect` | — | — |
| `py_property` | python | `property` | — | — |
| `py_staticmethod` | python | `staticmethod` | — | — |
| `py_classmethod` | python | `classmethod` | — | — |
| `py_wraps` | python | `wraps` | — | — |
| `py_cache` | python | `cache` | — | — |
| `py_partial` | python | `partial` | — | — |
| `py_reduce` | python | `reduce` | — | — |
| `py_dataclass` | python | `dataclass` | — | — |
| `py_count` | python | `count` | — | — |
| `py_cycle` | python | `cycle` | — | — |
| `py_repeat` | python | `repeat` | — | — |
| `py_chain` | python | `chain` | — | — |
| `py_islice` | python | `islice` | — | — |
| `py_product` | python | `product` | — | — |
| `py_permutations` | python | `permutations` | — | — |
| `py_combinations` | python | `combinations` | — | — |
| `py_accumulate` | python | `accumulate` | — | — |
| `py_groupby` | python | `groupby` | — | — |
| `py_Counter` | python | `Counter` | — | — |
| `py_defaultdict` | python | `defaultdict` | — | — |
| `py_namedtuple` | python | `namedtuple` | — | — |
| `py_deque` | python | `deque` | — | — |
| `py_OrderedDict` | python | `OrderedDict` | — | — |
| `py_union` | python | `union` | — | — |
| `py_intersection` | python | `intersection` | — | — |
| `py_difference` | python | `difference` | — | — |
| `py_symmetric_difference` | python | `symmetric_difference` | — | — |
| `py_issubset` | python | `issubset` | — | — |
| `py_set_add` | python | `set_add` | — | — |
| `py_set_remove` | python | `set_remove` | — | — |
| `py_keys` | python | `keys` | — | — |
| `py_values` | python | `values` | — | — |
| `py_items` | python | `items` | — | — |
| `py_get` | python | `get` | — | — |
| `py_setdefault` | python | `setdefault` | — | — |
| `py_update` | python | `update` | — | — |
| `py_pop` | python | `pop` | — | — |
| `py_slice_assign` | python | `slice_assign` | — | — |
| `py_module` | python | `module` | — | — |
| `py_truthy` | python | `truthy` | — | — |
| `py_is_generator` | python | `is_generator` | — | — |
| `py_freeze` | python | `freeze` | — | — |
| `py_ascii` | python | `ascii` | — | — |
| `pysyn_generator` | python-syntax | `generator` | — | — |
| `pysyn_with` | python-syntax | `with` | — | — |
| `pysyn_as` | python-syntax | `as` | — | — |
| `pysyn_match` | python-syntax | `match` | — | — |
| `pysyn_case` | python-syntax | `case` | — | — |
| `pysyn_async` | python-syntax | `async` | — | — |
| `pysyn_await` | python-syntax | `await` | — | — |
| `pysyn_lambda` | python-syntax | `lambda` | — | — |
| `pysyn_assert` | python-syntax | `assert` | — | — |
| `pysyn_del` | python-syntax | `del` | — | — |
| `pysyn_global` | python-syntax | `global` | — | — |
| `pysyn_nonlocal` | python-syntax | `nonlocal` | — | — |
| `pysyn_pass` | python-syntax | `pass` | — | — |
| `pysyn_raise` | python-syntax | `raise` | — | — |
| `pysyn_from` | python-syntax | `from` | — | — |
| `pysyn_finally` | python-syntax | `finally` | — | — |
| `pysyn_in` | python-syntax | `in` | — | — |
| `pysyn_not` | python-syntax | `not` | — | — |
| `pysyn_is` | python-syntax | `is` | — | — |
| `pysyn_elif` | python-syntax | `elif` | — | — |
| `pysyn_try` | python-syntax | `try` | — | — |
| `pysyn_except` | python-syntax | `except` | — | — |
| `pysyn_class` | python-syntax | `class` | — | — |
| `pysyn_def` | python-syntax | `def` | — | — |
| `pysyn_import` | python-syntax | `import` | — | — |
| `pysyn_return` | python-syntax | `return` | — | — |
| `pysyn_while` | python-syntax | `while` | — | — |
| `pysyn_for` | python-syntax | `for` | — | — |
| `pysyn_break` | python-syntax | `break` | — | — |
| `pysyn_continue` | python-syntax | `continue` | — | — |
| `pysyn_true` | python-syntax | `true` | — | — |
| `pysyn_false` | python-syntax | `false` | — | — |
| `pysyn_none` | python-syntax | `none` | — | — |
| `pysyn_and` | python-syntax | `and` | — | — |
| `pysyn_or` | python-syntax | `or` | — | — |

<!-- PARITY:END -->
