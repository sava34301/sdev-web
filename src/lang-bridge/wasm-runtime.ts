/**
 * WASM stage-0 runtime for SDEV v2.
 *
 * Loads the hand-written seed VM (public/wasm/sdev-seed.wasm), compiles the
 * source via the SELF-HOSTED compiler shim (Milestone 5p — the JS bootstrap
 * is no longer in this path), streams bytecode + string pool into WASM
 * linear memory, and invokes `run`. Host imports print into an output buffer.
 *
 * If compilation fails because the source uses a feature outside the
 * stage-0 subset (lists, functions, pipelines, etc.), `runWasm` throws
 * `WasmSubsetError` so callers can fall back to the JS reference runtime.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain JS module
import { compile as selfCompile, setSeedLoader } from './compile-self.mjs';
import { translateSource, type TranslatorDialect } from '@/lang/translator';

export class WasmSubsetError extends Error {}

// The SDEV standard library ships with the website, so `use
// "lang/stdlib/v2/oce.sdev"` works in the browser exactly as on the CLI.
// Files load lazily, only when a program names them.
type Loader = () => Promise<string>;
let STDLIB: Record<string, Loader> = {};
try {
  STDLIB = import.meta.glob('/lang/stdlib/**/*.sdev', { query: '?raw', import: 'default' }) as Record<string, Loader>;
} catch { /* not running under Vite (Node / Bun) — files come from disk */ }

const USE_RE = /^[ \t]*use "([^"]+)"[ \t]*$/gm;

