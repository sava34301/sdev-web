# Web IDE & Debugging Tools

The SDEV Web IDE (`/ide`) pairs a CodeMirror 6 workspace, cloud-synced file tree, and multi-runtime execution engine with built-in debugging, live evaluation, benchmarking, literate notebooks, hardware simulation, and real-time collaboration.

---

## 1. Execution & Understanding Controls

### Run Modes (`src/pages/IDE.tsx`)

| Control | Shortcut | Behaviour |
| --- | --- | --- |
| **Run Program** | `Ctrl+Enter` | Runs through the active runtime (`v1` interpreter/compiler or `v2` self-hosted WASM) with the understanding agent and cached translations enabled. |
| **Run without Understanding** | `Ctrl+Shift+Enter` | Executes the active file directly as written, bypassing cached translations, understander rules, and AI reconsider retries without modifying `understood` metadata. |
| **Re-understand & Run** | Toolbar / Run Menu | Clears stored whole-file and line-level understanding memories (`fresh: true`), re-evaluates the file, and updates the stored canonical translation. |

### Runtime Selector

- **Auto / v1 / v2:** Controlled in **Settings → Language Runtime** (`localStorage.sdev_runtime`) or overridden per file with `#!sdev v1` / `#!sdev v2`.
- **v1 Engine Switch:** Toggle between **Tree-walk Interpreter** (`Interp`) and **Bytecode Compiler** (`Compiler`).

### Translation Preview & Dual Downloads

When the understanding agent or human-language translator rewrites a file:
- A banner above the editor indicates the translation source (`from <Language>`, `via Built-in AI`, `via Website AI`, or `by understander rules`) and whether it came from cache.
- Toggle **Preview** (`Eye` / `EyeOff`) to inspect the canonical SDEV translation read-only without overwriting your original source.
- Open **Save** or **Downloads** to save either the **User-written version (`.sdev`)** or the **Translated version (`.translated.sdev`)** (for one file or all workspace files).

---

## 2. Activity Bar (Side Panels)

| Panel | Shortcut / Trigger | Purpose |
| --- | --- | --- |
| **Explorer** (`IdeFileTree`) | `Ctrl+B` | Nested folders, drag-and-drop file organization, upload, and Supabase cloud workspace sync (`useCloudFiles`). |
| **Search** (`IdeSearchPanel`) | `Ctrl+Shift+F` | Project-wide full-text search across workspace files. |
| **Outline** (`IdeOutline`) | `Ctrl+Shift+O` | Symbol outline of functions, classes, and bindings with click-to-jump. |
| **Problems** (`IdeProblems`) | `Ctrl+Shift+M` | Real-time static linter diagnostics (`SDEV001`–`SDEV015`) with line jump and quick fixes. |
| **AI Doctor** (`IdeAssistantPanel`) | Activity Bar | Automated error diagnosis and repair routing through local LLM servers (`callLocalFix`), website AI (`sdev-fix`), or deterministic SDEV structural rules (`sdevUnderstand`, `sdevCloseBlocks`, `sdevCloseAiBraces`). |
| **Hardware** (`HardwarePanel`) | Activity Bar | Board picker (30 MCUs), Arduino Library Manager search (10,232 libraries), cloud/CLI compile, Web Serial / WebUSB flashing, and **In-Browser Hardware Simulator**. |
| **Runtime & API Explorer** | `F1` on symbol | Searchable browser for all 881 canonical APIs across 16 modules, target badges (`v1`, `WASM`, `x64`, `WEB`, `CLI`, `MCU`), and `SDEV001`–`SDEV015` diagnostic reference. |
| **Live Classroom & Pair Rooms** | Activity Bar | Real-time collaborative editing and shared execution output (`LiveClassroomPanel`). |
| **Personal sdev** | Activity Bar | Switch active dialect, install `@user/lib` packages, toggle extensions, and export dialect docs (`PersonalPanel`). |
| **Settings** (`IdeSettingsPanel`) | Activity Bar | Font size/family, tab size, word wrap, auto-save, 5 IDE themes (`Sky Dark`, `Midnight`, `Open Sky`, `Sunset`, `Cloud`), AI Brain settings, and runtime toggle. |

---

## 3. Bottom Workbench Panels

