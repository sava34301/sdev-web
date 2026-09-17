import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerMath(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

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
}
