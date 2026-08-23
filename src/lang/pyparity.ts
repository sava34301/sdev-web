// ============================================================
// sdev Python-parity builtin surface
// ============================================================
// Everything here mirrors a CPython builtin, decorator, or
// standard-library helper so that programs translated from
// Python keep working verbatim.

import { SdevFunction, OutputCallback, stringify, isTruthy } from './builtins';
import { SdevError } from './errors';
import {
  SdevSet, SdevRaise, keyOf, makeTuple, isTuple, makeGenerator, isGenerator,
  isFunction, SdevGenerator,
} from './runtime-values';

export interface ParityHost {
  call: (fn: unknown, args: unknown[], line: number) => unknown;
  iterate: (value: unknown, line: number) => Iterable<unknown>;
  truthy: (value: unknown) => boolean;
  equal: (a: unknown, b: unknown) => boolean;
}

const fn = (name: string, impl: (args: unknown[], line: number) => unknown): SdevFunction =>
  ({ type: 'builtin', call: impl, name } as unknown as SdevFunction);

/** Splits a trailing keyword-argument bag off an argument list. */
function splitKwargs(args: unknown[]): { pos: unknown[]; kw: Record<string, unknown> } {
  const last = args[args.length - 1];
  if (last && typeof last === 'object' && (last as { __kwargs?: boolean }).__kwargs) {
    const { __kwargs, ...kw } = last as Record<string, unknown>;
    void __kwargs;
    return { pos: args.slice(0, -1), kw };
  }
  return { pos: args, kw: {} };
}

/**
 * Hook installed by the interpreter so user objects implementing
 * `on_repr` / `__repr__` control their own repr form.
 */
let objectReprHook: ((value: unknown) => string | undefined) | null = null;
export function setObjectReprHook(hook: ((value: unknown) => string | undefined) | null): void {
  objectReprHook = hook;
}

/** Python's `repr()`. */
export function repr(value: unknown): string {
  if (value && typeof value === 'object' && objectReprHook) {
    const custom = objectReprHook(value);
    if (custom !== undefined) return custom;
  }
  if (value === null || value === undefined) return 'void';
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (typeof value === 'boolean') return value ? 'yep' : 'nope';
  if (typeof value === 'number') return String(value);
  if (value instanceof SdevSet) return '{|' + value.values().map(repr).join(', ') + '|}';
  if (value instanceof Uint8Array) return `b"${Array.from(value).map((b) => String.fromCharCode(b)).join('')}"`;
  if (Array.isArray(value)) {
    const body = value.map(repr).join(', ');
    return isTuple(value) ? `(${body}${value.length === 1 ? ',' : ''})` : `[${body}]`;
  }
  if (isGenerator(value)) return '<generator>';
  if (isFunction(value)) return '<function>';
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (o.__error__) return `${o.name}(${repr(o.message)})`;
    const klass = (value as { __class__?: { name: string } }).__class__;
    const body = Object.keys(o).map((k) => `${k}: ${repr(o[k])}`).join(', ');
    return klass ? `${klass.name}{${body}}` : `{${body}}`;
  }
  return String(value);
}

/**
 * Implements Python's format-spec mini-language:
 * `[[fill]align][sign][#][0][width][,][.precision][type]`
 */
