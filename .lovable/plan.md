# v1 ↔ v2 Feature Parity + a self-hosted Parity Agent

## What the audit found

Two inventories were taken of the whole tree.

**sdev v1** (the TypeScript implementation) is enormous: ~400 builtins across
core/string/list/tome/math/bitwise/time/functional/file/net/matrix/graphics/
UI/web/kernel/FFI/hardware, plus classes (`essence`/`extend`/`new`/`self`/
`super`), `attempt … rescue`, `yeet`/`skip`, `iterate … through`, lambdas
(`->`), pipelines (`|>`), ternary (`~ :`), `summon` gist imports, a 26-language
translator, and an alternate bytecode VM.

**sdev v2** has three execution tracks, all far narrower:

| Track | Today |
|---|---|
| `lang/runtime/v2.js` (reference runtime, what the IDE runs) | 20 builtins, no classes, no try/catch, no break/continue, no dict iteration |
| bootstrap + self-hosted compiler → seed WASM VM | 6 builtins in the self-hosted codegen, 20 in the bootstrap |
| native x86-64 backend | ints/strings/control flow only — no lists, floats, or builtins |

"Same features everywhere" cannot mean "every track gets 400 builtins" — the
seed VM is a 2 MiB stack machine on purpose. It means: **one canonical feature
list, one place that decides which track must implement what, and a machine
that keeps all of it honest.**

## The plan

### Phase 0 — Canonical feature registry
Create `lang/parity/features.json`: one entry per feature (name, area, kind,
signature, docs anchor) and a required-support level per track:

```text
must    – the track is broken without it
should  – expected, gap is a bug
n/a     – physically impossible on that track (e.g. canvas on the seed VM)
```

This file becomes the single source of truth for both the agent and the docs.

### Phase 1 — The Parity Agent, written in sdev
`lang/parity/agent.sdev` (runs on sdev, per the requirement):
- loads the registry and the source of every track,
- probes each track for each feature (name-presence scan + executable smoke
  snippet where one exists),
- prints a gap report and writes `lang/parity/report.json`,
- regenerates the generated doc sections (parity matrix tables inside the v1,
  v2, and full documentation files) between marker comments,
- fails loudly when a `must` feature is missing — wired into CI as
  `scripts/test-parity.mjs`, so any future language change that lands on one
  track and not the others turns the suite red.

New tracks (a v3, another backend) are added by appending a column to the
registry — the agent picks them up with no code change.

### Phase 2 — Grow the self-hosted language, not the JS runtime

Every v2 feature must be self-hosted: written in sdev, compiled by the
sdev-written compiler, executed on the seed VM. `lang/runtime/v2.js` is
demoted to a **conformance oracle** — it keeps running only so the parity
agent can diff its answers against the self-hosted result. It receives no new
features and is no longer reachable from the app.

**Already done (this turn):** the IDE, the language bridge and every caller
now route v2 exclusively to the self-hosted compiler on the seed VM. The
JavaScript fallback is gone: a program the self-hosted compiler cannot compile
yet reports exactly that instead of quietly running on a different engine.



The parity surface needs language power the self-hosted compiler does not have
yet, so it is built first, in `lexer.sdev` / `parser.sdev` / `codegen.sdev`
plus new seed VM opcodes, each step preserving the byte-identical fixed point:

| Step | Adds |
|---|---|
| 5q | float literals + float typing, `read_file` / `write_file` / `http_get` |
| 5r | `and` / `or` / `not`, unary minus, `true` / `false` / `nothing` |
| 5s | `break`, `continue`, `for each … in`, `else if` |
| 5t | tomes (dict literal, `k: v` access, key iteration) — new heap shape + opcodes |
| 5u | closures and lambdas (`->`) — upvalue capture, first-class functions |
| 5v | `try` / `catch` + `throw` — VM unwind opcodes |
| 5w | classes: `essence` / `extend` / `new` / `self` / `super` — vtable on the heap |
| 5x | varargs and default parameters, `|>` pipeline, ternary, `match` |

### Phase 3 — The stdlib itself, in sdev

With the language capable, v1's portable surface is written **in sdev** under
`lang/stdlib/v2/`, one module per area, compiled through the self-hosted
compiler and shipped as bytecode artifacts the way the driver already is:

```text
lang/stdlib/v2/  text.sdev  list.sdev  tome.sdev  math.sdev  bits.sdev
                 time.sdev  func.sdev  json.sdev  types.sdev  random.sdev
```

No JavaScript implementations, no aliasing shims in the host — v1 names are
provided as sdev-level aliases inside these modules.

### Phase 4 — Host boundary for the things sdev cannot do alone

Canvas pixels, DOM, sockets and devices live outside the VM by nature. Rather
than reimplementing them in JS per version, the VM gets **one** generic
`SYSCALL` opcode (id + argument list) and a small documented syscall table.
Graphics, UI, web, kernel, matrix, FFI and hardware then become sdev libraries
in `lang/stdlib/v2/` that call syscalls — the logic is self-hosted, only the
raw effect crosses the boundary.

### Phase 5 — Native backend and documentation

The x86-64 backend is brought up to the same registry level (lists, strings,
builtins, floats) so a self-hosted program behaves identically compiled or
interpreted. The agent then regenerates the parity matrix into
`SDEV_DOCUMENTATION.md`, `SDEV_V2_DOCUMENTATION.md`,
`SDEV_FULL_DOCUMENTATION.md` and a new `SDEV_PARITY_DOCUMENTATION.md`
(registered on `/docs`), including a per-feature table generated from the
registry.

## Technical notes

- The registry is data, not code: adding a builtin means one JSON entry plus
  the sdev implementation; the agent proves it landed on every required track.
- The agent runs on sdev. It targets the self-hosted toolchain and uses the JS
  runtime only as the differential oracle it compares against.
- Self-hosting invariant: after every step the compiler must still compile
  itself byte-identically, so each language addition is proved by the existing
  fixed-point gate before the stdlib depends on it.
- Seed VM memory (2 MiB, 32-bit cells) grows as tomes, closures and exceptions
  land; heap layout changes are documented in `SDEV_INTERNALS.md`.
- Existing gates (`test-self-toolchain`, `test-shim-fixed-point`,
  `test-driver-artifact`, `test-wasm-runtime`, `test-native`, `test-ml-stdlib`)
  must stay green throughout; `test-parity` joins them.

## Scale

This is a long series of milestones, not one change. Phases 0–1 land first and
make the remaining gap measurable; Phase 2 then proceeds one language step at
a time, each one shippable and each one keeping the fixed point intact.

