import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerIo(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

  // speak - output to console
  const speak: SdevFunction = {
    type: 'builtin',
    call: (args: unknown[]) => {
      const message = args.map(stringify).join(' ');
      output(message);
      return null;
    },
  };
  builtins.set('speak', speak);
  // `say` is the v2 spelling — both runtimes must print the same way.
  builtins.set('say', speak);

  // whisper - output without newline concept (same as speak in this context)
  builtins.set('whisper', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const message = args.map(stringify).join('');
      output(message);
      return null;
    },
  });

  // shout - output in uppercase
  builtins.set('shout', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const message = args.map(stringify).join(' ').toUpperCase();
      output(message);
      return null;
    },
  });

  // measure - get length
  builtins.set('measure', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) {
        throw new SdevError('measure() takes exactly 1 argument', line);
      }
      const arg = args[0];
      if (typeof arg === 'string') return arg.length;
      if (Array.isArray(arg)) return arg.length;
      if (arg && typeof arg === 'object') return Object.keys(arg).length;
      throw new SdevError('measure() argument must be string, list, or dict', line);
    },
  });

  // morph - type conversion
  builtins.set('morph', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('morph() takes 2 arguments (value, type)', line);
      const val = args[0];
      const targetType = args[1];
      if (typeof targetType !== 'string') throw new SdevError('Second argument must be type name', line);

      switch (targetType) {
        case 'number':
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            const num = parseFloat(val);
            if (isNaN(num)) throw new SdevError(`Cannot morph '${val}' to number`, line);
            return num;
          }
          throw new SdevError('Cannot morph to number', line);
        case 'text':
          return stringify(val);
        case 'truth':
          return isTruthy(val);
        default:
          throw new SdevError(`Unknown type: ${targetType}`, line);
      }
    },
  });

  // conjure a sequence
  builtins.set('sequence', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 3) {
        throw new SdevError('sequence() takes 1 to 3 arguments', line);
      }
      let start = 0, end = 0, step = 1;
      if (args.length === 1) {
        end = toNumber(args[0], line);
      } else if (args.length === 2) {
        start = toNumber(args[0], line);
        end = toNumber(args[1], line);
      } else {
        start = toNumber(args[0], line);
        end = toNumber(args[1], line);
        step = toNumber(args[2], line);
      }
      if (step === 0) throw new SdevError('sequence() step cannot be 0', line);
      const result: number[] = [];
      if (step > 0) {
        for (let i = start; i < end; i += step) result.push(i);
      } else {
        for (let i = start; i > end; i += step) result.push(i);
      }
      return result;
    },
  });

  // each - map over array with lambda
  builtins.set('each', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('each() takes 2 arguments (list, transform)', line);
      const arr = args[0];
      const fn = args[1] as SdevFunction;
      if (!Array.isArray(arr)) throw new SdevError('First argument must be a list', line);
      if (!fn || typeof fn !== 'object' || !('call' in fn)) {
        throw new SdevError('Second argument must be a function', line);
      }
      return arr.map((item, idx) => {
        try { return fn.call([item, idx], line); }
        catch { return fn.call([item], line); }
      });
    },
  });

  // sift - filter array
  builtins.set('sift', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('sift() takes 2 arguments (list, predicate)', line);
      const arr = args[0];
      const fn = args[1] as SdevFunction;
      if (!Array.isArray(arr)) throw new SdevError('First argument must be a list', line);
      if (!fn || typeof fn !== 'object' || !('call' in fn)) {
        throw new SdevError('Second argument must be a function', line);
      }
      return arr.filter((item) => isTruthy(fn.call([item], line)));
    },
  });

  // fold - reduce array
  builtins.set('fold', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('fold() takes 3 arguments (list, initial, reducer)', line);
      const arr = args[0];
      let acc = args[1];
      const fn = args[2] as SdevFunction;
      if (!Array.isArray(arr)) throw new SdevError('First argument must be a list', line);
      if (!fn || typeof fn !== 'object' || !('call' in fn)) {
        throw new SdevError('Third argument must be a function', line);
      }
      for (const item of arr) {
        acc = fn.call([acc, item], line);
      }
      return acc;
    },
  });

  // gather - push to list
  builtins.set('gather', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      // gather()        → new empty list (stdlib/ML dialect)
      // gather(list, v) → append v to list
      if (args.length === 0) return [];
      if (args.length !== 2) throw new SdevError('gather() takes 0 or 2 arguments', line);
      const arr = args[0];
      if (!Array.isArray(arr)) throw new SdevError('First argument must be a list', line);
      arr.push(args[1]);
      return arr;
    },
  });

  // pluck - pop from list, or append when given a value (stdlib/ML dialect)
  builtins.set('pluck', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 2) throw new SdevError('pluck() takes 1 or 2 arguments', line);
      const arr = args[0];
      if (!Array.isArray(arr)) throw new SdevError('Argument must be a list', line);
      if (args.length === 2) {
        arr.push(args[1]);
        return arr;
      }
      if (arr.length === 0) throw new SdevError('Cannot pluck from empty list', line);
      return arr.pop();
    },
  });


  // slice - get portion
  builtins.set('portion', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2 || args.length > 3) {
        throw new SdevError('portion() takes 2 or 3 arguments', line);
      }
      const arr = args[0];
      if (!Array.isArray(arr) && typeof arr !== 'string') {
        throw new SdevError('First argument must be a list or string', line);
      }
      const start = toNumber(args[1], line);
      const end = args.length === 3 ? toNumber(args[2], line) : undefined;
      return arr.slice(start, end);
    },
  });

  // weave - join list to string
  builtins.set('weave', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('weave() takes 2 arguments', line);
      const arr = args[0];
      if (!Array.isArray(arr)) throw new SdevError('First argument must be a list', line);
      const sep = args[1];
      if (typeof sep !== 'string') throw new SdevError('Second argument must be a string', line);
      return arr.map(stringify).join(sep);
    },
  });

  // shatter - split string to list
  builtins.set('shatter', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('shatter() takes 2 arguments', line);
      const str = args[0];
      if (typeof str !== 'string') throw new SdevError('First argument must be a string', line);
      const sep = args[1];
      if (typeof sep !== 'string') throw new SdevError('Second argument must be a string', line);
      return str.split(sep);
    },
  });

  // essence - get type
  builtins.set('essence', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('essence() takes 1 argument', line);
      const val = args[0];
      if (val === null) return 'void';
      if (typeof val === 'number') return 'number';
      if (typeof val === 'string') return 'text';
      if (typeof val === 'boolean') return 'truth';
      if (Array.isArray(val)) return 'list';
      if (typeof val === 'object') {
        if ((val as { type?: string }).type === 'builtin' ||
            (val as { type?: string }).type === 'user' ||
            (val as { type?: string }).type === 'lambda') {
          return 'conjuration';
        }
        return 'tome';
      }
      return 'mystery';
    },
  });
}
