# lang/ — SDEV language sources

This directory holds the SDEV language itself. It is **not** application code.

## Status

Milestone 1 (this launch) — **shipped**:
- `runtime/v2.js` — the v2 "Prism" runtime, written in **pure JavaScript** with
  zero TypeScript and zero external dependencies. Implements the full
  beginner-first v2 surface syntax (`say`, `set … to`, `if/else/end`,
  `for each … in … end`, `while … end`, `to <name> with … end`, pipelines,
  lists, comparisons, boolean logic, arithmetic).
- `src/lang-bridge/bridge.ts` — the *only* remaining TypeScript file in the
  execution path. It picks v1 or v2 per file and delegates.

Milestone 2 (post-launch) — **scaffolded**:
- `bootstrap/` — hand-written WebAssembly seed that will execute a minimal
  SDEV subset (`sdev-min`). No TypeScript, no other host language.
- `compiler/` — the real compiler, written in SDEV, compiled by the seed.
- `runtime/vm.sdev`, `runtime/kernel.sdev`, `runtime/std/` — VM + kernel +
  standard library, written in SDEV.
- `paradigms/` — opt-in blocks: functional (`match`, ADTs, pipelines),
  systems (pointers, structs, FFI), data (SQL-ish queries), hardware
  (`board` → C++).
- `translator/` — the 26-language keyword translator, written in SDEV.
- `legacy/v1_frontend.sdev` — refine-mode: parses v1 keywords
  (`forge`, `conjure`, `::`, `;;`) into the v2 AST.

## Runtime selection (today)

Choose per file with a shebang:

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

Or globally with `localStorage.sdev_runtime = "v2"` in the IDE console.

Default without a shebang is **v1** while we finish the v2 golden-file suite.

## Build (Milestone 2, when implemented)

```
node build/build.mjs           # runs stage0 → stage1 → stage2
# produces dist/sdev-core.wasm
```

The Milestone 2 plan is in `.lovable/plan.md` (approved by the user).
