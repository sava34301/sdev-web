// SDEV v2 bootstrap compiler.
//
// Compiles a subset of SDEV v2 to bytecode for the stage-0 WAT VM
// (see lang/bootstrap/seed.wat for the opcode table and memory layout).
//
// Bootstrap-only: this file is written in JavaScript so the very first
// stage of the toolchain has *something* to emit bytecode. Once the
// stage-2 self-hosted compiler (lang/compiler/*.sdev) is complete, this
// file is deleted and SDEV compiles SDEV directly.
//
// Supported subset (integers-first, matches the ops the seed implements):
//   say <expr>
//   set <name> to <expr>
//   if <cond>  ... [else ...] end
//   while <cond> ... end
//   integer literals, string literals (say only)
//   + - * / %,  is / is not / < > <= >=,  and / or / not
//   identifiers
//
// Anything outside this subset — functions, lists, dicts, for-each,
// pipelines, pattern match, systems/data/hardware blocks — falls back to
// the JS reference runtime automatically (see the runtime dispatcher).

import { tokenize, SdevError } from '../runtime/v2.js';

// Opcodes (must match seed.wat exactly)
const OP = {
  PUSH_I32: 0x01, PUSH_STR: 0x02, LOAD: 0x03, STORE: 0x04,
  ADD: 0x10, SUB: 0x11, MUL: 0x12, DIV: 0x13, MOD: 0x14,
  EQ: 0x20, NE: 0x21, LT: 0x22, GT: 0x23, LE: 0x24, GE: 0x25,
  NOT: 0x30, JMP: 0x40, JZ: 0x41, SAY_I32: 0x50, SAY_STR: 0x51,
  HALT: 0xFF,
};

class Emitter {
  constructor() {
    this.bytes = [];
    this.stringPool = new Uint8Array(0x2000);
    this.poolNext = 0;
    this.strings = new Map(); // string → pool offset
    this.slots = new Map();   // varname → slot index
  }
  emit(b) { this.bytes.push(b & 0xff); }
  emitI32(v) { this.emit(v); this.emit(v >> 8); this.emit(v >> 16); this.emit(v >> 24); }
  emitI16At(pos, v) { this.bytes[pos] = v & 0xff; this.bytes[pos + 1] = (v >> 8) & 0xff; }
  placeholder16() { this.emit(0); this.emit(0); return this.bytes.length - 2; }
  here() { return this.bytes.length; }
  slotOf(name) {
    if (!this.slots.has(name)) {
      if (this.slots.size >= 256) throw new SdevError('too many variables (bootstrap limit 256)', 0);
      this.slots.set(name, this.slots.size);
    }
    return this.slots.get(name);
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

// Very small recursive-descent parser mirroring the v2 grammar subset.
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
      if (t.value === 'say') { p++; return { k: 'say', expr: expr(), line: t.line }; }
      if (t.value === 'set') { p++; const name = eat('IDENT').value; eat('KW', 'to'); return { k: 'set', name, expr: expr(), line: t.line }; }
      if (t.value === 'if') return ifStmt();
      if (t.value === 'while') return whileStmt();
    }
    throw new SdevError(`bootstrap: unsupported statement at ${t.type}:${t.value} (WASM subset). Use v2 JS runtime.`, t.line);
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
  function un_()  { if (peek().type === 'OP' && peek().value === '-') { p++; return { k: 'un', op: '-', x: un_() }; } return atom(); }
  function atom() {
    const t = peek();
    if (t.type === 'NUM') { p++; if (!Number.isInteger(t.value)) throw new SdevError('bootstrap subset supports integers only', t.line); return { k: 'num', v: t.value }; }
    if (t.type === 'STR') { p++; return { k: 'str', v: t.value }; }
    if (t.type === 'IDENT') { p++; return { k: 'ident', name: t.value }; }
    if (t.type === 'OP' && t.value === '(') { p++; const e = expr(); eat('OP', ')'); return e; }
    throw new SdevError(`bootstrap: unexpected ${t.type}:${t.value}`, t.line);
  }
}

function emitExpr(e, em) {
  switch (e.k) {
    case 'num':   em.emit(OP.PUSH_I32); em.emitI32(e.v); return 'int';
    case 'str':   em.emit(OP.PUSH_STR); { const off = em.intern(e.v); em.emit(off & 0xff); em.emit((off >> 8) & 0xff); } return 'str';
    case 'ident': em.emit(OP.LOAD); em.emit(em.slotOf(e.name)); return 'int';
    case 'un':
      if (e.op === '-') { em.emit(OP.PUSH_I32); em.emitI32(0); emitExpr(e.x, em); em.emit(OP.SUB); return 'int'; }
      if (e.op === 'not') { emitExpr(e.x, em); em.emit(OP.NOT); return 'int'; }
      break;
    case 'bin': {
      // short-circuit for and/or via JZ
      if (e.op === 'and') { emitExpr(e.l, em); em.emit(OP.JZ); const fx = em.placeholder16(); const before = em.here(); emitExpr(e.r, em); em.emitI16At(fx, em.here() - before); return 'int'; }
      if (e.op === 'or')  { emitExpr(e.l, em); em.emit(OP.NOT); em.emit(OP.JZ); const fx = em.placeholder16(); const before = em.here(); emitExpr(e.r, em); em.emitI16At(fx, em.here() - before); return 'int'; }
      emitExpr(e.l, em); emitExpr(e.r, em);
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
    }
  }
  throw new SdevError(`bootstrap: cannot compile ${e.k}`, 0);
}

function emitStmt(s, em) {
  switch (s.k) {
    case 'say': {
      const kind = emitExpr(s.expr, em);
      em.emit(kind === 'str' ? OP.SAY_STR : OP.SAY_I32);
      return;
    }
    case 'set': {
      emitExpr(s.expr, em);
      em.emit(OP.STORE); em.emit(em.slotOf(s.name));
      return;
    }
    case 'if': {
      emitExpr(s.cond, em);
      em.emit(OP.JZ); const jzPos = em.placeholder16(); const afterJZ = em.here();
      s.then_.forEach(x => emitStmt(x, em));
      if (s.else_) {
        em.emit(OP.JMP); const jmpPos = em.placeholder16(); const afterJmp = em.here();
        em.emitI16At(jzPos, em.here() - afterJZ);
        s.else_.forEach(x => emitStmt(x, em));
        em.emitI16At(jmpPos, em.here() - afterJmp);
      } else {
        em.emitI16At(jzPos, em.here() - afterJZ);
      }
      return;
    }
    case 'while': {
      const top = em.here();
      emitExpr(s.cond, em);
      em.emit(OP.JZ); const jzPos = em.placeholder16(); const afterJZ = em.here();
      s.body.forEach(x => emitStmt(x, em));
      em.emit(OP.JMP); const jmpPos = em.placeholder16(); const afterJmp = em.here();
      em.emitI16At(jmpPos, top - afterJmp);
      em.emitI16At(jzPos, em.here() - afterJZ);
      return;
    }
  }
}

export function compile(source) {
  const tokens = tokenize(source);
  const ast = parseProgram(tokens);
  const em = new Emitter();
  ast.forEach(s => emitStmt(s, em));
  em.emit(OP.HALT);
  return {
    bytecode: new Uint8Array(em.bytes),
    stringPool: em.stringPool.slice(0, em.poolNext),
  };
}
