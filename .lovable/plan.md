# Milestone 5k — Byte-Identity Cleanup

Goal: make `lang/compiler/codegen.sdev` emit bytecode **byte-for-byte identical** to `lang/bootstrap/compile.mjs` across all 50 cases in `scripts/test-self-codegen.mjs`. Once 50/50 cases go from `~` to `≡`, the JS bootstrap and JS reference runtime can be deleted.

## The four divergences to close

1. **String encoding.** Bootstrap folds literals into a shared `stringPool` and emits `LSTR` (opcode `0x02`, u16 pool offset). Self-hosted builds each literal at runtime via `LNEW(0)` + one `LI32/CHR/STRCAT` per byte.
2. **Function placement.** Bootstrap emits `JMP → main` first, then all function bodies contiguously, then main, then `HALT`. Self-hosted emits in source order with a per-function `JMP-over-body`.
3. **ENTER elision.** Bootstrap emits `ENTER n_extras` only when `n_extras > 0`. Self-hosted always emits `ENTER 0` for zero-local functions.
4. **Return-type inference.** Bootstrap runs a fixed-point pre-pass over all functions before emitting bodies. Self-hosted only records return types as bodies are parsed, so forward calls to string-returning fns pick `SAY_I32` instead of `SAY_STR`.

## Implementation plan

### Part A — Two-pass emission in `codegen.sdev`

Restructure the top-level parse loop into three phases:

```text
Phase 1 (collect):   walk tokens, register every `to NAME with …` in fn tables
                     (name, arity, body-start-token, body-end-token). Skip bodies.
Phase 2 (hoist):     emit JMP<placeholder>, then loop functions and emit each body
                     (reparse from stored token range, set in_func, ENTER only if
                     extras>0, implicit `return 0` guard). Record fn_offsets.
Phase 3 (main):      patch leading JMP to `here`. Emit remaining top-level stmts.
                     Emit HALT (0xff). Run resolve_pending_calls.
```

Token-range storage: two new parallel globals `fn_body_start[i]` / `fn_body_end[i]` (list cells).

To emit each body a second time, add a helper `emit_fn_body(i)` that saves `pos`, jumps to `fn_body_start[i]`, calls `parse_block`, restores `pos`. Requires making `parse_block` respect an explicit end index rather than only the `else`/`end` keywords — add a global `block_stop_pos` that halts parsing early.

### Part B — String pool

Add two new globals in the driver setup:
- `pool_bytes` — list of bytes forming `[u32 len][utf8...]` records
- `pool_map_keys` / `pool_map_offs` — parallel lists mapping literal → offset (linear scan; 50 cases have few unique strings)

New helpers in `codegen.sdev`:
- `intern_str(s)` — search `pool_map_keys`; if absent, append `[len_u32, bytes…]` to `pool_bytes`, record offset, return offset.
- `parse_atom` string-literal branch replaced with: `intern_str(s)` → emit `0x02` + `emit_i16(offset)`. Set `expr_type[0] = 1`.

Driver (`test-self-codegen.mjs`) changes:
- After codegen runs, `bc[0]` count is followed by pool. Convention: after `emit_byte(255)` (HALT), dump `pool_bytes` length + bytes via `say`.
- The driver reads bytecode array, then string-pool array, and installs the pool at memory offset 0 (same as `runOne` does with the JS bootstrap's `stringPool`).

### Part C — ENTER elision

Change the function-body emission block:
```text
# was: always emit ENTER + placeholder byte, backpatch with extras
# now: parse body into a scratch buffer; count extras; if extras>0 emit ENTER extras
```
Simpler alternative avoiding buffer split: pre-scan the body's tokens for `set IDENT` (not `set IDENT[`) that don't match a param name — mirror bootstrap's `collectSets`. Add helper `count_extra_locals(start, end, n_params)`.

### Part D — Fixed-point return-type inference

Before Phase 2 (hoist), run:
```text
loop until stable (bounded by fn_names[0] + 2 iters):
  for each fn i:
    walk its token range looking for `return EXPR`
    determine expr's string-ness using current fn_ret_types + sym_types
    if any return is str → set fn_ret_types[i] to 1
```
Reuse a lightweight "type-only" walker (no bytecode emission). Cheapest approach: run parse_block twice per fn during Phase 2 — first with a global `emit_enabled = 0` (short-circuits every `emit_byte`), just to populate `fn_ret_types`, then re-run with emit enabled. Iterate until `fn_ret_types` is stable.

### Part E — Regression coverage

`scripts/test-self-codegen.mjs`:
- Keep 50 semantic cases, plus new byte-identity assertion becomes a **failure** (not informational). Success bar: `byteMatches === 50 && failed === 0`.
- Add a targeted case per divergence: (a) fn defined after call using string return, (b) zero-local fn (ENTER absent), (c) repeated same string literal (pool interning), (d) top-level mixed with fns.

### Part F — Documentation + bootstrap retirement decision

Update `public/SDEV_INTERNALS.md`:
- Mark 5k as shipped, all 50/50 byte-identical.
- Note that JS bootstrap and reference runtime are retained one more milestone for CI cross-check but are queued for deletion in a follow-up housekeeping pass (removing them touches `src/lang-bridge/bridge.ts`, `scripts/build-compiler.ts`, and the IDE — out of scope for this milestone).

## Files touched

- `lang/compiler/codegen.sdev` (major: phases, string pool, ENTER elision, RT inference)
- `scripts/test-self-codegen.mjs` (driver: pool ingest, strict byte assertion, new cases)
- `public/SDEV_INTERNALS.md` (roadmap: 5k shipped, deletion queued)

## Risk / order of operations

Ship in this exact order, verifying `node scripts/test-self-codegen.mjs` after each:
1. ENTER elision — smallest diff, unblocks 2 fn cases.
2. Function hoisting — unblocks all forward-ref and fn cases.
3. String pool — unblocks all string cases.
4. Fixed-point RT inference — unblocks string-returning forward calls.
5. Byte assertion flip + new targeted cases.

Estimated new self-hosted SDEV code: ~150 lines. No changes to the seed VM (`seed.wat`) — every opcode already exists.