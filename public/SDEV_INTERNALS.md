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

**Milestone 5g (functions + full self-compile) — next chunk:**
- Extend `codegen.sdev` to handle function declarations
  (`to name with … end`), `return`, string literals, and list literals.
- Self-compile: have `codegen.sdev` compile its own source to bytecode,
  then re-run that bytecode to compile itself again, and diff the two
  byte streams. When the diff is empty, the JS bootstrap compiler AND
  the JS reference runtime are both deleted.

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
