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
  ALLOC: 0x70, NEWLIST: 0x80, LGET: 0x81, LSET: 0x82, LEN: 0x83, STRCAT: 0x91,
  HALT: 0xFF,
};

// Builtins available as function-call syntax. Each maps to a single opcode
// sequence emitted inline. Arity is checked at compile time.
const BUILTINS = {
  length:  { arity: 1, emit: (em) => em.emit(OP.LEN) },
  concat:  { arity: 2, emit: (em) => em.emit(OP.STRCAT) },
};

class Emitter {
  constructor() {
    this.bytes = [];
    this.stringPool = new Uint8Array(0x2000);
    this.poolNext = 0;
    this.strings = new Map();
    this.globals = new Map();               // name → global slot
    this.globalTypes = new Map();            // name → 'int' | 'str'
    this.functions = new Map();              // name → { arity, offset, patchSites: [] }
  }
  emit(b) { this.bytes.push(b & 0xff); }
  emitI32(v) { this.emit(v); this.emit(v >> 8); this.emit(v >> 16); this.emit(v >> 24); }
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

  const stmts = [];
  skipNL();
  while (peek().type !== 'EOF') { stmts.push(statement()); skipNL(); }
  return stmts;

  function statement() {
    const t = peek();
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
    if (peek().type === 'KW' && peek().value === 'else') { p++; skipNL(); else_ = []; while (!(peek().type === 'KW' && peek().value === 'end')) { else_.push(statement()); skipNL(); } }
    eat('KW', 'end');
    return { k: 'if', cond, then_, else_, line: t.line };
  }
  function whileStmt() {
    const t = eat('KW', 'while'); const cond = expr(); skipNL();
    const body = []; while (!(peek().type === 'KW' && peek().value === 'end')) { body.push(statement()); skipNL(); }
    eat('KW', 'end');
    return { k: 'while', cond, body, line: t.line };
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
      || (t.type === 'OP' && (t.value === '(' || t.value === '['));
  }
  function atom() {
    const t = peek();
    if (t.type === 'NUM') { p++; if (!Number.isInteger(t.value)) throw new SdevError('bootstrap subset supports integers only', t.line); return { k: 'num', v: t.value }; }
    if (t.type === 'STR') { p++; return { k: 'str', v: t.value }; }
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
    throw new SdevError(`bootstrap: unexpected ${t.type}:${t.value}`, t.line);
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
    em.functions.set(f.name, { arity: f.params.length, offset: -1, patchSites: [] });
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
    if ((s.k === 'set' || s.k === 'setIndex') && !locals.has(s.name)) locals.set(s.name, locals.size);
    if (s.k === 'if') { collectSets(s.then_, locals); if (s.else_) collectSets(s.else_, locals); }
    if (s.k === 'while') collectSets(s.body, locals);
  }
}

function emitExpr(e, em, locals) {
  switch (e.k) {
    case 'num':   em.emit(OP.PUSH_I32); em.emitI32(e.v); return 'int';
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
    case 'index': {
      emitExpr(e.target, em, locals);
      emitExpr(e.idx,    em, locals);
      em.emit(OP.LGET);
      return 'int';
    }
    case 'call': {
      const bi = BUILTINS[e.name];
      if (bi) {
        if (e.args.length !== bi.arity) throw new SdevError(`${e.name}: expected ${bi.arity} args, got ${e.args.length}`, 0);
        for (const a of e.args) emitExpr(a, em, locals);
        bi.emit(em);
        return e.name === 'concat' ? 'str' : 'int';
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
      return 'int';
    }
  }
  throw new SdevError(`bootstrap: cannot compile ${e.k}`, 0);
}

function emitStmt(s, em, locals) {
  switch (s.k) {
    case 'say': {
      const kind = emitExpr(s.expr, em, locals);
      em.emit(kind === 'str' ? OP.SAY_STR : OP.SAY_I32);
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
      // push arr, idx, val, then LSET
      if (locals && locals.has(s.name)) { em.emit(OP.LOAD_LOC); em.emit(locals.get(s.name)); }
      else { em.emit(OP.LOAD); em.emit(em.globalSlot(s.name)); }
      emitExpr(s.idx, em, locals);
      emitExpr(s.expr, em, locals);
      em.emit(OP.LSET);
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
      s.body.forEach(x => emitStmt(x, em, locals));
      em.emit(OP.JMP); const jmpPos = em.placeholder16(); const afterJmp = em.here();
      em.patchI16(jmpPos, top - afterJmp);
      em.patchI16(jzPos, em.here() - afterJZ);
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
