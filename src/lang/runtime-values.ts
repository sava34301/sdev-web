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

// ============================================================
// Python dunder <-> sdev protocol slot aliasing
// ------------------------------------------------------------
// A class may spell a protocol method either way; both names are
// registered on the class so dispatch is identical.
// ============================================================
export const DUNDER_TO_SLOT: Record<string, string> = {
  __init__: 'on_init',
  __new__: 'on_new',
  __del__: 'on_del',
  __str__: 'on_text',
  __repr__: 'on_repr',
  __format__: 'on_format',
  __bool__: 'on_truth',
  __hash__: 'on_hash',
  __len__: 'on_len',
  __iter__: 'on_iter',
  __next__: 'on_next',
  __call__: 'on_call',
  __getitem__: 'on_get',
  __setitem__: 'on_set',
  __delitem__: 'on_delitem',
  __getattr__: 'on_getattr',
  __setattr__: 'on_setattr',
  __delattr__: 'on_delattr',
  __contains__: 'on_contains',
  __enter__: 'on_enter',
  __exit__: 'on_exit',
  __aenter__: 'on_aenter',
  __aexit__: 'on_aexit',
  __aiter__: 'on_aiter',
  __anext__: 'on_anext',
  __await__: 'on_await',
  __add__: 'on_add',
  __sub__: 'on_sub',
  __mul__: 'on_mul',
  __truediv__: 'on_div',
  __div__: 'on_div',
  __floordiv__: 'on_floordiv',
  __mod__: 'on_mod',
  __pow__: 'on_pow',
  __matmul__: 'on_matmul',
  __and__: 'on_bitand',
  __or__: 'on_bitor',
  __xor__: 'on_bitxor',
  __invert__: 'on_invert',
  __lshift__: 'on_shl',
  __rshift__: 'on_shr',
  __radd__: 'on_radd',
  __rsub__: 'on_rsub',
  __rmul__: 'on_rmul',
  __rtruediv__: 'on_rdiv',
  __rmod__: 'on_rmod',
  __rpow__: 'on_rpow',
  __neg__: 'on_neg',
  __pos__: 'on_pos',
  __abs__: 'on_abs',
  __eq__: 'on_eq',
  __ne__: 'on_ne',
  __lt__: 'on_lt',
  __le__: 'on_le',
  __gt__: 'on_gt',
  __ge__: 'on_ge',
  __index__: 'on_index',
  __int__: 'on_int',
  __float__: 'on_float',
  __round__: 'on_round',
  __copy__: 'on_copy',
  __reversed__: 'on_reversed',
};

export const SLOT_TO_DUNDER: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [dunder, slot] of Object.entries(DUNDER_TO_SLOT)) {
    if (!(slot in map)) map[slot] = dunder;
  }
  return map;
})();

/** Given either spelling of a protocol method, return the other one. */
export function dunderAlias(name: string): string | undefined {
  return DUNDER_TO_SLOT[name] ?? SLOT_TO_DUNDER[name];
}
