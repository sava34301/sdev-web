# Milestone 5n — widen the seed VM so codegen.sdev round-trips through the shim

Goal: get `lang/compiler/codegen.sdev` to compile byte-identically to the JS
bootstrap through `lang/compiler/compile-self.mjs`, matching what
`lexer.sdev` and `parser.sdev` already do (see 5m). Once achieved,
`compile-self.mjs` is a drop-in replacement everywhere and
`lang/bootstrap/compile.mjs` can be deleted.

## Current gap (measured)

`scripts/test-self-toolchain.mjs` reports:

```
✓ lang/compiler/lexer.sdev   byte-identical (bc=746, pool=41)
✓ lang/compiler/parser.sdev  byte-identical (bc=380, pool=38)
⚠ lang/compiler/codegen.sdev self-hosted compile threw
                              ([sdev v2] line 0: string pool overflow)
```

The overflow is in the **JS bootstrap** while it compiles the shim's
driver program, not in the self-hosted codegen. The driver embeds the
entire user source as a compile-time string literal
(`set src to "<escaped codegen.sdev>"`), and codegen.sdev is ~15 KB —
larger than the seed VM's 8 KiB pool.

## Plan of attack (pick one; option B preferred)

### A. Widen the seed VM

1. Edit `lang/bootstrap/seed.wat` to raise `$VAR_BASE`, `$STACK_BASE`,
   `$CALL_BASE`, `$CODE_BASE` so the pool region grows from 8 KiB to
   at least 64 KiB. Rebuild `public/wasm/sdev-seed.wasm` (wat2wasm).
2. Raise `stringPool` size in `lang/bootstrap/compile.mjs` to match
   (`new Uint8Array(0x10000)`).
3. Re-run all gates.

Downside: touches the seed WASM and every downstream consumer that
assumes 4 pages / 0x2000 pool.

### B. Inject user source outside the pool (preferred)

Keep the seed VM intact; change the shim driver so it no longer embeds
the user source as a compile-time string literal:

1. Driver prefix becomes `set src to ""` (tiny pool cost), which reserves
   global slot 0 for `src`.
2. After `bootstrapCompile(driverProgram)` returns, before `run()`:
   - Write `[u32 srclen][utf8 bytes]` into WASM memory at a fixed high
     offset (e.g. the top of the heap region, or expose a new
     `write_src(offset)` export in seed.wat).
   - Overwrite global slot 0 (memory `VAR_BASE + 0`) with that offset.
3. All `ord(src, i)` / `length(src)` / `slice(src, i, j)` calls in
   codegen.sdev see the injected blob and work unchanged.

Downside: places src in a memory region the bump allocator could reach
if the compile is very large. Mitigation: place src at
`memory.buffer.byteLength - srclen - 4` and periodically check the
allocator's high-water mark.

## Retirement (final step, once codegen.sdev round-trips)

1. Replace `bootstrapCompile` in `src/lang-bridge/wasm-runtime.ts` with a
   browser build of `compile-self.mjs` (Vite `?raw` import for
   `codegen.sdev`, plus `/wasm/sdev-seed.wasm` already served).
2. Replace `bootstrapCompile` in `test-self-lexer.mjs`,
   `test-self-parser.mjs`, and `test-wasm-runtime.mjs`.
3. Keep the JS bootstrap only as the diff oracle in
   `test-self-codegen.mjs` until we're happy freezing a golden-bytes
   fixture instead.
4. Delete `lang/bootstrap/compile.mjs`, `src/lang-bridge/bootstrap.d.ts`,
   and their imports.
