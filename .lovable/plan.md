
# SDEV v2 "Prism" — Self-Hosted, Easy, Multi-Paradigm

## Guiding rule (new)

**Readability first.** The syntax must read like plain English at a glance. No sigils a beginner has to memorize, no type annotations required, no ceremony. All the "combine every language" power lives *inside* the language, but the surface a user writes stays tiny and friendly.

## Goal (unchanged)

Detach the SDEV language completely from TypeScript. Compiler, VM, kernel, graphics, translator, hardware emitter — all written in SDEV itself and shipped as a WebAssembly module. TypeScript stays only as thin browser glue (DOM, canvas, Web Serial, fetch).

## The new syntax — simple by default

Two rules cover 90% of programs:

1. **One line = one action.** No `::` / `;;` blocks required. Indentation groups things, like Python.
2. **English words, no symbols.** `set`, `to`, `if`, `else`, `for`, `each`, `while`, `do`, `end`, `is`, `not`, `and`, `or`.

```text
# hello.sdev — this is a complete program
say "hello, world"

# variables
set name to "Ada"
set age to 30
say "hi " + name

# if / else
if age is 18 or more
  say "adult"
else
  say "kid"
end

# loops
for each item in [1, 2, 3]
  say item
end

# functions
to greet with who
  say "hello, " + who
end

greet with "world"
```

That's the whole beginner surface. `set … to`, `to … end` (functions), `if … end`, `for each … end`, `while … end`, `say`, `ask`. A ten-year-old can read it.

### Power available when you want it — never required

Paradigm keywords are opt-in blocks. Beginners never see them.

```text
# functional: pattern matching + pipelines
match result
  ok x   -> say x
  error e -> say "oops: " + e
end

numbers | keep (n -> n > 0) | double | sum   # pipelines with a single |

# systems: manual memory when you need speed / hardware
systems
  set buf to bytes 1024
  buf[0] to 42
end

# data: SQL-ish queries built in
set adults to from u in users where u.age >= 18 take u.name

# hardware: unchanged intent, easier surface
board "uno"
  pin 13 is output
  forever
    turn 13 on ; wait 500ms
    turn 13 off; wait 500ms
  end
end
```

### What we're dropping vs. v1

- Gone: `::`, `;;`, `forge`, `conjure`, `iterate…through`, `yeet`, `yep`/`nope`.
- Kept as aliases in **refine mode** (`#!sdev v1` at the top of a file) so every existing `.sdev` file keeps running.
- New booleans: plain `true` / `false`. New null: `nothing`.

## Architecture: no host language

Same self-hosted bootstrap as before. The IDE loads one WASM file that IS the language.

```text
+---------------------------------------------------------+
|  Browser IDE (React shell)                              |
|  +------------------+     +--------------------------+  |
|  |  sdev-core.wasm  | <-> |  ts-bridge (~400 lines)  |  |
|  |  (compiled from  |     |  DOM, canvas, WebSerial  |  |
|  |   SDEV sources)  |     |  fetch, localStorage     |  |
|  +------------------+     +--------------------------+  |
+---------------------------------------------------------+
```

Three-stage bootstrap (done once, artifacts checked in):

1. `bootstrap/seed.wat` — small hand-written WebAssembly text. Runs a minimal SDEV subset.
2. `bootstrap/stage1.wasm` — full compiler written in that subset. Emits WASM.
3. `dist/sdev-core.wasm` — the real compiler, rewritten in full SDEV, self-compiled.

After stage 3, SDEV compiles SDEV. TypeScript never touches language logic again.

## Scope (per your prior answer: everything)

Moves to SDEV/WASM: lexer, parser, AST, type checker, IR, optimizer, WASM codegen, VM (REPL fallback), kernel + scheduler + GC, graphics command emitter, 26-language translator, `board` → C++ emitter, gist/library loader.

Stays in TypeScript (glue only): CodeEditor UI, CanvasPanel renderer, HardwarePanel Web Serial calls, Supabase client, IDE routing. All go through a narrow FFI (`sdev_compile`, `sdev_run`, `sdev_step`, `sdev_emit_graphics`, `sdev_translate`, `sdev_transpile_board`).

## Paradigms included (per your prior answer: all four)

- **Scripting** (default surface above)
- **Functional** — `match`, algebraic types (`type Result = ok x | error e`), pipelines with `|`, `pure` blocks
- **Systems** — `systems` blocks: pointers, structs, manual memory, FFI to C
- **Data/query** — `from … where … take` queries over lists, tables, or external SQL sources

