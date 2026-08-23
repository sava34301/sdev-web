import { SdevError } from './errors';

export type OutputCallback = (message: string) => void;

export interface SdevFunction {
  type: 'builtin' | 'user' | 'lambda';
  call: (args: unknown[], line: number) => unknown;
}

export function createBuiltins(output: OutputCallback): Map<string, SdevFunction> {
  const builtins = new Map<string, SdevFunction>();

  // speak - output to console
  builtins.set('speak', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const message = args.map(stringify).join(' ');
      output(message);
      return null;
    },
  });

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

  // Math operations with unique names
  builtins.set('magnitude', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('magnitude() takes 1 argument', line);
      return Math.abs(toNumber(args[0], line));
    },
  });

  builtins.set('least', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length === 0) throw new SdevError('least() takes at least 1 argument', line);
      if (args.length === 1 && Array.isArray(args[0])) {
        return Math.min(...args[0].map((x) => toNumber(x, line)));
      }
      return Math.min(...args.map((x) => toNumber(x, line)));
    },
  });

  builtins.set('greatest', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length === 0) throw new SdevError('greatest() takes at least 1 argument', line);
      if (args.length === 1 && Array.isArray(args[0])) {
        return Math.max(...args[0].map((x) => toNumber(x, line)));
      }
      return Math.max(...args.map((x) => toNumber(x, line)));
    },
  });

  builtins.set('root', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('root() takes 1 argument', line);
      return Math.sqrt(toNumber(args[0], line));
    },
  });

  builtins.set('ground', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('ground() takes 1 argument', line);
      return Math.floor(toNumber(args[0], line));
    },
  });

  builtins.set('elevate', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('elevate() takes 1 argument', line);
      return Math.ceil(toNumber(args[0], line));
    },
  });

  builtins.set('nearby', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('nearby() takes 1 argument', line);
      return Math.round(toNumber(args[0], line));
    },
  });

  builtins.set('chaos', {
    type: 'builtin',
    call: () => Math.random(),
  });

  // Dict operations
  builtins.set('inscriptions', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('inscriptions() takes 1 argument', line);
      const obj = args[0];
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        throw new SdevError('Argument must be a tome (dict)', line);
      }
      return Object.keys(obj as Record<string, unknown>);
    },
  });

  builtins.set('contents', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('contents() takes 1 argument', line);
      const obj = args[0];
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        throw new SdevError('Argument must be a tome (dict)', line);
      }
      return Object.values(obj as Record<string, unknown>);
    },
  });

  // String operations
  builtins.set('upper', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('upper() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].toUpperCase();
    },
  });

  builtins.set('lower', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('lower() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].toLowerCase();
    },
  });

  builtins.set('trim', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('trim() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].trim();
    },
  });

  builtins.set('reverse', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('reverse() takes 1 argument', line);
      const val = args[0];
      if (typeof val === 'string') return val.split('').reverse().join('');
      if (Array.isArray(val)) return [...val].reverse();
      throw new SdevError('Argument must be text or list', line);
    },
  });

  builtins.set('contains', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('contains() takes 2 arguments', line);
      const haystack = args[0];
      const needle = args[1];
      if (typeof haystack === 'string' && typeof needle === 'string') {
        return haystack.includes(needle);
      }
      if (Array.isArray(haystack)) {
        return haystack.some(item => JSON.stringify(item) === JSON.stringify(needle));
      }
      // Dict/tome: check if key exists
      if (haystack && typeof haystack === 'object') {
        const key = String(needle);
        return key in (haystack as Record<string, unknown>);
      }
      throw new SdevError('First argument must be text, list, or tome', line);
    },
  });

  // len - alias for measure (used internally by compiler forEach)
  builtins.set('len', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('len() takes 1 argument', line);
      const arg = args[0];
      if (typeof arg === 'string') return arg.length;
      if (Array.isArray(arg)) return arg.length;
      if (arg instanceof Set) return arg.size;
      if (arg instanceof Map) return arg.size;
      if (arg && typeof arg === 'object') {
        // Sets, and any object exposing a `size()` / `length()` protocol.
        const sized = arg as { size?: unknown; values?: unknown };
        if (typeof sized.size === 'function') return (sized.size as () => number)();
        if (typeof sized.size === 'number') return sized.size;
        if (typeof sized.values === 'function') {
          const vals = (sized.values as () => unknown)();
          if (Array.isArray(vals)) return vals.length;
        }
        return Object.keys(arg as Record<string, unknown>).length;
      }
      throw new SdevError('len() argument must be string, list, or dict', line);
    },
  });

  // gettype - get the type of a value (avoids 'essence' keyword clash)
  builtins.set('gettype', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('gettype() takes 1 argument', line);
      const val = args[0];
      if (val === null) return 'void';
      if (typeof val === 'number') return 'number';
      if (typeof val === 'string') return 'text';
      if (typeof val === 'boolean') return 'truth';
      if (Array.isArray(val)) return 'list';
      if (typeof val === 'object') {
        if ((val as { type?: string }).type === 'builtin' ||
            (val as { type?: string }).type === 'user' ||
            (val as { type?: string }).type === 'lambda') return 'conjuration';
        if ((val as { type?: string }).type === 'class') return 'class';
        return 'tome';
      }
      return 'mystery';
    },
  });

  // Advanced math
  builtins.set('sin', { type: 'builtin', call: (args: unknown[]) => Math.sin(args[0] as number) });
  builtins.set('cos', { type: 'builtin', call: (args: unknown[]) => Math.cos(args[0] as number) });
  builtins.set('tan', { type: 'builtin', call: (args: unknown[]) => Math.tan(args[0] as number) });
  builtins.set('log', { type: 'builtin', call: (args: unknown[]) => Math.log(args[0] as number) });
  builtins.set('exp', { type: 'builtin', call: (args: unknown[]) => Math.exp(args[0] as number) });
  builtins.set('PI', { type: 'builtin', call: () => Math.PI });
  builtins.set('TAU', { type: 'builtin', call: () => Math.PI * 2 });
  
  // random() alias for chaos()
  builtins.set('random', {
    type: 'builtin',
    call: () => Math.random(),
  });
  
  // Random utilities
  builtins.set('randint', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('randint() takes 2 arguments', line);
      const min = Math.ceil(args[0] as number);
      const max = Math.floor(args[1] as number);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
  });
  
  builtins.set('pick', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('pick() takes 1 argument', line);
      const arr = args[0];
      if (!Array.isArray(arr)) throw new SdevError('Argument must be a list', line);
      return arr[Math.floor(Math.random() * arr.length)] ?? null;
    },
  });
  
  builtins.set('shuffle', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('shuffle() takes 1 argument', line);
      const arr = args[0];
      if (!Array.isArray(arr)) throw new SdevError('Argument must be a list', line);
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    },
  });

  // JSON
  builtins.set('etch', { type: 'builtin', call: (args: unknown[]) => JSON.stringify(args[0]) });
  builtins.set('unetch', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      try { return JSON.parse(args[0] as string); }
      catch { throw new SdevError('Invalid JSON', line); }
    },
  });

  // ============= String Operations =============
  builtins.set('replace', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('replace() takes 3 arguments (text, search, replacement)', line);
      if (typeof args[0] !== 'string') throw new SdevError('First argument must be text', line);
      if (typeof args[1] !== 'string') throw new SdevError('Second argument must be text', line);
      if (typeof args[2] !== 'string') throw new SdevError('Third argument must be text', line);
      return (args[0] as string).split(args[1] as string).join(args[2] as string);
    },
  });

  builtins.set('startswith', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('startswith() takes 2 arguments', line);
      if (typeof args[0] !== 'string' || typeof args[1] !== 'string') {
        throw new SdevError('Arguments must be text', line);
      }
      return args[0].startsWith(args[1]);
    },
  });

  builtins.set('endswith', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('endswith() takes 2 arguments', line);
      if (typeof args[0] !== 'string' || typeof args[1] !== 'string') {
        throw new SdevError('Arguments must be text', line);
      }
      return args[0].endsWith(args[1]);
    },
  });

  builtins.set('repeat', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('repeat() takes 2 arguments (text, count)', line);
      if (typeof args[0] !== 'string') throw new SdevError('First argument must be text', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      return args[0].repeat(Math.max(0, Math.floor(args[1])));
    },
  });

  builtins.set('padleft', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2 || args.length > 3) throw new SdevError('padleft() takes 2-3 arguments', line);
      if (typeof args[0] !== 'string') throw new SdevError('First argument must be text', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      const pad = args.length === 3 ? String(args[2]) : ' ';
      return args[0].padStart(args[1], pad);
    },
  });

  builtins.set('padright', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2 || args.length > 3) throw new SdevError('padright() takes 2-3 arguments', line);
      if (typeof args[0] !== 'string') throw new SdevError('First argument must be text', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      const pad = args.length === 3 ? String(args[2]) : ' ';
      return args[0].padEnd(args[1], pad);
    },
  });

  builtins.set('charAt', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('charAt() takes 2 arguments (text, index)', line);
      if (typeof args[0] !== 'string') throw new SdevError('First argument must be text', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      const str = args[0];
      const idx = args[1] < 0 ? str.length + args[1] : args[1];
      return str[idx] ?? '';
    },
  });

  builtins.set('indexOf', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('indexOf() takes 2 arguments', line);
      if (typeof args[0] === 'string' && typeof args[1] === 'string') {
        return args[0].indexOf(args[1]);
      }
      if (Array.isArray(args[0])) {
        return args[0].findIndex(item => 
          JSON.stringify(item) === JSON.stringify(args[1])
        );
      }
      throw new SdevError('First argument must be text or list', line);
    },
  });

  builtins.set('lastIndexOf', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('lastIndexOf() takes 2 arguments', line);
      if (typeof args[0] === 'string' && typeof args[1] === 'string') {
        return args[0].lastIndexOf(args[1]);
      }
      if (Array.isArray(args[0])) {
        for (let i = args[0].length - 1; i >= 0; i--) {
          if (JSON.stringify(args[0][i]) === JSON.stringify(args[1])) return i;
        }
        return -1;
      }
      throw new SdevError('First argument must be text or list', line);
    },
  });

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

  // ============= Type Checking =============
  builtins.set('isNum', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isNum() takes 1 argument', line);
      return typeof args[0] === 'number';
    },
  });

  builtins.set('isText', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isText() takes 1 argument', line);
      return typeof args[0] === 'string';
    },
  });

  builtins.set('isList', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isList() takes 1 argument', line);
      return Array.isArray(args[0]);
    },
  });

  builtins.set('isTome', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isTome() takes 1 argument', line);
      return args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0]);
    },
  });

  builtins.set('isTruth', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isTruth() takes 1 argument', line);
      return typeof args[0] === 'boolean';
    },
  });

  builtins.set('isVoid', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isVoid() takes 1 argument', line);
      return args[0] === null;
    },
  });

  builtins.set('isFunc', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isFunc() takes 1 argument', line);
      const val = args[0];
      if (val && typeof val === 'object' && 'type' in val) {
        const t = (val as { type: string }).type;
        return t === 'builtin' || t === 'user' || t === 'lambda';
      }
      return false;
    },
  });

  // ============= Math Utilities =============
  builtins.set('clamp', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('clamp() takes 3 arguments (value, min, max)', line);
      const [val, min, max] = args.map(a => {
        if (typeof a !== 'number') throw new SdevError('All arguments must be numbers', line);
        return a;
      });
      return Math.min(Math.max(val, min), max);
    },
  });

  builtins.set('lerp', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('lerp() takes 3 arguments (start, end, t)', line);
      const [start, end, t] = args.map(a => {
        if (typeof a !== 'number') throw new SdevError('All arguments must be numbers', line);
        return a;
      });
      return start + (end - start) * t;
    },
  });

  builtins.set('mapRange', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 5) throw new SdevError('mapRange() takes 5 arguments (value, inMin, inMax, outMin, outMax)', line);
      const [value, inMin, inMax, outMin, outMax] = args.map(a => {
        if (typeof a !== 'number') throw new SdevError('All arguments must be numbers', line);
        return a;
      });
      return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
    },
  });

  builtins.set('sign', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('sign() takes 1 argument', line);
      if (typeof args[0] !== 'number') throw new SdevError('Argument must be a number', line);
      return Math.sign(args[0]);
    },
  });

  builtins.set('pow', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('pow() takes 2 arguments (base, exponent)', line);
      if (typeof args[0] !== 'number' || typeof args[1] !== 'number') {
        throw new SdevError('Arguments must be numbers', line);
      }
      return Math.pow(args[0], args[1]);
    },
  });

  // More trig
  builtins.set('asin', { type: 'builtin', call: (args: unknown[]) => Math.asin(args[0] as number) });
  builtins.set('acos', { type: 'builtin', call: (args: unknown[]) => Math.acos(args[0] as number) });
  builtins.set('atan', { type: 'builtin', call: (args: unknown[]) => Math.atan(args[0] as number) });
  builtins.set('atan2', { 
    type: 'builtin', 
    call: (args: unknown[]) => Math.atan2(args[0] as number, args[1] as number) 
  });
  builtins.set('sinh', { type: 'builtin', call: (args: unknown[]) => Math.sinh(args[0] as number) });
  builtins.set('cosh', { type: 'builtin', call: (args: unknown[]) => Math.cosh(args[0] as number) });
  builtins.set('tanh', { type: 'builtin', call: (args: unknown[]) => Math.tanh(args[0] as number) });
  builtins.set('log10', { type: 'builtin', call: (args: unknown[]) => Math.log10(args[0] as number) });
  builtins.set('log2', { type: 'builtin', call: (args: unknown[]) => Math.log2(args[0] as number) });

  // Constants
  builtins.set('E', { type: 'builtin', call: () => Math.E });
  builtins.set('INFINITY', { type: 'builtin', call: () => Infinity });

  // ============= Time =============
  builtins.set('now', {
    type: 'builtin',
    call: () => Date.now(),
  });

  builtins.set('timestamp', {
    type: 'builtin',
    call: () => new Date().toISOString(),
  });

  // ============= Tome (Dict) Operations =============
  builtins.set('has', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('has() takes 2 arguments (tome, key)', line);
      if (!args[0] || typeof args[0] !== 'object' || Array.isArray(args[0])) {
        throw new SdevError('First argument must be a tome', line);
      }
      const key = String(args[1]);
      return key in (args[0] as Record<string, unknown>);
    },
  });

  builtins.set('get', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2 || args.length > 3) throw new SdevError('get() takes 2-3 arguments (tome, key, default?)', line);
      if (!args[0] || typeof args[0] !== 'object' || Array.isArray(args[0])) {
        throw new SdevError('First argument must be a tome', line);
      }
      const key = String(args[1]);
      const obj = args[0] as Record<string, unknown>;
      if (key in obj) return obj[key];
      return args.length === 3 ? args[2] : null;
    },
  });

  builtins.set('set', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('set() takes 3 arguments (tome, key, value)', line);
      if (!args[0] || typeof args[0] !== 'object' || Array.isArray(args[0])) {
        throw new SdevError('First argument must be a tome', line);
      }
      const key = String(args[1]);
      (args[0] as Record<string, unknown>)[key] = args[2];
      return args[0];
    },
  });

  builtins.set('del', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('del() takes 2 arguments (tome, key)', line);
      if (!args[0] || typeof args[0] !== 'object' || Array.isArray(args[0])) {
        throw new SdevError('First argument must be a tome', line);
      }
      const key = String(args[1]);
      const obj = args[0] as Record<string, unknown>;
      const existed = key in obj;
      delete obj[key];
      return existed;
    },
  });

  builtins.set('merge', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('merge() takes at least 2 arguments', line);
      const result: Record<string, unknown> = {};
      for (const arg of args) {
        if (!arg || typeof arg !== 'object' || Array.isArray(arg)) {
          throw new SdevError('All arguments must be tomes', line);
        }
        Object.assign(result, arg);
      }
      return result;
    },
  });

  builtins.set('entries', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('entries() takes 1 argument', line);
      if (!args[0] || typeof args[0] !== 'object' || Array.isArray(args[0])) {
        throw new SdevError('Argument must be a tome', line);
      }
      return Object.entries(args[0] as Record<string, unknown>).map(([k, v]) => [k, v]);
    },
  });

  builtins.set('fromEntries', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('fromEntries() takes 1 argument', line);
      if (!Array.isArray(args[0])) throw new SdevError('Argument must be a list', line);
      const result: Record<string, unknown> = {};
      for (const entry of args[0]) {
        if (!Array.isArray(entry) || entry.length !== 2) {
          throw new SdevError('Each entry must be a [key, value] pair', line);
        }
        result[String(entry[0])] = entry[1];
      }
      return result;
    },
  });

  // ============= Missing documented builtins =============

  // starts(s, prefix) - alias for startswith
  builtins.set('starts', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('starts() takes 2 arguments', line);
      if (typeof args[0] !== 'string' || typeof args[1] !== 'string') throw new SdevError('Arguments must be text', line);
      return args[0].startsWith(args[1]);
    },
  });

  // ends(s, suffix) - alias for endswith
  builtins.set('ends', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('ends() takes 2 arguments', line);
      if (typeof args[0] !== 'string' || typeof args[1] !== 'string') throw new SdevError('Arguments must be text', line);
      return args[0].endsWith(args[1]);
    },
  });

  // locate(s, sub) - find index of substring
  builtins.set('locate', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('locate() takes 2 arguments', line);
      if (typeof args[0] === 'string' && typeof args[1] === 'string') return args[0].indexOf(args[1]);
      if (Array.isArray(args[0])) return args[0].findIndex(item => JSON.stringify(item) === JSON.stringify(args[1]));
      throw new SdevError('First argument must be text or list', line);
    },
  });

  // chars(s) - string to char list
  builtins.set('chars', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('chars() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].split('');
    },
  });

  // format(template, ...args) - string formatting with {} placeholders
  builtins.set('format', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('format() takes at least 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('First argument must be text', line);
      let template = args[0];
      let argIdx = 1;
      template = template.replace(/\{(\d+)?\}/g, (_, idx) => {
        const i = idx !== undefined ? parseInt(idx) + 1 : argIdx++;
        return stringify(args[i] !== undefined ? args[i] : '');
      });
      return template;
    },
  });

  // padLeft(s, width, char?) - alias PascalCase
  builtins.set('padLeft', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2 || args.length > 3) throw new SdevError('padLeft() takes 2-3 arguments', line);
      if (typeof args[0] !== 'string') throw new SdevError('First argument must be text', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      const pad = args.length === 3 ? String(args[2]) : ' ';
      return args[0].padStart(args[1], pad);
    },
  });

  // padRight(s, width, char?) - alias PascalCase
  builtins.set('padRight', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2 || args.length > 3) throw new SdevError('padRight() takes 2-3 arguments', line);
      if (typeof args[0] !== 'string') throw new SdevError('First argument must be text', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      const pad = args.length === 3 ? String(args[2]) : ' ';
      return args[0].padEnd(args[1], pad);
    },
  });

  // snatch(str_or_list, start, end?) - substring OR remove at index from list
  builtins.set('snatch', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('snatch() takes 2-3 arguments', line);
      // String substring: snatch(str, start, end?)
      if (typeof args[0] === 'string') {
        const str = args[0];
        const start = args[1] as number;
        const end = args.length === 3 ? (args[2] as number) : undefined;
        return str.slice(start, end);
      }
      // List: snatch(list, index) - remove at index
      if (Array.isArray(args[0])) {
        if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
        const arr = args[0];
        const idx = args[1] < 0 ? arr.length + args[1] : args[1];
        if (idx < 0 || idx >= arr.length) throw new SdevError('Index out of bounds', line);
        return arr.splice(idx, 1)[0];
      }
      throw new SdevError('First argument must be text or list', line);
    },
  });

  // sortDesc(list) - sort descending
  builtins.set('sortDesc', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('sortDesc() takes 1 argument', line);
      if (!Array.isArray(args[0])) throw new SdevError('Argument must be a list', line);
      return [...args[0]].sort((a, b) => {
        if (typeof a === 'number' && typeof b === 'number') return b - a;
        return String(b).localeCompare(String(a));
      });
    },
  });

  // clone(list) - deep copy
  builtins.set('clone', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('clone() takes 1 argument', line);
      return JSON.parse(JSON.stringify(args[0]));
    },
  });

  // erase is handled by advanced.ts (supports both tome and file FS)

  // difference(a, b) - set difference
  builtins.set('difference', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('difference() takes 2 arguments', line);
      if (!Array.isArray(args[0]) || !Array.isArray(args[1])) throw new SdevError('Arguments must be lists', line);
      const setB = new Set((args[1] as unknown[]).map(x => JSON.stringify(x)));
      return (args[0] as unknown[]).filter(x => !setB.has(JSON.stringify(x)));
    },
  });

  // seek(list, predicate) - alias for find
  builtins.set('seek', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('seek() takes 2 arguments (list, predicate)', line);
      if (!Array.isArray(args[0])) throw new SdevError('First argument must be a list', line);
      const fn = args[1] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('Second argument must be a function', line);
      for (const item of args[0]) {
        if (isTruthy(fn.call([item], line))) return item;
      }
      return null;
    },
  });

  // every(list, predicate) - alias for all
  builtins.set('every', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('every() takes 2 arguments', line);
      if (!Array.isArray(args[0])) throw new SdevError('First argument must be a list', line);
      const fn = args[1] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('Second argument must be a function', line);
      return args[0].every(item => isTruthy(fn.call([item], line)));
    },
  });

  // some(list, predicate) - alias for any
  builtins.set('some', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('some() takes 2 arguments', line);
      if (!Array.isArray(args[0])) throw new SdevError('First argument must be a list', line);
      const fn = args[1] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('Second argument must be a function', line);
      return args[0].some(item => isTruthy(fn.call([item], line)));
    },
  });

  // enumerate(list) - [[index, item], ...]
  builtins.set('enumerate', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('enumerate() takes 1 argument', line);
      if (!Array.isArray(args[0])) throw new SdevError('Argument must be a list', line);
      return (args[0] as unknown[]).map((item, idx) => [idx, item]);
    },
  });

  // constrain(v, min, max) - alias for clamp
  builtins.set('constrain', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('constrain() takes 3 arguments (value, min, max)', line);
      const [val, min, max] = args.map(a => {
        if (typeof a !== 'number') throw new SdevError('All arguments must be numbers', line);
        return a;
      });
      return Math.min(Math.max(val, min), max);
    },
  });

  // dist(x1, y1, x2, y2) - distance between two points
  builtins.set('dist', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 4) throw new SdevError('dist() takes 4 arguments (x1, y1, x2, y2)', line);
      const [x1, y1, x2, y2] = args.map(a => {
        if (typeof a !== 'number') throw new SdevError('All arguments must be numbers', line);
        return a;
      });
      return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },
  });

  // radians(deg) - degrees to radians
  builtins.set('radians', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('radians() takes 1 argument', line);
      if (typeof args[0] !== 'number') throw new SdevError('Argument must be a number', line);
      return args[0] * (Math.PI / 180);
    },
  });

  // degrees(rad) - radians to degrees
  builtins.set('degrees', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('degrees() takes 1 argument', line);
      if (typeof args[0] !== 'number') throw new SdevError('Argument must be a number', line);
      return args[0] * (180 / Math.PI);
    },
  });

  // random(min?, max?) - random with optional range
  builtins.set('random', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length === 0) return Math.random();
      if (args.length === 2) {
        const min = args[0] as number;
        const max = args[1] as number;
        return Math.random() * (max - min) + min;
      }
      throw new SdevError('random() takes 0 or 2 arguments', line);
    },
  });

  // mean(list) - alias for average
  builtins.set('mean', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('mean() takes 1 argument', line);
      if (!Array.isArray(args[0])) throw new SdevError('Argument must be a list', line);
      if (args[0].length === 0) throw new SdevError('Cannot compute mean of empty list', line);
      const total = args[0].reduce((acc: number, val) => {
        if (typeof val !== 'number') throw new SdevError('All elements must be numbers', line);
        return acc + val;
      }, 0);
      return total / args[0].length;
    },
  });

  // input(prompt?) - uses browser prompt() for real input
  builtins.set('input', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const promptText = args.length > 0 ? String(args[0]) : '';
      if (typeof globalThis !== 'undefined' && typeof (globalThis as any).prompt === 'function') {
        try {
          const result = (globalThis as any).prompt(promptText);
          // Cancelled / blocked / undefined → return empty string (never null/undefined)
          if (result === null || result === undefined) return '';
          return String(result);
        } catch {
          return '';
        }
      }
      if (args.length > 0) output(promptText);
      return '';
    },
  });

  // delay(ms) - no-op in synchronous context
  builtins.set('delay', {
    type: 'builtin',
    call: () => null,
  });

  // sleep(ms) - alias for delay
  builtins.set('sleep', {
    type: 'builtin',
    call: () => null,
  });

  // ============= MISSING STANDARD FUNCTIONS =============

  // print() - alias for speak
  builtins.set('print', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const message = args.map(stringify).join(' ');
      output(message);
      return null;
    },
  });

  // println() - print with newline (same as print in this context)
  builtins.set('println', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const message = args.map(stringify).join(' ');
      output(message);
      return null;
    },
  });

  // range() - alias for sequence
  builtins.set('range', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 3) throw new SdevError('range() takes 1-3 arguments', line);
      let start = 0, end = 0, step = 1;
      if (args.length === 1) { end = toNumber(args[0], line); }
      else if (args.length === 2) { start = toNumber(args[0], line); end = toNumber(args[1], line); }
      else { start = toNumber(args[0], line); end = toNumber(args[1], line); step = toNumber(args[2], line); }
      if (step === 0) throw new SdevError('range() step cannot be 0', line);
      const result: number[] = [];
      if (step > 0) { for (let i = start; i < end; i += step) result.push(i); }
      else { for (let i = start; i > end; i += step) result.push(i); }
      return result;
    },
  });

  // typeof() - alias for gettype
  builtins.set('typeof', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('typeof() takes 1 argument', line);
      const val = args[0];
      if (val === null) return 'void';
      if (typeof val === 'number') return 'number';
      if (typeof val === 'string') return 'text';
      if (typeof val === 'boolean') return 'truth';
      if (Array.isArray(val)) return 'list';
      if (typeof val === 'object') {
        if ((val as any).type === 'builtin' || (val as any).type === 'user' || (val as any).type === 'lambda') return 'conjuration';
        if ((val as any).type === 'class') return 'class';
        return 'tome';
      }
      return 'mystery';
    },
  });

  // exit(code?) - terminate program
  builtins.set('exit', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const code = args.length > 0 ? Number(args[0]) : 0;
      throw new SdevError(`Program exited with code ${code}`, 0);
    },
  });

  // panic(message) - fatal error
  builtins.set('panic', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const msg = args.length > 0 ? stringify(args[0]) : 'panic!';
      throw new SdevError(`PANIC: ${msg}`, line);
    },
  });

  // throw(message) - throw error
  builtins.set('throw', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const msg = args.length > 0 ? stringify(args[0]) : 'Error';
      throw new SdevError(msg, line);
    },
  });

  // ============= Character / Code Point =============

  // chr(n) - number to character
  builtins.set('chr', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('chr() takes 1 argument', line);
      if (typeof args[0] !== 'number') throw new SdevError('Argument must be a number', line);
      return String.fromCharCode(args[0]);
    },
  });

  // ord(char) - character to number
  builtins.set('ord', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 2) throw new SdevError('ord() takes 1 or 2 arguments', line);
      if (typeof args[0] !== 'string' || args[0].length === 0) throw new SdevError('Argument must be a non-empty string', line);
      // ord(s) → first char code; ord(s, i) → char code at index i (ML stdlib form)
      const idx = args.length === 2 ? Number(args[1]) : 0;
      if (idx < 0 || idx >= args[0].length) return 0;
      return args[0].charCodeAt(idx);
    },
  });


  // ============= Number Base Conversion =============

  // hex(n) - number to hex string
  builtins.set('hex', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('hex() takes 1 argument', line);
      if (typeof args[0] !== 'number') throw new SdevError('Argument must be a number', line);
      return '0x' + Math.trunc(args[0]).toString(16).toUpperCase();
    },
  });

  // oct(n) - number to octal string
  builtins.set('oct', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('oct() takes 1 argument', line);
      if (typeof args[0] !== 'number') throw new SdevError('Argument must be a number', line);
      return '0o' + Math.trunc(args[0]).toString(8);
    },
  });

  // bin(n) - number to binary string
  builtins.set('bin', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('bin() takes 1 argument', line);
      if (typeof args[0] !== 'number') throw new SdevError('Argument must be a number', line);
      return '0b' + (Math.trunc(args[0]) >>> 0).toString(2);
    },
  });

  // parseNum(str, base?) - parse string to number with optional base
  builtins.set('parseNum', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 2) throw new SdevError('parseNum() takes 1-2 arguments', line);
      if (typeof args[0] !== 'string') throw new SdevError('First argument must be text', line);
      const base = args.length === 2 ? Number(args[1]) : undefined;
      const n = base ? parseInt(args[0], base) : parseFloat(args[0]);
      if (isNaN(n)) throw new SdevError(`Cannot parse '${args[0]}' as number`, line);
      return n;
    },
  });

  // ============= Number Formatting =============

  // toFixed(n, digits) - format to fixed decimal places
  builtins.set('toFixed', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('toFixed() takes 2 arguments (number, digits)', line);
      if (typeof args[0] !== 'number') throw new SdevError('First argument must be a number', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      return args[0].toFixed(args[1]);
    },
  });

  // toPrecision(n, precision) - format to precision
  builtins.set('toPrecision', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('toPrecision() takes 2 arguments', line);
      if (typeof args[0] !== 'number') throw new SdevError('First argument must be a number', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      return args[0].toPrecision(args[1]);
    },
  });

  // isNaN(v) - check if NaN
  builtins.set('isNaN', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isNaN() takes 1 argument', line);
      return typeof args[0] === 'number' && isNaN(args[0]);
    },
  });

  // isFinite(v) - check if finite
  builtins.set('isFinite', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isFinite() takes 1 argument', line);
      return typeof args[0] === 'number' && isFinite(args[0]);
    },
  });

  // isInteger(v) - check if integer
  builtins.set('isInteger', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isInteger() takes 1 argument', line);
      return typeof args[0] === 'number' && Number.isInteger(args[0]);
    },
  });

  // ============= String Checking =============

  // capitalize(s) - first char uppercase
  builtins.set('capitalize', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('capitalize() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase();
    },
  });

  // title(s) - title case
  builtins.set('title', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('title() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].replace(/\b\w/g, c => c.toUpperCase());
    },
  });

  // center(s, width, char?) - center-pad string
  builtins.set('center', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2 || args.length > 3) throw new SdevError('center() takes 2-3 arguments', line);
      if (typeof args[0] !== 'string') throw new SdevError('First argument must be text', line);
      if (typeof args[1] !== 'number') throw new SdevError('Second argument must be a number', line);
      const pad = args.length === 3 ? String(args[2]) : ' ';
      const s = args[0];
      const width = args[1];
      if (s.length >= width) return s;
      const total = width - s.length;
      const left = Math.floor(total / 2);
      const right = total - left;
      return pad.repeat(left) + s + pad.repeat(right);
    },
  });

  // trimLeft(s) / trimRight(s)
  builtins.set('trimLeft', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('trimLeft() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].trimStart();
    },
  });

  builtins.set('trimRight', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('trimRight() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].trimEnd();
    },
  });

  // isUpper(s) - check if all uppercase
  builtins.set('isUpper', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isUpper() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].length > 0 && args[0] === args[0].toUpperCase() && args[0] !== args[0].toLowerCase();
    },
  });

  // isLower(s) - check if all lowercase
  builtins.set('isLower', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isLower() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].length > 0 && args[0] === args[0].toLowerCase() && args[0] !== args[0].toUpperCase();
    },
  });

  // isDigit(s) - check if all digits
  builtins.set('isDigit', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isDigit() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].length > 0 && /^\d+$/.test(args[0]);
    },
  });

  // isAlpha(s) - check if all alphabetic
  builtins.set('isAlpha', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isAlpha() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].length > 0 && /^[a-zA-Z]+$/.test(args[0]);
    },
  });

  // isAlphaNum(s) - check if all alphanumeric
  builtins.set('isAlphaNum', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isAlphaNum() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].length > 0 && /^[a-zA-Z0-9]+$/.test(args[0]);
    },
  });

  // isSpace(s) - check if all whitespace
  builtins.set('isSpace', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isSpace() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return args[0].length > 0 && /^\s+$/.test(args[0]);
    },
  });

  // ============= Regex / Pattern Matching =============

  // match(text, pattern) - regex match, returns list of matches or null
  builtins.set('match', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('match() takes 2 arguments (text, pattern)', line);
      if (typeof args[0] !== 'string' || typeof args[1] !== 'string') throw new SdevError('Arguments must be text', line);
      const m = args[0].match(new RegExp(args[1]));
      return m ? Array.from(m) : null;
    },
  });

  // matchAll(text, pattern) - all regex matches
  builtins.set('matchAll', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('matchAll() takes 2 arguments (text, pattern)', line);
      if (typeof args[0] !== 'string' || typeof args[1] !== 'string') throw new SdevError('Arguments must be text', line);
      const matches = Array.from(args[0].matchAll(new RegExp(args[1], 'g')));
      return matches.map(m => Array.from(m));
    },
  });

  // replaceRegex(text, pattern, replacement) - regex replace
  builtins.set('replaceRegex', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('replaceRegex() takes 3 arguments', line);
      if (typeof args[0] !== 'string' || typeof args[1] !== 'string' || typeof args[2] !== 'string') {
        throw new SdevError('Arguments must be text', line);
      }
      return args[0].replace(new RegExp(args[1], 'g'), args[2]);
    },
  });

  // test(text, pattern) - test if regex matches
  builtins.set('test', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('test() takes 2 arguments (text, pattern)', line);
      if (typeof args[0] !== 'string' || typeof args[1] !== 'string') throw new SdevError('Arguments must be text', line);
      return new RegExp(args[1]).test(args[0]);
    },
  });

  // ============= Bitwise Operations =============

  builtins.set('bitAnd', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('bitAnd() takes 2 arguments', line);
      return (args[0] as number) & (args[1] as number);
    },
  });

  builtins.set('bitOr', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('bitOr() takes 2 arguments', line);
      return (args[0] as number) | (args[1] as number);
    },
  });

  builtins.set('bitXor', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('bitXor() takes 2 arguments', line);
      return (args[0] as number) ^ (args[1] as number);
    },
  });

  builtins.set('bitNot', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('bitNot() takes 1 argument', line);
      return ~(args[0] as number);
    },
  });

  builtins.set('bitShiftLeft', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('bitShiftLeft() takes 2 arguments', line);
      return (args[0] as number) << (args[1] as number);
    },
  });

  builtins.set('bitShiftRight', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('bitShiftRight() takes 2 arguments', line);
      return (args[0] as number) >> (args[1] as number);
    },
  });

  // ============= Base64 =============

  builtins.set('base64encode', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('base64encode() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      return btoa(args[0]);
    },
  });

  builtins.set('base64decode', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('base64decode() takes 1 argument', line);
      if (typeof args[0] !== 'string') throw new SdevError('Argument must be text', line);
      try { return atob(args[0]); }
      catch { throw new SdevError('Invalid base64 string', line); }
    },
  });

  // ============= Hash =============

  builtins.set('hash', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('hash() takes 1 argument', line);
      const str = stringify(args[0]);
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h = ((h << 5) - h) + ch;
        h |= 0; // Convert to 32bit integer
      }
      return h;
    },
  });

  // ============= Time Formatting =============

  // time() - current time as tome
  builtins.set('time', {
    type: 'builtin',
    call: () => {
      const d = new Date();
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        hour: d.getHours(),
        minute: d.getMinutes(),
        second: d.getSeconds(),
        ms: d.getMilliseconds(),
        timestamp: d.getTime(),
        iso: d.toISOString(),
      };
    },
  });

  // formatTime(ms, format?) - format milliseconds
  builtins.set('formatTime', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('formatTime() takes at least 1 argument', line);
      if (typeof args[0] !== 'number') throw new SdevError('First argument must be a number (ms)', line);
      const d = new Date(args[0]);
      return d.toISOString();
    },
  });

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

  // ============= Buffer / Byte Array =============

  // buffer(size) - create a byte buffer
  builtins.set('buffer', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('buffer() takes 1 argument (size)', line);
      if (typeof args[0] !== 'number') throw new SdevError('Argument must be a number', line);
      const size = Math.trunc(args[0]);
      const data = new Uint8Array(size);
      const obj: Record<string, unknown> = {};
      obj._type = 'buffer';
      obj._data = data;
      obj.size = { type: 'builtin', call: () => size } as SdevFunction;
      obj.get = { type: 'builtin', call: (a: unknown[], l: number) => {
        const i = a[0] as number;
        if (i < 0 || i >= size) throw new SdevError('Buffer index out of bounds', l);
        return data[i];
      } } as SdevFunction;
      obj.set = { type: 'builtin', call: (a: unknown[], l: number) => {
        const i = a[0] as number;
        const v = a[1] as number;
        if (i < 0 || i >= size) throw new SdevError('Buffer index out of bounds', l);
        data[i] = v & 0xFF;
        return null;
      } } as SdevFunction;
      obj.fill = { type: 'builtin', call: (a: unknown[]) => { data.fill(a[0] as number & 0xFF); return null; } } as SdevFunction;
      obj.slice = { type: 'builtin', call: (a: unknown[]) => {
        const start = (a[0] as number) || 0;
        const end = (a[1] as number) || size;
        return Array.from(data.slice(start, end));
      } } as SdevFunction;
      obj.toList = { type: 'builtin', call: () => Array.from(data) } as SdevFunction;
      obj.toText = { type: 'builtin', call: () => new TextDecoder().decode(data) } as SdevFunction;
      obj.fromString = { type: 'builtin', call: (a: unknown[]) => {
        const bytes = new TextEncoder().encode(a[0] as string);
        data.set(bytes.slice(0, size));
        return null;
      } } as SdevFunction;
      obj.copyTo = { type: 'builtin', call: (a: unknown[], l: number) => {
        const target = a[0] as Record<string, unknown>;
        if (!target || target._type !== 'buffer') throw new SdevError('Target must be a buffer', l);
        (target._data as Uint8Array).set(data.slice(0, (target._data as Uint8Array).length));
        return null;
      } } as SdevFunction;
      return obj;
    },
  });

  // ============= Pointer-like References =============

  // pointer(buffer, offset) - create a reference to a buffer position
  builtins.set('pointer', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('pointer() takes 2 arguments (buffer, offset)', line);
      const buf = args[0] as Record<string, unknown>;
      if (!buf || buf._type !== 'buffer') throw new SdevError('First argument must be a buffer', line);
      const offset = args[1] as number;
      const data = buf._data as Uint8Array;
      const obj: Record<string, unknown> = {};
      obj._type = 'pointer';
      obj.offset = offset;
      obj.read = { type: 'builtin', call: () => data[offset] ?? 0 } as SdevFunction;
      obj.write = { type: 'builtin', call: (a: unknown[]) => { data[offset] = (a[0] as number) & 0xFF; return null; } } as SdevFunction;
      obj.advance = { type: 'builtin', call: (a: unknown[]) => {
        const newOffset = offset + (a.length > 0 ? (a[0] as number) : 1);
        return (builtins.get('pointer') as SdevFunction).call([buf, newOffset], line);
      } } as SdevFunction;
      obj.readU16 = { type: 'builtin', call: () => data[offset] | (data[offset + 1] << 8) } as SdevFunction;
      obj.readU32 = { type: 'builtin', call: () => data[offset] | (data[offset+1]<<8) | (data[offset+2]<<16) | (data[offset+3]<<24) } as SdevFunction;
      obj.writeU16 = { type: 'builtin', call: (a: unknown[]) => { const v = a[0] as number; data[offset]=v&0xFF; data[offset+1]=(v>>8)&0xFF; return null; } } as SdevFunction;
      obj.writeU32 = { type: 'builtin', call: (a: unknown[]) => { const v = a[0] as number; data[offset]=v&0xFF; data[offset+1]=(v>>8)&0xFF; data[offset+2]=(v>>16)&0xFF; data[offset+3]=(v>>24)&0xFF; return null; } } as SdevFunction;
      return obj;
    },
  });

  // ============= Misc Missing =============

  // keys(tome) - alias for inscriptions
  builtins.set('keys', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('keys() takes 1 argument', line);
      if (!args[0] || typeof args[0] !== 'object' || Array.isArray(args[0])) throw new SdevError('Argument must be a tome', line);
      return Object.keys(args[0] as Record<string, unknown>);
    },
  });

  // values(tome) - alias for contents
  builtins.set('values', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('values() takes 1 argument', line);
      if (!args[0] || typeof args[0] !== 'object' || Array.isArray(args[0])) throw new SdevError('Argument must be a tome', line);
      return Object.values(args[0] as Record<string, unknown>);
    },
  });

  // freeze(obj) - make object immutable (shallow)
  builtins.set('freeze', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('freeze() takes 1 argument', line);
      if (args[0] && typeof args[0] === 'object') Object.freeze(args[0]);
      return args[0];
    },
  });

  // isFrozen(obj)
  builtins.set('isFrozen', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('isFrozen() takes 1 argument', line);
      if (args[0] && typeof args[0] === 'object') return Object.isFrozen(args[0]);
      return true;
    },
  });

  // groupBy(list, fn) - group list elements by function result
  builtins.set('groupBy', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('groupBy() takes 2 arguments', line);
      if (!Array.isArray(args[0])) throw new SdevError('First argument must be a list', line);
      const fn = args[1] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('Second argument must be a function', line);
      const groups: Record<string, unknown[]> = {};
      for (const item of args[0]) {
        const key = String(fn.call([item], line));
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
      return groups;
    },
  });

  // chunk(list, size) - split list into chunks
  builtins.set('chunk', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('chunk() takes 2 arguments (list, size)', line);
      if (!Array.isArray(args[0])) throw new SdevError('First argument must be a list', line);
      if (typeof args[1] !== 'number' || args[1] <= 0) throw new SdevError('Second argument must be a positive number', line);
      const result: unknown[][] = [];
      const size = Math.floor(args[1]);
      for (let i = 0; i < args[0].length; i += size) {
        result.push(args[0].slice(i, i + size));
      }
      return result;
    },
  });

  // debounce - not useful in sync context, but included for API completeness
  // tap(value, fn) - execute fn with value, return value (for debugging)
  builtins.set('tap', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('tap() takes 2 arguments (value, fn)', line);
      const fn = args[1] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('Second argument must be a function', line);
      fn.call([args[0]], line);
      return args[0];
    },
  });

  // repeat(fn, n) - call function n times, return list of results
  builtins.set('times', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('times() takes 2 arguments (count, fn)', line);
      if (typeof args[0] !== 'number') throw new SdevError('First argument must be a number', line);
      const fn = args[1] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('Second argument must be a function', line);
      const results: unknown[] = [];
      for (let i = 0; i < Math.floor(args[0]); i++) {
        results.push(fn.call([i], line));
      }
      return results;
    },
  });

  // Vec2(x, y) - 2D vector
  builtins.set('Vec2', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('Vec2() takes 2 arguments (x, y)', line);
      const x = args[0] as number;
      const y = args[1] as number;
      const vec: Record<string, unknown> = { x, y };

      const makeVecMethod = (fn: (a: typeof vec, ...rest: unknown[]) => unknown): SdevFunction => ({
        type: 'builtin',
        call: (margs: unknown[]) => fn(vec, ...margs),
      });

      vec.add = makeVecMethod((self, other) => {
        const o = other as Record<string, number>;
        return buildVec(self.x as number + o.x, self.y as number + o.y);
      });
      vec.sub = makeVecMethod((self, other) => {
        const o = other as Record<string, number>;
        return buildVec(self.x as number - o.x, self.y as number - o.y);
      });
      vec.mul = makeVecMethod((self, scalar) => buildVec(self.x as number * (scalar as number), self.y as number * (scalar as number)));
      vec.mag = makeVecMethod((self) => Math.sqrt((self.x as number) ** 2 + (self.y as number) ** 2));
      vec.normalize = makeVecMethod((self) => {
        const m = Math.sqrt((self.x as number) ** 2 + (self.y as number) ** 2);
        return m === 0 ? buildVec(0, 0) : buildVec(self.x as number / m, self.y as number / m);
      });
      vec.dot = makeVecMethod((self, other) => {
        const o = other as Record<string, number>;
        return (self.x as number) * o.x + (self.y as number) * o.y;
      });
      vec.distance = makeVecMethod((self, other) => {
        const o = other as Record<string, number>;
        return Math.sqrt((self.x as number - o.x) ** 2 + (self.y as number - o.y) ** 2);
      });
      return vec;
    },
  });

  function buildVec(x: number, y: number): Record<string, unknown> {
    const vec: Record<string, unknown> = { x, y };
    const makeMethod = (fn: (self: typeof vec, ...rest: unknown[]) => unknown): SdevFunction => ({
      type: 'builtin',
      call: (args: unknown[]) => fn(vec, ...args),
    });
    vec.add = makeMethod((s, o) => buildVec(s.x as number + (o as Record<string,number>).x, s.y as number + (o as Record<string,number>).y));
    vec.sub = makeMethod((s, o) => buildVec(s.x as number - (o as Record<string,number>).x, s.y as number - (o as Record<string,number>).y));
    vec.mul = makeMethod((s, sc) => buildVec(s.x as number * (sc as number), s.y as number * (sc as number)));
    vec.mag = makeMethod((s) => Math.sqrt((s.x as number)**2 + (s.y as number)**2));
    vec.normalize = makeMethod((s) => { const m = Math.sqrt((s.x as number)**2+(s.y as number)**2); return m===0?buildVec(0,0):buildVec(s.x as number/m,s.y as number/m); });
    vec.dot = makeMethod((s, o) => (s.x as number)*(o as Record<string,number>).x + (s.y as number)*(o as Record<string,number>).y);
    vec.distance = makeMethod((s, o) => Math.sqrt((s.x as number-(o as Record<string,number>).x)**2+(s.y as number-(o as Record<string,number>).y)**2));
    return vec;
  }

  // Set() - set data structure
  builtins.set('Set', {
    type: 'builtin',
    call: () => {
      const data = new Set<string>();
      const obj: Record<string, unknown> = {};
      const update = () => {
        obj._data = Array.from(data).map(x => JSON.parse(x));
      };
      obj.add = { type: 'builtin', call: (args: unknown[]) => { data.add(JSON.stringify(args[0])); update(); return null; } } as SdevFunction;
      obj.remove = { type: 'builtin', call: (args: unknown[]) => { data.delete(JSON.stringify(args[0])); update(); return null; } } as SdevFunction;
      obj.has = { type: 'builtin', call: (args: unknown[]) => data.has(JSON.stringify(args[0])) } as SdevFunction;
      obj.size = { type: 'builtin', call: () => data.size } as SdevFunction;
      obj.values = { type: 'builtin', call: () => Array.from(data).map(x => JSON.parse(x)) } as SdevFunction;
      obj.clear = { type: 'builtin', call: () => { data.clear(); update(); return null; } } as SdevFunction;
      obj.isEmpty = { type: 'builtin', call: () => data.size === 0 } as SdevFunction;
      return obj;
    },
  });

  // Map() - map data structure
  builtins.set('Map', {
    type: 'builtin',
    call: () => {
      const data = new Map<string, unknown>();
      const obj: Record<string, unknown> = {};
      obj.set = { type: 'builtin', call: (args: unknown[]) => { data.set(String(args[0]), args[1]); return null; } } as SdevFunction;
      obj.get = { type: 'builtin', call: (args: unknown[]) => data.get(String(args[0])) ?? null } as SdevFunction;
      obj.has = { type: 'builtin', call: (args: unknown[]) => data.has(String(args[0])) } as SdevFunction;
      obj.delete = { type: 'builtin', call: (args: unknown[]) => { data.delete(String(args[0])); return null; } } as SdevFunction;
      obj.keys = { type: 'builtin', call: () => Array.from(data.keys()) } as SdevFunction;
      obj.values = { type: 'builtin', call: () => Array.from(data.values()) } as SdevFunction;
      obj.entries = { type: 'builtin', call: () => Array.from(data.entries()).map(([k, v]) => [k, v]) } as SdevFunction;
      obj.size = { type: 'builtin', call: () => data.size } as SdevFunction;
      obj.isEmpty = { type: 'builtin', call: () => data.size === 0 } as SdevFunction;
      obj.clear = { type: 'builtin', call: () => { data.clear(); return null; } } as SdevFunction;
      return obj;
    },
  });

  // Queue() - FIFO queue
  builtins.set('Queue', {
    type: 'builtin',
    call: () => {
      const data: unknown[] = [];
      const obj: Record<string, unknown> = {};
      obj.enqueue = { type: 'builtin', call: (args: unknown[]) => { data.push(args[0]); return null; } } as SdevFunction;
      obj.dequeue = { type: 'builtin', call: (_args: unknown[], line: number) => { if (data.length === 0) throw new SdevError('Queue is empty', line); return data.shift(); } } as SdevFunction;
      obj.peek = { type: 'builtin', call: () => data[0] ?? null } as SdevFunction;
      obj.size = { type: 'builtin', call: () => data.length } as SdevFunction;
      obj.isEmpty = { type: 'builtin', call: () => data.length === 0 } as SdevFunction;
      obj.clear = { type: 'builtin', call: () => { data.length = 0; return null; } } as SdevFunction;
      obj.toList = { type: 'builtin', call: () => [...data] } as SdevFunction;
      return obj;
    },
  });

  // Stack() - LIFO stack
  builtins.set('Stack', {
    type: 'builtin',
    call: () => {
      const data: unknown[] = [];
      const obj: Record<string, unknown> = {};
      obj.push = { type: 'builtin', call: (args: unknown[]) => { data.push(args[0]); return null; } } as SdevFunction;
      obj.pop = { type: 'builtin', call: (_args: unknown[], line: number) => { if (data.length === 0) throw new SdevError('Stack is empty', line); return data.pop(); } } as SdevFunction;
      obj.peek = { type: 'builtin', call: () => data[data.length - 1] ?? null } as SdevFunction;
      obj.size = { type: 'builtin', call: () => data.length } as SdevFunction;
      obj.isEmpty = { type: 'builtin', call: () => data.length === 0 } as SdevFunction;
      obj.clear = { type: 'builtin', call: () => { data.length = 0; return null; } } as SdevFunction;
      obj.toList = { type: 'builtin', call: () => [...data] } as SdevFunction;
      return obj;
    },
  });

  // LinkedList() - doubly linked list
  builtins.set('LinkedList', {
    type: 'builtin',
    call: () => {
      const data: unknown[] = [];
      const obj: Record<string, unknown> = {};
      obj.append = { type: 'builtin', call: (args: unknown[]) => { data.push(args[0]); return null; } } as SdevFunction;
      obj.prepend = { type: 'builtin', call: (args: unknown[]) => { data.unshift(args[0]); return null; } } as SdevFunction;
      obj.get = { type: 'builtin', call: (args: unknown[], line: number) => {
        const idx = args[0] as number;
        const ri = idx < 0 ? data.length + idx : idx;
        if (ri < 0 || ri >= data.length) throw new SdevError('Index out of bounds', line);
        return data[ri];
      } } as SdevFunction;
      obj.remove = { type: 'builtin', call: (args: unknown[]) => {
        const idx = data.findIndex(x => JSON.stringify(x) === JSON.stringify(args[0]));
        if (idx !== -1) data.splice(idx, 1);
        return null;
      } } as SdevFunction;
      obj.size = { type: 'builtin', call: () => data.length } as SdevFunction;
      obj.isEmpty = { type: 'builtin', call: () => data.length === 0 } as SdevFunction;
      obj.head = { type: 'builtin', call: (_args: unknown[], line: number) => {
        if (data.length === 0) throw new SdevError('LinkedList is empty', line);
        return data[0];
      } } as SdevFunction;
      obj.tail = { type: 'builtin', call: (_args: unknown[], line: number) => {
        if (data.length === 0) throw new SdevError('LinkedList is empty', line);
        return data[data.length - 1];
      } } as SdevFunction;
      obj.toList = { type: 'builtin', call: () => [...data] } as SdevFunction;
      obj.clear = { type: 'builtin', call: () => { data.length = 0; return null; } } as SdevFunction;
      return obj;
    },
  });

  // Convenience aliases
  builtins.set('appendFile', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('appendFile() takes 2 arguments', line);
      output(`📝 Appended to ${args[0]}: ${stringify(args[1])}`);
      return true;
    },
  });

  builtins.set('fileExists', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('fileExists() takes 1 argument', line);
      return false; // browser: always false for real files
    },
  });

  builtins.set('deleteFile', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('deleteFile() takes 1 argument', line);
      return false;
    },
  });

  builtins.set('listDir', {
    type: 'builtin',
    call: () => [],
  });

  // spawn (run function, synchronous in browser)
  builtins.set('spawn', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const fn = args[0] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('spawn() requires a function', line);
      fn.call([], line);
      return null;
    },
  });

  // min/max aliases
  builtins.set('min', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length === 0) throw new SdevError('min() takes at least 1 argument', line);
      if (args.length === 1 && Array.isArray(args[0])) return Math.min(...(args[0] as number[]));
      return Math.min(...(args as number[]));
    },
  });

  builtins.set('max', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length === 0) throw new SdevError('max() takes at least 1 argument', line);
      if (args.length === 1 && Array.isArray(args[0])) return Math.max(...(args[0] as number[]));
      return Math.max(...(args as number[]));
    },
  });

  // abs alias
  builtins.set('abs', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('abs() takes 1 argument', line);
      return Math.abs(args[0] as number);
    },
  });

  // floor/ceil/round aliases
  builtins.set('floor', { type: 'builtin', call: (args: unknown[]) => Math.floor(args[0] as number) });
  builtins.set('ceil', { type: 'builtin', call: (args: unknown[]) => Math.ceil(args[0] as number) });
  builtins.set('round', { type: 'builtin', call: (args: unknown[]) => Math.round(args[0] as number) });
  builtins.set('sqrt', { type: 'builtin', call: (args: unknown[]) => Math.sqrt(args[0] as number) });

  // str alias for morph to text
  builtins.set('str', {
    type: 'builtin',
    call: (args: unknown[]) => stringify(args[0]),
  });

  // int / num aliases
  builtins.set('int', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('int() takes 1 argument', line);
      const n = typeof args[0] === 'string' ? parseInt(args[0]) : Number(args[0]);
      if (isNaN(n)) throw new SdevError(`Cannot convert to integer: ${stringify(args[0])}`, line);
      return Math.trunc(n);
    },
  });

  builtins.set('num', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('num() takes 1 argument', line);
      const n = Number(args[0]);
      if (isNaN(n)) throw new SdevError(`Cannot convert to number: ${stringify(args[0])}`, line);
      return n;
    },
  });

  // __tryCatch(tryFn, catchFn) - used by compiler for attempt/rescue
  builtins.set('__tryCatch', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const tryFn = args[0] as SdevFunction;
      const catchFn = args[1] as SdevFunction;
      if (!tryFn || !catchFn) throw new SdevError('__tryCatch requires 2 function arguments', line);
      try {
        return tryFn.call([], line);
      } catch (e) {
        const msg = e instanceof SdevError ? e.message : String(e);
        return catchFn.call([msg], line);
      }
    },
  });

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

  return builtins;

}



