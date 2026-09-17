import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerHost(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

  // ============= ML host bindings (Milestone 13) =============
  // The ML stdlib (lang/stdlib/ml/*.sdev) is written entirely in sdev but
  // needs a handful of host primitives. A host (Node harness, Electron shell)
  // may override any of them via `globalThis.__sdevHost`; the browser falls
  // back to localStorage-backed files and a synchronous XHR fetch.
  type SdevHost = {
    readFile?: (path: string) => string;
    writeFile?: (path: string, content: string) => void;
    httpGet?: (url: string) => string;
  };
  const host = (): SdevHost => ((globalThis as unknown as { __sdevHost?: SdevHost }).__sdevHost ?? {});

  builtins.set('rand', { type: 'builtin', call: () => Math.random() });
  builtins.set('ln', {
    type: 'builtin',
    call: (args: unknown[], line: number) => Math.log(toNumber(args[0], line)),
  });

  builtins.set('tome_keys', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const t = args[0];
      if (t === null || typeof t !== 'object' || Array.isArray(t)) {
        throw new SdevError('tome_keys() takes a tome', line);
      }
      return Object.keys(t as Record<string, unknown>);
    },
  });

  builtins.set('read_file', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const path = String(args[0] ?? '');
      if (!path) throw new SdevError('read_file() takes a path', line);
      const h = host();
      if (h.readFile) return h.readFile(path);
      if (typeof localStorage !== 'undefined') return localStorage.getItem(`sdev:file:${path}`) ?? '';
      throw new SdevError(`read_file("${path}") — no host file system available`, line);
    },
  });

  builtins.set('write_file', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const path = String(args[0] ?? '');
      const content = String(args[1] ?? '');
      if (!path) throw new SdevError('write_file() takes a path and content', line);
      const h = host();
      if (h.writeFile) { h.writeFile(path, content); return true; }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`sdev:file:${path}`, content);
        return true;
      }
      throw new SdevError(`write_file("${path}") — no host file system available`, line);
    },
  });

  builtins.set('http_get', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const url = String(args[0] ?? '');
      if (!url) throw new SdevError('http_get() takes a url', line);
      const h = host();
      if (h.httpGet) return h.httpGet(url);
      if (typeof XMLHttpRequest !== 'undefined') {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false); // sdev evaluation is synchronous
        xhr.send(null);
        return xhr.responseText ?? '';
      }
      throw new SdevError(`http_get("${url}") — no host network available`, line);
    },
  });

  // ---- FFI host bridge (lang/stdlib/ffi.sdev) ----
  // Buffers are pure JS and always work. Library loading/calling needs a
  // real native host (`__sdevHost.ffi`); without one every handle-returning
  // primitive yields `void` so sdev code can degrade gracefully.
  type FfiHost = {
    open?: (path: string) => number | null;
    sym?: (lib: number, name: string) => number | null;
    call?: (fn: number, ret: string, kinds: unknown, argv: unknown) => unknown;
    close?: (lib: number) => boolean;
  };
  const ffiHost = (): FfiHost => (host() as { ffi?: FfiHost }).ffi ?? {};
  const buffers = new Map<number, DataView>();
  let nextBufAddr = 1;

  const bufOf = (addr: unknown, line: number): DataView => {
    const view = buffers.get(Number(addr));
    if (!view) throw new SdevError('ffi buffer address is not allocated', line);
    return view;
  };

  builtins.set('ffi_buf', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const size = Number(args[0] ?? 0);
      if (!Number.isFinite(size) || size <= 0) {
        throw new SdevError('ffi_buf() takes a positive byte size', line);
      }
      const addr = nextBufAddr++;
      buffers.set(addr, new DataView(new ArrayBuffer(Math.ceil(size))));
      return addr;
    },
  });

  builtins.set('ffi_write_f64', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      bufOf(args[0], line).setFloat64(Number(args[1]) * 8, Number(args[2]), true);
      return true;
    },
  });
  builtins.set('ffi_read_f64', {
    type: 'builtin',
    call: (args: unknown[], line: number) =>
      bufOf(args[0], line).getFloat64(Number(args[1]) * 8, true),
  });
  builtins.set('ffi_write_i32', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      bufOf(args[0], line).setInt32(Number(args[1]) * 4, Number(args[2]) | 0, true);
      return true;
    },
  });
  builtins.set('ffi_read_i32', {
    type: 'builtin',
    call: (args: unknown[], line: number) =>
      bufOf(args[0], line).getInt32(Number(args[1]) * 4, true),
  });

  builtins.set('ffi_open', {
    type: 'builtin',
    call: (args: unknown[]) => ffiHost().open?.(String(args[0] ?? '')) ?? null,
  });
  builtins.set('ffi_sym', {
    type: 'builtin',
    call: (args: unknown[]) =>
      ffiHost().sym?.(Number(args[0]), String(args[1] ?? '')) ?? null,
  });
  builtins.set('ffi_call', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const call = ffiHost().call;
      if (!call) throw new SdevError('ffi_call() — no native FFI host available', line);
      return call(Number(args[0]), String(args[1] ?? 'void'), args[2], args[3]);
    },
  });
  builtins.set('ffi_close', {
    type: 'builtin',
    call: (args: unknown[]) => ffiHost().close?.(Number(args[0])) ?? false,
  });
}
