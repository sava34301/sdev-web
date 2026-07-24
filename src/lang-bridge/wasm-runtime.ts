/**
 * WASM stage-0 runtime for SDEV v2.
 *
 * Loads the hand-written seed VM (public/wasm/sdev-seed.wasm), compiles the
 * source via the bootstrap compiler, streams bytecode + string pool into WASM
 * linear memory, and invokes `run`. Host imports print into an output buffer.
 *
 * If compilation fails because the source uses a feature outside the
 * bootstrap subset (lists, functions, pipelines, etc.), `runWasm` throws
 * `WasmSubsetError` so callers can fall back to the JS reference runtime.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain JS module
import { compile as bootstrapCompile } from '../../lang/bootstrap/compile.mjs';

export class WasmSubsetError extends Error {}

interface SeedExports {
  memory: WebAssembly.Memory;
  code_base: () => number;
  set_prog_len: (n: number) => void;
  run: () => number;
  sdev_version: () => number;
  alloc_str: (n: number) => number;
}

let cached: Promise<WebAssembly.Module> | null = null;

async function loadSeed(): Promise<WebAssembly.Module> {
  if (!cached) {
    cached = fetch('/wasm/sdev-seed.wasm')
      .then(r => { if (!r.ok) throw new Error(`fetch sdev-seed.wasm: ${r.status}`); return r.arrayBuffer(); })
      .then(buf => WebAssembly.compile(buf));
  }
  return cached;
}

export async function runWasm(source: string): Promise<{ success: boolean; output: string[]; error: string | null }> {
  const output: string[] = [];

  // Compile source to bytecode via the bootstrap compiler.
  let program: { bytecode: Uint8Array; stringPool: Uint8Array };
  try {
    program = bootstrapCompile(source);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Signal "not in bootstrap subset" so the dispatcher can fall back to JS v2.
    throw new WasmSubsetError(msg);
  }

  const module = await loadSeed();
  let mem!: WebAssembly.Memory;
  let allocStr!: (n: number) => number;
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
    env: { host_say_i32: () => {}, host_say_str: () => {}, host_say_f64: () => {}, host_fmath: () => 0 },
  });
  return (inst.exports as unknown as SeedExports).sdev_version();
}
