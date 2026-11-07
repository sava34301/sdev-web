# Case: Start planning and executing the remaining unfinished SDEV roadmap: self-hosting Milestones C–J, Windows/macOS native compiler backends, deeper v2 multi-paradigm compiler features, and IDE/Studio consolidation.

## Background and Current State
- SDEV is an independent, self-hosted multi-paradigm programming language created by Sava Milanov.
- The project has been in active development since December 2025 across web, CLI, IDE, compiler, and virtual machine runtimes.
- Current status: The core toolchain (`lang/compiler/lexer.sdev`, `parser.sdev`, `codegen.sdev`) is self-hosted and compiles byte-identically on a WebAssembly seed VM (`sdev-seed.wasm`).
- All 17 self-hosted and language test suites (`npm test`) currently pass with 100% success (toolchain round-trip, driver artifact, self-lexer, self-parser, self-codegen, stdlib v2, subsystems, shim fixed-point, parity gate with 209 features, formal formatter, parser literals, local model server, understander engine, agent rules, and WASM runtime).

## Proposed Scope to Plan and Execute
1. **Self-Hosting Milestones C through J**:
   - Port remaining test runners (`test-wasm-runtime.mjs`, `test-native.mjs`, `test-dialect.ts`, `test-translator.ts`, `test-parity.ts`) from Node.js/TypeScript to pure SDEV.
   - Port build scripts (`build-seed-wasm`, `build-cli`, `build-ultimate-docs`) from Node.js to pure SDEV.
   - Port the native x86-64 assembler and ELF linker from TypeScript to pure SDEV.
   - Compile the CLI binary directly from SDEV rather than bundling via esbuild.
   - Rewrite the remaining portable builtins from JavaScript into `lang/stdlib/v2/*.sdev` and retire the bootstrap JavaScript compiler.
2. **Native Backends for Windows and macOS**:
   - The native backend currently produces Linux x86-64 ELF executables only.
   - Build native Windows PE (`.exe`) and macOS Mach-O code generators and linkers.
3. **Deeper Multi-Paradigm Features in v2 Bytecode**:
   - While v1 (interpreter) supports Python/Kotlin/Rust syntax (comprehensions, generators, `fixed` constants, SQL queries, arena memory, Option/Result), compile comprehensions, generators (`yield`), and `with` statements directly to v2 bytecode.
   - Implement compile-time static type checking on v2.
4. **IDE and Studio Consolidation**:
   - Merge SDEV Studio (Chrono time-travel debugger, Live Lens, Prism trace) and Classic IDE into a unified web IDE experience.
   - Build canvas event helpers and UI preview error overlays.
5. **Distribution and Packaging**:
   - Purchase an OV/EV code signing certificate (~$200–$400/year) to prevent Windows SmartScreen blocks on downloads.
   - Publish the VS Code extension to the Visual Studio Marketplace and Open VSX.
   - Package and verify desktop Electron installers across clean Windows, macOS, and Linux systems.

## Resources and Constraints
- Developer: Single solo creator / student developer (Sava Milanov).
- Budget: Self-funded, zero venture funding, zero enterprise sponsors.
- Tooling: Developed with agentic AI pair programming (Google Antigravity, Lovable).
- Community: Pre-launch stage; no established user base or external contributor community yet.