| Panel | Purpose |
| --- | --- |
| **Terminal** (`IdeTerminal`) | Program stdout/stderr, runtime status, and interactive prompts. |
| **Time-Travel Debugger** (`TimeTravelDebugger`) | Step-by-step Chrono execution trace with play/pause, speed slider, step scrubber, line highlight sync, **Variables**, **Live Lens**, and **Prism AST/Token** inspector, plus **Canvas Snapshot** replay. |
| **Live Scratchpad, Benchmark & Notebook** (`LiveScratchpadPanel`) | Three live-execution tools in one tab (detailed below). |
| **Canvas** (`CanvasPanel`) | Live 2D vector, shape, gradient, sprite, and turtle graphics output. |
| **App Preview** (`AppPreviewPanel`) | Live interactive window/widget renderer (`window` / `endwindow` UI toolkit). |
| **Web Preview** (`WebPreviewPanel`) | Live HTML/CSS/JS preview iframe with reload, `.html` download, and open-in-new-tab. |
| **Problems** | Full workspace diagnostic table. |

---

## 4. Time-Travel Debugger, Scratchpad, Benchmarking & Notebooks

### Time-Travel Debugger (`src/components/ide/TimeTravelDebugger.tsx`, `src/studio/runner.ts`)

- Executes code with `runStudioCode` up to 600 Chrono steps.
- Scrubbing backwards or forwards jumps the editor cursor to the executed line, updates variable snapshots, displays Prism AST & token counts, and restores canvas graphics snapshots at that exact step.

### Live Interactive Scratchpad (`src/lang/eval-live.ts`)

- Auto-evaluates code as you type with an instruction budget (`maxInstructions`, default `5000` in the panel / `10000` in the engine) that traps runaway `while true` loops safely.
- Reports per-line evaluated values, inferred types (`number`, `string`, `boolean`, `list`, `record`, `function`, `nothing`), and durations.

### High-Precision Micro-Benchmarking (`src/lang/benchmark.ts`, `lang/runtime/notebook.sdev`)

- Configurable warm-up (default `10`) and measurement iterations (default `100`).
- Computes `opsPerSec`, `meanMs`, `minMs`, `maxMs`, and `p50Ms` / `p95Ms` / `p99Ms` percentiles via the SDEV-authored `bench_compute` engine, printing a formatted distribution report.

### Literate Markdown Notebooks (`src/lang/notebook.ts`, `lang/runtime/notebook.sdev`)

- Parses Markdown documents into sequential `markdown` and `code` cells (`nb_parse_cells`).
- Executes fenced SDEV code cells sequentially while preserving accumulated variable and function state across cells and isolating cell errors.

---

## 5. Live Classroom & Pair-Programming Rooms (`src/lang/collab/live-room.ts`)

- **Transport:** Instant `BroadcastChannel` for local browser tabs plus Supabase Realtime broadcast for cross-device classroom sessions identified by a 6-character room code.
- **CRDT State Sync:** Deterministic Lamport-clock `CrdtDocument` snapshots keep concurrent edits conflict-free.
- **Roles & Safety:** Supports `peer`, `teacher` (broadcast lesson snapshots), and `student` roles with ephemeral pseudonyms (no PII required) and sandboxed execution log sharing (`SharedExecutionEntry`) — remote code never auto-executes without explicit user action.

---

## 6. Exporting, Sharing & Keyboard Shortcuts

- **WASI 0.2 Component Export:** Package SDEV functions into `.wasm` + `.wit` + host glue (`Downloads → WASI 0.2 Component`).
- **Windows `.exe` / Electron Desktop App:** Package standalone executables from the **Downloads** dropdown.
- **Push to GitHub (`GitHubPushDialog.tsx`):** Commit and push workspace files directly to a GitHub repository via personal access token, with optional private repo creation.

### Key Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+Enter` | Run Program |
| `Ctrl+Shift+Enter` | Run without Understanding |
| `Ctrl+S` | Save current file (user-written) |
| `Ctrl+P` / `Ctrl+Shift+P` | Command Palette |
| `Ctrl+G` | Go to Line |
| `F1` | Context API Help (Runtime Explorer) or Command Palette |
| `Ctrl+B` | Toggle Explorer |
| `Ctrl+Shift+F` | Toggle Search |
| `Ctrl+Shift+O` | Toggle Outline |
| `Ctrl+Shift+M` | Open Problems |
| `` Ctrl+` `` | Focus Terminal |
| `Ctrl+Alt+Z` | Toggle Zen Mode |
| `F11` | Toggle Fullscreen |
