# lang/native — SDEV native x86-64 assembly backend

The **browser IDE** runs SDEV on WebAssembly (see `lang/bootstrap/`).
This directory is the **desktop** backend: it compiles SDEV to real
x86-64 assembly (GAS/AT&T syntax) and links it into a static Linux ELF.

## Files

- `codegen-x64.mjs` — SDEV AST → `.s` (System V AMD64, no libc).
- `runtime.s` — hand-written asm: `_start`, `sdev_say_int`, `sdev_say_str`.
- `link.mjs` — spawns `as` + `ld` to produce an ELF binary.

## Usage (CLI)

```
node scripts/sdev-native.mjs prog.sdev -o prog
./prog
```

The compiler will:

1. parse `prog.sdev` using the same parser the browser uses,
2. emit `prog.s` next to `prog`,
3. assemble + link into `prog` (static ELF, no libc, ~1 KB).

## Supported subset (matches WASM seed)

- `set … to`, `if / else / end`, `while / end`
- `to name with p1 p2 … end`, `return`, full recursion
- 64-bit signed integers, string *literals* (immutable)
- `say <expr>` — prints int or string + newline

Not yet: lists, dynamic strings, canvas/graphics, hardware. Those stay
browser-only until we port them to the native backend.

## Prerequisites

- GNU binutils (`as`, `ld`). On Linux they ship in every distro.
- On this sandbox we pull them via `nix run nixpkgs#binutils`.
- macOS: install `binutils` via Homebrew (`brew install binutils`) — this
  gives you `x86_64-linux-gnu-as`; pass paths through `link()`'s `opts`.
- Windows: assemble the emitted `.s` with MASM/NASM or run under WSL.

## Why two backends?

Browsers don't execute x86 machine code — they only run JS and WASM.
So the web IDE stays on WebAssembly (which *is* the browser's native
assembly). For real desktop CLI use where you want an actual ELF you can
`strace` or `objdump -d`, use this backend.
