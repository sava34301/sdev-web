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

import { tokenize, SdevError } from '../v2-lexer.mjs';
import { setModuleReader, defaultReadModule, prelink } from '../prelink.mjs';
import { desugarKinds, parse, parseWithKinds, parseProgram } from '../v2-parser.mjs';
import { collectSets as collectSetNames, resolveMethodReturnType } from '../v2-types.mjs';

export { setModuleReader, prelink, desugarKinds, parse, parseWithKinds };

const OP = {
  PUSH_I32: 0x01, PUSH_STR: 0x02, LOAD: 0x03, STORE: 0x04, POP: 0x05,
  ADD: 0x10, SUB: 0x11, MUL: 0x12, DIV: 0x13, MOD: 0x14,
  EQ: 0x20, NE: 0x21, LT: 0x22, GT: 0x23, LE: 0x24, GE: 0x25,
  NOT: 0x30, JMP: 0x40, JZ: 0x41, SAY_I32: 0x50, SAY_STR: 0x51,
  CALLV: 0xC4,
  CALL: 0x60, RET: 0x61, ENTER: 0x62, LOAD_LOC: 0x63, STORE_LOC: 0x64,
  ALLOC: 0x70, NEWLIST: 0x80, LGET: 0x81, LSET: 0x82, LEN: 0x83,
  SGET: 0x84, I2S: 0x87, CHR: 0x88, LNEW: 0x89, STREQ: 0x90, STRCAT: 0x91,
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
  // Milestone 5x — closures (lambdas capturing by value)
  CLOSURE: 0xC5,
  HALT: 0xFF,


};

// Transcendental math op codes for the FMATH opcode.
const FMATH_OP = { sin: 0, cos: 1, tan: 2, exp: 3, log: 4, pow: 5 };

// Builtins available as function-call syntax. Each maps to a single opcode
// sequence emitted inline. Arity is checked at compile time.
// `ret` is the compile-time result type used by scope typing.
const BUILTINS = {
  length:  { arity: 1, ret: 'int', emit: (em) => em.emit(OP.LEN) },
  len:     { arity: 1, ret: 'int', emit: (em) => em.emit(OP.LEN) },
  concat:  { arity: 2, ret: 'str', emit: (em) => em.emit(OP.STRCAT) },
  ord:     { arity: 2, ret: 'int', emit: (em) => em.emit(OP.SGET) },
  chr:     { arity: 1, ret: 'str', emit: (em) => em.emit(OP.CHR) },
  str:     { arity: 1, ret: 'str', emit: (em) => em.emit(OP.I2S) },
  text:    { arity: 1, ret: 'str', emit: (em) => em.emit(OP.I2S) },
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
  patchI32(pos, v) {
    this.bytes[pos] = v & 0xff; this.bytes[pos + 1] = (v >> 8) & 0xff;
    this.bytes[pos + 2] = (v >> 16) & 0xff; this.bytes[pos + 3] = (v >> 24) & 0xff;
  }
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
    em.functions.set(f.name, { arity: f.params.length, offset: -1, patchSites: [], refSites: [], retType: 'int' });
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
    for (const site of info.refSites)   em.patchI32(site, info.offset);
  }
}

const collectSets = (body, locals) =>
  collectSetNames(body, locals, (s) => [feList(s.d), feIdx(s.d), s.name]);

const feList = (d) => `_fe_l${d}`;
const feIdx  = (d) => `_fe_i${d}`;

