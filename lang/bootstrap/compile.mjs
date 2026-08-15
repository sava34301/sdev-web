// SDEV v2 bootstrap compiler — Milestone 3 (functions + call frames).
//
// Compiles a subset of SDEV v2 to bytecode for the stage-0 WAT VM
// (see lang/bootstrap/seed.wat for the opcode table and memory layout).
//
// Bootstrap-only: this file is written in JavaScript so the very first
// stage of the toolchain has *something* to emit bytecode. Once the
// stage-3 self-hosted compiler (lang/compiler/*.sdev) is complete, this
// file is deleted and SDEV compiles SDEV directly.
//
// Supported subset:
//   say <expr>
//   set <name> to <expr>
//   if <cond>  ... [else ...] end
//   while <cond> ... end
//   to <name> [with p1 p2 ...] ... end     (recursive functions)
//   return <expr>
//   integer / string literals, identifiers
//   fn(args) call form, `name with a b` form
//   + - * / %,  is / is not / < > <= >=,  and / or / not

import { tokenize, SdevError } from '../runtime/v2.js';

const OP = {
  PUSH_I32: 0x01, PUSH_STR: 0x02, LOAD: 0x03, STORE: 0x04, POP: 0x05,
  ADD: 0x10, SUB: 0x11, MUL: 0x12, DIV: 0x13, MOD: 0x14,
  EQ: 0x20, NE: 0x21, LT: 0x22, GT: 0x23, LE: 0x24, GE: 0x25,
  NOT: 0x30, JMP: 0x40, JZ: 0x41, SAY_I32: 0x50, SAY_STR: 0x51,
  CALL: 0x60, RET: 0x61, ENTER: 0x62, LOAD_LOC: 0x63, STORE_LOC: 0x64,
  ALLOC: 0x70, NEWLIST: 0x80, LGET: 0x81, LSET: 0x82, LEN: 0x83,
  SGET: 0x84, I2S: 0x87, CHR: 0x88, LNEW: 0x89, STRCAT: 0x91,
  // Milestone 5t — tomes (string-keyed dictionaries)
  TNEW: 0x8A, TSET: 0x8B, TGET: 0x8C, THAS: 0x8D, TKEYS: 0x8E, TVALS: 0x8F,
  // Milestone 6 — boxed f64 floats
  PUSH_F64: 0xA0, FADD: 0xA1, FSUB: 0xA2, FMUL: 0xA3, FDIV: 0xA4,
  FLT: 0xA5, FGT: 0xA6, FEQ: 0xA7, I2F: 0xA8, F2I: 0xA9,
  FNEG: 0xAA, FABS: 0xAB, FSQRT: 0xAC, SAY_F64: 0xAD, FMATH: 0xAE,
  // Milestone 7 — host-mediated file I/O + networking
  READFILE: 0xB0, WRITEFILE: 0xB1, HTTPGET: 0xB2,
  // Milestone 5q — float bit inspection (used by the self-hosted codegen)
  FBYTE: 0xB4,
  // Milestone 5u — string + numeric standard library
  UPPER: 0x92, LOWER: 0x93, TRIM: 0x94, SUBSTR: 0x95, FIND: 0x96,
  SPLIT: 0x97, JOIN: 0x98, REPLACE: 0x99, S2I: 0x9A,
  IABS: 0x9B, IMIN: 0x9C, IMAX: 0x9D, RANGE: 0x9E, SUM: 0x9F,
  FCEIL: 0xB5, FFLOOR: 0xB6, FROUND: 0xB7, RANDINT: 0xB8,
  // Milestone 5v — error handling + string→float
  TRY: 0xC0, ENDTRY: 0xC1, THROW: 0xC2, S2F: 0xC3,
  HALT: 0xFF,


};

// Transcendental math op codes for the FMATH opcode.
const FMATH_OP = { sin: 0, cos: 1, tan: 2, exp: 3, log: 4, pow: 5 };

