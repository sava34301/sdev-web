import { Lexer } from '../core/lexer';
import { Parser } from '../core/parser';
import type { Environment } from '../core/environment';
import { InterpreterCore } from './interpreter-core';
import { stringify } from '../builtins/utils';
import { createCoreBuiltins } from '../builtins/core';

export type SdevCallable = { call: (args: unknown[], line: number) => unknown };

export interface SdevModuleRunner {
  readonly env: Environment;
  call: (fnName: string, ...args: unknown[]) => unknown;
  callStr: (fnName: string, ...args: unknown[]) => string;
  getVar: (name: string) => unknown;
  setVar: (name: string, val: unknown) => void;
}

function stripUseLines(src: string): string {
  return src
    .split('\n')
    .filter((l) => !l.trim().startsWith('use "'))
    .join('\n');
}

function bindSeedVmPrimitives(env: Environment): void {
  const def = (name: string, call: (args: unknown[], line: number) => unknown) =>
    env.define(name, { type: 'builtin', call });

  def('length', (a) => {
    const x = a[0];
    if (x == null) return 0;
    if (typeof x === 'string' || Array.isArray(x)) return x.length;
    if (typeof x === 'object') return Object.keys(x as object).length;
    return 0;
  });
  def('substr', (a) => {
    const s = String(a[0] ?? '');
    const start = Math.max(0, Number(a[1] ?? 0));
    const n = Math.max(0, Number(a[2] ?? s.length));
    return s.slice(start, start + n);
  });
  def('mklist', (a) => Array.from({ length: Math.max(0, Number(a[0] ?? 0)) }, () => null));
  def('find', (a) => {
    if (typeof a[0] === 'string') return a[0].indexOf(String(a[1] ?? ''));
    if (Array.isArray(a[0])) {
      const fn = a[1] as SdevCallable | undefined;
      if (fn && typeof fn.call === 'function') {
        for (const item of a[0]) if (fn.call([item], 0)) return item;
        return null;
      }
      return a[0].indexOf(a[1]);
    }
    return -1;
  });
  def('concat', (a) => {
    if (Array.isArray(a[0])) return ([] as unknown[]).concat(...(a as unknown[][]));
    return a.map((x) => (x === null || x === undefined ? '' : typeof x === 'object' ? stringify(x) : String(x))).join('');
  });
  def('split', (a) => String(a[0] ?? '').split(String(a[1] ?? '')));
  def('join', (a) => (Array.isArray(a[0]) ? a[0].map((x) => (x == null ? '' : String(x))).join(String(a[1] ?? '')) : ''));
  def('write_file', () => 0);

  // Seed VM float-math intrinsics
  def('i2f', (a) => Number(a[0] ?? 0));
  def('f2i', (a) => Math.trunc(Number(a[0] ?? 0)));
  def('fround', (a) => Math.round(Number(a[0] ?? 0)));
  def('ffloor', (a) => Math.floor(Number(a[0] ?? 0)));
  def('fceil', (a) => Math.ceil(Number(a[0] ?? 0)));
  def('fabs', (a) => Math.abs(Number(a[0] ?? 0)));
  def('fsqrt', (a) => Math.sqrt(Number(a[0] ?? 0)));
  def('fsin', (a) => Math.sin(Number(a[0] ?? 0)));
  def('fcos', (a) => Math.cos(Number(a[0] ?? 0)));
  def('ftan', (a) => Math.tan(Number(a[0] ?? 0)));
  def('fexp', (a) => Math.exp(Number(a[0] ?? 0)));
  def('flog', (a) => Math.log(Number(a[0] ?? 1)));
  def('fpow', (a) => Math.pow(Number(a[0] ?? 0), Number(a[1] ?? 1)));
}

/**
 * Compile and instantiate one or more `.sdev` source modules once, returning a
 * synchronous bridge for calling functions implemented in pure SDEV.
 */
export function createSdevModuleRunner(...rawSources: string[]): SdevModuleRunner {
  const uniqueSources: string[] = [];
  const seen = new Set<string>();
  for (const s of rawSources) {
    if (!seen.has(s)) {
      seen.add(s);
      uniqueSources.push(stripUseLines(s));
    }
  }
  const combined = uniqueSources.join('\n');
  const tokens = new Lexer(combined, { translate: false }).tokenize();
  const ast = new Parser(tokens).parse();
  const interp = new InterpreterCore(() => {});
  const env = interp.getGlobalEnv();
  createCoreBuiltins(() => {}, interp.getFopRegistry()).forEach((fn, name) => env.define(name, fn));
  bindSeedVmPrimitives(env);
  interp.interpret(ast);

  return {
    env,
    call: (fnName: string, ...args: unknown[]) => {
      const fn = env.get(fnName, 0) as SdevCallable;
      return fn.call(args, 0);
    },
    callStr: (fnName: string, ...args: unknown[]) => {
      const fn = env.get(fnName, 0) as SdevCallable;
      const res = fn.call(args, 0);
      return typeof res === 'string' ? res.replace(/[\x01\x02]/g, '') : String(res ?? '');
    },
    getVar: (name: string) => env.get(name, 0),
    setVar: (name: string, val: unknown) => env.define(name, val),
  };
}

/** Cache a `createSdevModuleRunner` lazily on first invocation. */
export function lazyModuleRunner(...rawSources: string[]): () => SdevModuleRunner {
  let cached: SdevModuleRunner | null = null;
  return () => {
    if (!cached) cached = createSdevModuleRunner(...rawSources);
    return cached;
  };
}
