/**
 * Keeping the CLI current.
 *
 *   - Once a day (in the background, never blocking) it reads
 *     <site>/releases.json and, when there is a newer version, says so.
 *   - `sdev update` downloads the new CLI (and the seed VM / native runtime
 *     next to it) and replaces itself in place. `SDEV_NO_UPDATE_CHECK=1`
 *     turns the daily check off.
 */
import { existsSync, readFileSync, writeFileSync, renameSync, chmodSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION, SITE } from './version';
import { SDEV_HOME } from './env';

interface Releases { version: string; notes?: string; cli: { url: string; wasm?: string; runtime?: string } }

export function newer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
}

async function fetchReleases(): Promise<Releases | null> {
  try {
    const res = await fetch(`${process.env.SDEV_RELEASES_URL ?? SITE + '/releases.json'}`, { headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) return null;
    const j = (await res.json()) as Releases;
    return typeof j?.version === 'string' ? j : null;
  } catch {
    return null;
  }
}

const stampFile = () => join(SDEV_HOME, 'update-check.json');

/** Daily, silent unless there is something newer. Call without awaiting the result's network. */
export async function maybeNotifyUpdate(): Promise<void> {
  if (process.env.SDEV_NO_UPDATE_CHECK === '1' || !process.stdout.isTTY) return;
  try {
    const f = stampFile();
    const last = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) as { at: number; latest?: string } : null;
    if (last?.latest && newer(last.latest, VERSION)) {
      process.stderr.write(`\nsdev ${last.latest} is available (you have ${VERSION}). Run: sdev update\n`);
    }
    if (last && Date.now() - last.at < 24 * 3600 * 1000) return;
    const r = await fetchReleases();
    mkdirSync(SDEV_HOME, { recursive: true });
    writeFileSync(f, JSON.stringify({ at: Date.now(), latest: r?.version ?? last?.latest }));
  } catch { /* never get in the way */ }
}

/** The file this CLI runs from (bin/sdev.mjs). */
function selfPath(): string {
  try { return fileURLToPath(import.meta.url); } catch { return resolve(process.argv[1]); }
}

export async function runUpdate(force = false): Promise<void> {
  const r = await fetchReleases();
  if (!r) { console.error('Could not reach the sdev website to check for updates.'); process.exitCode = 1; return; }
  if (!force && !newer(r.version, VERSION)) { console.log(`sdev ${VERSION} is the newest version.`); return; }
  const self = selfPath();
  const dir = dirname(self);
  console.log(`Updating sdev ${VERSION} -> ${r.version}…`);
  const get = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed (${res.status}): ${url}`);
    return new Uint8Array(await res.arrayBuffer());
  };
  try {
    const cli = await get(r.cli.url);
    const extras: [string, Uint8Array][] = [];
    if (r.cli.wasm) extras.push(['sdev-seed.wasm', await get(r.cli.wasm)]);
    if (r.cli.runtime) extras.push(['runtime.s', await get(r.cli.runtime)]);
    // write next to ourselves, then swap atomically
    const tmp = self + '.new';
    writeFileSync(tmp, cli);
    chmodSync(tmp, 0o755);
    for (const [name, bytes] of extras) writeFileSync(join(dir, name), bytes);
    renameSync(tmp, self);
    writeFileSync(stampFile(), JSON.stringify({ at: Date.now(), latest: r.version }));
    console.log(`sdev is now ${r.version}.${r.notes ? '\n' + r.notes : ''}`);
  } catch (e) {
    console.error(`Update failed: ${e instanceof Error ? e.message : String(e)}`);
    console.error('If sdev was installed with npm, run: npm install -g sdev-lang@latest');
    process.exitCode = 1;
  }
}