// Builtins available as function-call syntax. Each maps to a single opcode
// sequence emitted inline. Arity is checked at compile time.
// `ret` is the compile-time result type used by scope typing.
const BUILTINS = {
  length:  { arity: 1, ret: 'int', emit: (em) => em.emit(OP.LEN) },
  concat:  { arity: 2, ret: 'str', emit: (em) => em.emit(OP.STRCAT) },
  ord:     { arity: 2, ret: 'int', emit: (em) => em.emit(OP.SGET) },
  chr:     { arity: 1, ret: 'str', emit: (em) => em.emit(OP.CHR) },
  str:     { arity: 1, ret: 'str', emit: (em) => em.emit(OP.I2S) },
  mklist:  { arity: 1, ret: 'int', emit: (em) => em.emit(OP.LNEW) },
  // --- Milestone 5t: tomes ---
  // `keys(t)` yields a list of string handles; `values(t)` a list whose
  // element kind is decided at the call site from the tome's value kind.
  keys:    { arity: 1, ret: 'liststr', emit: (em) => em.emit(OP.TKEYS) },
  values:  { arity: 1, ret: 'int',     emit: (em) => em.emit(OP.TVALS) },
  has:     { arity: 2, ret: 'int',     emit: (em) => em.emit(OP.THAS)  },
  // --- Milestone 6: floats ---
  // Explicit int↔float conversion.
  i2f:     { arity: 1, ret: 'float', emit: (em) => em.emit(OP.I2F) },
  f2i:     { arity: 1, ret: 'int',   emit: (em) => em.emit(OP.F2I) },
  // Unary float math.
  fneg:    { arity: 1, ret: 'float', emit: (em) => em.emit(OP.FNEG) },
  fabs:    { arity: 1, ret: 'float', emit: (em) => em.emit(OP.FABS) },
  fsqrt:   { arity: 1, ret: 'float', emit: (em) => em.emit(OP.FSQRT) },
  // Transcendentals via host.
  fsin:    { arity: 1, ret: 'float', emit: (em) => { em.emit(OP.FMATH); em.emit(FMATH_OP.sin); } },
  fcos:    { arity: 1, ret: 'float', emit: (em) => { em.emit(OP.FMATH); em.emit(FMATH_OP.cos); } },
  ftan:    { arity: 1, ret: 'float', emit: (em) => { em.emit(OP.FMATH); em.emit(FMATH_OP.tan); } },
  fexp:    { arity: 1, ret: 'float', emit: (em) => { em.emit(OP.FMATH); em.emit(FMATH_OP.exp); } },
  flog:    { arity: 1, ret: 'float', emit: (em) => { em.emit(OP.FMATH); em.emit(FMATH_OP.log); } },
  fpow:    { arity: 2, ret: 'float', emit: (em) => { em.emit(OP.FMATH); em.emit(FMATH_OP.pow); } },
  // --- Milestone 7: file I/O + networking (host-mediated) ---
  read_file:  { arity: 1, ret: 'str', emit: (em) => em.emit(OP.READFILE)  },
  write_file: { arity: 2, ret: 'int', emit: (em) => em.emit(OP.WRITEFILE) },
  http_get:   { arity: 1, ret: 'str', emit: (em) => em.emit(OP.HTTPGET)   },
  // --- Milestone 5q: float bit inspection ---
  // fbyte(x, i) → the i-th little-endian IEEE-754 byte of the double x.
  // The self-hosted codegen uses it to emit PUSH_F64 operands.
  fbyte:      { arity: 2, ret: 'int', emit: (em) => em.emit(OP.FBYTE)     },
  // --- Milestone 5u: string + numeric standard library ---
  upper:    { arity: 1, ret: 'str',     emit: (em) => em.emit(OP.UPPER)   },
  lower:    { arity: 1, ret: 'str',     emit: (em) => em.emit(OP.LOWER)   },
  trim:     { arity: 1, ret: 'str',     emit: (em) => em.emit(OP.TRIM)    },
  substr:   { arity: 3, ret: 'str',     emit: (em) => em.emit(OP.SUBSTR)  },
  find:     { arity: 2, ret: 'int',     emit: (em) => em.emit(OP.FIND)    },
  contains: { arity: 2, ret: 'int',     emit: (em) => {
                em.emit(OP.FIND); em.emit(OP.PUSH_I32); em.emitI32(0); em.emit(OP.GE); } },
  split:    { arity: 2, ret: 'liststr', emit: (em) => em.emit(OP.SPLIT)   },
  join:     { arity: 2, ret: 'str',     emit: (em) => em.emit(OP.JOIN)    },
  replace:  { arity: 3, ret: 'str',     emit: (em) => em.emit(OP.REPLACE) },
  int:      { arity: 1, ret: 'int',     emit: (em) => em.emit(OP.S2I)     },
  abs:      { arity: 1, ret: 'int',     emit: (em) => em.emit(OP.IABS)    },
  min:      { arity: 2, ret: 'int',     emit: (em) => em.emit(OP.IMIN)    },
  max:      { arity: 2, ret: 'int',     emit: (em) => em.emit(OP.IMAX)    },
  range:    { arity: 1, ret: 'int',     emit: (em) => em.emit(OP.RANGE)   },
  sum:      { arity: 1, ret: 'int',     emit: (em) => em.emit(OP.SUM)     },
  random:   { arity: 1, ret: 'int',     emit: (em) => em.emit(OP.RANDINT) },
  fceil:    { arity: 1, ret: 'float',   emit: (em) => em.emit(OP.FCEIL)   },
  ffloor:   { arity: 1, ret: 'float',   emit: (em) => em.emit(OP.FFLOOR)  },
  fround:   { arity: 1, ret: 'float',   emit: (em) => em.emit(OP.FROUND)  },
  // --- Milestone 5v: string → float ---
  num:      { arity: 1, ret: 'float',   emit: (em) => em.emit(OP.S2F)     },

};


class Emitter {
  constructor() {
    this.bytes = [];
    this.stringPool = new Uint8Array(0x10000);
    this.poolNext = 0;
    this.strings = new Map();
    this.globals = new Map();               // name → global slot
    this.globalTypes = new Map();            // name → 'int' | 'str'
    this.functions = new Map();              // name → { arity, offset, patchSites: [] }
  }
  emit(b) { this.bytes.push(b & 0xff); }
  emitI32(v) { this.emit(v); this.emit(v >> 8); this.emit(v >> 16); this.emit(v >> 24); }
  emitF64(v) {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, v, true);
    const b = new Uint8Array(buf);
    for (let i = 0; i < 8; i++) this.emit(b[i]);
  }
  emitU16(v) { this.emit(v); this.emit(v >> 8); }
  patchI16(pos, v) { this.bytes[pos] = v & 0xff; this.bytes[pos + 1] = (v >> 8) & 0xff; }
  patchU16(pos, v) { this.bytes[pos] = v & 0xff; this.bytes[pos + 1] = (v >> 8) & 0xff; }
  placeholder16() { this.emit(0); this.emit(0); return this.bytes.length - 2; }
  here() { return this.bytes.length; }
  globalSlot(name) {
    if (!this.globals.has(name)) {
      if (this.globals.size >= 256) throw new SdevError('too many globals (256 max)', 0);
      this.globals.set(name, this.globals.size);
    }
    return this.globals.get(name);
  }
  intern(str) {
    if (this.strings.has(str)) return this.strings.get(str);
    const utf8 = new TextEncoder().encode(str);
    const off = this.poolNext;
    if (off + 4 + utf8.length > this.stringPool.length) throw new SdevError('string pool overflow', 0);
    new DataView(this.stringPool.buffer).setUint32(off, utf8.length, true);
    this.stringPool.set(utf8, off + 4);
    this.poolNext += 4 + utf8.length;
    this.strings.set(str, off);
    return off;
  }
}