/** Add every shipped stdlib file the program (transitively) uses. */
export async function withStdlib(source: string, modules?: Record<string, string> | null): Promise<Record<string, string> | null> {
  if (Object.keys(STDLIB).length === 0) return modules ?? null;
  const out: Record<string, string> = { ...(modules ?? {}) };
  const queue = [source, ...Object.values(out)];
  let added = false;
  while (queue.length) {
    const text = queue.pop()!;
    for (const m of text.matchAll(USE_RE)) {
      const path = m[1];
      if (path in out) continue;
      const load = STDLIB['/' + path.replace(/^\.?\//, '')];
      if (!load) continue;
      out[path] = await load();
      queue.push(out[path]);
      added = true;
    }
  }
  return added || modules ? out : null;
}

interface SeedExports {
  memory: WebAssembly.Memory;
  code_base: () => number;
  set_prog_len: (n: number) => void;
  run: () => number;
  sdev_version: () => number;
  alloc_str: (n: number) => number;
}

let cached: Promise<WebAssembly.Module> | null = null;
let cachedBytes: Promise<ArrayBuffer> | null = null;
let cachedOracleCompile: ((src: string, opts?: { readModule?: (p: string) => string }) => unknown) | null = null;
const compiledProgramCache = new Map<string, { bytecode: Uint8Array; stringPool: Uint8Array }>();
const COMPILED_CACHE_MAX = 16;

function compiledCacheKey(source: string, modules?: Record<string, string>): string {
  if (!modules) return source;
  const keys = Object.keys(modules).sort();
  let key = source + '\0';
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    key += k + '\0' + modules[k] + '\0';
  }
  return key;
}

async function loadSeedBytes(): Promise<ArrayBuffer> {
  if (!cachedBytes) {
    cachedBytes = fetch('/wasm/sdev-seed.wasm')
      .then(r => { if (!r.ok) throw new Error(`fetch sdev-seed.wasm: ${r.status}`); return r.arrayBuffer(); });
  }
  return cachedBytes;
}

async function loadSeed(): Promise<WebAssembly.Module> {
  if (!cached) {
    cached = loadSeedBytes().then(buf => WebAssembly.compile(buf));
  }
  return cached;
}

export interface RunWasmOptions {
  /** Natural language of the source: 'auto' (default), 'English', or a name. */
  sourceLanguage?: string | null;
  /** Active dialect — its words are already canonical and stay untouched. */
  dialect?: TranslatorDialect | null;
}

export async function runWasm(
  source: string,
  modules?: Record<string, string>,
  options: RunWasmOptions = {},
): Promise<{ success: boolean; output: string[]; error: string | null }> {
  const output: string[] = [];

  // ── Built-in multilingual pass ──
  // Part of the language, not the IDE: any entry point that reaches the
  // self-hosted toolchain accepts sdev written in a supported human
  // language, translated onto the canonical v2 surface first.
  // When a personal dialect is active, canonicalize() has already translated
  // the dialect's words — skip translateSource so user identifiers in
  // Bulgarian or other scripts are never rewritten as keywords.
  const lang = options.sourceLanguage ?? 'auto';
  if (!options.dialect && lang !== 'English' && lang !== null) {
    const opts = { target: 'v2' as const, dialect: null };
    source = translateSource(source, lang, opts).translated;
    if (modules) {
      modules = Object.fromEntries(
        Object.entries(modules).map(([k, v]) => [k, translateSource(v, lang, opts).translated]),
      );
    }
  }

  // Milestone 5q: floats and host I/O are compiled by the self-hosted
  // codegen itself, so there is no bootstrap-only carve-out left here.
  // Compile source to bytecode via the self-hosted compiler shim.
  modules = (await withStdlib(source, modules)) ?? undefined;
  setSeedLoader(loadSeedBytes);
  const isDiagnosticError = (msg: string) =>
    /unknown function|expected \d+ args|joining lists with \+|unknown (?:parent )?kind|outside of a loop|too many (?:globals|locals)|overflow/.test(msg);

  // Check with the reference compiler first so syntax or semantic issues fail
  // fast without spinning up the WASM self-hosted compiler.
  const cacheKey = compiledCacheKey(source, modules);
  let program = compiledProgramCache.get(cacheKey);
  if (!program) {
    try {
      if (!cachedOracleCompile) {
        const oracle = await import('./oracle/compile.mjs');
        cachedOracleCompile = oracle.compile;
      }
      cachedOracleCompile(source, modules ? { readModule: (path: string) => modules?.[path] ?? '' } : {});
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).replace(/^\[sdev v2\] line \d+: /, '');
      if (isDiagnosticError(msg)) {
        return { success: false, output: [], error: msg };
      }
      throw new WasmSubsetError(msg);
    }

    try {
      program = await selfCompile(source, modules ?? null);
      if (program.bytecode.length === 0) throw new Error('stage-0 compiler produced no bytecode');
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).replace(/^\[sdev v2\] line \d+: /, '');
      if (isDiagnosticError(msg)) {
        return { success: false, output: [], error: msg };
      }
      // Signal "not in stage-0 subset" so the dispatcher can fall back to the understander.
      throw new WasmSubsetError(msg);
    }

    if (compiledProgramCache.size >= COMPILED_CACHE_MAX) {
      const oldest = compiledProgramCache.keys().next().value;
      if (oldest !== undefined) compiledProgramCache.delete(oldest);
    }
    compiledProgramCache.set(cacheKey, program);
  }

  const module = await loadSeed();
  /* eslint-disable prefer-const */
  let mem!: WebAssembly.Memory;
  let allocStr!: (n: number) => number;
  /* eslint-enable prefer-const */
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  // Browser file I/O maps onto localStorage under an "sdev:file:" namespace,
  // so the same read_file/write_file builtins work in the IDE without
  // dragging in a proper virtual filesystem yet.
  const readVfs = (path: string): Uint8Array | null => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('sdev:file:' + path) : null;
      return raw == null ? null : encoder.encode(raw);
    } catch { return null; }
  };
  const writeVfs = (path: string, bytes: Uint8Array): boolean => {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem('sdev:file:' + path, decoder.decode(bytes));
      return true;
    } catch { return false; }
  };
  const putBlob = (bytes: Uint8Array): number => {
    const dst = allocStr(bytes.length);
    new Uint8Array(mem.buffer, dst + 4, bytes.length).set(bytes);
    return dst;
  };

  const instance = await WebAssembly.instantiate(module, {
    env: {
      host_say_i32: (n: number) => output.push(String(n)),
      host_say_str: (ptr: number, len: number) => {
        const bytes = new Uint8Array(mem.buffer, ptr, len);
        output.push(decoder.decode(bytes));
      },
      host_say_f64: (x: number) => output.push(String(x)),
      host_fmath: (op: number, a: number, b: number): number => {
        switch (op) {
          case 0: return Math.sin(a);
          case 1: return Math.cos(a);
          case 2: return Math.tan(a);
          case 3: return Math.exp(a);
          case 4: return Math.log(a);
          case 5: return Math.pow(a, b);
          default: return NaN;
        }
      },
      host_read_file: (ptr: number, len: number): number => {
        const path = decoder.decode(new Uint8Array(mem.buffer, ptr, len));
        const bytes = readVfs(path) ?? new Uint8Array(0);
        return putBlob(bytes);
      },
      host_write_file: (pPtr: number, pLen: number, dPtr: number, dLen: number): number => {
        const path = decoder.decode(new Uint8Array(mem.buffer, pPtr, pLen));
        const data = new Uint8Array(mem.buffer, dPtr, dLen).slice();
        return writeVfs(path, data) ? 0 : -1;
      },
      // Networking in the browser is best-effort and gated on CORS. Fetch is
      // async; the seed VM is synchronous, so we degrade to an empty blob
      // and log a hint. Programs that need HTTP should run under Node.
      host_http_get: (_ptr: number, _len: number): number => {
        console.warn('[sdev] http_get is unavailable in the browser runtime; use the Node CLI.');
        return putBlob(new Uint8Array(0));
      },
    },
  });

  const exports = instance.exports as unknown as SeedExports;
  mem = exports.memory;
  allocStr = exports.alloc_str;

  // Load string pool into 0x0000..0x1FFF and bytecode into code_base()
  const memU8 = new Uint8Array(mem.buffer);
  memU8.set(program.stringPool, 0);
  const codeBase = exports.code_base();
  if (codeBase + program.bytecode.length > memU8.length) {
    throw new Error('program too large for stage-0 memory');
  }
  memU8.set(program.bytecode, codeBase);
  exports.set_prog_len(program.bytecode.length);

  try {
    exports.run();
    return { success: true, output, error: null };
  } catch (e) {
    return { success: false, output, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function seedVersion(): Promise<number> {
  const mod = await loadSeed();
  const inst = await WebAssembly.instantiate(mod, {
    env: { host_say_i32: () => {}, host_say_str: () => {}, host_say_f64: () => {}, host_fmath: () => 0, host_read_file: () => 0, host_write_file: () => -1, host_http_get: () => 0 },
  });
  return (inst.exports as unknown as SeedExports).sdev_version();
}
