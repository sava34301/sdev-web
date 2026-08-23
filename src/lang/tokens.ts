import { KEYWORD_TOKEN_BY_WORD } from './keywords';

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  FSTRING = 'FSTRING',     // f"...{expr}..." — value holds the raw template
  BYTES = 'BYTES',         // b"..."
  IDENTIFIER = 'IDENTIFIER',

  // Unique sdev Keywords
  FORGE = 'FORGE',         // variable declaration
  CONJURE = 'CONJURE',     // function
  PONDER = 'PONDER',       // if
  OTHERWISE = 'OTHERWISE', // else
  ELIF = 'ELIF',           // else if
  CYCLE = 'CYCLE',         // while
  ITERATE = 'ITERATE',     // for-each loop
  THROUGH = 'THROUGH',     // for-each keyword / membership operator
  WITHIN = 'WITHIN',       // for-in loop
  BE = 'BE',               // assignment operator
  YIELD = 'YIELD',         // return
  YEET = 'YEET',           // break
  SKIP = 'SKIP',           // continue
  PASS = 'PASS',           // no-op
  YEP = 'YEP',             // true
  NOPE = 'NOPE',           // false
  VOID = 'VOID',           // null
  SUMMON = 'SUMMON',       // import
  FROM = 'FROM',           // from
  ATTEMPT = 'ATTEMPT',     // try
  RESCUE = 'RESCUE',       // catch / except
  FINALLY = 'FINALLY',     // finally
  RAISE = 'RAISE',         // raise
  ASSERT = 'ASSERT',       // assert
  ESSENCE = 'ESSENCE',     // class (contextual, legacy)
  ESSENCE_KW = 'ESSENCE_KW', // class (kind / class spellings)
  EXTEND = 'EXTEND',       // extends
  NEW = 'NEW',             // new instance
  SELF = 'SELF',           // self reference
  SUPER = 'SUPER',         // super call
  ASYNC = 'ASYNC',         // async function modifier
  AWAIT = 'AWAIT',         // await expression
  EMIT = 'EMIT',           // generator yield
  DELEGATE = 'DELEGATE',   // yield from
  WITH = 'WITH',           // context manager
  AS = 'AS',               // binding name
  GLOBAL = 'GLOBAL',       // global scope declaration
  NONLOCAL = 'NONLOCAL',   // enclosing scope declaration
  DEL = 'DEL',             // delete
  MATCH = 'MATCH',         // structural match
  CASE = 'CASE',           // match arm
  WHEN = 'WHEN',           // pattern guard
  LAMBDA = 'LAMBDA',       // anonymous function
  IS = 'IS',               // identity comparison

  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  STARSTAR = 'STARSTAR',   // ** power / dict unpacking
  SLASH = 'SLASH',
  BACKSLASH = 'BACKSLASH', // \ floor division
  PERCENT = 'PERCENT',
  CARET = 'CARET',         // power operator
  TILDE = 'TILDE',         // ternary operator ~
  AT = 'AT',               // @ decorator / matrix multiply
  WALRUS = 'WALRUS',       // := binding expression
  AUGASSIGN = 'AUGASSIGN', // += -= *= /= %= ^= \= **=  (value holds the op)
  AMP = 'AMP',             // & bitwise and / set intersection
  BAR = 'BAR',             // | bitwise or / set union / pattern alternation
  SHL = 'SHL',             // <<
  SHR = 'SHR',             // >>
  ELLIPSIS = 'ELLIPSIS',   // ...

  // Comparison (unique symbols)
  EQUALS = 'EQUALS',       // equals
  DIFFERS = 'DIFFERS',     // differs / <>
  LESS = 'LESS',           // <
  MORE = 'MORE',           // >
  ATMOST = 'ATMOST',       // <=
  ATLEAST = 'ATLEAST',     // >=

  // Logical (word-based)
  ALSO = 'ALSO',           // and
  EITHER = 'EITHER',       // or
  ISNT = 'ISNT',           // not

  // Delimiters (unique block syntax)
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LSET = 'LSET',           // {| set literal
  RSET = 'RSET',           // |} set literal

  COMMA = 'COMMA',
  ARROW = 'ARROW',         // ->
  FATARROW = 'FATARROW',   // => (match arm shorthand)
  PIPE = 'PIPE',           // |>
  DOUBLE_COLON = 'DOUBLE_COLON', // :: block start
  DOUBLE_SEMI = 'DOUBLE_SEMI',   // ;; block end
  COLON = 'COLON',
  DOT = 'DOT',

  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

/**
 * Keyword table. Built from the shared dual-name registry in
 * `keywords.ts`, so every keyword has both a v1 mystical spelling and
 * a v2 plain spelling.
 *
 * NOTE: 'essence' stays a contextual keyword (IDENTIFIER) so it can also
 * be used as the `essence(x)` type-checking builtin. The `kind` / `class`
 * spellings map to ESSENCE_KW.
 */
export const KEYWORDS: Record<string, TokenType> = (() => {
  const map: Record<string, TokenType> = {};
  for (const [word, token] of Object.entries(KEYWORD_TOKEN_BY_WORD)) {
    if (word === 'essence') continue; // contextual for backwards compatibility
    const tt = (TokenType as unknown as Record<string, TokenType>)[token];
    if (tt) map[word] = tt;
  }
  return map;
})();

export { KEYWORD_SPECS, WORDS_BY_TOKEN } from './keywords';