// Per-scope type tracking. Keyed by the locals Map identity; null → globals.
const _scopeTypes = new WeakMap();
function scopeTypes(locals, em) {
  if (!locals) return em.globalTypes;
  let m = _scopeTypes.get(locals);
  if (!m) { m = new Map(); _scopeTypes.set(locals, m); }
  return m;
}

// ---------------- Parser (bootstrap subset) ----------------
export function parse(source) { return parseProgram(tokenize(source)); }
function parseProgram(tokens) {
  let p = 0;
  const peek = (n = 0) => tokens[p + n];
  const eat = (type, value) => {
    const t = tokens[p];
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new SdevError(`bootstrap: expected ${value ?? type}, got ${t.type}:${t.value}`, t.line);
    }
    p++; return t;
  };
  const skipNL = () => { while (peek().type === 'NL') p++; };
  let feDepth = 0;             // Milestone 5s: foreach nesting depth


  const stmts = [];
  skipNL();
  while (peek().type !== 'EOF') { stmts.push(statement()); skipNL(); }
  return stmts;

  function statement() {
    const t = peek();
    // Milestone 5s: `break` / `continue` are plain identifiers in the lexer.
    if (t.type === 'IDENT' && t.value === 'break')    { p++; return { k: 'break', line: t.line }; }
    if (t.type === 'IDENT' && t.value === 'continue') { p++; return { k: 'continue', line: t.line }; }
    // Milestone 5v: `attempt` / `rescue` / `throw` are plain identifiers too.
    if (t.type === 'IDENT' && t.value === 'attempt')   return attemptStmt();
    if (t.type === 'IDENT' && t.value === 'throw')     { p++; return { k: 'throw', expr: expr(), line: t.line }; }
    if (t.type === 'KW') {
      if (t.value === 'say')    { p++; return { k: 'say', expr: expr(), line: t.line }; }

      if (t.value === 'set')    {
        p++;
        const name = eat('IDENT').value;
        // `set xs[i] to v`  → index-assignment
        if (peek().type === 'OP' && peek().value === '[') {
          p++;
          const idx = expr();
          eat('OP', ']');
          eat('KW', 'to');
          return { k: 'setIndex', name, idx, expr: expr(), line: t.line };
        }
        eat('KW', 'to');
        return { k: 'set', name, expr: expr(), line: t.line };
      }
      if (t.value === 'if')     return ifStmt();
      if (t.value === 'while')  return whileStmt();
      if (t.value === 'for')    return forEachStmt();
      if (t.value === 'to')     return funcDecl();
      if (t.value === 'return') { p++; return { k: 'return', expr: peek().type === 'NL' ? null : expr(), line: t.line }; }
    }
    // Expression statement (e.g. `greet with "x"`).
    const e = expr();
    return { k: 'exprStmt', expr: e, line: t.line };
  }
  function ifStmt() {
    const t = eat('KW', 'if'); const cond = expr(); skipNL();
    const then_ = []; while (!(peek().type === 'KW' && (peek().value === 'else' || peek().value === 'end'))) { then_.push(statement()); skipNL(); }
    let else_ = null;
    let chained = false;
    if (peek().type === 'KW' && peek().value === 'else') {
      p++;
      // Milestone 5s: `else if` chains — the nested `if` consumes the `end`.
      if (peek().type === 'KW' && peek().value === 'if') { else_ = [ifStmt()]; chained = true; }
      else { skipNL(); else_ = []; while (!(peek().type === 'KW' && peek().value === 'end')) { else_.push(statement()); skipNL(); } }
    }
    if (!chained) eat('KW', 'end');
    return { k: 'if', cond, then_, else_, line: t.line };
  }
  // Milestone 5v: `attempt ... rescue [err] ... end`.
  function attemptStmt() {
    const t = peek(); p++; skipNL();
    const atEnd = () => (peek().type === 'KW' && peek().value === 'end')
      || (peek().type === 'IDENT' && peek().value === 'rescue')
      || peek().type === 'EOF';
    const body = []; while (!atEnd()) { body.push(statement()); skipNL(); }
    let errName = null;
    const rescue_ = [];
    if (peek().type === 'IDENT' && peek().value === 'rescue') {
      p++;
      if (peek().type === 'IDENT') errName = eat('IDENT').value;
      skipNL();
      while (!(peek().type === 'KW' && peek().value === 'end') && peek().type !== 'EOF') {
        rescue_.push(statement()); skipNL();
      }
    }
    eat('KW', 'end');
    return { k: 'attempt', body, errName, rescue_, line: t.line };
  }

  function whileStmt() {
    const t = eat('KW', 'while'); const cond = expr(); skipNL();
    const body = []; while (!(peek().type === 'KW' && peek().value === 'end')) { body.push(statement()); skipNL(); }
    eat('KW', 'end');
    return { k: 'while', cond, body, line: t.line };
  }
  // Milestone 5s: `for each NAME in EXPR ... end`, desugared at emit time to
  // an index loop over two hidden variables named after the loop's lexical
  // foreach-nesting depth (so the self-hosted compiler can name them the
  // same way without an AST).
  function forEachStmt() {
    const t = eat('KW', 'for');
    if (peek().type === 'KW' && peek().value === 'each') p++;
    const name = eat('IDENT').value;
    if (peek().type === 'KW' && peek().value === 'in') p++;
    const iter = expr(); skipNL();
    feDepth++;
    const d = feDepth;
    const body = []; while (!(peek().type === 'KW' && peek().value === 'end')) { body.push(statement()); skipNL(); }
    eat('KW', 'end');
    feDepth--;
    return { k: 'foreach', name, iter, body, d, line: t.line };
  }
  function funcDecl() {
    const t = eat('KW', 'to');
    const name = eat('IDENT').value;
    const params = [];
    if (peek().type === 'KW' && peek().value === 'with') {
      p++;
      while (peek().type === 'IDENT') { params.push(eat('IDENT').value); }
    }
    skipNL();
    const body = []; while (!(peek().type === 'KW' && peek().value === 'end')) { body.push(statement()); skipNL(); }
    eat('KW', 'end');
    return { k: 'func', name, params, body, line: t.line };
  }

  function expr() { return or_(); }
  function or_() { let l = and_(); while (peek().type === 'KW' && peek().value === 'or') { p++; l = { k: 'bin', op: 'or', l, r: and_() }; } return l; }
  function and_() { let l = not_(); while (peek().type === 'KW' && peek().value === 'and') { p++; l = { k: 'bin', op: 'and', l, r: not_() }; } return l; }
  function not_() { if (peek().type === 'KW' && peek().value === 'not') { p++; return { k: 'un', op: 'not', x: not_() }; } return cmp_(); }
  function cmp_() {
    let l = add_();
    while (true) {
      const t = peek();
      if (t.type === 'KW' && t.value === 'is') { p++; let op = 'is'; if (peek().type === 'KW' && peek().value === 'not') { p++; op = 'isnot'; } l = { k: 'bin', op, l, r: add_() }; }
      else if (t.type === 'OP' && ['<', '>', '<=', '>='].includes(t.value)) { p++; l = { k: 'bin', op: t.value, l, r: add_() }; }
      else break;
    }
    return l;
  }
  function add_() { let l = mul_(); while (peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) { const op = peek().value; p++; l = { k: 'bin', op, l, r: mul_() }; } return l; }
  function mul_() { let l = un_();  while (peek().type === 'OP' && (peek().value === '*' || peek().value === '/' || peek().value === '%')) { const op = peek().value; p++; l = { k: 'bin', op, l, r: un_() }; } return l; }
  function un_()  { if (peek().type === 'OP' && peek().value === '-') { p++; return { k: 'un', op: '-', x: un_() }; } return callOrAtom(); }
  function callOrAtom() {
    let a = atom();
    // fn(a, b) call form
    if (a.k === 'ident' && peek().type === 'OP' && peek().value === '(') {
      p++;
      const args = [];
      if (!(peek().type === 'OP' && peek().value === ')')) {
        args.push(expr());
        while (peek().type === 'OP' && peek().value === ',') { p++; args.push(expr()); }
      }
      eat('OP', ')');
      a = { k: 'call', name: a.name, args };
    }
    // `fn with a b` call form (space-separated single atoms)
    else if (a.k === 'ident' && peek().type === 'KW' && peek().value === 'with') {
      p++;
      const args = [];
      while (canStartAtom(peek())) args.push(atom());
      a = { k: 'call', name: a.name, args };
    }
    // postfix indexing: x[i][j]...
    while (peek().type === 'OP' && peek().value === '[') {
      p++;
      const idx = expr();
      eat('OP', ']');
      a = { k: 'index', target: a, idx };
    }
    return a;
  }
  function canStartAtom(t) {
    return t.type === 'NUM' || t.type === 'STR' || t.type === 'IDENT'
      || (t.type === 'KW' && (t.value === 'true' || t.value === 'false' || t.value === 'nothing'))
      || (t.type === 'OP' && (t.value === '(' || t.value === '['));
  }
  function atom() {
    const t = peek();
    if (t.type === 'NUM') {
      p++;
      // Number literals with a fractional part become boxed f64 floats.
      // Integers stay in the fast i32 path.
      if (t.isFloat) return { k: 'fnum', v: t.value };
      if (Number.isInteger(t.value)) return { k: 'num', v: t.value };
      return { k: 'fnum', v: t.value };
    }
    if (t.type === 'STR') { p++; return { k: 'str', v: t.value }; }
    // Milestone 5r: boolean / nothing literals lower to plain ints.
    if (t.type === 'KW' && t.value === 'true')    { p++; return { k: 'num', v: 1 }; }
    if (t.type === 'KW' && t.value === 'false')   { p++; return { k: 'num', v: 0 }; }
    if (t.type === 'KW' && t.value === 'nothing') { p++; return { k: 'num', v: 0 }; }
    if (t.type === 'IDENT') { p++; return { k: 'ident', name: t.value }; }
    if (t.type === 'OP' && t.value === '(') { p++; const e = expr(); eat('OP', ')'); return e; }
    // list literal: [a, b, c]
    if (t.type === 'OP' && t.value === '[') {
      p++;
      const items = [];
      if (!(peek().type === 'OP' && peek().value === ']')) {
        items.push(expr());
        while (peek().type === 'OP' && peek().value === ',') { p++; items.push(expr()); }
      }
      eat('OP', ']');
      return { k: 'list', items, line: t.line };
    }
    // Milestone 5t — tome literal: { "k": v, name: v2 }
    if (t.type === 'OP' && t.value === '{') {
      p++;
      const pairs = [];
      skipNL();
      if (!(peek().type === 'OP' && peek().value === '}')) {
        pairs.push(tomePair());
        while (peek().type === 'OP' && peek().value === ',') { p++; skipNL(); pairs.push(tomePair()); }
      }
      skipNL();
      eat('OP', '}');
      return { k: 'tome', pairs, line: t.line };
    }
    throw new SdevError(`bootstrap: unexpected ${t.type}:${t.value}`, t.line);
  }
  // A tome entry: `<key>: <value>`. A bare identifier key is sugar for the
  // string of the same name, matching v1's `{name: "x"}` form.
  function tomePair() {
    skipNL();
    let key;
    if (peek().type === 'IDENT' && tokens[p + 1] && tokens[p + 1].type === 'OP' && tokens[p + 1].value === ':') {
      key = { k: 'str', v: eat('IDENT').value };
    } else {
      key = expr();
    }
    eat('OP', ':');
    const val = expr();
    skipNL();
    return { key, val };
  }
}

