import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerFunctional(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

  // ============= Functional Programming =============

  // compose(f, g) - function composition: compose(f, g)(x) = f(g(x))
  builtins.set('compose', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('compose() takes at least 2 arguments', line);
      const fns = args.map(a => {
        if (!a || typeof a !== 'object' || !('call' in a)) throw new SdevError('All arguments must be functions', line);
        return a as SdevFunction;
      });
      return {
        type: 'builtin' as const,
        call: (innerArgs: unknown[], innerLine: number) => {
          let result: unknown = fns[fns.length - 1].call(innerArgs, innerLine);
          for (let i = fns.length - 2; i >= 0; i--) {
            result = fns[i].call([result], innerLine);
          }
          return result;
        },
      };
    },
  });

  // pipe(value, ...fns) - pipe value through functions
  builtins.set('pipe', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('pipe() takes at least 2 arguments (value, ...fns)', line);
      let result = args[0];
      for (let i = 1; i < args.length; i++) {
        const fn = args[i] as SdevFunction;
        if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('Arguments after first must be functions', line);
        result = fn.call([result], line);
      }
      return result;
    },
  });

  // curry(fn, arity) - currying
  builtins.set('curry', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('curry() takes 2 arguments (fn, arity)', line);
      const fn = args[0] as SdevFunction;
      const arity = args[1] as number;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('First argument must be a function', line);
      const curried = (collected: unknown[]): SdevFunction => ({
        type: 'builtin' as const,
        call: (innerArgs: unknown[], innerLine: number) => {
          const all = [...collected, ...innerArgs];
          if (all.length >= arity) return fn.call(all, innerLine);
          return curried(all);
        },
      });
      return curried([]);
    },
  });

  // memoize(fn) - memoization
  builtins.set('memoize', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('memoize() takes 1 argument', line);
      const fn = args[0] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('Argument must be a function', line);
      const cache = new Map<string, unknown>();
      return {
        type: 'builtin' as const,
        call: (innerArgs: unknown[], innerLine: number) => {
          const key = JSON.stringify(innerArgs);
          if (cache.has(key)) return cache.get(key);
          const result = fn.call(innerArgs, innerLine);
          cache.set(key, result);
          return result;
        },
      };
    },
  });

  // ============= Monadic Option & Result (Rust/Functional Parity) =============
  builtins.set('Some', {
    type: 'builtin',
    call: (args: unknown[]) => ({ is_some: true, is_none: false, val: args[0] }),
  });

  builtins.set('None', {
    type: 'builtin',
    call: () => ({ is_some: false, is_none: true, val: null }),
  });

  builtins.set('is_some', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const o = args[0] as Record<string, unknown>;
      return Boolean(o && typeof o === 'object' && o.is_some);
    },
  });

  builtins.set('is_none', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const o = args[0] as Record<string, unknown>;
      return Boolean(o && typeof o === 'object' && o.is_none);
    },
  });

  builtins.set('unwrap_or', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const o = args[0] as Record<string, unknown>;
      const fallback = args[1];
      if (o && typeof o === 'object') {
        if (o.is_some || o.is_ok) return o.val;
      }
      return fallback;
    },
  });

  builtins.set('map_some', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const opt = args[0] as Record<string, unknown>;
      const fn = args[1] as SdevFunction;
      if (!opt || typeof opt !== 'object' || !opt.is_some) return opt;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('Second argument must be a function', line);
      return { is_some: true, is_none: false, val: fn.call([opt.val], line) };
    },
  });

  builtins.set('flat_map_some', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const opt = args[0] as Record<string, unknown>;
      const fn = args[1] as SdevFunction;
      if (!opt || typeof opt !== 'object' || !opt.is_some) return opt;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('Second argument must be a function', line);
      return fn.call([opt.val], line);
    },
  });

  builtins.set('Ok', {
    type: 'builtin',
    call: (args: unknown[]) => ({ is_ok: true, is_err: false, val: args[0], err: null }),
  });

  builtins.set('Err', {
    type: 'builtin',
    call: (args: unknown[]) => ({ is_ok: false, is_err: true, val: null, err: args[0] }),
  });

  builtins.set('is_ok', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const o = args[0] as Record<string, unknown>;
      return Boolean(o && typeof o === 'object' && o.is_ok);
    },
  });

  builtins.set('is_err', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const o = args[0] as Record<string, unknown>;
      return Boolean(o && typeof o === 'object' && o.is_err);
    },
  });

  builtins.set('result_unwrap_or', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const r = args[0] as Record<string, unknown>;
      const fallback = args[1];
      if (r && typeof r === 'object' && r.is_ok) return r.val;
      return fallback;
    },
  });

  builtins.set('map_ok', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const r = args[0] as Record<string, unknown>;
      const fn = args[1] as SdevFunction;
      if (!r || typeof r !== 'object' || !r.is_ok) return r;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('Second argument must be a function', line);
      return { is_ok: true, is_err: false, val: fn.call([r.val], line), err: null };
    },
  });

  builtins.set('flat_map_ok', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const r = args[0] as Record<string, unknown>;
      const fn = args[1] as SdevFunction;
      if (!r || typeof r !== 'object' || !r.is_ok) return r;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('Second argument must be a function', line);
      return fn.call([r.val], line);
    },
  });

  // ============= Extended Function-Oriented Programming Combinators =============
  const asFn = (v: unknown, msg: string, line: number): SdevFunction => {
    if (!v || typeof v !== 'object' || !('call' in v) || typeof (v as SdevFunction).call !== 'function') {
      throw new SdevError(msg, line);
    }
    return v as SdevFunction;
  };
  const isFnVal = (v: unknown): v is SdevFunction =>
    Boolean(v && typeof v === 'object' && 'call' in v && typeof (v as SdevFunction).call === 'function');
  const isPlaceholder = (v: unknown): boolean =>
    Boolean(v && typeof v === 'object' && (v as { __sdev_placeholder__?: boolean }).__sdev_placeholder__);

  // partial(fn, ...boundArgs) - supports `_` placeholder sentinels
  builtins.set('partial', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('partial() takes at least 1 argument (fn, ...args)', line);
      const fn = asFn(args[0], 'First argument to partial() must be a function', line);
      const bound = args.slice(1);
      return {
        type: 'builtin' as const,
        call: (rest: unknown[], callLine: number) => {
          let ri = 0;
          const finalArgs = bound.map((b) => (isPlaceholder(b) && ri < rest.length ? rest[ri++] : b));
          while (ri < rest.length) finalArgs.push(rest[ri++]);
          return fn.call(finalArgs, callLine);
        },
      };
    },
  });

  // partial_right(fn, ...boundArgs)
  builtins.set('partial_right', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('partial_right() takes at least 1 argument (fn, ...args)', line);
      const fn = asFn(args[0], 'First argument to partial_right() must be a function', line);
      const bound = args.slice(1);
      const hasPh = bound.some(isPlaceholder);
      return {
        type: 'builtin' as const,
        call: (rest: unknown[], callLine: number) => {
          if (hasPh) {
            let ri = 0;
            const resolved = bound.map((b) => (isPlaceholder(b) && ri < rest.length ? rest[ri++] : b));
            return fn.call([...rest.slice(ri), ...resolved], callLine);
          }
          return fn.call([...rest, ...bound], callLine);
        },
      };
    },
  });

  // flip(fn) - reverses first two arguments
  builtins.set('flip', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('flip() takes 1 argument', line);
      const fn = asFn(args[0], 'Argument to flip() must be a function', line);
      return {
        type: 'builtin' as const,
        call: (inner: unknown[], callLine: number) => {
          if (inner.length < 2) return fn.call(inner, callLine);
          return fn.call([inner[1], inner[0], ...inner.slice(2)], callLine);
        },
      };
    },
  });

  // identity(x) / identity_fn(x) / id_fn(x)
  const identityBuiltin: SdevFunction = {
    type: 'builtin',
    call: (args: unknown[]) => (args.length > 0 ? args[0] : null),
  };
  builtins.set('identity', identityBuiltin);
  builtins.set('identity_fn', identityBuiltin);
  builtins.set('id_fn', identityBuiltin);

  // constant(x) / always(x)
  const constantBuiltin: SdevFunction = {
    type: 'builtin',
    call: (args: unknown[]) => {
      const val = args.length > 0 ? args[0] : null;
      return { type: 'builtin' as const, call: () => val };
    },
  };
  builtins.set('constant', constantBuiltin);
  builtins.set('always', constantBuiltin);

  // juxt(...fns) or juxt(fnsList)
  builtins.set('juxt', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length === 0) throw new SdevError('juxt() requires at least 1 function', line);
      const raw = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const fns = raw.map((f) => asFn(f, 'All arguments to juxt() must be functions', line));
      return {
        type: 'builtin' as const,
        call: (inner: unknown[], callLine: number) => fns.map((f) => f.call(inner, callLine)),
      };
    },
  });

  // converge(afterFn, branchFns)
  builtins.set('converge', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('converge() takes 2 arguments (afterFn, branchFns)', line);
      const afterFn = asFn(args[0], 'First argument to converge() must be a function', line);
      if (!Array.isArray(args[1])) throw new SdevError('Second argument to converge() must be a list of functions', line);
      const branches = args[1].map((f) => asFn(f, 'All branch elements in converge() must be functions', line));
      return {
        type: 'builtin' as const,
        call: (inner: unknown[], callLine: number) => {
          const vals = branches.map((bf) => bf.call(inner, callLine));
          return afterFn.call(vals, callLine);
        },
      };
    },
  });

  // ap(fnsOrFunctor, valuesOrFunctor)
  builtins.set('ap', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('ap() takes 2 arguments (fns, values)', line);
      const left = args[0] as Record<string, unknown>;
      const right = args[1] as Record<string, unknown>;
      if (Array.isArray(left) && Array.isArray(right)) {
        const out: unknown[] = [];
        for (const f of left) {
          const fn = asFn(f, 'ap() list elements on left must be functions', line);
          for (const v of right) out.push(fn.call([v], line));
        }
        return out;
      }
      if (left && typeof left === 'object' && (left.is_some || left.is_none)) {
        if (!left.is_some || !right || typeof right !== 'object' || !right.is_some) {
          return { is_some: false, is_none: true, val: null };
        }
        const fn = asFn(left.val, 'Option ap() requires a function inside Some', line);
        return { is_some: true, is_none: false, val: fn.call([right.val], line) };
      }
      if (left && typeof left === 'object' && (left.is_ok || left.is_err)) {
        if (!left.is_ok) return left;
        if (!right || typeof right !== 'object' || !right.is_ok) return right;
        const fn = asFn(left.val, 'Result ap() requires a function inside Ok', line);
        return { is_ok: true, is_err: false, val: fn.call([right.val], line), err: null };
      }
      throw new SdevError('ap() requires lists, Options, or Results', line);
    },
  });

  // tap(fn) or tap(value, fn)
  builtins.set('tap', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length === 1) {
        const fn = asFn(args[0], 'tap(fn) expects a function', line);
        return {
          type: 'builtin' as const,
          call: (inner: unknown[], callLine: number) => {
            fn.call(inner, callLine);
            return inner[0] ?? null;
          },
        };
      }
      if (args.length === 2) {
        const val = args[0];
        const fn = asFn(args[1], 'Second argument to tap(val, fn) must be a function', line);
        fn.call([val], line);
        return val;
      }
      throw new SdevError('tap() takes 1 or 2 arguments', line);
    },
  });

  // thru(value, fn)
  builtins.set('thru', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('thru() takes 2 arguments (value, fn)', line);
      const fn = asFn(args[1], 'Second argument to thru() must be a function', line);
      return fn.call([args[0]], line);
    },
  });

  // once(fn)
  builtins.set('once', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('once() takes 1 argument', line);
      const fn = asFn(args[0], 'Argument to once() must be a function', line);
      let called = false;
      let cached: unknown = null;
      return {
        type: 'builtin' as const,
        call: (inner: unknown[], callLine: number) => {
          if (!called) {
            called = true;
            cached = fn.call(inner, callLine);
          }
          return cached;
        },
      };
    },
  });

  // trampoline(fn) or trampoline(fn, ...args)
  builtins.set('trampoline', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('trampoline() takes at least 1 argument', line);
      const fn = asFn(args[0], 'First argument to trampoline() must be a function', line);
      const runTrampoline = (initArgs: unknown[], callLine: number): unknown => {
        let res = fn.call(initArgs, callLine);
        while (isFnVal(res)) {
          res = res.call([], callLine);
        }
        return res;
      };
      if (args.length > 1) {
        return runTrampoline(args.slice(1), line);
      }
      return {
        type: 'builtin' as const,
        call: (inner: unknown[], callLine: number) => runTrampoline(inner, callLine),
      };
    },
  });

  // complement(pred) / negate_fn(pred)
  const complementFn: SdevFunction = {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('complement() takes 1 argument', line);
      const pred = asFn(args[0], 'Argument to complement() must be a function', line);
      return {
        type: 'builtin' as const,
        call: (inner: unknown[], callLine: number) => !isTruthy(pred.call(inner, callLine)),
      };
    },
  };
  builtins.set('complement', complementFn);
  builtins.set('negate_fn', complementFn);

  // both(p1, p2) & either_fn(p1, p2) & all_pass(preds) & any_pass(preds)
  builtins.set('both', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('both() takes 2 predicates', line);
      const p1 = asFn(args[0], 'First argument to both() must be a function', line);
      const p2 = asFn(args[1], 'Second argument to both() must be a function', line);
      return {
        type: 'builtin' as const,
        call: (inner: unknown[], callLine: number) =>
          isTruthy(p1.call(inner, callLine)) && isTruthy(p2.call(inner, callLine)),
      };
    },
  });

  builtins.set('either_fn', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('either_fn() takes 2 predicates', line);
      const p1 = asFn(args[0], 'First argument to either_fn() must be a function', line);
      const p2 = asFn(args[1], 'Second argument to either_fn() must be a function', line);
      return {
        type: 'builtin' as const,
        call: (inner: unknown[], callLine: number) =>
          isTruthy(p1.call(inner, callLine)) || isTruthy(p2.call(inner, callLine)),
      };
    },
  });

  builtins.set('all_pass', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1 || !Array.isArray(args[0])) {
        throw new SdevError('all_pass() takes a list of predicates', line);
      }
      const preds = args[0].map((p) => asFn(p, 'all_pass() elements must be functions', line));
      return {
        type: 'builtin' as const,
        call: (inner: unknown[], callLine: number) => preds.every((p) => isTruthy(p.call(inner, callLine))),
      };
    },
  });

  builtins.set('any_pass', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1 || !Array.isArray(args[0])) {
        throw new SdevError('any_pass() takes a list of predicates', line);
      }
      const preds = args[0].map((p) => asFn(p, 'any_pass() elements must be functions', line));
      return {
        type: 'builtin' as const,
        call: (inner: unknown[], callLine: number) => preds.some((p) => isTruthy(p.call(inner, callLine))),
      };
    },
  });

  // cond(pairs) - [[pred, fn], ...]
  builtins.set('cond', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1 || !Array.isArray(args[0])) {
        throw new SdevError('cond() takes a list of [predicate, transform] pairs', line);
      }
      const pairs = args[0].map((pair) => {
        if (!Array.isArray(pair) || pair.length < 2) {
          throw new SdevError('Each cond() branch must be a [predicate, fn] pair', line);
        }
        return [
          asFn(pair[0], 'cond() predicate must be a function', line),
          asFn(pair[1], 'cond() handler must be a function', line),
        ] as const;
      });
      return {
        type: 'builtin' as const,
        call: (inner: unknown[], callLine: number) => {
          for (const [pred, fn] of pairs) {
            if (isTruthy(pred.call(inner, callLine))) return fn.call(inner, callLine);
          }
          return null;
        },
      };
    },
  });

  // Functional Lenses: lens, lens_prop, lens_path, view, set_over, over
  const makePropLens = (key: string | number) => ({
    __lens__: true,
    get: {
      type: 'builtin' as const,
      call: (a: unknown[]) => {
        const target = a[0];
        if (Array.isArray(target) && typeof key === 'number') return target[key] ?? null;
        if (target && typeof target === 'object') return (target as Record<string, unknown>)[String(key)] ?? null;
        return null;
      },
    },
    set: {
      type: 'builtin' as const,
      call: (a: unknown[]) => {
        const val = a[0];
        const target = a[1];
        if (Array.isArray(target) && typeof key === 'number') {
          const copy = [...target];
          copy[key] = val;
          return copy;
        }
        const base = target && typeof target === 'object' ? (target as Record<string, unknown>) : {};
        return { ...base, [String(key)]: val };
      },
    },
  });

  builtins.set('lens', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('lens() takes 2 arguments (getter, setter)', line);
      const get = asFn(args[0], 'lens() getter must be a function', line);
      const set = asFn(args[1], 'lens() setter must be a function', line);
      return { __lens__: true, get, set };
    },
  });

  builtins.set('lens_prop', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('lens_prop() takes 1 argument (key)', line);
      const k = typeof args[0] === 'number' ? args[0] : stringify(args[0]);
      return makePropLens(k);
    },
  });

  builtins.set('lens_path', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1 || !Array.isArray(args[0])) {
        throw new SdevError('lens_path() takes 1 argument (list of keys/indices)', line);
      }
      const path = args[0];
      const getAt = (obj: unknown): unknown => {
        let cur = obj;
        for (const seg of path) {
          if (cur === null || cur === undefined) return null;
          if (Array.isArray(cur) && typeof seg === 'number') cur = cur[seg];
          else if (typeof cur === 'object') cur = (cur as Record<string, unknown>)[stringify(seg)];
          else return null;
        }
        return cur === undefined ? null : cur;
      };
      const setAt = (obj: unknown, idx: number, val: unknown): unknown => {
        if (idx >= path.length) return val;
        const seg = path[idx];
        if (Array.isArray(obj) && typeof seg === 'number') {
          const copy = [...obj];
          copy[seg] = setAt(obj[seg], idx + 1, val);
          return copy;
        }
        const key = stringify(seg);
        const base = obj && typeof obj === 'object' && !Array.isArray(obj) ? (obj as Record<string, unknown>) : {};
        return { ...base, [key]: setAt(base[key], idx + 1, val) };
      };
      return {
        __lens__: true,
        get: { type: 'builtin' as const, call: (a: unknown[]) => getAt(a[0]) },
        set: { type: 'builtin' as const, call: (a: unknown[]) => setAt(a[1], 0, a[0]) },
      };
    },
  });

  builtins.set('view', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('view() takes 2 arguments (lens, target)', line);
      const l = args[0] as { __lens__?: boolean; get?: SdevFunction };
      if (!l || typeof l !== 'object' || !l.get) throw new SdevError('First argument to view() must be a lens', line);
      return l.get.call([args[1]], line);
    },
  });

  builtins.set('set_over', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('set_over() takes 3 arguments (lens, value, target)', line);
      const l = args[0] as { __lens__?: boolean; set?: SdevFunction };
      if (!l || typeof l !== 'object' || !l.set) throw new SdevError('First argument to set_over() must be a lens', line);
      return l.set.call([args[1], args[2]], line);
    },
  });

  builtins.set('over', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('over() takes 3 arguments (lensOrKey, fn, target)', line);
      const l = (typeof args[0] === 'string' || typeof args[0] === 'number')
        ? makePropLens(args[0])
        : (args[0] as { get?: SdevFunction; set?: SdevFunction });
      if (!l || typeof l !== 'object' || !l.get || !l.set) {
        throw new SdevError('First argument to over() must be a lens or property key', line);
      }
      const fn = asFn(args[1], 'Second argument to over() must be a function', line);
      const cur = l.get.call([args[2]], line);
      const next = fn.call([cur], line);
      return l.set.call([next, args[2]], line);
    },
  });

  // Transducers: xf_map, xf_filter, xf_take, transduce
  builtins.set('xf_map', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('xf_map() takes 1 argument (fn)', line);
      const fn = asFn(args[0], 'xf_map() argument must be a function', line);
      return {
        type: 'builtin' as const,
        call: (stepArgs: unknown[], stepLine: number) => {
          const step = asFn(stepArgs[0], 'Transducer expects a step reducer function', stepLine);
          return {
            type: 'builtin' as const,
            call: (redArgs: unknown[], redLine: number) =>
              step.call([redArgs[0], fn.call([redArgs[1]], redLine)], redLine),
          };
        },
      };
    },
  });

  builtins.set('xf_filter', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('xf_filter() takes 1 argument (pred)', line);
      const pred = asFn(args[0], 'xf_filter() argument must be a function', line);
      return {
        type: 'builtin' as const,
        call: (stepArgs: unknown[], stepLine: number) => {
          const step = asFn(stepArgs[0], 'Transducer expects a step reducer function', stepLine);
          return {
            type: 'builtin' as const,
            call: (redArgs: unknown[], redLine: number) =>
              isTruthy(pred.call([redArgs[1]], redLine)) ? step.call([redArgs[0], redArgs[1]], redLine) : redArgs[0],
          };
        },
      };
    },
  });

  builtins.set('xf_take', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('xf_take() takes 1 argument (n)', line);
      const count = toNumber(args[0], line);
      return {
        type: 'builtin' as const,
        call: (stepArgs: unknown[], stepLine: number) => {
          const step = asFn(stepArgs[0], 'Transducer expects a step reducer function', stepLine);
          let rem = count;
          return {
            type: 'builtin' as const,
            call: (redArgs: unknown[], redLine: number) => {
              if (rem <= 0) return { __reduced__: true, value: redArgs[0] };
              rem -= 1;
              const nextAcc = step.call([redArgs[0], redArgs[1]], redLine);
              if (rem <= 0) return { __reduced__: true, value: nextAcc };
              return nextAcc;
            },
          };
        },
      };
    },
  });

  builtins.set('transduce', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 4) {
        throw new SdevError('transduce() takes 4 arguments (xform, reducer, init, collection)', line);
      }
      const rawXform = args[0];
      const reducer = asFn(args[1], 'transduce() reducer must be a function', line);
      let acc = args[2];
      const coll = args[3];
      if (!Array.isArray(coll)) throw new SdevError('transduce() 4th argument must be a list', line);

      let stepFn: SdevFunction = reducer;
      if (Array.isArray(rawXform)) {
        for (let i = rawXform.length - 1; i >= 0; i--) {
          const xf = asFn(rawXform[i], 'transduce() xform list must contain transducer functions', line);
          stepFn = asFn(xf.call([stepFn], line), 'Transducer did not return a step function', line);
        }
      } else {
        const xf = asFn(rawXform, 'transduce() xform must be a transducer function or list', line);
        stepFn = asFn(xf.call([stepFn], line), 'Transducer did not return a step function', line);
      }

      for (const item of coll) {
        acc = stepFn.call([acc, item], line);
        if (acc && typeof acc === 'object' && (acc as { __reduced__?: boolean }).__reduced__) {
          acc = (acc as { value: unknown }).value;
          break;
        }
      }
      return acc;
    },
  });

  // attempt_result(fn, ...args) & try_catch_fn(fn, onErr)
  builtins.set('attempt_result', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('attempt_result() takes at least 1 argument (fn, ...args)', line);
      const fn = asFn(args[0], 'First argument to attempt_result() must be a function', line);
      try {
        const val = fn.call(args.slice(1), line);
        return { is_ok: true, is_err: false, val, err: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { is_ok: false, is_err: true, val: null, err: msg };
      }
    },
  });

  builtins.set('try_catch_fn', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('try_catch_fn() takes 2 arguments (fn, onErr)', line);
      const fn = asFn(args[0], 'First argument to try_catch_fn() must be a function', line);
      const onErr = asFn(args[1], 'Second argument to try_catch_fn() must be a function', line);
      return {
        type: 'builtin' as const,
        call: (inner: unknown[], callLine: number) => {
          try {
            return fn.call(inner, callLine);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return onErr.call([msg, ...inner], callLine);
          }
        },
      };
    },
  });

  // match_option(opt, onSome, onNone) & match_result(res, onOk, onErr)
  builtins.set('match_option', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('match_option() takes 3 arguments (opt, onSome, onNone)', line);
      const opt = args[0] as Record<string, unknown>;
      const onSome = args[1];
      const onNone = args[2];
      const isSome = Boolean(opt && typeof opt === 'object' && (opt.is_some || opt.tag === 'Some'));
      if (isSome) {
        return isFnVal(onSome) ? onSome.call([opt.val], line) : onSome;
      }
      return isFnVal(onNone) ? onNone.call([], line) : onNone;
    },
  });

  builtins.set('match_result', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('match_result() takes 3 arguments (res, onOk, onErr)', line);
      const res = args[0] as Record<string, unknown>;
      const onOk = args[1];
      const onErr = args[2];
      const isOk = Boolean(res && typeof res === 'object' && (res.is_ok || res.tag === 'Ok'));
      if (isOk) {
        return isFnVal(onOk) ? onOk.call([res.val], line) : onOk;
      }
      return isFnVal(onErr) ? onErr.call([res?.err ?? null], line) : onErr;
    },
  });

}
