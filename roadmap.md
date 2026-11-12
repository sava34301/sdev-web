# Roadmap — replacing JavaScript with SDEV

Goal: every piece of the project that *can* be written in SDEV is written in
SDEV. What stays in JavaScript is only the irreducible host boundary — the
code that browsers, Node and Electron require in order to start SDEV at all.

## Current task — Arduino remake (completed in Antigravity)
- [x] Every Arduino board in the catalogue (Uno R3/R4 Minima/R4 WiFi/Q, Nano family, Mega, Leonardo, Micro, MKR, Zero, Due, Giga, Portenta, ESP32/ESP8266, Pico)
- [x] Every Arduino core command available in the `board` block (SDEV words + raw C++), `::`/`;;` and `{}` blocks
- [x] Every Library Manager library usable with `use "Name"` (compact index of all libraries)
- [x] Compile on the website with no install (hosted builder for supported boards, own build server for the rest)
- [x] Upload from the browser: STK500v1, STK500v2, AVR109, SAM-BA, DFU (WebUSB), esptool, UF2
- [x] Full hardware documentation generated from the command catalogue (`scripts/gen-hardware-docs.ts` → `public/SDEV_HARDWARE_DOCUMENTATION.md`)
- [x] Tests: translator, protocol simulators, real compiles of every example (`scripts/test-transpile.ts`, `src/lang/hardware/board-db.test.ts`)
- [x] Canonical API registry (`src/lang/registry/api-registry.ts`), static linter (`src/lang/linter.ts`), Runtime Explorer panel (`src/components/ide/RuntimeExplorerPanel.tsx`), CLI `doctor`/`explain`/`lint`/`api`, and Studio compiler & cloud persistence wiring

## Previous task

- [x] One version for every tool (`release.json`, `npm run release`); CLI, VS Code extension and desktop app update themselves from `releases.json`
- [x] VS Code extension runs the same CLI as the website (dialects, understander, sdev:ai, v1/v2, native)
- [x] Desktop app opens the live editor (offline: bundled copy) and announces desktop updates
- [x] sdev:ai examples (quiz game, to-do list) open and run in the editor; no false warnings on sdev:ai files
- [x] Block-closing rules written in SDEV (`lang/agent/blocks.sdev`), used first with the TypeScript rules as fallback; sdev:ai auto-closes forgotten `}` and accepts `+=` `-=` `*=` `/=`
- [x] Understander's own full parser and interpreter in SDEV (`lang/agent/parser_eval.sdev`)
- [x] Milestone M15 ML standard library: batched forward passes (`linear_forward_batch`, `sequential_forward_batch`, `gpt_forward_batch`), accelerated `best_matmul` dispatch, and binary checkpoints (`save_checkpoint_bin` / `load_checkpoint_bin`)
- [x] Build the next 3D sequence: exploded code layers, processor assembly and paired runtime targets; verified forward/reverse scroll, tablet framing and reduced motion.
- [x] Research professional 3D scroll sites and replace the flat card stack with a real scroll-controlled 3D compiler scene; verify scene progress, framing, Playground and static mobile/reduced-motion fallbacks.
- [x] Add refined scroll depth, reading progress, selectable code demos and language examples; verified Playground output, mobile overflow and reduced motion in the browser.
- [x] Redesign the homepage as an immersive 3D scroll experience while keeping
      the Playground functional and the IDE immediately accessible.

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

- [x] **A. Language gap: `is` on strings** — added `STREQ` (`0x90`) in `seed.wat`, taught `codegen.sdev` and `compile.mjs` to emit `0x90` (`STREQ`) for `is` and `0x90` + `0x30` (`NOT`) for `is not` when either side is string-typed, rebuilt `sdev-seed.wasm` and `driver-artifact.mjs`, and simplified `str_same` in `testkit.sdev`.

- [x] **B. Remaining probes and gates → SDEV** — ported `probe-self-codegen.sdev`, `test-self-lexer.sdev`, `test-self-parser.sdev`, `test-self-codegen.sdev`, and `test-shim-fixed-point.sdev` to SDEV.

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

## Homepage
- [x] Real 3D scroll experience like modern award sites: pinned WebGL camera flight through the compiler, scroll-rotated 3D feature ring, IDE always one click away

- [x] More interactive homepage: cursor glow, magnetic buttons, letter hover, clickable chapter rail, draggable ring, counting numbers, scroll-tilted Playground and zooming final tunnel

- [x] Professional full redesign: Graphite & Blue, Space Grotesk + DM Sans, split hero with live typing demo, sticky how-it-works card stack, bento features, learn/ship rows, get-started paths

## Sharing (done)
- [x] Public /explore page: dialects, extensions, shared programs with search and install
- [x] /my page: own dialects, extensions, files and shared programs
- [x] Ready-made dialect "Сдев" (src/lang/dialect/presets.ts) — runs in the IDE and the CLI
- [x] CLI cloud writes: dialect preset/pull/sync, ext publish/pull/remove, cloud rm/share/shared

## Self-hosted understander
- [x] Text-tooling primitives (lines, regex_capture/replace/find_all, char tests…) in JS + Python
- [x] `lang/agent/understander.sdev` v1: output, calculations, set/add/increase/decrease/becomes; TS fallback when unsure
- [x] Project names option for cross-file references; test:engine suite
- [x] Port ask/input, when/otherwise, side-by-side say, block closing by indentation to sdev
- [x] Port yes/no answers, typed-number conversion, counted loops, placeholders, dialect words to sdev
- [x] Names from the other IDE files fed into the understander
- [x] AI-native dialect (`sdev:ai`, `!#ai`) written in sdev, both directions
- [x] sdev:ai constants (`k`), classes (`c Name : Base {`), `throw`, `finally`; AI prompts updated
- [x] IDE "Open as sdev:ai" (Edit menu, both ways); online AI writes whole programs in sdev:ai; everyday tasks (reverse/upper/sort/dice…) ported to sdev
- [x] Project index (names defined across files) written in sdev: `lang/agent/project.sdev`, cached per file
- [x] Large files read in remembered top-level parts: after a small edit only the changed parts are read again (~6x faster)
- [x] Plain-words requests ("make a window that is a calculator") go straight to the AI, which writes the full program; added evaluate()

## Detach from Lovable (started 2026-10-25)
- [x] AI helpers use our own provider via SDEV_AI_* secrets (legacy gateway only as fallback)
- [x] Removed unused Lovable sign-in helper, dev tagger, old s-dev.lovable.app links
- [ ] AI provider key — waiting on user (SDEV_AI_API_KEY / BASE_URL / MODEL)
- [ ] Email (sign-up / reset / app emails) — needs an email service + sending domain from user
- [ ] Backend (database, accounts, storage, functions) — needs user's own backend project
- [ ] Website hosting for web.sdev.codes — needs user's hosting choice
- [ ] Assistant integration (MCP) — needs decision: rebuild on open MCP SDK or drop
- [ ] Final move-out cleanup: preview sign-in bridge, launch-gate preview hosts, badge CSS, sandbox dev plugins