// ---------------- Two-pass emitter ----------------
// Pass 1: separate function decls from main statements.
// Pass 2: emit a leading JMP to main, then function bodies (recording
//         their offsets), then main, then HALT. Patch all CALL sites and
//         the leading JMP with the recorded offsets.

function emit(stmts, em) {
  const funcs = stmts.filter(s => s.k === 'func');
  const main = stmts.filter(s => s.k !== 'func');

  // Register functions (name → arity) up front so recursive calls resolve.
  for (const f of funcs) {
    if (em.functions.has(f.name)) throw new SdevError(`duplicate function ${f.name}`, f.line);
    em.functions.set(f.name, { arity: f.params.length, offset: -1, patchSites: [], retType: 'int' });
  }

  // Infer return types by fixed-point iteration BEFORE emitting bodies, so
  // that `say fn()` and `str + fn()` pick SAY_STR / STRCAT correctly even
  // when the callee is defined later or is (mutually) recursive.
  let changed = true;
  let guard = 0;
  while (changed && guard++ < funcs.length + 2) {
    changed = false;
    for (const f of funcs) {
      const info = em.functions.get(f.name);
      const t = inferReturnTypeOf(f, em.functions);
      if (t !== info.retType) { info.retType = t; changed = true; }
    }
  }

  // Leading JMP to main (patched later)
  em.emit(OP.JMP);
  const jmpToMainPos = em.placeholder16();
  const afterJmpToMain = em.here();

  // Emit each function body
  for (const f of funcs) {
    const info = em.functions.get(f.name);
    info.offset = em.here();
    // Local slot table: params first, then locals in declaration order.
    const locals = new Map();
    f.params.forEach((p, i) => locals.set(p, i));
    // Scan for `set` and function params to determine extra locals.
    collectSets(f.body, locals);
    const extra = locals.size - f.params.length;
    if (extra > 0) { em.emit(OP.ENTER); em.emit(extra); }
    for (const s of f.body) emitStmt(s, em, locals);
    // Fallthrough guard: implicit `return 0`.
    em.emit(OP.PUSH_I32); em.emitI32(0); em.emit(OP.RET);
  }

  // Patch the leading JMP to point at main
  em.patchI16(jmpToMainPos, em.here() - afterJmpToMain);

  // Emit main
  for (const s of main) emitStmt(s, em, null); // null → globals
  em.emit(OP.HALT);

  // Patch all CALL sites now that function offsets are known.
  for (const info of em.functions.values()) {
    for (const site of info.patchSites) em.patchU16(site, info.offset);
  }
}

