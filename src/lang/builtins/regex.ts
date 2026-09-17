import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerRegex(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

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
}
