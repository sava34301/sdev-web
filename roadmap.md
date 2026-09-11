# Roadmap — replacing JavaScript with SDEV

Goal: every piece of the project that *can* be written in SDEV is written in
SDEV. What stays in JavaScript is only the irreducible host boundary — the
code that browsers, Node and Electron require in order to start SDEV at all.

## The host boundary (stays JavaScript, by necessity)

- `bin/sdevhost.mjs` — the single SDEV kernel: compiles a `.sdev` program with
  the self-hosted compiler, runs it on the seed VM, answers host calls
  (files, shell, args, compiler oracle, exit code).
- `lang/compiler/compile-self.mjs` + `lang/compiler/driver-artifact.mjs` —
  generated/self-hosted bridge, not hand-written logic.
- `lang/bootstrap/compile.mjs` — the build-time oracle that keeps byte
  identity honest. Retired only when Milestone J lands.
- `electron/*.cjs`, `postcss.config.js`, `eslint.config.js`, Vite config —
  required by their hosts.

## Sweep 1 — done

- [x] `bin/sdevhost.mjs` host kernel with the `sdev:` host-call protocol.
- [x] `lang/stdlib/testkit.sdev` — assertions, byte-wise string compare,
      shell/args helpers for SDEV-authored scripts.
- [x] `scripts/test-self-toolchain.sdev` (replaces the `.mjs`).
- [x] `scripts/test-driver-artifact.sdev` (replaces the `.mjs`).
- [x] `scripts/probe-self-lexer.sdev` (replaces the `.mjs`).
- [x] npm entries: `test:toolchain`, `test:driver`, `probe:lexer`, `sdev:host`.

## Milestones

**A. Language gap: `is` on strings** — the VM compares string handles, so two
separately built strings with equal bytes are not equal. Add a string-aware
equality opcode in `seed.wat`, teach `codegen.sdev` to emit it when either
side is typed as a string, mirror it in the bootstrap and the native backend,
then drop `str_same` from testkit.

**B. Remaining probes and gates → SDEV**
`probe-self-codegen.mjs`, `test-self-lexer.mjs`, `test-self-parser.mjs`,
`test-self-codegen.mjs`, `test-shim-fixed-point.mjs`. These carry JS
reference implementations; port each reference to SDEV alongside the gate.

**C. WASM + native test suites → SDEV**
`test-wasm-runtime.mjs`, `test-native.mjs`, `scripts/sdev-native.mjs`. Needs a
host call for "run this bytecode and give me its output", plus assembler and
linker invocation through `sdev:exec:`.

**D. Build scripts → SDEV**
`build-seed-wasm.mjs` (needs a `wabt` host call), `build-cli.mjs`,
`build-ultimate-docs.mjs`, `build-driver.mjs`.

**E. TypeScript test scripts → SDEV**
`test-dialect.ts`, `test-translator.ts`, `test-parity.ts`, `test-ml-stdlib.ts`,
`test-bg.ts`. Requires exposing the TS reference runtime to SDEV over a host
call, or reimplementing each fixture set in SDEV.

**F. Native backend → SDEV**
`lang/native/codegen-x64.mjs` and `link.mjs` are pure byte emission — a direct
port to `lang/native/codegen-x64.sdev`, driven by the host kernel.

**G. JS reference runtime → SDEV**
`lang/runtime/v2.js` and `public/sdev-interpreter.js` are hand-written
interpreters. Replace with a compiled SDEV interpreter shipped as bytecode
plus the seed VM.

**H. CLI → SDEV**
`cli/*.ts` and `bin/sdev.mjs` become `cli/*.sdev` run by the host kernel;
`build-cli.mjs` then only bundles the kernel and the baked bytecode.

**I. Website and IDE**
`src/**` is React/TypeScript. Plan: move language logic (`src/lang/**`) into
SDEV modules executed through the WASM bridge, leaving `src/components/**`
and `src/pages/**` as the thin React host. Full replacement of React itself
is out of scope until SDEV has a DOM binding.

**J. Retire the bootstrap**
Once B–D pass without the oracle, delete `lang/bootstrap/compile.mjs` and
make the self-hosted compiler its own reference.
