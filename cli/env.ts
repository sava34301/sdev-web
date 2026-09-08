/**
 * Node environment shims for the sdev CLI.
 *
 * The CLI reuses the *exact* modules the IDE runs (dialects, extensions,
 * the library registry, the self-hosted v2 toolchain). Those modules expect
 * a browser: `localStorage`, `fetch("/wasm/sdev-seed.wasm")`, `btoa`/`atob`.
 * This module installs file-backed equivalents and must be imported first.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, resolve, isAbsolute } from 'node:path';

export const SDEV_HOME = process.env.SDEV_HOME || join(homedir(), '.sdev');
mkdirSync(SDEV_HOME, { recursive: true });

const STORE_PATH = join(SDEV_HOME, 'store.json');
const FILE_NS = 'sdev:file:';

function loadStore(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(STORE_PATH, 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * localStorage backed by ~/.sdev/store.json. Keys in the `sdev:file:`
 * namespace (used by the v2 runtime's read_file/write_file) are mapped onto
 * real files on disk instead, so programs do actual I/O under Node.
 */
class FileStorage implements Storage {
  private data: Record<string, string> = loadStore();

  private flush(): void {
    try {
      writeFileSync(STORE_PATH, JSON.stringify(this.data, null, 2));
    } catch {
      /* read-only home — stay in memory */
    }
  }

  private static diskPath(key: string): string | null {
    if (!key.startsWith(FILE_NS)) return null;
    const p = key.slice(FILE_NS.length);
    return isAbsolute(p) ? p : resolve(process.cwd(), p);
  }

  get length(): number {
    return Object.keys(this.data).length;
  }

  key(i: number): string | null {
    return Object.keys(this.data)[i] ?? null;
  }

  getItem(key: string): string | null {
    const disk = FileStorage.diskPath(key);
    if (disk) {
      try {
        return readFileSync(disk, 'utf8');
      } catch {
        return null;
      }
    }
    return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
  }

  setItem(key: string, value: string): void {
    const disk = FileStorage.diskPath(key);
    if (disk) {
      mkdirSync(dirname(disk), { recursive: true });
      writeFileSync(disk, value);
      return;
    }
    this.data[key] = String(value);
    this.flush();
  }

  removeItem(key: string): void {
    delete this.data[key];
    this.flush();
  }

  clear(): void {
    this.data = {};
    this.flush();
  }
}

if (typeof (globalThis as { localStorage?: Storage }).localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: new FileStorage(), configurable: true });
}

/** Where the seed VM lives: env override, next to the bundle, or in public/. */
export function seedWasmPath(): string {
  const candidates = [
    process.env.SDEV_SEED_WASM,
    join(dirname(process.argv[1] ?? '.'), 'sdev-seed.wasm'),
    resolve(process.cwd(), 'public/wasm/sdev-seed.wasm'),
    resolve(SDEV_HOME, 'sdev-seed.wasm'),
  ].filter(Boolean) as string[];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error('sdev-seed.wasm not found. Set SDEV_SEED_WASM to its path.');
}

const nativeFetch = globalThis.fetch?.bind(globalThis);

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  if (url.includes('sdev-seed.wasm')) {
    const bytes = readFileSync(seedWasmPath());
    return new Response(new Uint8Array(bytes), { status: 200, headers: { 'content-type': 'application/wasm' } });
  }
  if (url.startsWith('/')) {
    const local = resolve(process.cwd(), 'public' + url);
    if (existsSync(local)) return new Response(readFileSync(local), { status: 200 });
  }
  if (!nativeFetch) throw new Error('fetch is unavailable in this Node build');
  return nativeFetch(input, init);
}) as typeof fetch;
