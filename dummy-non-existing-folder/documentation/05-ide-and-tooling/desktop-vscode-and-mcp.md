# Desktop App (Electron), VS Code Extension, Releases & MCP Server

Beyond the browser IDE and terminal CLI, SDEV ships as an Electron desktop application, an official Visual Studio Code extension, a single-version auto-updating release pipeline, and a Model Context Protocol (MCP) server for AI assistants.

---

## 1. Unified Release System (`release.json` & `scripts/release.mjs`)

One file — `release.json` — defines the canonical version (`5.1.0`) for the Web IDE, CLI, VS Code extension, and Electron desktop app.

Running:

```bash
node scripts/release.mjs [--bump patch|minor|major]
```

executes the full release pipeline:
1. Updates `cli/version.ts`, `extension/package.json`, and `extension-vsix-meta/extension.vsixmanifest`.
2. Rebuilds the standalone CLI (`bin/sdev.mjs`) from `src/lang` via `scripts/build-cli.mjs`.
3. Copies `bin/sdev.mjs` (`sdev-cli.mjs`), `bin/sdev-seed.wasm`, and `bin/runtime.s` directly into `extension/interpreter/`.
4. Populates `public/downloads/` (`sdev.mjs`, `sdev-seed.wasm`, `runtime.s`, `sdev-language.vsix`) and builds `public/sdev-language-<version>.vsix`.
5. Emits `public/releases.json`, which installed CLI and desktop tools check to update themselves (`sdev update`).

---

## 2. Electron Desktop IDE (`electron/`)

- **Files:** `electron/main.cjs`, `electron/preload.cjs`, `electron/README.md`.
- Wraps the full Web IDE UI inside a native desktop window (loading the live site when online or the bundled `dist/index.html` offline with `SDEV_ELECTRON=1` relative `./` asset paths).
- Exposes `window.sdevDesktop` IPC methods (`platform`, `openFile`, `saveFile`, `compileNative`, `runNative`), enabling the **DesktopNativeButton** to emit x86-64 assembly, assemble/link with `as` + `ld`, and execute native binaries directly from the IDE.

```bash
npm run desktop:dev       # Live dev window against Vite
npm run desktop:build     # Production relative-path Vite build
npm run desktop:package   # Linux x64 standalone package in electron-release/
```

---

## 3. VS Code Extension (`extension/`)

- **Capabilities:**
  - Syntax highlighting (`extension/syntaxes/sdev.tmLanguage.json`) for `.sdev` and `.sdv` across v1, v2 Prism, `js { ... }` blocks, `board "<id>" { ... }` hardware sketches, ML/LLM stdlib, and FFI/CUDA/WebGPU.
  - 34 snippets (`extension/snippets/sdev.json`) across both dialects.
  - Bundled execution runtimes inside `extension/interpreter/`: `sdev-cli.mjs` (full dialect/understander/v1/v2 CLI), `sdev-interpreter.js`, `sdev-interpreter.py`, `sdev-native.cjs`, `sdev-v2.cjs`, `sdev-seed.wasm`, and `runtime.s`.
- **Commands:**
  - `sdev: Run File` (`Ctrl+Enter` / `Cmd+Enter`)
  - `sdev: Run File with v2` (`Ctrl+Alt+Enter` / `Cmd+Alt+Enter`)
  - `sdev: Run Selection` (`Ctrl+Shift+Enter` / `Cmd+Shift+Enter`)
  - `sdev: Build Native Executable (x86-64)`
  - `sdev: Open Online Playground`
  - `sdev: Open Documentation`

---

## 4. Model Context Protocol (MCP) Server (`src/lib/mcp/`, `supabase/functions/mcp/`)

SDEV exposes an OAuth-authenticated MCP server built with `@lovable.dev/mcp-js` (`src/lib/mcp/index.ts`), bundled into a portable self-contained Supabase Edge Function (`supabase/functions/mcp/index.ts`) using `vite.config.ts`'s Windows-safe relative entry alias.

### Registered MCP Tools

| Tool | Read-Only | Description |
| --- | --- | --- |
| `list_files` | Yes | Lists the signed-in user's cloud `code_files` (`id`, `name`, `runtime`, `dialect`, `updated_at`). |
| `read_file` | Yes | Reads the full source of a user's SDEV file by UUID. |
| `save_file` | No | Creates a new SDEV file or updates an existing file by UUID. |
| `list_dialects` | Yes | Lists the user's dialects and publicly shared dialects (with optional search). |
| `list_shared_programs` | Yes | Lists publicly shared Gists (`gists`) with optional title filtering. |
| `read_shared_program` | Yes | Reads a shared public program by slug or id. |

### Verification

- `node --test scripts/test-mcp-deployment.mjs` verifies that `supabase/functions/mcp/index.ts` contains only portable `npm:` package imports (no machine-local Windows drive paths) and defines `defineMcp`.