/**
 * Hook installed by the interpreter so that user objects implementing the
 * `on_text` / `__str__` protocol control their own textual form.
 * Returns undefined when the value has no such protocol.
 */
let objectTextHook: ((value: unknown) => string | undefined) | null = null;
export function setObjectTextHook(hook: ((value: unknown) => string | undefined) | null): void {
  objectTextHook = hook;
}

export function stringify(value: unknown): string {
  if (value === null) return 'void';
  if (typeof value === 'boolean') return value ? 'yep' : 'nope';
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && (value as { __error__?: boolean }).__error__) {
    // Python's `str(exception)` yields just the message.
    return String((value as { message?: unknown }).message ?? '');
  }
  if (value && typeof value === 'object' && objectTextHook) {
    const custom = objectTextHook(value);
    if (custom !== undefined) return custom;
  }
  if (typeof value === 'number') {
    if (value === Infinity) return 'inf';
    if (value === -Infinity) return '-inf';
    return String(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stringify).join(', ') + ']';
  }
  if (typeof value === 'object') {
    if ((value as { type?: string }).type === 'builtin' || 
        (value as { type?: string }).type === 'user' ||
        (value as { type?: string }).type === 'lambda' ||
        (value as { type?: string }).type === 'class') {
      return '<conjuration>';
    }
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([k]) => !['add','sub','mul','mag','normalize','dot','distance',
                          'enqueue','dequeue','push','pop','peek','size','isEmpty',
                          'clear','values','keys','entries','get','set','has','delete',
                          'remove','append','prepend','toList','_data'].includes(k))
      .map(([k, v]) => `${k}: ${stringify(v)}`)
      .join(', ');
    return ':: ' + entries + ' ;;';
  }
  return String(value);
}

export function isTruthy(value: unknown): boolean {
  if (value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function toNumber(value: unknown, line: number): number {
  if (typeof value === 'number') return value;
  throw new SdevError(`Expected number, got ${typeof value}`, line);
}