function methodRetType(classes, functions, key) {
  return resolveMethodReturnType(classes, (fn) => functions.get(fn)?.retType, key);
}

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
      // Short-circuit and/or: both paths leave exactly one 0/1 value (mirrors lang/compiler/codegen.sdev).
      if (e.op === 'and') { emitExpr(e.l, em, locals); em.emit(OP.JZ); const fx = em.placeholder16(); const b1 = em.here(); emitExpr(e.r, em, locals); em.emit(OP.NOT); em.emit(OP.NOT); em.emit(OP.JMP); const fe = em.placeholder16(); const b2 = em.here(); em.patchI16(fx, em.here() - b1); em.emit(OP.PUSH_I32); em.emitI32(0); em.patchI16(fe, em.here() - b2); return 'int'; }
      if (e.op === 'or')  { emitExpr(e.l, em, locals); em.emit(OP.JZ); const fx = em.placeholder16(); const b1 = em.here(); em.emit(OP.PUSH_I32); em.emitI32(1); em.emit(OP.JMP); const fe = em.placeholder16(); const b2 = em.here(); em.patchI16(fx, em.here() - b1); emitExpr(e.r, em, locals); em.emit(OP.NOT); em.emit(OP.NOT); em.patchI16(fe, em.here() - b2); return 'int'; }
      // `xs + [a, b]` / `[a] + xs` joins lists via list_concat_two
      // (lang/stdlib/v2/list.sdev); mirrors lang/compiler/codegen.sdev.
      if (e.op === '+' && (e.l.k === 'list' || e.r.k === 'list')) {
        if (!em.functions.has('list_concat_two')) throw new SdevError('joining lists with + needs use "lang/stdlib/v2/list.sdev"', e.line ?? 0);
        emitExpr({ k: 'call', name: 'list_concat_two', args: [e.l, e.r] }, em, locals);
        return 'int';
      }
      const lk = emitExpr(e.l, em, locals);
      const rk = emitExpr(e.r, em, locals);
      // Promote `+` to STRCAT when either operand is a string literal.
      if (e.op === '+' && (lk === 'str' || rk === 'str')) { em.emit(OP.STRCAT); return 'str'; }
      if ((e.op === 'is' || e.op === 'isnot') && (lk === 'str' || rk === 'str')) {
        em.emit(OP.STREQ);
        if (e.op === 'isnot') em.emit(OP.NOT);
        return 'int';
      }
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
    // Milestone 5x: closure — captures are loaded in the *enclosing* scope,
    // the body is emitted inline behind a JMP, then CLOSURE boxes the pair.
    case 'lambda': {
      for (const c of e.caps) emitLoadName(c, em, locals);
      em.emit(OP.JMP); const overPos = em.placeholder16(); const afterOver = em.here();
      const bodyOff = em.here();
      const lLocals = new Map();
      for (const n of e.params) if (!lLocals.has(n)) lLocals.set(n, lLocals.size);
      for (const n of e.caps)   if (!lLocals.has(n)) lLocals.set(n, lLocals.size);
      const fixed = lLocals.size;
      collectSets(e.body, lLocals);
      const extra = lLocals.size - fixed;
      if (extra > 0) { em.emit(OP.ENTER); em.emit(extra); }
      for (const s of e.body) emitStmt(s, em, lLocals);
      em.emit(OP.PUSH_I32); em.emitI32(0); em.emit(OP.RET);
      em.patchI16(overPos, em.here() - afterOver);
      em.emit(OP.CLOSURE); em.emitU16(bodyOff); em.emit(e.caps.length);
      return 'int';
    }
    // Milestone 5y: `new NAME` — an object is a tome whose entries are the
    // class's methods, each stored as a function value.
    case 'new': {
      const ms = em.classes ? em.classes.get(e.cls) : null;
      if (!ms) throw new SdevError(`unknown kind ${e.cls}`, e.line);
      em.emit(OP.TNEW); em.emitU16(ms.length);
      for (const mm of ms) {
        em.emit(OP.PUSH_STR);
        const off = em.intern(mm.key);
        em.emit(off & 0xff); em.emit((off >> 8) & 0xff);
        const info = em.functions.get(mm.fn);
        if (!info) throw new SdevError(`kind ${e.cls}: missing method ${mm.key}`, e.line);
        em.emit(OP.PUSH_I32);
        const site = em.here();
        em.emitI32(0);
        info.refSites.push(site);
        em.emit(OP.TSET);
      }
      return 'tome';
    }
    case 'field': {
      emitExpr(e.target, em, locals);
      em.emit(OP.PUSH_STR);
      const off = em.intern(e.name);
      em.emit(off & 0xff); em.emit((off >> 8) & 0xff);
      em.emit(OP.TGET);
      return 'int';
    }
    // `obj.method(a, b)` — the receiver is passed as the first argument and
    // the target is read out of the object's tome, then called indirectly.
    case 'mcall': {
      emitLoadName(e.recv, em, locals);
      for (const a of e.args) emitExpr(a, em, locals);
      emitLoadName(e.recv, em, locals);
      em.emit(OP.PUSH_STR);
      const off = em.intern(e.m);
      em.emit(off & 0xff); em.emit((off >> 8) & 0xff);
      em.emit(OP.TGET);
      em.emit(OP.CALLV);
      em.emit(e.args.length + 1);
      return methodRetType(em.classes, em.functions, e.m);
    }
    // Milestone 5w: function value — PUSH_I32 with the callee's code offset.
    case 'ref': {
      const info = em.functions.get(e.name);
      if (!info) throw new SdevError(`unknown function ${e.name}`, 0);
      em.emit(OP.PUSH_I32);
      const site = em.here();
      em.emitI32(0);
      info.refSites.push(site);
      return 'int';
    }
    case 'callv': {
      for (const a of e.args) emitExpr(a, em, locals);
      emitExpr(e.target, em, locals);
      em.emit(OP.CALLV);
      em.emit(e.args.length);
      return 'int';
    }
    case 'call': {
      const bi = BUILTINS[e.name];
      if (bi) {
        if (e.args.length !== bi.arity) throw new SdevError(`${e.name}: expected ${bi.arity} args, got ${e.args.length}`, e.line ?? 0);
        let argKind = 'int';
        for (const a of e.args) argKind = emitExpr(a, em, locals);
        // Strings already carry their text; do not format their numeric address.
        if (!((e.name === 'str' || e.name === 'text') && argKind === 'str')) bi.emit(em);
        // `values(t)` mirrors the tome's value kind onto the produced list.
        if (e.name === 'values') return argKind === 'tomestr' ? 'liststr' : 'int';
        return bi.ret;
      }
      const info = em.functions.get(e.name);
      if (!info) throw new SdevError(`unknown function ${e.name}`, e.line ?? 0);
      if (e.args.length !== info.arity) throw new SdevError(`${e.name}: expected ${info.arity} args, got ${e.args.length}`, e.line ?? 0);
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
    case 'new':   return 'tome';
    case 'field': return 'int';
    case 'mcall': return methodRetType(fnTypes._classes, fnTypes, e.m);
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
    // Milestone 5y: `set obj.field to v`.
    case 'setField': {
      emitLoadName(s.name, em, locals);
      em.emit(OP.PUSH_STR);
      const off = em.intern(s.field);
      em.emit(off & 0xff); em.emit((off >> 8) & 0xff);
      emitExpr(s.expr, em, locals);
      em.emit(OP.TSET);
      em.emit(OP.POP);
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

export function compile(source, opts = {}) {
  const src = prelink(source, opts.readModule ?? defaultReadModule);
  const tokens = tokenize(src);
  const classes = desugarKinds(tokens);
  const ast = parseProgram(tokens);
  const em = new Emitter();
  em.classes = classes;
  em.functions._classes = classes;   // read by the inference pass
  emit(ast, em);
  return {
    bytecode: new Uint8Array(em.bytes),
    stringPool: em.stringPool.slice(0, em.poolNext),
  };
}
