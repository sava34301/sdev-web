# CLI Toolchain & Terminal Editor (`sdev` / `sdevhost`)

The `sdev` CLI (`cli/index.ts` → `bin/sdev.mjs`) shares the exact same language pipeline as the browser IDE — dialects, extensions, library registry, file signatures, the understanding agent, the v1 interpreter, the self-hosted v2 compiler, and the native x86-64 / Windows PE backends.

---

## 1. Building & Installing

```bash
npm run cli:build      # Bundles cli/index.ts -> bin/sdev.mjs (+ sdev-seed.wasm, runtime.s)
node bin/sdev.mjs help
```

Or run via npm script or symlink on your `PATH`:

```bash
npm run sdev -- --help
ln -s "$PWD/bin/sdev.mjs" /usr/local/bin/sdev
```

---

## 2. Local State & Pipeline

`cli/env.ts` backs browser-style storage onto your local filesystem (default `~/.sdev`, override with `SDEV_HOME`):

- `~/.sdev/store.json` — active dialect, installed dialects, enabled extensions, cached `@user/lib` bundles, default runtime.
- `~/.sdev/session.json` — owner-readable Supabase auth session, auto-refreshed before cloud commands.
- `sdev:file:` keys map to real host filesystem I/O.
- `SDEV_SEED_WASM` overrides the path to `sdev-seed.wasm`.

Every execution passes through `cli/pipeline.ts`:

```text
file -> strip #⟨sdev⟩ signature -> canonicalize active dialect -> understander / local brain
     -> apply enabled extensions -> resolve `use` modules & libraries
     -> v1 interpreter | v2 self-hosted compiler + seed VM | native backend
```

---

## 3. Command Reference

### Project Scaffolding (`sdev.json`)

| Command | Description |
| --- | --- |
| `sdev new <name> [-t <template>]` | Create a new project with canonical starter code and `sdev.json` (`templates: console, web, game, hardware, ml`). |
| `sdev init [-t <template>]` | Initialize `sdev.json` in the current directory. |

When running `sdev run` without a file argument inside a project root, the CLI automatically resolves the entry file from `sdev.json` (or `main.sdev`).

### Running, Checking & Diagnostics

| Command | Description |
| --- | --- |
| `sdev run [file]` | Execute a program (supports `--runtime v1\|v2`, `--dialect`, `--lang`, `--no-ext`, `--agent`, `--brain`, `--no-agent`, `--explain`). |
| `sdev edit <file>` (alias `ide`) | Open the built-in full-screen terminal editor. |
| `sdev repl` | Start an interactive SDEV session. |
| `sdev check <file>` | Parse source and report syntax errors without running. |
| `sdev lint <file> [--target <t>]` | Run the target-aware static linter (`v1 \| v2-wasm \| native-x64 \| arduino-cpp \| web`). |
| `sdev api [query]` | Search the 881-entry Canonical API Registry (`--module <m>`, `--target <t>`). |
| `sdev explain <CODE\|name>` | Explain a diagnostic code (`SDEV001`–`SDEV015`) or API signature. |
| `sdev doctor` | Verify SDEV home, runtime assets, seed VM, local toolchain, and API registry health. |
| `sdev ast <file>` | Print the parsed AST as JSON. |
| `sdev fmt <file> [-w]` | Format SDEV source (`-w` writes in place). |
| `sdev watch <file>` | Re-run automatically when the file changes on disk. |

### Building & Native Compilation

| Command | Description |
| --- | --- |
| `sdev compile <file> [-o out]` | Compile source to an `SDEVC4` bytecode container (`.sdevc`). |
| `sdev run-bc <file.sdevc>` | Execute a compiled `.sdevc` container on the Seed VM. |
| `sdev disasm <file>` | Disassemble bytecode into human-readable instructions. |
| `sdev native <file> [-o out]` | Compile to a standalone native binary (`--emit-asm` emits `.s` assembly; supports `--target windows` / `--format pe` via `scripts/sdev-native.mjs`). |

### Files, Dialects, Extensions & Libraries

| Area | Subcommands |
| --- | --- |
| **Files & Signatures** | `info <file>`, `sign show\|stamp\|verify\|strip <file>` |
| **Dialects** | `dialect list\|preset\|new\|use\|show\|validate\|docs\|canon\|surface\|xlate\|words\|install\|publish\|pull\|sync\|export\|import\|remove` |
| **Extensions** | `ext list\|enable\|disable\|add\|publish\|pull\|remove\|sync\|prelude` |
| **Libraries** | `lib list\|add <@user/slug[@ver]>\|remove\|pins\|export\|import` |

### Cloud, Understanding Agent & Settings

| Area | Subcommands |
| --- | --- |
| **Auth** | `auth login\|code\|signup\|reset\|token\|status\|whoami\|refresh\|logout` (OTP `auth code` supports Google-created accounts) |
| **Cloud** | `cloud list\|pull\|push\|rm\|share\|shared` |
| **Agent** | `agent status\|explain <file>\|understand <file> [-o out]\|promote <name> [--rename]\|forget` |
| **Settings** | `runtime [v1\|v2]`, `languages`, `translate <file> --to <Language> [-o out]`, `home`, `version`, `update [--force]` |

---

## 4. Terminal Editor (`sdev edit`)

Implemented in `cli/editor.ts` with syntax highlighting, line numbers, and a status bar displaying the active runtime and dialect:

- `Ctrl+S` — Save
- `Ctrl+R` — Save and run through the full pipeline
- `Ctrl+F` — Find
- `Ctrl+G` — Go to line
- `Ctrl+K` — Cut line
- `Ctrl+L` — Format
- `Ctrl+Q` — Quit (prompts once when unsaved changes exist)

---

## 5. Self-Hosted Host Runner (`bin/sdevhost.mjs`) & Zero-Host VM (`bin/sdev-vm`)

- `node bin/sdevhost.mjs <file.sdev>` (`npm run sdev:host`) compiles programs with the self-hosted v2 compiler, runs pre-flight reference diagnostics (catching unknown functions, wrong argument counts, and `list +` without `list.sdev`), executes on `sdev-seed.wasm`, and answers `sdev:` host calls (`sdev:args`, `sdev:exec:`, `sdev:ls:`, etc.).
- `./bin/sdev-vm` provides the same execution and `sdev:` protocol with zero Node.js or WebAssembly runtime (see [Zero-Host Architecture](../06-compiler-and-internals/zero-host-native-and-pe.md)).
