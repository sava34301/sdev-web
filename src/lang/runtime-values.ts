// ============================================================
// sdev runtime value model (Python-parity layer)
// ============================================================
// Shared value types used by the interpreter and the parity
// builtins: sets, tuples, generators, exceptions and protocol
// (dunder) dispatch helpers.

import { SdevFunction, stringify } from './builtins';

/** Raised by `hurl` / `raise`. Carries an arbitrary sdev value. */
export class SdevRaise extends Error {
  value: unknown;
  cause?: unknown;
  constructor(value: unknown, cause?: unknown) {
    super(typeof value === 'string' ? value : stringify(value));
    this.name = 'SdevRaise';
    this.value = value;
    this.cause = cause;
  }
}

/** Stable hash key for set/dict membership. */
export function keyOf(value: unknown): string {
  if (value === null || value === undefined) return 'void';
  if (typeof value === 'string') return 's:' + value;
  if (typeof value === 'number') return 'n:' + value;
  if (typeof value === 'boolean') return 'b:' + value;
  if (Array.isArray(value)) return 'l:[' + value.map(keyOf).join(',') + ']';
  if (value instanceof SdevSet) return 'set:{' + [...value.entries.keys()].sort().join(',') + '}';
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return 'o:{' + Object.keys(o).sort().map((k) => k + ':' + keyOf(o[k])).join(',') + '}';
  }
  return 'x:' + String(value);
}

/** A hashed collection backing `{| ... |}` set literals. */
export class SdevSet {
  entries = new Map<string, unknown>();
  frozen = false;

  constructor(values: Iterable<unknown> = [], frozen = false) {
    for (const v of values) this.entries.set(keyOf(v), v);
    this.frozen = frozen;
  }

  get size(): number {
    return this.entries.size;
  }

  has(v: unknown): boolean {
    return this.entries.has(keyOf(v));
  }

  add(v: unknown): void {
    this.entries.set(keyOf(v), v);
  }

  delete(v: unknown): boolean {
    return this.entries.delete(keyOf(v));
  }

  values(): unknown[] {
    return [...this.entries.values()];
  }

  clone(): SdevSet {
    return new SdevSet(this.values(), this.frozen);
  }

  toString(): string {
    return '{|' + this.values().map((v) => stringify(v)).join(', ') + '|}';
  }
}

/** Marks a list as an immutable tuple. */
export const TUPLE = Symbol.for('sdev.tuple');

export function makeTuple(items: unknown[]): unknown[] {
  const t = items.slice();
  Object.defineProperty(t, TUPLE, { value: true, enumerable: false });
  return t;
}

export function isTuple(v: unknown): boolean {
  return Array.isArray(v) && (v as unknown[] & { [TUPLE]?: boolean })[TUPLE] === true;
}

/** A suspended sdev generator, driven by a host JS iterator. */
export interface SdevGenerator {
  type: 'generator';
  done: boolean;
  next: (sent?: unknown) => { value: unknown; done: boolean };
  throwInto: (err: unknown) => { value: unknown; done: boolean };
  close: () => void;
  [Symbol.iterator]: () => Iterator<unknown>;
}

export function makeGenerator(iter: Iterator<unknown, unknown, unknown>): SdevGenerator {
  const gen: SdevGenerator = {
    type: 'generator',
    done: false,
    next: (sent?: unknown) => {
      if (gen.done) return { value: null, done: true };
      const r = iter.next(sent as never);
      if (r.done) gen.done = true;
      return { value: r.done ? (r.value ?? null) : r.value, done: !!r.done };
    },
    throwInto: (err: unknown) => {
      if (gen.done || !iter.throw) return { value: null, done: true };
      const r = iter.throw(err);
      if (r.done) gen.done = true;
      return { value: r.value ?? null, done: !!r.done };
    },
    close: () => {
      if (!gen.done && iter.return) iter.return(undefined as never);
      gen.done = true;
    },
    [Symbol.iterator]() {
      return {
        next: () => {
          const r = gen.next();
          return r.done ? { value: undefined, done: true } : { value: r.value, done: false };
        },
      };
    },
  };
  return gen;
}

export function isGenerator(v: unknown): v is SdevGenerator {
  return !!v && typeof v === 'object' && (v as { type?: string }).type === 'generator';
}

export function isFunction(v: unknown): v is SdevFunction {
  if (!v || typeof v !== 'object') return false;
  const t = (v as { type?: string }).type;
  return t === 'builtin' || t === 'user' || t === 'lambda';
}

/** Protocol (dunder) slot names, keyed by sdev operator. */
export const PROTOCOL_SLOTS: Record<string, string> = {
  '+': 'on_add',
  '-': 'on_sub',
  '*': 'on_mul',
  '/': 'on_div',
  '%': 'on_mod',
  '^': 'on_pow',
  '\\': 'on_floordiv',
  '@': 'on_matmul',
  '&': 'on_bitand',
  '|': 'on_bitor',
  '<<': 'on_shl',
  '>>': 'on_shr',
  'equals': 'on_eq',
  'differs': 'on_ne',
  '<': 'on_lt',
  '<=': 'on_le',
  '>': 'on_gt',
  '>=': 'on_ge',
  'in': 'on_contains',
};

/** Right-hand reflected slots (Python's __radd__ family). */
export const REFLECTED_SLOTS: Record<string, string> = {
  '+': 'on_radd',
  '-': 'on_rsub',
  '*': 'on_rmul',
  '/': 'on_rdiv',
  '%': 'on_rmod',
  '^': 'on_rpow',
};
