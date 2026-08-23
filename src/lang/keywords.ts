// ============================================================
// sdev dual-name keyword table
// ------------------------------------------------------------
// Every keyword in sdev has TWO spellings that lex to the exact
// same token:
//
//   * the v1 "mystical" flavour  (forge, conjure, ponder, ...)
//   * the v2 "plain" flavour     (let,   fn,      if,     ...)
//
// Both are permanently supported. New features must register in
// this one table so the v1 interpreter, the v2 self-hosted
// compiler and the parity agent all stay in sync.
// ============================================================

export interface KeywordSpec {
  /** Canonical token name (matches TokenType). */
  token: string;
  /** v1 mystical spelling. */
  mystic: string;
  /** v2 plain spelling. */
  plain: string;
  /** Extra accepted spellings (Python compatibility etc.). */
  aliases?: string[];
  /** Short human description used by docs + parity tooling. */
  about: string;
}

export const KEYWORD_SPECS: KeywordSpec[] = [
  // ---- declarations -------------------------------------------------
  { token: 'FORGE', mystic: 'forge', plain: 'let', aliases: ['var'], about: 'variable declaration' },
  { token: 'CONJURE', mystic: 'conjure', plain: 'fn', aliases: ['def'], about: 'function declaration' },
  { token: 'ESSENCE_KW', mystic: 'essence', plain: 'kind', aliases: ['class'], about: 'class declaration' },
  { token: 'EXTEND', mystic: 'extend', plain: 'extends', about: 'inheritance' },
  { token: 'BE', mystic: 'be', plain: 'be', about: 'assignment' },

  // ---- control flow -------------------------------------------------
  { token: 'PONDER', mystic: 'ponder', plain: 'if', about: 'conditional' },
  { token: 'OTHERWISE', mystic: 'otherwise', plain: 'else', about: 'alternative branch' },
  { token: 'ELIF', mystic: 'elsewise', plain: 'elif', about: 'else-if branch' },
  { token: 'CYCLE', mystic: 'cycle', plain: 'while', about: 'while loop' },
  { token: 'ITERATE', mystic: 'iterate', plain: 'for', about: 'for-each loop' },
  { token: 'THROUGH', mystic: 'through', plain: 'in', about: 'loop iterable separator / membership test' },
  { token: 'WITHIN', mystic: 'within', plain: 'foreach', about: 'for-in loop (legacy dialect)' },
  { token: 'YIELD', mystic: 'yield', plain: 'return', about: 'return from a function' },
  { token: 'YEET', mystic: 'yeet', plain: 'break', about: 'break out of a loop' },
  { token: 'SKIP', mystic: 'skip', plain: 'continue', about: 'continue the loop' },
  { token: 'PASS', mystic: 'idle', plain: 'pass', about: 'no-op statement' },

  // ---- generators ---------------------------------------------------
  { token: 'EMIT', mystic: 'exhale', plain: 'emit', about: 'yield a value from a generator' },
  { token: 'DELEGATE', mystic: 'channel', plain: 'delegate', about: 'yield from / delegate to a sub-iterator' },

  // ---- errors -------------------------------------------------------
  { token: 'ATTEMPT', mystic: 'attempt', plain: 'try', about: 'guarded block' },
  { token: 'RESCUE', mystic: 'rescue', plain: 'except', aliases: ['catch'], about: 'exception handler' },
  { token: 'FINALLY', mystic: 'ensure', plain: 'finally', about: 'always-run block' },
  { token: 'RAISE', mystic: 'hurl', plain: 'raise', aliases: ['throw'], about: 'raise an exception' },
  { token: 'ASSERT', mystic: 'insist', plain: 'assert', about: 'assertion' },

  // ---- context managers / scope -------------------------------------
  { token: 'WITH', mystic: 'weave', plain: 'with', about: 'context manager block' },
  { token: 'AS', mystic: 'bind', plain: 'as', about: 'binding name (with / import / except)' },
  { token: 'GLOBAL', mystic: 'worldly', plain: 'global', about: 'global scope declaration' },
  { token: 'NONLOCAL', mystic: 'outer', plain: 'nonlocal', about: 'enclosing scope declaration' },
  { token: 'DEL', mystic: 'banish', plain: 'del', about: 'delete a binding, item or attribute' },

  // ---- pattern matching ---------------------------------------------
  { token: 'MATCH', mystic: 'sift', plain: 'match', about: 'structural pattern match' },
  { token: 'CASE', mystic: 'omen', plain: 'case', about: 'a single match arm' },
  { token: 'WHEN', mystic: 'when', plain: 'when', aliases: ['guard'], about: 'pattern guard' },

  // ---- modules ------------------------------------------------------
  { token: 'SUMMON', mystic: 'summon', plain: 'import', aliases: ['use'], about: 'import a module' },
  { token: 'FROM', mystic: 'from', plain: 'from', about: 'source of an import / exception chain' },

  // ---- functions / values -------------------------------------------
  { token: 'LAMBDA', mystic: 'spell', plain: 'lambda', about: 'anonymous function' },
  { token: 'NEW', mystic: 'new', plain: 'new', about: 'instantiate a class' },
  { token: 'SELF', mystic: 'self', plain: 'self', about: 'receiver inside a method' },
  { token: 'SUPER', mystic: 'super', plain: 'super', about: 'parent-class dispatch' },
  { token: 'ASYNC', mystic: 'async', plain: 'async', about: 'asynchronous function modifier' },
  { token: 'AWAIT', mystic: 'await', plain: 'await', about: 'await an awaitable' },

  // ---- literals -----------------------------------------------------
  { token: 'YEP', mystic: 'yep', plain: 'true', about: 'boolean true' },
  { token: 'NOPE', mystic: 'nope', plain: 'false', about: 'boolean false' },
  { token: 'VOID', mystic: 'void', plain: 'none', aliases: ['null', 'nothing'], about: 'the empty value' },

  // ---- operators ----------------------------------------------------
  { token: 'ALSO', mystic: 'also', plain: 'and', about: 'logical and' },
  { token: 'EITHER', mystic: 'either', plain: 'or', about: 'logical or' },
  { token: 'ISNT', mystic: 'isnt', plain: 'not', about: 'logical not' },
  { token: 'EQUALS', mystic: 'equals', plain: 'eq', about: 'value equality' },
  { token: 'DIFFERS', mystic: 'differs', plain: 'ne', about: 'value inequality' },
  { token: 'IS', mystic: 'same', plain: 'is', about: 'identity comparison' },
];

/** word -> canonical token name, for every accepted spelling. */
export const KEYWORD_TOKEN_BY_WORD: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const spec of KEYWORD_SPECS) {
    map[spec.mystic] = spec.token;
    map[spec.plain] = spec.token;
    for (const alias of spec.aliases ?? []) map[alias] = spec.token;
  }
  return map;
})();

/** canonical token name -> every accepted spelling. */
export const WORDS_BY_TOKEN: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const spec of KEYWORD_SPECS) {
    map[spec.token] = [spec.mystic, spec.plain, ...(spec.aliases ?? [])];
  }
  return map;
})();
