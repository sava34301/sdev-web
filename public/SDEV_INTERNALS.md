# SDEV Internals — the self-hosted compiler

This is a contributor document. If you just want to write SDEV, read
`SDEV_V2_DOCUMENTATION.md` instead.

## Design goal

The SDEV language is **not written in TypeScript**. It is written in SDEV
itself, compiled to WebAssembly, and shipped as a single `.wasm` binary the
browser IDE loads. TypeScript only survives in a thin bridge that connects
the WASM module to browser APIs (DOM, canvas, Web Serial, fetch, storage).

## Where we are today (Milestone 1 — Launch)

- **`lang/runtime/v2.js`** — the v2 language, implemented in pure JavaScript
  (zero TypeScript, zero dependencies). This is the reference runtime the
  IDE uses right now.
- **`src/lang/index.ts`** — the *only* TS file that touches execution. It
  picks between v1 (legacy TS runtime) and v2 (this JS runtime) per file.
- **`src/lang-bridge/`** — reserved for the future WASM bridge. Currently
  re-exports the same `execute()` for callers that want to be explicit.

Milestone 1 satisfies "detach from TypeScript" at the *language* layer:
no part of the v2 lexer, parser, or interpreter is written in TypeScript.

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
