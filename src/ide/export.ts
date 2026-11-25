import { downloadBlob, downloadText } from '@/lib/download';
import { readSignature, stripSignature, writeSignature } from '@/lang/dialect/signature';
import type { DialectSpec } from '@/lang/dialect/spec';
import type { IdeFile } from './types';
import sdevStubAsset from '@/runtime/sdev-stub-win-x64.exe.asset.json';

export function translationHasDiff(writtenBody: string, translatedSource: string | null | undefined): boolean {
  return Boolean(translatedSource && translatedSource.trim() !== writtenBody.trim());
}

export function translationDownloadName(fileName: string, variant: 'written' | 'translated', hasDiff: boolean): string {
  if (variant !== 'translated' || !hasDiff) return fileName;
  return fileName.endsWith('.sdev')
    ? fileName.replace(/(\.translated)?\.sdev$/i, '.translated.sdev')
    : `${fileName}.translated.sdev`;
}

export function signFileForExport(
  file: IdeFile,
  variant: 'written' | 'translated',
  dialect: DialectSpec | null,
  embeddedTranslated: string | null,
  runtime = 'v1',
): { signed: string; outName: string } {
  const existing = readSignature(file.content);
  const strippedFileBody = stripSignature(file.content);
  const hasDiff = translationHasDiff(strippedFileBody, embeddedTranslated);
  const body = variant === 'translated' && hasDiff && embeddedTranslated ? embeddedTranslated : file.content;
  const outName = translationDownloadName(file.name, variant, hasDiff);
  const signed = writeSignature(body, {
    rt: runtime,
    dialect: variant === 'translated' && hasDiff ? null : (dialect ? dialect.meta.slug : existing?.dialect ?? null),
    dialectVersion: variant === 'translated' && hasDiff ? null : (dialect ? dialect.meta.version : existing?.dialectVersion ?? null),
    libs: existing?.libs ?? [],
    origin: variant === 'translated' && hasDiff ? (dialect ? dialect.meta.slug : existing?.origin ?? null) : (existing?.origin ?? null),
    translated: variant === 'written' && hasDiff ? embeddedTranslated : undefined,
    brain: variant === 'written' && hasDiff ? (file.understood?.brainUsed ?? existing?.brain ?? null) : undefined,
    lang: variant === 'written' && hasDiff ? (file.understood?.detectedLanguage ?? existing?.lang ?? null) : undefined,
  });
  return { signed, outName };
}

export function patchLegacyRuntimeStub(stub: Uint8Array): boolean {
  // Existing uploaded Windows runtimes contain the web DSL helper named
  // canvas(), which overwrites graphics canvas() inside the executable. Patch
  // that single embedded string in-place so downloaded .exe files use the
  // native canvas window without needing users to wait for a CDN replacement.
  const pattern = new TextEncoder().encode('"object",\n  "canvas",\n  "svg"');
  const replacement = new TextEncoder().encode('"object",\n  "xanvas",\n  "svg"');
  outer: for (let i = 0; i <= stub.length - pattern.length; i++) {
    for (let j = 0; j < pattern.length; j++) {
      if (stub[i + j] !== pattern[j]) continue outer;
    }
    stub.set(replacement, i);
    return true;
  }
  return false;
}

export function downloadElectronWrapper(): void {
  const pkg = JSON.stringify({
    name: 'sdev-ide',
    version: '1.0.0',
    description: 'sdev IDE – desktop edition',
    main: 'main.js',
    scripts: { start: 'electron .', build: 'electron-builder' },
    dependencies: { electron: '^28.0.0' },
    devDependencies: { 'electron-builder': '^24.0.0' },
    build: { appId: 'dev.sdev.ide', productName: 'sdev IDE', directories: { output: 'dist-electron' } },
  }, null, 2);

  const mainJs = `const { app, BrowserWindow, shell } = require('electron');
function createWindow() {
  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    titleBarStyle: 'hiddenInset', backgroundColor: '#0d0e1a',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  win.loadURL('https://web.sdev.codes/ide');
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });`;

  const readme = `# sdev IDE – Desktop Edition\n\n## Quick Start\n\n1. Install Node.js (https://nodejs.org)\n2. Open terminal here\n3. Run:\n\n\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n\n## Build installer\n\`\`\`bash\nnpm run build\n\`\`\`\n`;

  for (const { name, content } of [
    { name: 'package.json', content: pkg },
    { name: 'main.js', content: mainJs },
    { name: 'README.md', content: readme },
  ]) {
    downloadText(content, name);
  }
}

export async function packageSourceAsExe(fileName: string, content: string): Promise<void> {
  const res = await fetch(sdevStubAsset.url);
  if (!res.ok) throw new Error(`stub fetch failed: ${res.status}`);
  const stub = new Uint8Array(await res.arrayBuffer());
  patchLegacyRuntimeStub(stub);
  const payload = new TextEncoder().encode(content);
  const magic = new TextEncoder().encode('SDEVPACK');
  const lenBuf = new ArrayBuffer(8);
  new DataView(lenBuf).setBigUint64(0, BigInt(payload.length), true);
  const out = new Uint8Array(stub.length + payload.length + 8 + 8);
  out.set(stub, 0);
  out.set(payload, stub.length);
  out.set(magic, stub.length + payload.length);
  out.set(new Uint8Array(lenBuf), stub.length + payload.length + 8);

  const blob = new Blob([out], { type: 'application/vnd.microsoft.portable-executable' });
  downloadBlob(blob, fileName.replace(/\.sdev$/i, '') + '.exe');
}
