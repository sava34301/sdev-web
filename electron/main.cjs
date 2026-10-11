// SDEV Desktop IDE — Electron main process.
//
// Wraps the compiled web IDE (dist/) in a native window and exposes a small
// bridge that lets the renderer:
//   - open / save files on the local filesystem
//   - compile the current SDEV source into a *real* native ELF executable
//     via the x86-64 assembly backend in lang/native/
//
// The browser IDE keeps running SDEV through WebAssembly; this shell adds
// the "out-of-browser, real assembly" pipeline the web build cannot do.

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const isDev = !!process.env.SDEV_DESKTOP_DEV;
const DIST_INDEX = path.join(__dirname, '..', 'dist', 'index.html');
// The IDE itself always comes from the website when online, so the desktop
// app is always the newest version; the bundled copy is the offline fallback.
const SITE = process.env.SDEV_SITE || 'https://web.sdev.codes';
const SHELL_VERSION = (() => { try { return require('../release.json').version; } catch { return app.getVersion(); } })();

function newer(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}

/** The native shell (file dialogs, assembler bridge) changes rarely — tell the user when it does. */
async function checkShellUpdate(win) {
  try {
    const res = await fetch(SITE + '/releases.json', { cache: 'no-store' });
    if (!res.ok) return;
    const rel = await res.json();
    if (!newer(rel.version, SHELL_VERSION)) return;
    const r = await dialog.showMessageBox(win, {
      type: 'info',
      message: `SDEV Desktop ${rel.version} is available`,
      detail: `You have ${SHELL_VERSION}. The editor itself is already up to date; this update refreshes the desktop features.${rel.notes ? '\n\n' + rel.notes : ''}`,
      buttons: ['Download', 'Later'],
    });
    if (r.response === 0) shell.openExternal(rel.desktop && rel.desktop.page ? rel.desktop.page : SITE);
  } catch { /* offline */ }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a1626',
    title: 'SDEV Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const offline = () => win.loadFile(DIST_INDEX, { hash: '/ide' }).catch(() => win.loadFile(DIST_INDEX));
  if (isDev) {
    win.loadURL('http://localhost:8080/ide');
  } else {
    win.loadURL(SITE + '/ide').catch(offline);
    win.webContents.once('did-fail-load', (_e, code) => { if (code !== -3) offline(); });
    setTimeout(() => checkShellUpdate(win), 4000);
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ---- IPC: filesystem ------------------------------------------------------
ipcMain.handle('sdev:openFile', async () => {
  const r = await dialog.showOpenDialog({
    filters: [{ name: 'SDEV', extensions: ['sdev', 'txt'] }, { name: 'All', extensions: ['*'] }],
    properties: ['openFile'],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const p = r.filePaths[0];
  return { path: p, content: fs.readFileSync(p, 'utf8') };
});

ipcMain.handle('sdev:saveFile', async (_e, { path: existingPath, content }) => {
  let target = existingPath;
  if (!target) {
    const r = await dialog.showSaveDialog({
      filters: [{ name: 'SDEV', extensions: ['sdev'] }],
      defaultPath: 'program.sdev',
    });
    if (r.canceled || !r.filePath) return null;
    target = r.filePath;
  }
  fs.writeFileSync(target, content, 'utf8');
  return { path: target };
});

// ---- IPC: native compile --------------------------------------------------
// Compiles SDEV source into a real x86-64 ELF using lang/native/*.
// Requires `as` and `ld` (binutils) on PATH on the host.
ipcMain.handle('sdev:compileNative', async (_e, { source, outPath }) => {
  try {
    if (!outPath) {
      const r = await dialog.showSaveDialog({
        title: 'Compile SDEV to native executable',
        defaultPath: 'program',
      });
      if (r.canceled || !r.filePath) return { ok: false, cancelled: true };
      outPath = r.filePath;
    }
    // Dynamic import — codegen + linker are ESM.
    const codegenUrl = pathToFileURL(path.join(__dirname, '..', 'lang', 'native', 'codegen-x64.mjs')).href;
    const linkUrl    = pathToFileURL(path.join(__dirname, '..', 'lang', 'native', 'link.mjs')).href;
    const { generateAsm } = await import(codegenUrl);
    const { link }        = await import(linkUrl);

    const asm = generateAsm(source);
    const asmPath = outPath + '.s';
    fs.writeFileSync(asmPath, asm);
    link(asm, outPath, { tmpDir: path.dirname(outPath) });
    return { ok: true, outPath, asmPath };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
});

ipcMain.handle('sdev:runNative', async (_e, { outPath }) => {
  const { spawnSync } = require('node:child_process');
  const r = spawnSync(outPath, [], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
});

ipcMain.handle('sdev:platform', () => ({
  platform: process.platform,
  arch: process.arch,
  version: app.getVersion(),
}));

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