All four share the same easy base syntax — no extra punctuation to learn.

## Repo layout

```text
lang/                      # NEW — SDEV sources for the language itself
  bootstrap/
    seed.wat
    seed.wasm              # built artifact
    stage1.wasm            # built artifact
  compiler/
    lexer.sdev
    parser.sdev
    ast.sdev
    typecheck.sdev
    ir.sdev
    wasm_codegen.sdev
    optimizer.sdev
  runtime/
    vm.sdev
    kernel.sdev
    std/                   # standard library modules
  paradigms/
    functional.sdev
    systems.sdev
    data.sdev
    hardware.sdev
  translator/
    keywords.sdev          # 26-language keyword tables
    engine.sdev
  legacy/
    v1_frontend.sdev       # refine mode: forge/conjure/:: /;;  aliases

build/
  build.mjs                # runs stage0 → stage1 → stage2
dist/
  sdev-core.wasm           # shipped

src/lang-bridge/           # RENAMED from src/lang/ — TS glue only
  ffi.ts
  bridge.ts
  graphics-render.ts
  hardware-serial.ts

src/lang/                  # DELETED after migration (types.d.ts kept for FFI)
```

## Refine fallback (safety net for launch)

If any v2 subsystem isn't polished in time, the file falls back to v1 syntax with `#!sdev v1` on line 1. The v2 compiler still handles it via `lang/legacy/v1_frontend.sdev`. Zero broken examples, zero broken user files at launch.

## Documentation

- Rewrite `public/SDEV_DOCUMENTATION.md` — v2 syntax, beginner-first.
- New `public/SDEV_PARADIGMS.md` — opt-in power features.
- New `public/SDEV_INTERNALS.md` — bootstrap, WASM ABI, contributor guide.
- Update `public/SDEV_HARDWARE_DOCUMENTATION.md` for the new `board` block.
- New `public/SDEV_MIGRATION_V1_TO_V2.md` — refine mode + porting recipes.
- Update `public/SDEV_LEAFLET_DOCUMENTATION.md` for the new imports.
- Update `src/components/LanguageReference.tsx` to teach the easy surface first.

## Verification ("check if everything works")

1. **Golden-file tests** — every example in the docs is executed by `sdev-core.wasm`, output diffed against a recorded transcript.
2. **v1 parity harness** — every existing `.sdev` file runs under refine mode; output must match the old TS interpreter byte-for-byte.
3. **Hardware transpile snapshots** — every `board` block compared against a checked-in `.ino`.
4. **IDE Playwright smoke** — open `/ide`, load `blink.sdev`, compile, verify WASM loads, canvas and output panels render.
5. **Translator round-trip** — for each of 26 languages, translate a canonical sample there and back, assert AST equality.

## Execution phases (ordered, each shippable)

1. **Bootstrap seed** — write `seed.wat`, define `sdev-min`, produce `seed.wasm`. Ship nothing yet.
2. **Stage 1 compiler** in `sdev-min` — targets WASM, no optimizer, no types. Produces `stage1.wasm`.
3. **Stage 2 full compiler** in SDEV — with types, IR, optimizer. Self-recompiles. `sdev-core.wasm` is real.
4. **TS bridge + IDE swap** — replace `src/lang/*` imports with `src/lang-bridge/bridge.ts`. IDE, playground, translator, hardware panel all call the WASM. Old TS files deleted.
5. **Paradigm modules** — functional, systems, data, hardware layered on stage 2.
6. **Refine mode** — v1 front-end plugged in so every existing `.sdev` file still runs.
7. **Docs rewrite + verification suite** — all doc files, all five test harnesses, green before launch.

## Risks & mitigations

- **Timeline** — self-hosting is the biggest single task in the project. Mitigation: refine mode lets us ship v1 syntax on the v2 engine even if v2 polish slips.
- **WASM debugging** — harder than TS stack traces. Mitigation: compiler emits source maps + a `--trace` REPL from day one.
- **Bundle size** — target ≤ 400 KB gzipped for `sdev-core.wasm`. If we blow past it, split into `sdev-core.wasm` (compiler) + `sdev-runtime.wasm` (VM/kernel), lazy-loaded.
- **Bootstrap trust** — `seed.wasm` is a binary artifact. Mitigation: `seed.wat` is human-readable and re-built by CI with `wat2wasm` on every PR.

Approve and I start with phase 1 (the bootstrap seed), then land phases in order, each behind a feature flag so the live site keeps working until we flip the switch.