function collectSets(body, locals) {
  for (const s of body) {
    // Only plain `set x to v` introduces a new binding. `set x[i] to v` is
    // a mutation of an existing binding (must already be a local or global)
    // so it never creates a local — that would shadow the very list it's
    // trying to mutate.
    if (s.k === 'set' && !locals.has(s.name)) locals.set(s.name, locals.size);
    if (s.k === 'if') { collectSets(s.then_, locals); if (s.else_) collectSets(s.else_, locals); }
    if (s.k === 'while') collectSets(s.body, locals);
    // Milestone 5v: the rescue binding is a local, as are both sub-blocks.
    if (s.k === 'attempt') {
      collectSets(s.body, locals);
      if (s.errName && !locals.has(s.errName)) locals.set(s.errName, locals.size);
      collectSets(s.rescue_, locals);
    }

    // Milestone 5s: a foreach introduces two hidden bindings (list + index)
    // and the loop variable, registered in emission order.
    if (s.k === 'foreach') {
      for (const n of [feList(s.d), feIdx(s.d), s.name]) {
        if (!locals.has(n)) locals.set(n, locals.size);
      }
      collectSets(s.body, locals);
    }

  }
}

// Milestone 5s: hidden foreach bindings, named by lexical nesting depth so
// the self-hosted single-pass compiler can derive the same names.
const feList = (d) => `_fe_l${d}`;
const feIdx  = (d) => `_fe_i${d}`;

