# SDEV Desktop IDE (Electron shell)

A real, out-of-browser SDEV IDE. It bundles the same UI as the web IDE
(`/ide`) and adds a native-assembly compile path:

- **Web IDE** → runs SDEV inside WebAssembly (browser's own assembly).
- **Desktop IDE** → same UI, plus **"Build Native"** which pipes your
  program through `lang/native/codegen-x64.mjs` + `as` + `ld` and produces
  a real x86-64 Linux ELF you can execute on your machine.

## Requirements on the host
- Node.js 20+
- `binutils` on `PATH` (`as`, `ld`) for the native backend
  - Linux: `sudo apt install binutils` / `pacman -S binutils`
  - macOS: `xcode-select --install` (uses `as`/`ld64`, Linux ELF target
    needs a cross-binutils; see `lang/native/README.md`)

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
