# Milestone 5m — Widen self-hosted codegen to compile the toolchain

Goal: extend `lang/compiler/codegen.sdev` so it can compile the full
`lang/compiler/lexer.sdev`, `parser.sdev`, and its own source byte-identically
to `lang/bootstrap/compile.mjs`. Once achieved, `compile-self.mjs` becomes a
drop-in replacement everywhere, and `lang/bootstrap/compile.mjs` can be
deleted.

## Current gap (measured)

Probe: compile the self-hosted lexer driver through `compile-self.mjs` vs the
JS bootstrap on the same input program:

```
JS bootstrap : bc=758  pool=50
Self-hosted  : bc=9    pool=9
```

The self-hosted codegen bails silently on features `lexer.sdev` uses that the
5k feature set doesn't cover. Enumerate them, add them one at a time, gate
each with a new case in `test-self-codegen.mjs`.

## Suspected missing features (verify by inspecting `lexer.sdev` + `parser.sdev`)

- Multi-line `to NAME with a b c ...` functions with 3+ params.
- `continue` / early return patterns inside nested loops.
- String builtins beyond `chr/ord/str`: `slice`, `is_digit`, `is_alpha`,
  `is_alnum` (need to confirm they're inline builtins in codegen).
- Bounded list writes through computed indices in nested `if` chains.
- Any operator or keyword the 43-case suite doesn't exercise.

## Plan of attack

1. Add a `probe` script that compiles `lexer.sdev` through the shim and prints
   the first bytecode divergence offset vs the JS bootstrap.
2. Bisect: shrink the program by hand until a minimal reproducer emerges.
3. Add that reproducer as a new byte-identity case in `test-self-codegen.mjs`.
4. Fix `codegen.sdev` (and possibly the inline lex in the driver) to emit
   identically. Re-run the shim fixed-point gate.
5. Repeat until `lexer.sdev`, `parser.sdev`, and `codegen.sdev` all round-trip
   byte-identically.

## Retirement (final step)

Once round-trip byte-identity holds for all three self-hosted sources:

1. Replace `bootstrapCompile` in `src/lang-bridge/wasm-runtime.ts` with a
   browser build of `compile-self.mjs` (Vite `?raw` import for
   `codegen.sdev`, plus the seed WASM already served at `/wasm/sdev-seed.wasm`).
2. Replace `bootstrapCompile` in `test-self-lexer.mjs`, `test-self-parser.mjs`,
   and `test-wasm-runtime.mjs`.
3. Keep the JS bootstrap only as the diff oracle in `test-self-codegen.mjs`
   until we're happy freezing a golden-bytes fixture instead.
4. Delete `lang/bootstrap/compile.mjs`, `src/lang-bridge/bootstrap.d.ts`,
   and their imports.