function emitLoadName(name, em, locals) {
  if (locals && locals.has(name)) { em.emit(OP.LOAD_LOC); em.emit(locals.get(name)); }
  else { em.emit(OP.LOAD); em.emit(em.globalSlot(name)); }
}
function emitStoreName(name, em, locals, kind) {
  scopeTypes(locals, em).set(name, kind);
  if (locals && locals.has(name)) { em.emit(OP.STORE_LOC); em.emit(locals.get(name)); }
  else { em.emit(OP.STORE); em.emit(em.globalSlot(name)); }
}


function emitExpr(e, em, locals) {
  switch (e.k) {
    case 'num':   em.emit(OP.PUSH_I32); em.emitI32(e.v); return 'int';
    case 'fnum':  em.emit(OP.PUSH_F64); em.emitF64(e.v); return 'float';
    case 'str':   em.emit(OP.PUSH_STR); { const off = em.intern(e.v); em.emit(off & 0xff); em.emit((off >> 8) & 0xff); } return 'str';
    case 'ident': {
      const t = scopeTypes(locals, em).get(e.name) || 'int';
      if (locals && locals.has(e.name)) { em.emit(OP.LOAD_LOC); em.emit(locals.get(e.name)); return t; }
      em.emit(OP.LOAD); em.emit(em.globalSlot(e.name)); return t;
    }
    case 'un':
      if (e.op === '-') { em.emit(OP.PUSH_I32); em.emitI32(0); emitExpr(e.x, em, locals); em.emit(OP.SUB); return 'int'; }
      if (e.op === 'not') { emitExpr(e.x, em, locals); em.emit(OP.NOT); return 'int'; }
      break;
    case 'bin': {
      if (e.op === 'and') { emitExpr(e.l, em, locals); em.emit(OP.JZ); const fx = em.placeholder16(); const before = em.here(); emitExpr(e.r, em, locals); em.patchI16(fx, em.here() - before); return 'int'; }
      if (e.op === 'or')  { emitExpr(e.l, em, locals); em.emit(OP.NOT); em.emit(OP.JZ); const fx = em.placeholder16(); const before = em.here(); emitExpr(e.r, em, locals); em.patchI16(fx, em.here() - before); return 'int'; }
      const lk = emitExpr(e.l, em, locals);
      const rk = emitExpr(e.r, em, locals);
      // Promote `+` to STRCAT when either operand is a string literal.
      if (e.op === '+' && (lk === 'str' || rk === 'str')) { em.emit(OP.STRCAT); return 'str'; }
      // Float arithmetic when BOTH sides are floats. Mixed int/float requires
      // an explicit i2f() — keeps codegen deterministic given emission order.
      if (lk === 'float' && rk === 'float') {
        switch (e.op) {
          case '+': em.emit(OP.FADD); return 'float';
          case '-': em.emit(OP.FSUB); return 'float';
          case '*': em.emit(OP.FMUL); return 'float';
          case '/': em.emit(OP.FDIV); return 'float';
          case '<':  em.emit(OP.FLT); return 'int';
          case '>':  em.emit(OP.FGT); return 'int';
          case 'is': em.emit(OP.FEQ); return 'int';
        }
      }
      switch (e.op) {
        case '+': em.emit(OP.ADD); return 'int';
        case '-': em.emit(OP.SUB); return 'int';
        case '*': em.emit(OP.MUL); return 'int';
        case '/': em.emit(OP.DIV); return 'int';
        case '%': em.emit(OP.MOD); return 'int';
        case 'is':    em.emit(OP.EQ); return 'int';
        case 'isnot': em.emit(OP.NE); return 'int';
        case '<':  em.emit(OP.LT); return 'int';
        case '>':  em.emit(OP.GT); return 'int';
        case '<=': em.emit(OP.LE); return 'int';
        case '>=': em.emit(OP.GE); return 'int';
      }
      break;
    }
    case 'list': {
      if (e.items.length > 0xffff) throw new SdevError('list literal too large', 0);
      for (const it of e.items) emitExpr(it, em, locals);
      em.emit(OP.NEWLIST); em.emitU16(e.items.length);
      return 'int';
    }
    case 'tome': {
      if (e.pairs.length > 0xffff) throw new SdevError('tome literal too large', 0);
      em.emit(OP.TNEW); em.emitU16(e.pairs.length);
      let vk = 'int';
      for (const pr of e.pairs) {
        emitExpr(pr.key, em, locals);
        const k = emitExpr(pr.val, em, locals);
        if (k === 'str') vk = 'str';
        em.emit(OP.TSET);
      }
      return vk === 'str' ? 'tomestr' : 'tome';
    }
    case 'index': {
      const tk = emitExpr(e.target, em, locals);
      emitExpr(e.idx,    em, locals);
      if (tk === 'tome' || tk === 'tomestr') {
        em.emit(OP.TGET);
        return tk === 'tomestr' ? 'str' : 'int';
      }
      em.emit(OP.LGET);
      return tk === 'liststr' ? 'str' : 'int';
    }
    case 'call': {
      const bi = BUILTINS[e.name];
      if (bi) {
        if (e.args.length !== bi.arity) throw new SdevError(`${e.name}: expected ${bi.arity} args, got ${e.args.length}`, 0);
        let argKind = 'int';
        for (const a of e.args) argKind = emitExpr(a, em, locals);
        bi.emit(em);
        // `values(t)` mirrors the tome's value kind onto the produced list.
        if (e.name === 'values') return argKind === 'tomestr' ? 'liststr' : 'int';
        return bi.ret;
      }
      const info = em.functions.get(e.name);
      if (!info) throw new SdevError(`unknown function ${e.name}`, 0);
      if (e.args.length !== info.arity) throw new SdevError(`${e.name}: expected ${info.arity} args, got ${e.args.length}`, 0);
      for (const a of e.args) emitExpr(a, em, locals);
      em.emit(OP.CALL);
      const site = em.here();
      em.emitU16(0);            // target placeholder — patched at end
      em.emit(e.args.length);
      info.patchSites.push(site);
      return info.retType || 'int';
    }
  }
  throw new SdevError(`bootstrap: cannot compile ${e.k}`, 0);
}

