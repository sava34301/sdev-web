# Contributing to SDEV

Welcome to the **SDEV** open-source repository! SDEV is an accessible, multi-paradigm programming language featuring dual surface dialects (v1 expressive dialect and v2 Prism beginner-first dialect) and three execution tracks (TypeScript runtime, self-hosted WebAssembly compiler, and native x86-64 Linux/macOS backend).

This guide provides instructions for setting up your development environment, testing language subsystems, adhering to architectural invariants, and submitting pull requests.

---

## 1. Project Invariants & Core Rules

Before modifying code, familiarize yourself with our project architectural guidelines:

1. **Dual-Runtime Parity**:
   - Any new language primitive or builtin added to the JavaScript/TypeScript runtime (`src/lang/builtins.ts`) must also have parity in the Python/self-hosted interpreters where applicable.
2. **Code Understander & AI Agent**:
   - Working code must reach the compiler as written (`asWritten()`). Real sdev keywords and valid syntax are never treated as "non-canonical".
   - The understander executes the self-written engine (`lang/agent/understander.sdev` via `src/lang/agent/sdev-engine.ts`) first and uses its output only when confident of every line and the result parses cleanly. The TypeScript understander remains the fallback.
   - The local browser brain prompt (`src/lang/agent/brain-prompt.ts`) mirrors the Supabase edge function prompt (`supabase/functions/sdev-agent/index.ts`) and must always be kept synchronized.
3. **Hardware & Board Blocks**:
   - `board "<id>"` blocks are isolated by `stripBoardBlocks` and processed by the hardware transpiler (`src/lang/hardware/understand.ts`), never rewritten into sdev code.
4. **Single Source of Versioning**:
   - `release.json` holds the single canonical version for the Web IDE, CLI, VS Code extension, and Electron desktop app.
   - Never bump version numbers by hand in `package.json` or elsewhere. Always use:
     ```bash
     node scripts/release.mjs
     ```
5. **Documentation Generation**:
   - `README.md` and `public/SDEV_ULTIMATE_DOCUMENTATION.md` are generated artifacts. Do not manually edit them. Update the source markdown files or implementation, then execute:
     ```bash
     node scripts/build-ultimate-docs.mjs
     ```

---

## 2. Environment Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher (Node.js 20+ LTS recommended).
- **npm** or **bun**: standard package manager.
- **Python 3.8+** (Optional): For running python parity checks.
- **WSL / Linux** (Optional): Required for testing the native x86-64 assembly backend (`test:native`).

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-org/sdev-web.git
cd sdev-web
npm install
```

### Environment Configuration
Copy the template file to configure your local environment:
```bash
cp .env.example .env
```
Refer to [docs/ENV.md](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/docs/ENV.md) for full descriptions of all variables.

---

## 3. Development Workflow

### Web IDE & Frontend
Run the Vite development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
Preview the production build:
```bash
npm run build
npm run preview
```

### Desktop Application (Electron)
Launch the desktop IDE with live reloading:
```bash
npm run desktop:dev
```
Package the Electron application for distribution:
```bash
npm run desktop:package
```

### Command Line Interface (CLI)
Build the standalone CLI bundle:
```bash
npm run cli:build
```
Run the CLI locally:
```bash
npm run sdev -- --help
```

---

## 4. Test Suite Reference

SDEV maintains extensive test coverage across the language parser, compiler, standard library, AI understander, and hardware drivers.

| Category | Command | Description |
| :--- | :--- | :--- |
| **Full Suite** | `npm test` | Runs comprehensive language test suite (`scripts/test-all.sdev`). |
| **TDD Features** | `npm run test:tdd-features` | Tests live scratchpad, micro-benchmarker, and literate notebooks. |
| **AI Understander** | `npm run test:brain-benchmarks` | Benchmarks MicroBrain natural language translations & sanitizer. |
| **Agent Docs** | `npm run test:understander-docs`| Verifies all documented code examples pass through understander. |
| **Expansion** | `npm run test:expansion` | Tests extended stdlib, data structures, and algorithms. |
| **Parity** | `npm run test:parity` | Verifies dual-dialect (v1 vs v2 Prism) parity. |
| **WASM Runtime** | `npm run test:wasm-runtime` | Tests WebAssembly compiler target execution. |
| **Native Backend** | `npm run test:native` | Executes native x86-64 GNU assembler/linker tests in WSL/Linux. |
| **Hardware** | `npm run test:board-db` | Validates microcontroller definitions and pin mappings. |
| **Machine Learning**| `npm run test:ml` | Tests matrix manipulation, tensors, and linear regression. |
| **Self-Hosting** | `npm run test:toolchain` | Tests the self-hosted compiler toolchain pipeline. |
| **Security** | `npm run security:scan` | Executes ECC AgentShield security vulnerability scan. |

---

## 5. Coding Standards

- **TypeScript**: Strict type checking is enforced. Do not use `any` unless wrapping dynamic foreign function interfaces (FFI).
- **Test-Driven Development (TDD)**:
  1. Write unit tests under `scripts/` or `src/` replicating the desired feature or bug.
  2. Verify tests fail (**RED**).
  3. Write minimal code to satisfy the test contract (**GREEN**).
  4. Refactor for clarity and performance (**REFACTOR**).
- **UI Components**: UI components in `src/components/` adhere to Tailwind CSS and Radix UI accessible primitives. Preserve reduced-motion and mobile responsive fallbacks.

---

## 6. Submitting a Pull Request

Before pushing your branch, execute the following checklist:

- [ ] Linter passes with no errors: `npm run lint`
- [ ] Production build succeeds: `npm run build`
- [ ] Relevant test suites pass: `npm run test:expansion && npm run test:tdd-features`
- [ ] Understander test suite passes: `npm run test:understander-docs`
- [ ] No hardcoded secrets or personal API keys in commits.
- [ ] Synchronized `brain-prompt.ts` with `supabase/functions/sdev-agent/index.ts` if agent prompts changed.
- [ ] Documentation updated if introducing new keywords, builtins, or environment variables.
