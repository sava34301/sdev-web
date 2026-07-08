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

**Milestone 5l (JS bootstrap retirement) — next:**
- With the self-hosted compiler byte-identical to `lang/bootstrap/compile.mjs`,
  the bootstrap has no functional role beyond serving as the differential
  oracle for the test suite. The next milestone rewires the IDE and the
  web runtime to compile via the self-hosted codegen and removes
  `lang/bootstrap/compile.mjs`, its reference runtime in `lang/runtime/v2.js`,
  and any lingering direct imports in `src/lang-bridge/` and
  `scripts/build-compiler.ts`.

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
  compiler/             # .sdev sources: lexer, parser, typecheck, ir, codegen
  runtime/
    v2.js               # Milestone 1 reference runtime (pure JS)
    vm.sdev             # Milestone 2 VM
    kernel.sdev         # tasks, syscalls, GC
    std/                # standard library modules (.sdev)
  paradigms/            # functional, systems, data, hardware — .sdev
  translator/           # 26-language keyword tables + engine — .sdev
  legacy/
    v1_frontend.sdev    # refine mode: parses forge/conjure/:: /;; into v2 AST

src/lang-bridge/        # thin TS glue — the ONLY TS in the exec path
  bridge.ts             # picks runtime and dispatches
  v2.d.ts               # ambient types for lang/runtime/v2.js

dist/
  sdev-core.wasm        # shipped artifact (Milestone 2)
```

## Verification

Before every launch:

1. `scripts/test-v2-goldens.mjs` — every example in `SDEV_V2_DOCUMENTATION.md`
   runs; stdout is diffed against a recorded transcript.
2. `scripts/test-v1-parity.mjs` — every legacy `.sdev` file runs under refine
   mode; stdout must match the TS interpreter byte-for-byte.
3. `scripts/test-hardware.mjs` — every `board` block transpiles; output is
   diffed against a checked-in `.ino` snapshot.
4. Playwright smoke — open `/ide`, load `blink.sdev`, click Run, verify
   the canvas and output panels render.

## Why not just keep the TypeScript interpreter?

Because SDEV wants to be a real language, not a project's DSL. Every serious
language is written in itself. Self-hosting proves the design is complete
enough to describe itself, and gives the community a single artifact
(`sdev-core.wasm`) that runs the same anywhere WebAssembly runs — browser,
Node, Deno, Bun, wasmtime, a microcontroller with a WASM interpreter.