// ---- Return-type inference (pre-emit pass) --------------------------------
// Mirrors emitExpr's type rules without emitting code. Runs to fixed point
// so mutually-recursive string-returning functions converge.

function inferReturnTypeOf(func, fnTypes) {
  const localTypes = new Map();
  for (const p of func.params) localTypes.set(p, 'int');
  return inferBody(func.body, localTypes, fnTypes);
}
function inferBody(body, localTypes, fnTypes) {
  let ret = 'int';
  for (const s of body) {
    if (s.k === 'set') localTypes.set(s.name, inferExpr(s.expr, localTypes, fnTypes));
    else if (s.k === 'return' && s.expr) {
      if (inferExpr(s.expr, localTypes, fnTypes) === 'str') ret = 'str';
    }
    else if (s.k === 'if') {
      if (inferBody(s.then_, localTypes, fnTypes) === 'str') ret = 'str';
      if (s.else_ && inferBody(s.else_, localTypes, fnTypes) === 'str') ret = 'str';
    }
    else if (s.k === 'while') {
      if (inferBody(s.body, localTypes, fnTypes) === 'str') ret = 'str';
    }
    else if (s.k === 'attempt') {
      if (inferBody(s.body, localTypes, fnTypes) === 'str') ret = 'str';
      if (s.errName) localTypes.set(s.errName, 'str');
      if (inferBody(s.rescue_, localTypes, fnTypes) === 'str') ret = 'str';
    }

    else if (s.k === 'foreach') {
      const ik = inferExpr(s.iter, localTypes, fnTypes);
      localTypes.set(s.name, ik === 'liststr' ? 'str' : 'int');
      if (inferBody(s.body, localTypes, fnTypes) === 'str') ret = 'str';
    }

  }
  return ret;
}
function inferExpr(e, localTypes, fnTypes) {
  switch (e.k) {
    case 'num':   return 'int';
    case 'fnum':  return 'float';
    case 'str':   return 'str';
    case 'ident': return localTypes.get(e.name) || 'int';
    case 'un':    return 'int';
    case 'bin': {
      const l = inferExpr(e.l, localTypes, fnTypes);
      const r = inferExpr(e.r, localTypes, fnTypes);
      if (e.op === '+' && (l === 'str' || r === 'str')) return 'str';
      if (['+', '-', '*', '/'].includes(e.op) && l === 'float' && r === 'float') return 'float';
      return 'int';
    }
    case 'list':  return 'int';
    case 'tome': {
      for (const pr of e.pairs) {
        if (inferExpr(pr.val, localTypes, fnTypes) === 'str') return 'tomestr';
      }
      return 'tome';
    }
    case 'index': {
      const tk = inferExpr(e.target, localTypes, fnTypes);
      return (tk === 'tomestr' || tk === 'liststr') ? 'str' : 'int';
    }
    case 'call': {
      const bi = BUILTINS[e.name];
      if (bi) {
        if (e.name === 'values') {
          return inferExpr(e.args[0], localTypes, fnTypes) === 'tomestr' ? 'liststr' : 'int';
        }
        return bi.ret;
      }
      const info = fnTypes.get(e.name);
      return info ? (info.retType || 'int') : 'int';
    }
  }
  return 'int';
}

