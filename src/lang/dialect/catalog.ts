/**
 * Canonical sdev v2 surface catalog.
 *
 * Every word a dialect may rename lives here exactly once. The Dialect Studio
 * renders this list; the canonicalizer maps dialect words back onto these
 * canonical words before the untouched self-hosted compiler sees the source.
 */

export type CatalogGroup =
  | 'core'
  | 'control'
  | 'functions'
  | 'errors'
  | 'objects'
  | 'modules'
  | 'literals'
  | 'operators'
  | 'builtins';

export interface CatalogEntry {
  /** canonical sdev v2 spelling — never changes */
  word: string;
  group: CatalogGroup;
  about: string;
  /** builtins are callable names, keywords are reserved words */
  kind: 'keyword' | 'builtin';
}

export const CATALOG: CatalogEntry[] = [
  // ---- core ---------------------------------------------------------
  { word: 'say', group: 'core', kind: 'keyword', about: 'print a value' },
  { word: 'ask', group: 'core', kind: 'keyword', about: 'read a line of input' },
  { word: 'set', group: 'core', kind: 'keyword', about: 'declare or reassign a variable' },
  { word: 'to', group: 'core', kind: 'keyword', about: 'target of a set / start of a function' },

  // ---- control flow -------------------------------------------------
  { word: 'if', group: 'control', kind: 'keyword', about: 'conditional block' },
  { word: 'else', group: 'control', kind: 'keyword', about: 'alternative branch' },
  { word: 'end', group: 'control', kind: 'keyword', about: 'close a block' },
  { word: 'for', group: 'control', kind: 'keyword', about: 'start of a loop' },
  { word: 'each', group: 'control', kind: 'keyword', about: 'loop over every item' },
  { word: 'in', group: 'control', kind: 'keyword', about: 'the sequence a loop walks' },
  { word: 'while', group: 'control', kind: 'keyword', about: 'loop while a condition holds' },
  { word: 'break', group: 'control', kind: 'keyword', about: 'leave the loop' },
  { word: 'continue', group: 'control', kind: 'keyword', about: 'skip to the next iteration' },
  { word: 'match', group: 'control', kind: 'keyword', about: 'structural match' },

  // ---- functions ----------------------------------------------------
  { word: 'with', group: 'functions', kind: 'keyword', about: 'parameter / argument list' },
  { word: 'return', group: 'functions', kind: 'keyword', about: 'return a value' },
  { word: 'make', group: 'functions', kind: 'keyword', about: 'lambda literal' },
  { word: 'capture', group: 'functions', kind: 'keyword', about: 'closure capture list' },
  { word: 'ref', group: 'functions', kind: 'keyword', about: 'take a function as a value' },
  { word: 'call', group: 'functions', kind: 'keyword', about: 'call a function value' },

  // ---- errors -------------------------------------------------------
  { word: 'attempt', group: 'errors', kind: 'keyword', about: 'guarded block' },
  { word: 'rescue', group: 'errors', kind: 'keyword', about: 'handle a raised error' },
  { word: 'throw', group: 'errors', kind: 'keyword', about: 'raise an error' },

  // ---- objects ------------------------------------------------------
  { word: 'kind', group: 'objects', kind: 'keyword', about: 'define a kind (class)' },
  { word: 'has', group: 'objects', kind: 'keyword', about: 'declare a field' },
  { word: 'does', group: 'objects', kind: 'keyword', about: 'declare a method' },
  { word: 'new', group: 'objects', kind: 'keyword', about: 'instantiate a kind' },
  { word: 'self', group: 'objects', kind: 'keyword', about: 'the receiver inside a method' },
  { word: 'extends', group: 'objects', kind: 'keyword', about: 'inherit from another kind' },
  { word: 'super', group: 'objects', kind: 'keyword', about: 'parent-kind dispatch' },

  // ---- modules ------------------------------------------------------
  { word: 'use', group: 'modules', kind: 'keyword', about: 'import a module or library' },

  // ---- literals -----------------------------------------------------
  { word: 'true', group: 'literals', kind: 'keyword', about: 'boolean true' },
  { word: 'false', group: 'literals', kind: 'keyword', about: 'boolean false' },
  { word: 'nothing', group: 'literals', kind: 'keyword', about: 'the empty value' },

  // ---- word operators -----------------------------------------------
  { word: 'is', group: 'operators', kind: 'keyword', about: 'equality comparison' },
  { word: 'not', group: 'operators', kind: 'keyword', about: 'logical negation' },
  { word: 'and', group: 'operators', kind: 'keyword', about: 'logical and' },
  { word: 'or', group: 'operators', kind: 'keyword', about: 'logical or' },
  { word: 'more', group: 'operators', kind: 'keyword', about: '"or more" — greater or equal' },
  { word: 'less', group: 'operators', kind: 'keyword', about: '"or less" — less or equal' },

  // ---- builtins -----------------------------------------------------
  ...([
    ['range', 'numbers from 0 up to n'],
    ['len', 'length of a list, tome or text'],
    ['sum', 'add every number in a list'],
    ['str', 'value as text'],
    ['text', 'value as text'],
    ['num', 'text as a number'],
    ['ord', 'character to byte value'],
    ['chr', 'byte value to character'],
    ['upper', 'uppercase text'],
    ['lower', 'lowercase text'],
    ['trim', 'strip surrounding spaces'],
    ['split', 'split text into a list'],
    ['join', 'join a list into text'],
    ['find', 'position of a needle'],
    ['replace', 'replace every occurrence'],
    ['abs', 'absolute value'],
    ['min', 'smaller of two numbers'],
    ['max', 'larger of two numbers'],
    ['floor', 'round down'],
    ['ceil', 'round up'],
    ['sqrt', 'square root'],
    ['pow', 'raise to a power'],
    ['random', 'deterministic pseudo-random number'],
    ['keys', 'keys of a tome'],
    ['values', 'values of a tome'],
    ['read_file', 'read a file as text'],
    ['write_file', 'write text to a file'],
    ['append_file', 'append text to a file'],
    ['file_exists', 'does a path exist'],
    ['input', 'read a line from stdin'],
    ['args', 'command line arguments'],
    ['env', 'environment variable'],
    ['exit', 'stop with a status code'],
    ['now_ms', 'milliseconds since the epoch'],
    ['sleep_ms', 'pause execution'],
    ['say_err', 'print to standard error'],
  ] as const).map(([word, about]): CatalogEntry => ({ word, about, group: 'builtins', kind: 'builtin' })),
];

export const CATALOG_WORDS: string[] = CATALOG.map((e) => e.word);

export const CATALOG_BY_WORD: Record<string, CatalogEntry> = Object.fromEntries(
  CATALOG.map((e) => [e.word, e]),
);

export const GROUP_LABELS: Record<CatalogGroup, string> = {
  core: 'Core',
  control: 'Control flow',
  functions: 'Functions',
  errors: 'Errors',
  objects: 'Kinds & objects',
  modules: 'Modules',
  literals: 'Literals',
  operators: 'Word operators',
  builtins: 'Builtins',
};
