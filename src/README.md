# `src/`

Frontend React + TypeScript application source, layered language runtime (`src/lang/`), self-hosted compiler bridge (`src/lang-bridge/`), IDE state modules (`src/ide/`), and visual debugging studio (`src/studio/`).

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Subfolders

| Subfolder | Purpose |
| :--- | :--- |
| [`assets/`](./assets/) | Bundled image assets imported by the React frontend (`sdev-logo.png`). |
| [`components/`](./components/) | Shared React UI components for the homepage playground, canvas graphics viewer, natural-language code translator, bytecode compiler panel, AI chatbot, downloads menu, and IDE. |
| [`contexts/`](./contexts/) | Top-level React context providers (`AuthContext.tsx` and `DialectsContext.tsx`) sharing a single Supabase auth subscription and dialect store across the app. |
| [`hooks/`](./hooks/) | Custom React hooks for authentication (`useAuth`), cloud file storage (`useCloudFiles`), debounced workspace sync (`useWorkspaceSync`), Personal SDEV dialects (`useDialects`), hybrid translation (`useCodeTranslation`), clipboard copying (`useClipboard`), user handles (`useUsername`), and admin checks (`useIsAdmin`). |
| [`ide/`](./ide/) | Pure TypeScript IDE domain modules (zero React component dependencies): workspace & settings types (`types.ts`), IDE colour themes & language list (`themes.ts`), default starter files & snippets (`starterFiles.ts`), and signed `.sdev` / Electron / standalone Windows `.exe` exporters (`export.ts`). |
| [`integrations/`](./integrations/) | External backend service integrations for the web application. |
| [`lang/`](./lang/) | Layered TypeScript implementation of the SDEV language runtime, builtins, code understander agent, Personal SDEV dialect engine, microcontroller hardware toolchain, API registry, and developer tools. |
| [`lang-bridge/`](./lang-bridge/) | JavaScript/TypeScript bridge between the host environment (Browser or Node.js) and the self-hosted SDEV v2 compiler + WebAssembly Seed VM. |
| [`lib/`](./lib/) | General frontend utility modules: protocol-aware router selector (`app-router.ts`), file download helpers (`download.ts`), typed `localStorage` JSON helpers (`storage.ts`), launch gate & countdown helpers, Google Calendar link builder, Tailwind class merger (`utils.ts`), and MCP server definitions. |
| [`pages/`](./pages/) | Top-level route pages for the web application, lazy-loaded so opening `/ide` never waits for homepage or community assets. |
| [`runtime/`](./runtime/) | Metadata pointers (`sdev-stub-win-x64.exe.asset.json`) for the downloadable pre-built Windows standalone `.exe` runtime stub. |
| [`studio/`](./studio/) | Visual debugging and live execution engines: Chrono Time-Travel step recorder + Live Lens loop tracer (`runner.ts`) and live interactive scratchpad evaluator (`eval-live.ts`). |

### Files

| File | Purpose |
| :--- | :--- |
| `App.tsx` | React component or page (`App.tsx`). |
| `index.css` | Project file (`index.css`). |
| `main.tsx` | React component or page (`main.tsx`). |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `vite-env.d.ts` | / <reference types="vite/client" />. |

<!-- FOLDER_INVENTORY_END -->