function emitStmt(s, em, locals) {
  switch (s.k) {
    case 'say': {
      const kind = emitExpr(s.expr, em, locals);
      em.emit(kind === 'str' ? OP.SAY_STR : kind === 'float' ? OP.SAY_F64 : OP.SAY_I32);
      return;
    }
    case 'set': {
      const kind = emitExpr(s.expr, em, locals);
      scopeTypes(locals, em).set(s.name, kind);
      if (locals && locals.has(s.name)) { em.emit(OP.STORE_LOC); em.emit(locals.get(s.name)); }
      else { em.emit(OP.STORE); em.emit(em.globalSlot(s.name)); }
      return;
    }
    case 'setIndex': {
      // push arr, idx, val, then LSET (tomes: TSET, which leaves the tome).
      const tk = scopeTypes(locals, em).get(s.name) || 'int';
      if (locals && locals.has(s.name)) { em.emit(OP.LOAD_LOC); em.emit(locals.get(s.name)); }
      else { em.emit(OP.LOAD); em.emit(em.globalSlot(s.name)); }
      emitExpr(s.idx, em, locals);
      const vk = emitExpr(s.expr, em, locals);
      if (tk === 'tome' || tk === 'tomestr') {
        em.emit(OP.TSET);
        em.emit(OP.POP);
        // A string value promotes the variable's tome kind for later reads.
        if (vk === 'str' && tk === 'tome') scopeTypes(locals, em).set(s.name, 'tomestr');
      } else {
        em.emit(OP.LSET);
      }
      return;
    }
    case 'if': {
      emitExpr(s.cond, em, locals);
      em.emit(OP.JZ); const jzPos = em.placeholder16(); const afterJZ = em.here();
      s.then_.forEach(x => emitStmt(x, em, locals));
      if (s.else_) {
        em.emit(OP.JMP); const jmpPos = em.placeholder16(); const afterJmp = em.here();
        em.patchI16(jzPos, em.here() - afterJZ);
        s.else_.forEach(x => emitStmt(x, em, locals));
        em.patchI16(jmpPos, em.here() - afterJmp);
      } else {
        em.patchI16(jzPos, em.here() - afterJZ);
      }
      return;
    }
    case 'while': {
      const top = em.here();
      emitExpr(s.cond, em, locals);
      em.emit(OP.JZ); const jzPos = em.placeholder16(); const afterJZ = em.here();
      const ctx = { breaks: [], conts: [] };
      (em.loops ||= []).push(ctx);
      s.body.forEach(x => emitStmt(x, em, locals));
      em.loops.pop();
      for (const c of ctx.conts) em.patchI16(c.pos, top - c.after);
      em.emit(OP.JMP); const jmpPos = em.placeholder16(); const afterJmp = em.here();
      em.patchI16(jmpPos, top - afterJmp);
      em.patchI16(jzPos, em.here() - afterJZ);
      for (const b of ctx.breaks) em.patchI16(b.pos, em.here() - b.after);
      return;
    }
    // Milestone 5s: `for each x in xs` → hidden index loop.
    case 'foreach': {
      const ln = feList(s.d), iv = feIdx(s.d);
      const kind = emitExpr(s.iter, em, locals);
      emitStoreName(ln, em, locals, kind);
      em.emit(OP.PUSH_I32); em.emitI32(0);
      emitStoreName(iv, em, locals, 'int');
      const top = em.here();
      emitLoadName(iv, em, locals);
      emitLoadName(ln, em, locals);
      em.emit(OP.LEN);
      em.emit(OP.LT);
      em.emit(OP.JZ); const jzPos = em.placeholder16(); const afterJZ = em.here();
      emitLoadName(ln, em, locals);
      emitLoadName(iv, em, locals);
      em.emit(OP.LGET);
      emitStoreName(s.name, em, locals, kind === 'liststr' ? 'str' : 'int');
      const ctx = { breaks: [], conts: [] };
      (em.loops ||= []).push(ctx);
      s.body.forEach(x => emitStmt(x, em, locals));
      em.loops.pop();
      const cont = em.here();
      for (const c of ctx.conts) em.patchI16(c.pos, cont - c.after);
      emitLoadName(iv, em, locals);
      em.emit(OP.PUSH_I32); em.emitI32(1);
      em.emit(OP.ADD);
      emitStoreName(iv, em, locals, 'int');
      em.emit(OP.JMP); const jmpPos = em.placeholder16(); const afterJmp = em.here();
      em.patchI16(jmpPos, top - afterJmp);
      em.patchI16(jzPos, em.here() - afterJZ);
      for (const b of ctx.breaks) em.patchI16(b.pos, em.here() - b.after);
      return;
    }
    // Milestone 5v: attempt / rescue / throw.
    case 'attempt': {
      em.emit(OP.TRY); const tryPos = em.placeholder16(); const afterTry = em.here();
      s.body.forEach(x => emitStmt(x, em, locals));
      em.emit(OP.ENDTRY);
      em.emit(OP.JMP); const overPos = em.placeholder16(); const afterOver = em.here();
      em.patchI16(tryPos, em.here() - afterTry);
      // Handler entry: the thrown message sits on top of the operand stack.
      if (s.errName) emitStoreName(s.errName, em, locals, 'str');
      else em.emit(OP.POP);
      s.rescue_.forEach(x => emitStmt(x, em, locals));
      em.patchI16(overPos, em.here() - afterOver);
      return;
    }
    case 'throw': {
      emitExpr(s.expr, em, locals);
      em.emit(OP.THROW);
      return;
    }
    case 'break':

    case 'continue': {
      const ctx = (em.loops || [])[(em.loops || []).length - 1];
      if (!ctx) throw new SdevError(`${s.k} outside of a loop`, s.line);
      em.emit(OP.JMP); const pos = em.placeholder16(); const after = em.here();
      (s.k === 'break' ? ctx.breaks : ctx.conts).push({ pos, after });
      return;
    }

    case 'return': {
      if (s.expr) emitExpr(s.expr, em, locals);
      else { em.emit(OP.PUSH_I32); em.emitI32(0); }
      em.emit(OP.RET);
      return;
    }
    case 'exprStmt': {
      // Discard result.
      emitExpr(s.expr, em, locals);
      em.emit(OP.POP);
      return;
    }
  }
}

export function compile(source) {
  const tokens = tokenize(source);
  const ast = parseProgram(tokens);
  const em = new Emitter();
  emit(ast, em);
  return {
    bytecode: new Uint8Array(em.bytes),
    stringPool: em.stringPool.slice(0, em.poolNext),
  };
}
