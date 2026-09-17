import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerList(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

  // ============= List Operations =============
  builtins.set('insert', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('insert() takes 3 arguments (list, index, value)', line);
      if (!Array.isArray(args[0])) throw new SdevError('First argument must be a list', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      const arr = args[0];
      arr.splice(args[1], 0, args[2]);
      return arr;
    },
  });

  builtins.set('remove', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('remove() takes 2 arguments (list, index)', line);
      if (!Array.isArray(args[0])) throw new SdevError('First argument must be a list', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      const arr = args[0];
      const idx = args[1] < 0 ? arr.length + args[1] : args[1];
      if (idx < 0 || idx >= arr.length) throw new SdevError('Index out of bounds', line);
      return arr.splice(idx, 1)[0];
    },
  });

  builtins.set('concat', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('concat() takes at least 2 arguments', line);
      if (Array.isArray(args[0])) {
        return args.reduce((acc: unknown[], arr) => {
          if (!Array.isArray(arr)) throw new SdevError('All arguments must be lists', line);
          return [...acc, ...arr];
        }, []);
      }
      if (typeof args[0] === 'string') {
        return args.map(a => String(a)).join('');
      }
      throw new SdevError('First argument must be a list or text', line);
    },
  });

  builtins.set('flatten', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('flatten() takes 1 argument', line);
      if (!Array.isArray(args[0])) throw new SdevError('Argument must be a list', line);
      return args[0].flat(Infinity);
    },
  });

  builtins.set('zip', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('zip() takes at least 2 arguments', line);
      const arrays = args.map((a, i) => {
        if (!Array.isArray(a)) throw new SdevError(`Argument ${i + 1} must be a list`, line);
        return a;
      });
      const minLen = Math.min(...arrays.map(a => a.length));
      const result: unknown[][] = [];
      for (let i = 0; i < minLen; i++) {
        result.push(arrays.map(arr => arr[i]));
      }
      return result;
    },
  });

  builtins.set('unzip', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('unzip() takes 1 argument', line);
      if (!Array.isArray(args[0])) throw new SdevError('Argument must be a list', line);
      if (args[0].length === 0) return [];
      const first = args[0][0];
      if (!Array.isArray(first)) throw new SdevError('Elements must be lists', line);
      const numArrays = first.length;
      const result: unknown[][] = Array.from({ length: numArrays }, () => []);
      for (const tuple of args[0]) {
        if (!Array.isArray(tuple)) throw new SdevError('Elements must be lists', line);
        for (let i = 0; i < tuple.length; i++) {
          result[i]?.push(tuple[i]);
        }
      }
      return result;
    },
  });

  builtins.set('first', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('first() takes 1 argument', line);
      if (Array.isArray(args[0])) return args[0][0] ?? null;
      if (typeof args[0] === 'string') return args[0][0] ?? '';
      throw new SdevError('Argument must be a list or text', line);
    },
  });

  builtins.set('last', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('last() takes 1 argument', line);
      if (Array.isArray(args[0])) return args[0][args[0].length - 1] ?? null;
      if (typeof args[0] === 'string') return args[0][args[0].length - 1] ?? '';
      throw new SdevError('Argument must be a list or text', line);
    },
  });

  builtins.set('rest', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('rest() takes 1 argument', line);
      if (Array.isArray(args[0])) return args[0].slice(1);
      if (typeof args[0] === 'string') return args[0].slice(1);
      throw new SdevError('Argument must be a list or text', line);
    },
  });

  builtins.set('take', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('take() takes 2 arguments (list, count)', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      if (Array.isArray(args[0])) return args[0].slice(0, args[1]);
      if (typeof args[0] === 'string') return args[0].slice(0, args[1]);
      throw new SdevError('First argument must be a list or text', line);
    },
  });

  builtins.set('drop', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('drop() takes 2 arguments (list, count)', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      if (Array.isArray(args[0])) return args[0].slice(args[1]);
      if (typeof args[0] === 'string') return args[0].slice(args[1]);
      throw new SdevError('First argument must be a list or text', line);
    },
  });

  builtins.set('sum', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('sum() takes 1 argument', line);
      if (!Array.isArray(args[0])) throw new SdevError('Argument must be a list', line);
      return args[0].reduce((acc: number, val) => {
        if (typeof val !== 'number') throw new SdevError('All elements must be numbers', line);
        return acc + val;
      }, 0);
    },
  });

  builtins.set('product', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('product() takes 1 argument', line);
      if (!Array.isArray(args[0])) throw new SdevError('Argument must be a list', line);
      return args[0].reduce((acc: number, val) => {
        if (typeof val !== 'number') throw new SdevError('All elements must be numbers', line);
        return acc * val;
      }, 1);
    },
  });

  builtins.set('average', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('average() takes 1 argument', line);
      if (!Array.isArray(args[0])) throw new SdevError('Argument must be a list', line);
      if (args[0].length === 0) throw new SdevError('Cannot average empty list', line);
      const total = args[0].reduce((acc: number, val) => {
        if (typeof val !== 'number') throw new SdevError('All elements must be numbers', line);
        return acc + val;
      }, 0);
      return total / args[0].length;
    },
  });

  builtins.set('sort', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 2) throw new SdevError('sort() takes 1-2 arguments', line);
      if (!Array.isArray(args[0])) throw new SdevError('First argument must be a list', line);
      const arr = [...args[0]];
      if (args.length === 2) {
        const fn = args[1] as SdevFunction;
        if (!fn || typeof fn !== 'object' || !('call' in fn)) {
          throw new SdevError('Second argument must be a function', line);
        }
        arr.sort((a, b) => fn.call([a, b], line) as number);
      } else {
        arr.sort((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          return String(a).localeCompare(String(b));
        });
      }
      return arr;
    },
  });

  builtins.set('unique', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('unique() takes 1 argument', line);
      if (!Array.isArray(args[0])) throw new SdevError('Argument must be a list', line);
      const seen = new Set<string>();
      return args[0].filter(item => {
        const key = JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
  });

  builtins.set('count', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('count() takes 2 arguments (list, value)', line);
      if (!Array.isArray(args[0])) throw new SdevError('First argument must be a list', line);
      const needle = JSON.stringify(args[1]);
      return args[0].filter(item => JSON.stringify(item) === needle).length;
    },
  });

  builtins.set('all', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('all() takes 2 arguments (list, predicate)', line);
      if (!Array.isArray(args[0])) throw new SdevError('First argument must be a list', line);
      const fn = args[1] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) {
        throw new SdevError('Second argument must be a function', line);
      }
      return args[0].every(item => isTruthy(fn.call([item], line)));
    },
  });

  builtins.set('any', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('any() takes 2 arguments (list, predicate)', line);
      if (!Array.isArray(args[0])) throw new SdevError('First argument must be a list', line);
      const fn = args[1] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) {
        throw new SdevError('Second argument must be a function', line);
      }
      return args[0].some(item => isTruthy(fn.call([item], line)));
    },
  });

  builtins.set('find', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('find() takes 2 arguments (list, predicate)', line);
      if (!Array.isArray(args[0])) throw new SdevError('First argument must be a list', line);
      const fn = args[1] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) {
        throw new SdevError('Second argument must be a function', line);
      }
      for (const item of args[0]) {
        if (isTruthy(fn.call([item], line))) return item;
      }
      return null;
    },
  });
}