export function formatValue(value: unknown, spec?: string, conv?: string): string {
  let text: string;
  if (conv === 'r') text = repr(value);
  else if (conv === 'a') text = repr(value);
  else text = displayText(value);

  if (!spec) return text;

  const m = /^(?:(.)?([<>^]))?([+\- ])?(#)?(0)?(\d+)?(,)?(?:\.(\d+))?([bcdeEfFgGnosxX%])?$/.exec(spec);
  if (!m) return text;
  const [, fillRaw, align, sign, alt, zero, widthRaw, comma, precRaw, kind] = m;
  const width = widthRaw ? parseInt(widthRaw, 10) : 0;
  const prec = precRaw ? parseInt(precRaw, 10) : undefined;

  if (kind && 'bcdeEfFgGnosxX%'.includes(kind) && kind !== 's') {
    const num = Number(value);
    switch (kind) {
      case 'b': text = (num >>> 0).toString(2); break;
      case 'o': text = (num >>> 0).toString(8); break;
      case 'x': text = (num >>> 0).toString(16); break;
      case 'X': text = (num >>> 0).toString(16).toUpperCase(); break;
      case 'c': text = String.fromCharCode(num); break;
      case 'd': case 'n': text = String(Math.trunc(num)); break;
      case 'e': text = num.toExponential(prec ?? 6); break;
      case 'E': text = num.toExponential(prec ?? 6).toUpperCase(); break;
      case 'f': case 'F': text = num.toFixed(prec ?? 6); break;
      case 'g': case 'G': text = prec !== undefined ? num.toPrecision(prec) : String(num); break;
      case '%': text = (num * 100).toFixed(prec ?? 6) + '%'; break;
    }
    if (alt && kind === 'x') text = '0x' + text;
    if (alt && kind === 'b') text = '0b' + text;
    if (alt && kind === 'o') text = '0o' + text;
  } else if (prec !== undefined && typeof value === 'number') {
    text = value.toFixed(prec);
  } else if (prec !== undefined && typeof value === 'string') {
    text = value.slice(0, prec);
  }

  if (comma) {
    const [ip, fp] = text.split('.');
    text = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fp ? '.' + fp : '');
  }
  if (sign === '+' && typeof value === 'number' && Number(value) >= 0) text = '+' + text;
  if (sign === ' ' && typeof value === 'number' && Number(value) >= 0) text = ' ' + text;

  if (width && text.length < width) {
    const fill = fillRaw ?? (zero ? '0' : ' ');
    const pad = fill.repeat(width - text.length);
    const defaultAlign = typeof value === 'number' ? '>' : '<';
    switch (align ?? (zero ? '>' : defaultAlign)) {
      case '>': text = pad + text; break;
      case '^': {
        const left = Math.floor(pad.length / 2);
        text = pad.slice(0, left) + text + pad.slice(left);
        break;
      }
      default: text = text + pad;
    }
  }
  return text;
}

/** Human-readable text (Python's `str()`). */
export function displayText(value: unknown): string {
  if (value === null || value === undefined) return 'void';
  if (typeof value === 'boolean') return value ? 'yep' : 'nope';
  if (value instanceof SdevSet) return value.toString();
  if (Array.isArray(value)) {
    const body = value.map(repr).join(', ');
    return isTuple(value) ? `(${body})` : `[${body}]`;
  }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (o.__error__) return `${o.name}: ${o.message}`;
  }
  return stringify(value);
}

