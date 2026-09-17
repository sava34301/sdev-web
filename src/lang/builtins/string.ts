import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerString(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

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
}
