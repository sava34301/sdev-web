/**
 * The agent's built-in vocabulary.
 *
 * This is what lets somebody write `output`, `out`, `terminal`, `echo`,
 * `печатай` or `打印` and still mean `say`. It is deliberately generous:
 * the agent only ever rewrites into canonical sdev, so a wrong guess is
 * visible in the canonical source the user can inspect.
 */

export type Intent =
  | 'say'
  | 'ask'
  | 'set'
  | 'if'
  | 'else'
  | 'end'
  | 'while'
  | 'for'
  | 'in'
  | 'return'
  | 'function'
  | 'break'
  | 'continue'
  | 'true'
  | 'false'
  | 'nothing'
  | 'and'
  | 'or'
  | 'not';

/** intent -> every spelling the agent recognises out of the box */
export const VOCABULARY: Record<Intent, string[]> = {
  say: [
    'say', 'print', 'output', 'out', 'echo', 'show', 'display', 'write', 'log',
    'puts', 'println', 'printf', 'terminal', 'console', 'speak', 'shout',
    'whisper', 'tell', 'emitln', 'печатай', 'изведи', 'кажи', 'imprimir',
    'afficher', 'ausgeben', 'печать', '打印', '輸出', 'вывод',
  ],
  ask: ['ask', 'input', 'read', 'prompt', 'readline', 'gets', 'scan', 'въведи'],
  set: [
    'set', 'let', 'var', 'make', 'define', 'assign', 'forge', 'create',
    'declare', 'const', 'dim', 'нека', 'задай',
  ],
  if: ['if', 'when', 'whenever', 'ponder', 'should', 'ако', 'si', 'wenn'],
  else: ['else', 'otherwise', 'elsewise', 'orelse', 'иначе'],
  end: ['end', 'endif', 'done', 'fi', 'esac', 'endwhile', 'endfor', 'край'],
  while: ['while', 'until', 'cycle', 'repeat', 'loopwhile', 'докато'],
  for: ['for', 'foreach', 'iterate', 'each', 'loop', 'walk', 'за'],
  in: ['in', 'through', 'of', 'over', 'from', 'в'],
  return: ['return', 'yield', 'give', 'giveback', 'result', 'върни'],
  function: ['to', 'func', 'function', 'def', 'fn', 'conjure', 'procedure', 'sub', 'method'],
  break: ['break', 'stop', 'leave', 'exitloop', 'yeet'],
  continue: ['continue', 'next', 'skip'],
  true: ['true', 'yes', 'yep', 'on', 'да'],
  false: ['false', 'no', 'nope', 'off', 'не'],
  nothing: ['nothing', 'none', 'null', 'nil', 'void', 'undefined', 'empty'],
  and: ['and', 'also', 'plusalso'],
  or: ['or', 'either'],
  not: ['not', 'isnt', 'negate'],
};

/** canonical word emitted for each intent */
export const CANONICAL: Record<Intent, string> = {
  say: 'say',
  ask: 'ask',
  set: 'set',
  if: 'if',
  else: 'else',
  end: 'end',
  while: 'while',
  for: 'for',
  in: 'in',
  return: 'return',
  function: 'to',
  break: 'break',
  continue: 'continue',
  true: 'true',
  false: 'false',
  nothing: 'nothing',
  and: 'and',
  or: 'or',
  not: 'not',
};

export function baseWordMap(): Map<string, Intent> {
  const map = new Map<string, Intent>();
  for (const [intent, words] of Object.entries(VOCABULARY) as [Intent, string[]][]) {
    for (const w of words) map.set(w.toLowerCase(), intent);
  }
  return map;
}

/** Multi-word assignment phrases: `x will be 3`, `x becomes 3`, `x gets 3`. */
export const ASSIGN_PHRASES: string[] = [
  'will be', 'shall be', 'is set to', 'is now', 'should be', 'becomes',
  'gets', 'equals', 'holds', 'to be', 'be', 'is', '=', ':=', '<-', 'е',
];

/** English number words the agent understands as literals. */
export const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
  million: 1000000,
};

/** Comparison phrases -> canonical sdev comparison. */
export const COMPARISONS: [RegExp, string][] = [
  [/\bis\s+greater\s+than\s+or\s+equal\s+to\b/gi, ' is or more '],
  [/\bis\s+less\s+than\s+or\s+equal\s+to\b/gi, ' is or less '],
  [/\b(?:is\s+)?(?:greater|bigger|larger|more)\s+than\b/gi, ' > '],
  [/\b(?:is\s+)?(?:less|smaller|fewer)\s+than\b/gi, ' < '],
  [/\bat\s+least\b/gi, ' is or more '],
  [/\bat\s+most\b/gi, ' is or less '],
  [/\b(?:is\s+)?(?:equal\s+to|the\s+same\s+as)\b/gi, ' is '],
  [/\b(?:is\s+)?(?:not\s+equal\s+to|different\s+from)\b/gi, ' is not '],
  [/\bor\s+more\b/gi, ' or more '],
  [/\bor\s+less\b/gi, ' or less '],
];
