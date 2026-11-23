import { SdevFunction } from './utils';
import { SdevError } from '../core/errors';
import { lazyModuleRunner } from '../runtime/sdev-module';
import SDEV_TEXT_SRC from '../../../lang/stdlib/v2/text.sdev?raw';
import SDEV_REGEX_SRC from '../../../lang/stdlib/v2/regex.sdev?raw';
import { regexProblem } from './regex-guard';

function guard(text: string, pattern: string, line: number) {
  const p = regexProblem(pattern, text);
  if (p) throw new SdevError(p, line);
}

const getRegexRunner = lazyModuleRunner(SDEV_TEXT_SRC, SDEV_REGEX_SRC);

function usesHostOnlyRegex(pat: string): boolean {
  return /[()|{}]/.test(pat) || /\\[pPDWSbB1-9]/.test(pat);
}

export function registerRegex(builtins: Map<string, SdevFunction>): void {
  // match(text, pattern) - regex match, returns list of match or null
  builtins.set('match', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('match() takes 2 arguments (text, pattern)', line);
      if (typeof args[0] !== 'string' || typeof args[1] !== 'string') throw new SdevError('Arguments must be text', line);
      guard(args[0], args[1], line);
      if (!usesHostOnlyRegex(args[1])) {
        const hit = getRegexRunner().callStr('re_search', args[1], args[0]);
        if (hit) return [hit];
        return getRegexRunner().call('re_test', args[1], args[0]) === 1 ? [''] : null;
      }
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
      guard(args[0], args[1], line);
      if (!usesHostOnlyRegex(args[1])) {
        const hits = getRegexRunner().call('re_find_all', args[1], args[0]) as string[];
        return hits.map((h) => [h]);
      }
      const matches = Array.from(args[0].matchAll(new RegExp(args[1], 'g')));
      return matches.map((m) => Array.from(m));
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
      guard(args[0], args[1], line);
      if (!usesHostOnlyRegex(args[1])) {
        return getRegexRunner().callStr('re_replace_all', args[0], args[1], args[2]);
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
      guard(args[0], args[1], line);
      if (!usesHostOnlyRegex(args[1])) {
        return getRegexRunner().call('re_test', args[1], args[0]) === 1;
      }
      return new RegExp(args[1]).test(args[0]);
    },
  });
}
