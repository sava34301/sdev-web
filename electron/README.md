# SDEV Desktop IDE (Electron shell)

A real, out-of-browser SDEV IDE. It bundles the same UI as the web IDE
(`/ide`), including Personal SDEV, the Understanding Agent (`@webllm` / local / cloud), Time-Travel Debugger, Hardware Simulator, and native-executable compile paths:

- **Web IDE** -> runs SDEV inside WebAssembly (and can download a WASI 0.2 component or build native via cloud/local).
- **Desktop IDE** -> same UI, plus **"Build Native"** which emits either a **Linux x86-64 static ELF** (`as` + `ld`) or a **standalone Windows PE/COFF `.exe`** (`pe.mjs` — zero C compiler needed on Windows).

See also: [Desktop App, VS Code & MCP](../docs/05-ide-and-tooling/desktop-vscode-and-mcp.md) and [Zero-Host Native & Windows PE](../docs/06-compiler-and-internals/zero-host-native-and-pe.md).

## Requirements on the host
- Node.js 20+
- On Linux/macOS: `binutils` on `PATH` (`as`, `ld`) for ELF native builds (`SDEV_RUNTIME_S` overrides runtime assembly path)
- On Windows: no external assembler needed when targeting PE/COFF `.exe` via `pe.mjs` / `pe_x64.sdev`

## Dev loop

```bash
# terminal 1
npm run dev                        # vite at http://localhost:8080

# terminal 2
SDEV_DESKTOP_DEV=1 npx electron electron/main.cjs
```

## Production build

```bash
# 1) Build the web bundle with relative asset paths (file:// safe)
SDEV_ELECTRON=1 npm run build

# 2) Package the desktop app (installs electron + packager on first run)
npm install --save-dev electron @electron/packager
npx @electron/packager . "SDEV" \
  --platform=linux --arch=x64 \
  --out=electron-release --overwrite \
  --ignore='^/src' --ignore='^/public' --ignore='^/electron-release'
```

The output at `electron-release/SDEV-linux-x64/SDEV` is a standalone
desktop program. Ship it as a `.tar.gz`:

```bash
tar czf SDEV-linux-x64.tar.gz -C electron-release SDEV-linux-x64/
```

## Renderer bridge

Inside the app, `window.sdevDesktop` exposes:

| method                                | purpose                                 |
| ------------------------------------- | --------------------------------------- |
| `platform()`                          | `{platform, arch, version}`             |
| `openFile()`                          | native open dialog → `{path, content}`  |
| `saveFile({path, content})`           | native save dialog / overwrite          |
| `compileNative({source, outPath?})`   | SDEV → x86-64 → ELF via `as`+`ld`       |
| `runNative({outPath})`                | spawn the produced binary, capture I/O  |

The web build does not define `window.sdevDesktop`, so any UI that gates
on it stays hidden in the browser.

## Updates

The desktop app opens the live editor from the website, so it is always the newest version; without internet it uses the bundled copy. When the desktop shell itself changes, it offers the new download.

---

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Files

| File | Purpose |
| :--- | :--- |
| `main.cjs` | SDEV Desktop IDE — Electron main process. |
| `preload.cjs` | Preload bridge — exposes a minimal, safe API to the renderer. |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |

<!-- FOLDER_INVENTORY_END -->