export function createParityBuiltins(output: OutputCallback, host: ParityHost): Map<string, SdevFunction> {
  const b = new Map<string, SdevFunction>();
  const add = (name: string, impl: (args: unknown[], line: number) => unknown) => b.set(name, fn(name, impl));

  const list = (v: unknown, line: number): unknown[] => [...host.iterate(v, line)];
  const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v));

  // ---------- core output ----------
  add('print', (args) => {
    const { pos, kw } = splitKwargs(args);
    const sep = kw.sep === undefined ? ' ' : String(kw.sep);
    const end = kw.end === undefined ? '' : String(kw.end);
    output(pos.map(displayText).join(sep) + end);
    return null;
  });

  // ---------- conversions ----------
  add('str', (args) => (args.length ? displayText(args[0]) : ''));
  add('repr', (args) => repr(args[0]));
  add('int', (args) => {
    const [v, base] = args;
    if (typeof v === 'string') return parseInt(v.trim(), base ? num(base) : 10) || 0;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return Math.trunc(num(v));
  });
  add('float', (args) => (args.length ? parseFloat(String(args[0])) : 0));
  add('bool', (args) => host.truthy(args[0]));
  add('complexish', (args) => ({ real: num(args[0]), imag: num(args[1] ?? 0) }));
  add('bytes', (args, line) => {
    const v = args[0];
    if (typeof v === 'string') return new Uint8Array([...v].map((c) => c.charCodeAt(0)));
    if (typeof v === 'number') return new Uint8Array(v);
    return new Uint8Array(list(v, line).map((x) => num(x) & 0xff));
  });

  // ---------- containers ----------
  add('list', (args, line) => (args.length ? list(args[0], line) : []));
  add('tuple', (args, line) => makeTuple(args.length ? list(args[0], line) : []));
  add('set', (args, line) => new SdevSet(args.length ? list(args[0], line) : []));
  add('frozenset', (args, line) => new SdevSet(args.length ? list(args[0], line) : [], true));
  add('dict', (args, line) => {
    const { pos, kw } = splitKwargs(args);
    const out: Record<string, unknown> = {};
    if (pos.length && pos[0] && typeof pos[0] === 'object' && !Array.isArray(pos[0])) {
      Object.assign(out, pos[0] as Record<string, unknown>);
    } else if (pos.length) {
      for (const pair of list(pos[0], line)) {
        const [k, v] = list(pair, line);
        out[stringify(k)] = v;
      }
    }
    Object.assign(out, kw);
    return out;
  });

  add('len', (args, line) => {
    const v = args[0];
    if (typeof v === 'string' || Array.isArray(v)) return v.length;
    if (v instanceof SdevSet) return v.size;
    if (v instanceof Uint8Array) return v.length;
    if (v && typeof v === 'object') return Object.keys(v as object).length;
    throw new SdevError('len() needs a sized value', line);
  });

  add('range', (args) => {
    const [a, bb, c] = args.map((x) => (x === undefined ? undefined : num(x)));
    const start = bb === undefined ? 0 : a!;
    const stop = bb === undefined ? a! : bb;
    const step = c === undefined ? 1 : c;
    const out: number[] = [];
    if (step === 0) return out;
    if (step > 0) for (let i = start; i < stop; i += step) out.push(i);
    else for (let i = start; i > stop; i += step) out.push(i);
    return out;
  });

  add('enumerate', (args, line) => {
    const items = list(args[0], line);
    const start = args[1] === undefined ? 0 : num(args[1]);
    return items.map((v, i) => makeTuple([i + start, v]));
  });

  add('zip', (args, line) => {
    const cols = args.map((a) => list(a, line));
    const n = cols.length ? Math.min(...cols.map((c) => c.length)) : 0;
    const out: unknown[] = [];
    for (let i = 0; i < n; i++) out.push(makeTuple(cols.map((c) => c[i])));
    return out;
  });

  add('zip_longest', (args, line) => {
    const { pos, kw } = splitKwargs(args);
    const filler = kw.fillvalue ?? null;
    const cols = pos.map((a) => list(a, line));
    const n = cols.length ? Math.max(...cols.map((c) => c.length)) : 0;
    const out: unknown[] = [];
    for (let i = 0; i < n; i++) out.push(makeTuple(cols.map((c) => (i < c.length ? c[i] : filler))));
    return out;
  });

  add('map', (args, line) => {
    const f = args[0];
    const cols = args.slice(1).map((a) => list(a, line));
    const n = cols.length ? Math.min(...cols.map((c) => c.length)) : 0;
    const out: unknown[] = [];
    for (let i = 0; i < n; i++) out.push(host.call(f, cols.map((c) => c[i]), line));
    return out;
  });

  add('filter', (args, line) => {
    const [f, seq] = args;
    return list(seq, line).filter((v) => (f === null ? host.truthy(v) : host.truthy(host.call(f, [v], line))));
  });

  add('any', (args, line) => list(args[0], line).some((v) => host.truthy(v)));
  add('all', (args, line) => list(args[0], line).every((v) => host.truthy(v)));

  add('sorted', (args, line) => {
    const { pos, kw } = splitKwargs(args);
    const items = list(pos[0], line);
    const key = kw.key ?? pos[1];
    const reverse = host.truthy(kw.reverse);
    const scored = items.map((v) => ({ v, k: key ? host.call(key, [v], line) : v }));
    scored.sort((x, y) => {
      const a = x.k as number | string;
      const bb = y.k as number | string;
      if (a === bb) return 0;
      return a < bb ? -1 : 1;
    });
    const out = scored.map((s) => s.v);
    return reverse ? out.reverse() : out;
  });

  add('reversed', (args, line) => list(args[0], line).reverse());

  add('min', (args, line) => {
    const { pos, kw } = splitKwargs(args);
    const items = pos.length === 1 ? list(pos[0], line) : pos;
    if (!items.length) return kw.default ?? null;
    const key = kw.key;
    return items.reduce((best, v) => {
      const bv = key ? host.call(key, [best], line) : best;
      const vv = key ? host.call(key, [v], line) : v;
      return (vv as number) < (bv as number) ? v : best;
    });
  });

  add('max', (args, line) => {
    const { pos, kw } = splitKwargs(args);
    const items = pos.length === 1 ? list(pos[0], line) : pos;
    if (!items.length) return kw.default ?? null;
    const key = kw.key;
    return items.reduce((best, v) => {
      const bv = key ? host.call(key, [best], line) : best;
      const vv = key ? host.call(key, [v], line) : v;
      return (vv as number) > (bv as number) ? v : best;
    });
  });

  add('sum', (args, line) => {
    const items = list(args[0], line);
    let acc: unknown = args[1] ?? 0;
    for (const v of items) acc = (acc as number) + (v as number);
    return acc;
  });

  // ---------- numeric ----------
  add('abs', (args) => Math.abs(num(args[0])));
  add('round', (args) => {
    const n = num(args[0]);
    const d = args[1] === undefined ? 0 : num(args[1]);
    const f = Math.pow(10, d);
    return Math.round(n * f) / f;
  });
  add('pow', (args) => {
    const [a, e, m] = args.map(num);
    if (args[2] === undefined) return Math.pow(a, e);
    let result = 1;
    let base = a % m;
    let exp = e;
    while (exp > 0) {
      if (exp % 2 === 1) result = (result * base) % m;
      base = (base * base) % m;
      exp = Math.floor(exp / 2);
    }
    return result;
  });
  add('divmod', (args) => {
    const [a, bb] = args.map(num);
    return makeTuple([Math.floor(a / bb), ((a % bb) + bb) % bb]);
  });
  add('bin', (args) => '0b' + (num(args[0]) >>> 0).toString(2));
  add('oct', (args) => '0o' + (num(args[0]) >>> 0).toString(8));
  add('hex', (args) => '0x' + (num(args[0]) >>> 0).toString(16));

  // ---------- reflection ----------
  add('type', (args) => {
    const v = args[0];
    if (v === null || v === undefined) return 'void';
    if (Array.isArray(v)) return isTuple(v) ? 'tuple' : 'list';
    if (v instanceof SdevSet) return v.frozen ? 'frozenset' : 'set';
    if (v instanceof Uint8Array) return 'bytes';
    if (isGenerator(v)) return 'generator';
    if (isFunction(v)) return 'function';
    if (typeof v === 'object') {
      const klass = (v as { __class__?: { name: string } }).__class__;
      if (klass) return klass.name;
      if ((v as { type?: string }).type === 'class') return 'class';
      return 'tome';
    }
    if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
    return typeof v;
  });

  add('isinstance', (args) => {
    const [v, t] = args;
    const names = Array.isArray(t) ? t : [t];
    const typeName = (b.get('type') as SdevFunction).call([v], 0) as string;
    return names.some((want) => {
      if (want && typeof want === 'object' && (want as { name?: string }).name) {
        const klass = want as { name: string; mro?: { name: string }[] };
        const own = (v as { __class__?: { mro: { name: string }[] } }).__class__;
        if (own) return own.mro.some((c) => c.name === klass.name);
        return typeName === klass.name;
      }
      const s = String(want);
      if (s === 'number' && (typeName === 'int' || typeName === 'float')) return true;
      return s === typeName;
    });
  });

  add('issubclass', (args) => {
    const [a, bb] = args as [{ mro?: { name: string }[] }, { name?: string }];
    if (!a?.mro) return false;
    return a.mro.some((c) => c.name === bb?.name);
  });

  add('getattr', (args) => {
    const [obj, name, fallback] = args;
    if (obj && typeof obj === 'object') {
      const v = (obj as Record<string, unknown>)[String(name)];
      return v === undefined ? (fallback ?? null) : v;
    }
    return fallback ?? null;
  });
  add('setattr', (args) => {
    const [obj, name, value] = args;
    if (obj && typeof obj === 'object') (obj as Record<string, unknown>)[String(name)] = value;
    return null;
  });
  add('hasattr', (args) => {
    const [obj, name] = args;
    return !!obj && typeof obj === 'object' && (obj as Record<string, unknown>)[String(name)] !== undefined;
  });
  add('delattr', (args) => {
    const [obj, name] = args;
    if (obj && typeof obj === 'object') delete (obj as Record<string, unknown>)[String(name)];
    return null;
  });
  add('vars', (args) => {
    const o = args[0];
    return o && typeof o === 'object' ? { ...(o as Record<string, unknown>) } : {};
  });
  add('dir', (args) => (args[0] && typeof args[0] === 'object' ? Object.keys(args[0] as object).sort() : []));
  add('callable', (args) => isFunction(args[0]) || (!!args[0] && (args[0] as { type?: string }).type === 'class'));
  add('id', (args) => keyOf(args[0]).length * 2654435761 % 2147483647);
  add('hash', (args) => {
    const s = keyOf(args[0]);
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  });
  add('format', (args) => formatValue(args[0], args[1] === undefined ? undefined : String(args[1])));

  // ---------- iteration protocol ----------
  add('iter', (args, line) => {
    const v = args[0];
    if (isGenerator(v)) return v;
    const items = host.iterate(v, line);
    const it = items[Symbol.iterator]();
    return makeGenerator(it as Iterator<unknown, unknown, unknown>);
  });

  add('next', (args, line) => {
    const g = args[0];
    if (!isGenerator(g)) throw new SdevError('next() needs a generator', line);
    const step = (g as SdevGenerator).next(args[2]);
    if (step.done) {
      if (args.length > 1) return args[1];
      throw new SdevRaise({ __error__: true, name: 'StopIteration', message: 'iterator exhausted' });
    }
    return step.value;
  });

  add('send', (args, line) => {
    const g = args[0];
    if (!isGenerator(g)) throw new SdevError('send() needs a generator', line);
    const step = (g as SdevGenerator).next(args[1]);
    return step.done ? null : step.value;
  });

  add('close', (args) => {
    const g = args[0];
    if (isGenerator(g)) (g as SdevGenerator).close();
    return null;
  });

  add('collect', (args, line) => list(args[0], line));

  // ---------- decorators ----------
  add('property', (args) => args[0]);
  add('staticmethod', (args) => args[0]);
  add('classmethod', (args) => args[0]);
  add('wraps', () => fn('wrapper', (a) => a[0]));

  add('cache', (args, line) => {
    const target = args[0];
    const memo = new Map<string, unknown>();
    return fn('cached', (callArgs) => {
      const k = keyOf(callArgs);
      if (!memo.has(k)) memo.set(k, host.call(target, callArgs, line));
      return memo.get(k);
    });
  });
  b.set('lru_cache', fn('lru_cache', (args, line) => {
    // Usable both as `@lru_cache` and `@lru_cache(maxsize be 128)`
    if (args.length && isFunction(args[0])) return (b.get('cache') as SdevFunction).call(args, line);
    return fn('lru_cache_apply', (inner, l) => (b.get('cache') as SdevFunction).call(inner, l));
  }));

  add('partial', (args, line) => {
    const [target, ...bound] = args;
    return fn('partial', (callArgs, l) => host.call(target, [...bound, ...callArgs], l ?? line));
  });

  add('reduce', (args, line) => {
    const [f, seq, initial] = args;
    const items = list(seq, line);
    let acc: unknown;
    let start = 0;
    if (args.length > 2) acc = initial;
    else { acc = items[0]; start = 1; }
    for (let i = start; i < items.length; i++) acc = host.call(f, [acc, items[i]], line);
    return acc;
  });

  add('dataclass', (args) => args[0]);

  // ---------- itertools ----------
  add('count', (args) => {
    let i = args[0] === undefined ? 0 : num(args[0]);
    const step = args[1] === undefined ? 1 : num(args[1]);
    const it = (function* (): Generator<unknown, unknown, unknown> {
      for (;;) { yield i; i += step; }
    })();
    return makeGenerator(it);
  });

  add('cycle', (args, line) => {
    const items = list(args[0], line);
    const it = (function* (): Generator<unknown, unknown, unknown> {
      if (!items.length) return null;
      for (;;) for (const v of items) yield v;
    })();
    return makeGenerator(it);
  });

  add('repeat', (args) => {
    const [v, times] = args;
    const it = (function* (): Generator<unknown, unknown, unknown> {
      if (times === undefined) { for (;;) yield v; }
      for (let i = 0; i < num(times); i++) yield v;
      return null;
    })();
    return makeGenerator(it);
  });

  add('chain', (args, line) => args.flatMap((a) => list(a, line)));

  add('islice', (args, line) => {
    const [seq, a, bb, c] = args;
    const items: unknown[] = [];
    const start = bb === undefined ? 0 : num(a);
    const stop = bb === undefined ? (a === undefined ? Infinity : num(a)) : num(bb);
    const step = c === undefined ? 1 : num(c);
    let i = 0;
    for (const v of host.iterate(seq, line)) {
      if (i >= stop) break;
      if (i >= start && (i - start) % step === 0) items.push(v);
      i++;
    }
    return items;
  });

  add('product', (args, line) => {
    const { pos, kw } = splitKwargs(args);
    const repeatN = kw.repeat === undefined ? 1 : num(kw.repeat);
    let pools = pos.map((a) => list(a, line));
    if (repeatN > 1) {
      const base = pools;
      pools = [];
      for (let i = 0; i < repeatN; i++) pools.push(...base.map((p) => [...p]));
    }
    let result: unknown[][] = [[]];
    for (const pool of pools) {
      const next: unknown[][] = [];
      for (const prefix of result) for (const v of pool) next.push([...prefix, v]);
      result = next;
    }
    return result.map(makeTuple);
  });

  add('permutations', (args, line) => {
    const items = list(args[0], line);
    const r = args[1] === undefined ? items.length : num(args[1]);
    const out: unknown[] = [];
    const walk = (current: unknown[], remaining: unknown[]): void => {
      if (current.length === r) { out.push(makeTuple(current)); return; }
      remaining.forEach((v, i) => walk([...current, v], [...remaining.slice(0, i), ...remaining.slice(i + 1)]));
    };
    walk([], items);
    return out;
  });

  add('combinations', (args, line) => {
    const items = list(args[0], line);
    const r = num(args[1]);
    const out: unknown[] = [];
    const walk = (start: number, current: unknown[]): void => {
      if (current.length === r) { out.push(makeTuple(current)); return; }
      for (let i = start; i < items.length; i++) walk(i + 1, [...current, items[i]]);
    };
    walk(0, []);
    return out;
  });

  add('accumulate', (args, line) => {
    const items = list(args[0], line);
    const f = args[1];
    const out: unknown[] = [];
    let acc: unknown = null;
    items.forEach((v, i) => {
      acc = i === 0 ? v : (f ? host.call(f, [acc, v], line) : (acc as number) + (v as number));
      out.push(acc);
    });
    return out;
  });

  add('groupby', (args, line) => {
    const items = list(args[0], line);
    const key = args[1];
    const out: unknown[] = [];
    let currentKey: unknown = Symbol('none');
    let bucket: unknown[] = [];
    for (const v of items) {
      const k = key ? host.call(key, [v], line) : v;
      if (!host.equal(k, currentKey)) {
        if (bucket.length) out.push(makeTuple([currentKey, bucket]));
        currentKey = k;
        bucket = [];
      }
      bucket.push(v);
    }
    if (bucket.length) out.push(makeTuple([currentKey, bucket]));
    return out;
  });

  // ---------- collections ----------
  add('Counter', (args, line) => {
    const counts: Record<string, unknown> = {};
    for (const v of list(args[0] ?? [], line)) {
      const k = stringify(v);
      counts[k] = ((counts[k] as number) ?? 0) + 1;
    }
    return counts;
  });

  add('defaultdict', (args, line) => {
    const factory = args[0];
    const store: Record<string, unknown> = {};
    return new Proxy(store, {
      get(target, prop: string) {
        if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('__')) {
          target[prop] = factory ? host.call(factory, [], line) : null;
        }
        return target[prop];
      },
    });
  });

  add('namedtuple', (args, line) => {
    const fields = typeof args[1] === 'string' ? String(args[1]).split(/[\s,]+/) : list(args[1], line).map(String);
    return fn(String(args[0]), (values) => {
      const out: Record<string, unknown> = {};
      fields.forEach((f, i) => { out[f] = values[i] ?? null; });
      return out;
    });
  });

  add('deque', (args, line) => (args.length ? list(args[0], line) : []));
  add('OrderedDict', (args) => ({ ...(args[0] as Record<string, unknown> ?? {}) }));

  // ---------- set helpers ----------
  add('union', (args, line) => new SdevSet(args.flatMap((a) => list(a, line))));
  add('intersection', (args, line) => {
    const [first, ...rest] = args.map((a) => new SdevSet(list(a, line)));
    return new SdevSet(first.values().filter((v) => rest.every((s) => s.has(v))));
  });
  add('difference', (args, line) => {
    const [first, ...rest] = args.map((a) => new SdevSet(list(a, line)));
    return new SdevSet(first.values().filter((v) => !rest.some((s) => s.has(v))));
  });
  add('symmetric_difference', (args, line) => {
    const [a, bb] = args.map((x) => new SdevSet(list(x, line)));
    return new SdevSet([...a.values().filter((v) => !bb.has(v)), ...bb.values().filter((v) => !a.has(v))]);
  });
  add('issubset', (args, line) => {
    const [a, bb] = args.map((x) => new SdevSet(list(x, line)));
    return a.values().every((v) => bb.has(v));
  });
  add('set_add', (args) => { (args[0] as SdevSet).add(args[1]); return args[0]; });
  add('set_remove', (args) => { (args[0] as SdevSet).delete(args[1]); return args[0]; });

  // ---------- dict helpers ----------
  add('keys', (args) => Object.keys((args[0] ?? {}) as object));
  add('values', (args) => Object.values((args[0] ?? {}) as object));
  add('items', (args) => Object.entries((args[0] ?? {}) as object).map(([k, v]) => makeTuple([k, v])));
  add('get', (args) => {
    const [o, k, d] = args;
    const v = (o as Record<string, unknown>)?.[stringify(k)];
    return v === undefined ? (d ?? null) : v;
  });
  add('setdefault', (args) => {
    const [o, k, d] = args;
    const obj = o as Record<string, unknown>;
    const key = stringify(k);
    if (obj[key] === undefined) obj[key] = d ?? null;
    return obj[key];
  });
  add('update', (args) => {
    Object.assign(args[0] as object, args[1] as object);
    return args[0];
  });
  add('pop', (args) => {
    const [o, k, d] = args;
    if (Array.isArray(o)) return o.length ? (k === undefined ? o.pop() : o.splice(num(k), 1)[0]) : (d ?? null);
    const obj = o as Record<string, unknown>;
    const key = stringify(k);
    if (!(key in obj)) return d ?? null;
    const v = obj[key];
    delete obj[key];
    return v;
  });

  // ---------- slice assignment (used by `xs[a:b] be ...`) ----------
  add('slice_assign', (args, line) => {
    const [target, start, stop, step, value] = args;
    if (!Array.isArray(target)) throw new SdevError('Only lists support slice assignment', line);
    const n = target.length;
    const s = start === null || start === undefined ? 0 : (num(start) < 0 ? n + num(start) : num(start));
    const e = stop === null || stop === undefined ? n : (num(stop) < 0 ? n + num(stop) : Math.min(num(stop), n));
    const items = list(value, line);
    if (step === null || step === undefined || num(step) === 1) {
      target.splice(s, Math.max(0, e - s), ...items);
      return target;
    }
    let idx = 0;
    for (let i = s; i < e && idx < items.length; i += num(step)) target[i] = items[idx++];
    return target;
  });

  // ---------- exceptions ----------
  const EXCEPTIONS = [
    'Exception', 'BaseException', 'ValueError', 'TypeError', 'KeyError', 'IndexError',
    'AttributeError', 'RuntimeError', 'StopIteration', 'ZeroDivisionError',
    'AssertionError', 'NotImplementedError', 'OverflowError', 'ImportError',
    'NameError', 'OSError', 'FileNotFoundError', 'PermissionError', 'TimeoutError',
    'RecursionError', 'UnicodeError', 'ArithmeticError', 'LookupError', 'MemoryError',
    'StopAsyncIteration', 'KeyboardInterrupt', 'SystemExit', 'GeneratorExit',
  ];
  for (const name of EXCEPTIONS) {
    add(name, (args) => ({
      __error__: true,
      name,
      message: args.length ? displayText(args[0]) : name,
      args: args.slice(),
    }));
  }

  // ---------- modules as tomes ----------
  const moduleTome = (entries: Record<string, unknown>) => entries;

  b.set('math_module' as string, fn('math_module', () => null));
  const mathModule = moduleTome({
    pi: Math.PI, e: Math.E, tau: Math.PI * 2, inf: Infinity, nan: NaN,
    sqrt: fn('sqrt', (a) => Math.sqrt(num(a[0]))),
    floor: fn('floor', (a) => Math.floor(num(a[0]))),
    ceil: fn('ceil', (a) => Math.ceil(num(a[0]))),
    trunc: fn('trunc', (a) => Math.trunc(num(a[0]))),
    fabs: fn('fabs', (a) => Math.abs(num(a[0]))),
    exp: fn('exp', (a) => Math.exp(num(a[0]))),
    log: fn('log', (a) => (a[1] === undefined ? Math.log(num(a[0])) : Math.log(num(a[0])) / Math.log(num(a[1])))),
    log2: fn('log2', (a) => Math.log2(num(a[0]))),
    log10: fn('log10', (a) => Math.log10(num(a[0]))),
    sin: fn('sin', (a) => Math.sin(num(a[0]))),
    cos: fn('cos', (a) => Math.cos(num(a[0]))),
    tan: fn('tan', (a) => Math.tan(num(a[0]))),
    asin: fn('asin', (a) => Math.asin(num(a[0]))),
    acos: fn('acos', (a) => Math.acos(num(a[0]))),
    atan: fn('atan', (a) => Math.atan(num(a[0]))),
    atan2: fn('atan2', (a) => Math.atan2(num(a[0]), num(a[1]))),
    hypot: fn('hypot', (a) => Math.hypot(...a.map(num))),
    gcd: fn('gcd', (a) => {
      let x = Math.abs(num(a[0]));
      let y = Math.abs(num(a[1]));
      while (y) { [x, y] = [y, x % y]; }
      return x;
    }),
    factorial: fn('factorial', (a) => {
      let acc = 1;
      for (let i = 2; i <= num(a[0]); i++) acc *= i;
      return acc;
    }),
    isnan: fn('isnan', (a) => Number.isNaN(num(a[0]))),
    isinf: fn('isinf', (a) => !Number.isFinite(num(a[0])) && !Number.isNaN(num(a[0]))),
  });

  const jsonModule = moduleTome({
    dumps: fn('dumps', (a) => JSON.stringify(a[0])),
    loads: fn('loads', (a) => JSON.parse(String(a[0]))),
  });

  const randomModule = moduleTome({
    random: fn('random', () => Math.random()),
    randint: fn('randint', (a) => Math.floor(Math.random() * (num(a[1]) - num(a[0]) + 1)) + num(a[0])),
    uniform: fn('uniform', (a) => Math.random() * (num(a[1]) - num(a[0])) + num(a[0])),
    choice: fn('choice', (a, line) => {
      const items = list(a[0], line);
      return items[Math.floor(Math.random() * items.length)];
    }),
    shuffle: fn('shuffle', (a) => {
      const xs = a[0] as unknown[];
      for (let i = xs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [xs[i], xs[j]] = [xs[j], xs[i]];
      }
      return xs;
    }),
    sample: fn('sample', (a, line) => {
      const items = [...list(a[0], line)];
      const k = num(a[1]);
      const out: unknown[] = [];
      for (let i = 0; i < k && items.length; i++) out.push(items.splice(Math.floor(Math.random() * items.length), 1)[0]);
      return out;
    }),
  });

  const timeModule = moduleTome({
    time: fn('time', () => Date.now() / 1000),
    monotonic: fn('monotonic', () => performance.now() / 1000),
    sleep: fn('sleep', () => null),
  });

  const reModule = moduleTome({
    match: fn('match', (a) => {
      const m = new RegExp('^' + String(a[0])).exec(String(a[1]));
      return m ? { group: m[0], groups: m.slice(1), index: m.index } : null;
    }),
    search: fn('search', (a) => {
      const m = new RegExp(String(a[0])).exec(String(a[1]));
      return m ? { group: m[0], groups: m.slice(1), index: m.index } : null;
    }),
    findall: fn('findall', (a) => String(a[1]).match(new RegExp(String(a[0]), 'g')) ?? []),
    sub: fn('sub', (a) => String(a[2]).replace(new RegExp(String(a[0]), 'g'), String(a[1]))),
    split: fn('split', (a) => String(a[1]).split(new RegExp(String(a[0])))),
  });

  const sysModule = moduleTome({
    version: 'sdev 2.x',
    platform: 'sdev',
    argv: [],
    maxsize: Number.MAX_SAFE_INTEGER,
    exit: fn('exit', () => { throw new SdevRaise({ __error__: true, name: 'SystemExit', message: 'exit' }); }),
  });

  const modules: Record<string, unknown> = {
    math: mathModule,
    json: jsonModule,
    random: randomModule,
    time: timeModule,
    re: reModule,
    sys: sysModule,
    itertools: moduleTome({
      count: b.get('count')!, cycle: b.get('cycle')!, repeat: b.get('repeat')!,
      chain: b.get('chain')!, islice: b.get('islice')!, product: b.get('product')!,
      permutations: b.get('permutations')!, combinations: b.get('combinations')!,
      accumulate: b.get('accumulate')!, groupby: b.get('groupby')!,
      zip_longest: b.get('zip_longest')!,
    }),
    functools: moduleTome({
      reduce: b.get('reduce')!, partial: b.get('partial')!,
      lru_cache: b.get('lru_cache')!, cache: b.get('cache')!, wraps: b.get('wraps')!,
    }),
    collections: moduleTome({
      Counter: b.get('Counter')!, defaultdict: b.get('defaultdict')!,
      namedtuple: b.get('namedtuple')!, deque: b.get('deque')!, OrderedDict: b.get('OrderedDict')!,
    }),
  };

  add('module', (args, line) => {
    const name = String(args[0]);
    const m = modules[name];
    if (!m) throw new SdevError(`Unknown module '${name}'`, line);
    return m;
  });

  // Expose the module tomes directly too, so `math.sqrt(2)` just works.
  for (const [name, value] of Object.entries(modules)) {
    b.set(name, value as unknown as SdevFunction);
  }

  // ---------- misc ----------
  add('truthy', (args) => host.truthy(args[0]));
  add('is_generator', (args) => isGenerator(args[0]));
  add('freeze', (args, line) => new SdevSet(list(args[0], line), true));
  add('ascii', (args) => repr(args[0]));
  add('sdev_isTruthy', (args) => isTruthy(args[0]));

  return b;
}
