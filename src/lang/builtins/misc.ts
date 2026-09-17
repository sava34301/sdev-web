import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerMisc(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

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
      if (typeof globalThis !== 'undefined' && typeof (globalThis as { prompt?: (text: string) => string | null }).prompt === 'function') {
        try {
          const result = (globalThis as { prompt?: (text: string) => string | null }).prompt(promptText);
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
        if ((val as { type?: string }).type === 'builtin' || (val as { type?: string }).type === 'user' || (val as { type?: string }).type === 'lambda') return 'conjuration';
        if ((val as { type?: string }).type === 'class') return 'class';
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
}
