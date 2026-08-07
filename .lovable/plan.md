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

### Phase 2 — Close the v2 reference-runtime gap (the big one)
`lang/runtime/v2.js` gains v1's whole *portable* surface, in v2 naming, with
v1 names kept as aliases so v1 code keeps working:
- strings (~30), lists (~40), tomes (~12), math + bitwise + bases (~50),
  time, functional, type predicates, JSON, base64, random.
- Syntax: `try`/`catch`, `break`, `continue`, dict literals + iteration,
  lambdas, ternary, `match`, classes with inheritance, `summon`.

### Phase 3 — Host-backed areas without reimplementation
Graphics, UI, web builder, kernel, matrix, FFI and hardware are already
environment-driven modules in `src/lang/`. Instead of rewriting them, v2 gets
a thin adapter that registers the *same* modules into the v2 environment, so
both versions share one implementation and can never drift.

### Phase 4 — Compiled tracks
Registry-driven, in the existing milestone order: 5q (floats + host I/O in the
self-hosted codegen), then lists/builtins in the native x86-64 backend. Every
step is gated by the parity report rather than by hand-written checklists.

### Phase 5 — Documentation
The agent regenerates the parity matrix into `SDEV_DOCUMENTATION.md`,
`SDEV_V2_DOCUMENTATION.md`, `SDEV_FULL_DOCUMENTATION.md` and a new
`SDEV_PARITY_DOCUMENTATION.md` (registered on `/docs`), plus a per-feature
reference table generated from the registry so docs can no longer fall behind
the implementation.

## Technical notes

- The registry is data, not code: adding a builtin means one JSON entry plus
  the implementation; the agent proves it landed on every required track.
- The agent runs on the v1 interpreter through the existing sdev runner, the
  same way `lang/stdlib/ml/*.sdev` already does.
- Alias policy: v1 names never break; v2 names are the documented ones.
- Existing gates (`test-self-toolchain`, `test-shim-fixed-point`,
  `test-driver-artifact`, `test-wasm-runtime`, `test-native`, `test-ml-stdlib`)
  must stay green throughout; `test-parity` joins them.

## Scale

Phases 0–2 are the bulk of the user-visible parity and land first. Phases 3–5
follow in the same working style as the previous milestones.
