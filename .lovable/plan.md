## Milestone 5l — JS bootstrap retirement

Goal: eliminate `lang/bootstrap/compile.mjs` as an *active* code path. Everywhere the app or tests currently call `bootstrapCompile(src)` to produce bytecode + string pool, call the **self-hosted** compiler (`lang/compiler/codegen.sdev`, driven through the seed VM) instead. After this milestone the JS bootstrap survives only as a git-history reference — no runtime import, no test import.

Scope note: `lang/runtime/v2.js` is a full tree-walk JS interpreter (used by the IDE for feature-complete execution), not a bootstrap artefact. It is *not* removed in 5l. Its retirement is a separate future milestone that requires the self-hosted VM to reach feature parity with the interpreter (classes, async, kernel, graphics, etc.).

### Changes

1. **New shim** `lang/compiler/compile-self.mjs`
   - Exports `compile(source) -> { bytecode: Uint8Array, stringPool: Uint8Array, entryPoint: 0 }` with the exact shape the current `bootstrapCompile` returns.
   - Internally: loads the seed WASM (`public/wasm/sdev-seed.wasm`), loads `lang/compiler/codegen.sdev` + `lexer.sdev` + `parser.sdev` compiled via the bootstrap once at module init (memoised), runs the self-hosted pipeline against `source`, and reads the emitted bytecode + pool out of the VM's `say` channel (same convention `test-self-codegen.mjs` already uses).
   - One-time bootstrap of the self-hosted compiler still uses `compile.mjs` in-memory, but it's isolated to this shim and never touches app code directly.

2. **Rewire consumers** (drop-in swap of the import path only)
   - `src/lang-bridge/wasm-runtime.ts` — replace `bootstrapCompile` import with `compile` from the new shim.
   - `scripts/test-self-codegen.mjs`, `scripts/test-self-lexer.mjs`, `scripts/test-self-parser.mjs`, `scripts/test-wasm-runtime.mjs` — keep the JS bootstrap as the diff oracle in `test-self-codegen.mjs` **only** (that's its last legitimate use — proving byte-identity). The other three tests switch to the shim.
   - `src/lang-bridge/bootstrap.d.ts` — retained only for `test-self-codegen.mjs`.

3. **Delete the "v2 runtime" comment trail** in `src/lang-bridge/bridge.ts` — the file already routes to `runV2` (interpreter) or v1; no bootstrap references exist in the runtime path. Update the header comment only.

4. **Test suite gate**
   - Run all four `scripts/test-self-*.mjs` and `scripts/test-wasm-runtime.mjs`. Success bar unchanged: 50/50 semantic, 50/50 byte-identical (via the diff oracle), wasm runtime green.

5. **Docs**
   - `public/SDEV_INTERNALS.md`: mark 5l shipped. Note the JS bootstrap is now only the differential oracle in `test-self-codegen.mjs` and is queued for deletion once we accept the self-hosted compiler as its own ground truth (5m — "delete the oracle").
   - `.lovable/plan.md`: replace with the 5m plan (delete `lang/bootstrap/compile.mjs`, `src/lang-bridge/bootstrap.d.ts`, and the diff assertion → replace with a golden-bytes fixture snapshot).

### Files touched

- new: `lang/compiler/compile-self.mjs`
- edit: `src/lang-bridge/wasm-runtime.ts`
- edit: `scripts/test-self-lexer.mjs`, `scripts/test-self-parser.mjs`, `scripts/test-wasm-runtime.mjs`
- edit: `src/lang-bridge/bridge.ts` (comment only)
- edit: `public/SDEV_INTERNALS.md`, `.lovable/plan.md`

### Risks

- The self-hosted compile shim needs the seed VM to run in Node (it already does — used by every `test-self-*.mjs`). No browser path changes.
- Cold-start cost: the shim compiles `codegen.sdev` once via `bootstrapCompile` at init, then reuses the WASM instance. Amortised over all subsequent compiles.
- If the shim init fails, `wasm-runtime.ts` should fall back to throwing `WasmSubsetError` as today (callers already handle it by falling back to the JS interpreter).

Confirm and I'll ship it.
