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
}
