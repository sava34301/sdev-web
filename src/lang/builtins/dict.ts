import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerDict(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

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
}
