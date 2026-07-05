# Two-track SDEV: Browser (WASM) + Desktop (Native ASM)

## Track A — Browser IDE stays as-is
No behavior change. The `/ide` route keeps running SDEV through the seed WASM VM (V2-WASM) with the JS v2 fallback. We only make three cosmetic/clarity edits:

1. Rename the runtime label in `IdeSettingsPanel.tsx` from `V2-WASM` to `WASM` and update the tooltip to say "the browser's native assembly."
2. Add a short note in `public/SDEV_INTERNALS.md` explaining the split: browser = WASM, desktop = native x86-64 asm.
3. Add a small "Runtimes" section on the home page (`Index.tsx`) with two cards: **Web (WASM)** and **Desktop (Native ASM)**.

No changes to `lang/bootstrap/*`, `wasm-runtime.ts`, or the VM.

## Track B — Native assembly backend (new)

A new compiler path that emits real x86-64 assembly (GAS/AT&T syntax, Linux ELF via `as` + `ld`). This does **not** run in the browser — it's for the CLI / downloadable desktop IDE.

### New files

```
lang/
  native/
    README.md              # what this is, how to build
    codegen-x64.mjs        # SDEV AST → x86-64 GAS assembly (.s)
    runtime.s              # hand-written asm: _start, sys_write wrapper, itoa
    link.mjs               # spawns `as` + `ld`, produces ELF a.out
scripts/
  sdev-native.mjs          # CLI entry: `node scripts/sdev-native.mjs prog.sdev -o prog`
                           # pipeline: parse (reuse lang/bootstrap parser)
                           #        → codegen-x64 → write .s
                           #        → link.mjs → ELF executable
  test-native.mjs          # regression: `say 42`, arithmetic, if, while, fib
```

### Subset supported at first cut

Same as the current WASM seed subset:
- integers, strings (constant literals only)
- `set … to`, `if / else / end`, `while / end`
- `to name with … end`, `return`, recursion
- `say <expr>` → `sys_write(1, …)` via a small itoa helper in `runtime.s`

Lists, heap objects, and the hardware/canvas surface are **not** in the native backend yet — those stay browser-only until we port them.

### How the desktop IDE ships

Not a separate Electron app in this repo — instead we expose the native compiler as a CLI and document it. The existing `src/runtime/sdev-stub-win-x64.exe` asset is untouched; this is a real, minimal ELF-emitting path for Linux/macOS with `as`+`ld` installed. Windows users get the same `.s` output and can assemble with MASM/NASM (documented in `lang/native/README.md`).

A `Downloads` note is added to the home page pointing at the CLI usage.

### Verification

`scripts/test-native.mjs` runs three programs through the native pipeline in the sandbox (which has `nix run nixpkgs#binutils` available), executes the produced ELF, and diffs stdout against the WASM VM's output. If both backends agree on `say fib(10)` → `55`, the split is real.

## Out of scope for this pass
- No Electron shell.
- No macOS/Windows cross-linking.
- No native lists/strings-mutation/graphics (browser-only for now).
- No changes to auth, DB, or edge functions.

## Files touched

Track A (3 small edits):
- `src/components/ide/IdeSettingsPanel.tsx`
- `public/SDEV_INTERNALS.md`
- `src/pages/Index.tsx` (add a Runtimes section)

Track B (new):
- `lang/native/README.md`
- `lang/native/codegen-x64.mjs`
- `lang/native/runtime.s`
- `lang/native/link.mjs`
- `scripts/sdev-native.mjs`
- `scripts/test-native.mjs`
