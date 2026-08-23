// SDEV → x86-64 GAS assembly (AT&T syntax, Linux SysV ABI).
//
// Emits a *.s* file that, when assembled with `as` and linked with `ld`
// against lang/native/runtime.s, produces a static ELF that runs the
// bootstrap subset of SDEV (integers, if/while, functions, recursion, say).
//
// This is the "desktop / out-of-browser" backend. The browser IDE keeps
// using the WASM seed VM. Both backends share the SAME parser
// (lang/bootstrap/compile.mjs → parse), so a program that runs in the
// browser under V2-WASM will produce the same output as a native ELF.
//
// Calling convention: params passed on the stack (right→left), caller
// cleans up. Return value in %rax. All values are 64-bit signed integers.
// Local slot N lives at -8*(N+1)(%rbp). We reserve up to 16 locals per fn.

import { parseWithKinds } from '../bootstrap/compile.mjs';

const LOCAL_SLOTS = 32;


// ---------------------------------------------------------------------------
// Milestone 6c — static value kinds.
//
// Native values are all 64-bit words. A word is either an integer, a pointer
// to a heap string ([i64 len][bytes]) or a pointer to a heap list
// ([i64 count][words]). Which one it is has to be decided at compile time,
// exactly like the WASM codegen does, so `say` can pick say_str vs say_int
// and `+` can pick addq vs sdev_concat.
// ---------------------------------------------------------------------------

const STR_BUILTINS = new Set(['concat', 'chr', 'str', 'upper', 'lower', 'trim', 'replace', 'substring', 'join']);
const INT_BUILTINS = new Set(['length', 'ord', 'abs', 'contains', 'index_of', 'has', 'min', 'max', 'int']);
const LIST_BUILTINS = new Set(['list_new', 'mklist', 'split', 'keys', 'values']);
const TOME_BUILTINS = new Set(['tome_new', 'tset']);
// Milestone 6e — builtins that yield an IEEE-754 double (raw bits in a word).
const FLOAT_BUILTINS = new Set(['sqrt', 'floor', 'ceil', 'round', 'sin', 'cos',
  'exp', 'log', 'pow', 'random', 'num']);

// The 64-bit pattern of a double, as an unsigned decimal for `movabsq`.
function f64bits(v) {
  const b = new DataView(new ArrayBuffer(8));
  b.setFloat64(0, v, true);
  return b.getBigUint64(0, true).toString();
}

function typeOf(e, tys, fnTypes) {
  switch (e.k) {
    case 'fnum': return 'float';
    case 'str': return 'str';
    case 'list': return 'list';
    case 'tome': return 'tome';
    // Milestone 6f: an object is a tome; a function value is an opaque word.
    case 'new': return 'tome';
    case 'ref': case 'lambda': return 'int';
    case 'callv':
      return (e.target.k === 'ident' && tys.get(`@fnval:${e.target.name}`)) || 'int';

    case 'field': return (fnTypes && fnTypes.get(`@field:${e.name}`)) || 'int';
    case 'mcall': return methodRetType(fnTypes, e.m);
    case 'ident': return tys.get(e.name) || 'int';
    case 'index': {
      // Milestone 6d: a tome read yields the kind stored under that key; a
      // list read yields the list's recorded element kind.
      const tt = typeOf(e.target, tys, fnTypes);
      if (tt === 'tome') return tys.get(tomeValKey(e)) || 'int';
      const base = e.target.k === 'ident' ? e.target.name : null;
      return (base && tys.get(`@elem:${base}`)) || 'int';
    }
    case 'un': return e.op === '-' ? typeOf(e.x, tys, fnTypes) : 'int';
    case 'bin':
      if (e.op === '+') {
        if (typeOf(e.l, tys, fnTypes) === 'str' || typeOf(e.r, tys, fnTypes) === 'str') return 'str';
      }
      if ('+-*/'.includes(e.op) && e.op.length === 1 &&
          (typeOf(e.l, tys, fnTypes) === 'float' || typeOf(e.r, tys, fnTypes) === 'float')) return 'float';
      return 'int';
    case 'call':
      if (FLOAT_BUILTINS.has(e.name)) return 'float';
      if (STR_BUILTINS.has(e.name)) return 'str';
      if (LIST_BUILTINS.has(e.name)) return 'list';
      if (TOME_BUILTINS.has(e.name)) return 'tome';
      if (INT_BUILTINS.has(e.name)) return 'int';
      return (fnTypes && fnTypes.get(e.name)) || 'int';
    default: return 'int';
  }
}

// Milestone 6f — a method call is typed by name, exactly like the WASM
// backend: the receiver's class is not tracked statically, so any declared
// method of that name that returns text makes the call string-typed.
function methodRetType(fnTypes, key) {
  if (!fnTypes) return 'int';
  const classes = fnTypes._classes;
  if (!classes) return 'int';
  for (const ms of classes.values()) {
    for (const mm of ms) {
      if (mm.key !== key) continue;
      const t = fnTypes.get(mm.fn);
      if (t && t !== 'int') return t;
    }
  }
  return 'int';
}


// The kind of the elements a list-valued expression holds, as far as the
// compiler can tell statically.
function elemTypeOf(e, tys, fnTypes) {
  if (e.k === 'list') return e.items.length ? typeOf(e.items[0], tys, fnTypes) : 'int';
  if (e.k === 'call' && (e.name === 'split' || e.name === 'keys')) return 'str';
  if (e.k === 'ident') return tys.get(`@elem:${e.name}`) || 'int';
  return 'int';
}

// Key under which the value kind of `t["k"]` is remembered, so
// `set t["name"] to "ada"` followed by `say t["name"]` prints text.
function tomeValKey(e) {
  const base = e.target.k === 'ident' ? e.target.name : '?';
  const k = e.idx && e.idx.k === 'str' ? e.idx.v : '?';
  return `@tome:${base}:${k}`;
}


// Return type of each user function: the join of its `return` expressions,
// evaluated with the types known for its own assignments. Params are ints.
function inferFnTypes(funcs, mainBody = [], classes = null) {
  const fnTypes = new Map();
  fnTypes._classes = classes;
  const byName = new Map(funcs.map(f => [f.name, f]));

  // Milestone 6e: parameter kinds are inferred from call sites, so a function
  // that is only ever called with floats treats its parameter as a float.
  const noteCalls = (e, tys) => {
    if (!e || typeof e !== 'object') return;
    if (e.k === 'call') {
      const f = byName.get(e.name);
      if (f) {
        e.args.forEach((arg, i) => {
          const t = typeOf(arg, tys, fnTypes);
          const key = `@param:${e.name}:${i}`;
          if (t !== 'int' && !fnTypes.has(key)) fnTypes.set(key, t);
        });
      }
      (e.args || []).forEach(a => noteCalls(a, tys));
      return;
    }
    for (const v of Object.values(e)) {
      if (Array.isArray(v)) v.forEach(x => noteCalls(x, tys));
      else if (v && typeof v === 'object') noteCalls(v, tys);
    }
  };
  for (let pass = 0; pass < 3; pass++) {
    for (const f of [...funcs, { name: null, params: [], body: mainBody }]) {
      const tys = new Map();
      for (const [i, p] of (f.params || []).entries()) {
        const t = f.name && fnTypes.get(`@param:${f.name}:${i}`);
        if (t) tys.set(p, t);
      }
      let t = 'int';
      const walk = (body) => {
        for (const s of body) {
          noteCalls(s, tys);
          if (s.k === 'set') tys.set(s.name, typeOf(s.expr, tys, fnTypes));
          // Milestone 6f: remember the kind written into each field name, so
          // `say p.name` picks say_str.
          if (s.k === 'setField') {
            const ft = typeOf(s.expr, tys, fnTypes);
            if (ft !== 'int') fnTypes.set(`@field:${s.field}`, ft);
          }
          if (s.k === 'if') { walk(s.then_); if (s.else_) walk(s.else_); }
          if (s.k === 'while') walk(s.body);
          if (s.k === 'foreach') walk(s.body);
          if (s.k === 'attempt') {
            walk(s.body);
            if (s.errName) tys.set(s.errName, 'str');
            walk(s.rescue_);
          }
          if (s.k === 'return' && s.expr) {
            const rt = typeOf(s.expr, tys, fnTypes);
            if (rt !== 'int') t = rt;
          }
        }
      };

      walk(f.body);
      if (f.name) fnTypes.set(f.name, t);
    }
  }
  return fnTypes;
}

class NativeEmitter {
  constructor() {
    this.lines = [];
    this.strings = new Map();   // literal → label
    this.globals = new Map();   // name → .bss label
    this.functions = new Map(); // name → { arity, label }
    this.classes = new Map();   // Milestone 6f: kind name → methods
    this.lambdas = [];          // Milestone 6f: pending closure bodies
    this.labelSeq = 0;
  }

  L(s = '') { this.lines.push(s); }
  gensym(prefix) { return `.L${prefix}${this.labelSeq++}`; }
  strLabel(s) {
    if (this.strings.has(s)) return this.strings.get(s);
    const lbl = `.LC${this.strings.size}`;
    this.strings.set(s, lbl);
    return lbl;
  }
  globalLabel(name) {
    if (!this.globals.has(name)) {
      // Hidden loop variables use '@' in their names; asm labels cannot.
      this.globals.set(name, `sdev_g_${name.replace(/[^A-Za-z0-9_]/g, '_')}`);
    }
    return this.globals.get(name);
  }
}

function emitExpr(e, em, locals, tys = new Map(), fnTypes = new Map()) {
  // Every expression leaves its value in %rax.
  switch (e.k) {
    case 'num':
      em.L(`    movq $${e.v|0}, %rax`);
      return;
    case 'fnum':
      em.L(`    movabsq $${f64bits(e.v)}, %rax`);
      return;
    case 'str': {
      const lbl = em.strLabel(e.v);
      em.L(`    leaq ${lbl}(%rip), %rax`);
      return;
    }
    case 'ident':
      if (locals && locals.has(e.name)) {
        const slot = locals.get(e.name);
        em.L(`    movq -${8 * (slot + 1)}(%rbp), %rax`);
      } else {
        em.L(`    movq ${em.globalLabel(e.name)}(%rip), %rax`);
      }
      return;
    case 'un':
      if (e.op === '-') {
        emitExpr(e.x, em, locals, tys, fnTypes);
        if (typeOf(e.x, tys, fnTypes) === 'float') {
          // Flip the IEEE-754 sign bit.
          em.L('    movabsq $-9223372036854775808, %rcx');
          em.L('    xorq %rcx, %rax');
        } else {
          em.L('    negq %rax');
        }
        return;
      }
      if (e.op === 'not') {
        emitExpr(e.x, em, locals, tys, fnTypes);
        em.L('    testq %rax, %rax');
        em.L('    sete %al');
        em.L('    movzbq %al, %rax');
        return;
      }
      break;
    case 'list': {
      // list_literal: [a, b, c] → alloc(8 + 8n), store count, then fill.
      em.L(`    movq $${8 + 8 * e.items.length}, %rdi`);
      em.L('    call sdev_alloc');
      em.L(`    movq $${e.items.length}, (%rax)`);
      em.L('    pushq %rax');
      e.items.forEach((it, i) => {
        emitExpr(it, em, locals, tys, fnTypes);
        em.L('    movq (%rsp), %rcx');
        em.L(`    movq %rax, ${8 + 8 * i}(%rcx)`);
      });
      em.L('    popq %rax');
      return;
    }
    case 'tome': {
      // Milestone 6d: { k: v, ... } → tnew + one tset per pair.
      em.L('    call sdev_tnew');
      em.L('    pushq %rax');
      for (const pr of e.pairs) {
        emitExpr(pr.key, em, locals, tys, fnTypes);
        em.L('    pushq %rax');
        emitExpr(pr.val, em, locals, tys, fnTypes);
        em.L('    movq %rax, %rdx');
        em.L('    popq %rsi');
        em.L('    movq (%rsp), %rdi');
        em.L('    call sdev_tset');
      }
      em.L('    popq %rax');
      return;
    }
    case 'index': {
      const isTome = typeOf(e.target, tys, fnTypes) === 'tome';
      emitExpr(e.target, em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitExpr(e.idx, em, locals, tys, fnTypes);
      em.L('    popq %rcx');
      if (isTome) {
        // tome_get: string key lookup.
        em.L('    movq %rcx, %rdi');
        em.L('    movq %rax, %rsi');
        em.L('    call sdev_tget');
      } else {
        // list_get: load the i-th word past the count header.
        em.L('    movq 8(%rcx,%rax,8), %rax');
      }
      return;
    }
    case 'bin': {
      if (e.op === '+' && typeOf(e, tys, fnTypes) === 'str') {
        emitStrExpr(e.l, em, locals, tys, fnTypes);
        em.L('    pushq %rax');
        emitStrExpr(e.r, em, locals, tys, fnTypes);
        em.L('    movq %rax, %rsi');
        em.L('    popq %rdi');
        em.L('    call sdev_concat');
        return;
      }
      if ((e.op === 'is' || e.op === 'isnot') &&
          (typeOf(e.l, tys, fnTypes) === 'str' || typeOf(e.r, tys, fnTypes) === 'str')) {
        // Milestone 6d: text compares by value, not by pointer.
        emitStrExpr(e.l, em, locals, tys, fnTypes);
        em.L('    pushq %rax');
        emitStrExpr(e.r, em, locals, tys, fnTypes);
        em.L('    movq %rax, %rsi');
        em.L('    popq %rdi');
        em.L('    call sdev_str_eq');
        if (e.op === 'isnot') {
          em.L('    testq %rax, %rax');
          em.L('    sete %al');
          em.L('    movzbq %al, %rax');
        }
        return;
      }
      {
        const lf = typeOf(e.l, tys, fnTypes) === 'float';
        const rf = typeOf(e.r, tys, fnTypes) === 'float';
        const FOPS = { '+': 'addsd', '-': 'subsd', '*': 'mulsd', '/': 'divsd' };
        const FCMP = { 'is': 'sete', 'isnot': 'setne', '<': 'setb', '>': 'seta', '<=': 'setbe', '>=': 'setae' };
        if ((lf || rf) && (FOPS[e.op] || FCMP[e.op])) {
          emitFloatExpr(e.l, em, locals, tys, fnTypes);
          em.L('    pushq %rax');
          emitFloatExpr(e.r, em, locals, tys, fnTypes);
          em.L('    movq %rax, %xmm1');
          em.L('    popq %rax');
          em.L('    movq %rax, %xmm0');
          if (FOPS[e.op]) {
            em.L(`    ${FOPS[e.op]} %xmm1, %xmm0`);
            em.L('    movq %xmm0, %rax');
          } else {
            em.L('    ucomisd %xmm1, %xmm0');
            em.L(`    ${FCMP[e.op]} %al`);
            em.L('    movzbq %al, %rax');
          }
          return;
        }
      }
      if (e.op === 'and' || e.op === 'or') {
        const short = em.gensym(e.op);
        emitExpr(e.l, em, locals, tys, fnTypes);
        em.L('    testq %rax, %rax');
        em.L(`    ${e.op === 'and' ? 'jz' : 'jnz'} ${short}`);
        emitExpr(e.r, em, locals, tys, fnTypes);
        em.L(`${short}:`);
        return;
      }
      emitExpr(e.l, em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitExpr(e.r, em, locals, tys, fnTypes);
      em.L('    movq %rax, %rcx');
      em.L('    popq %rax');            // %rax = L, %rcx = R
      switch (e.op) {
        case '+': em.L('    addq %rcx, %rax'); return;
        case '-': em.L('    subq %rcx, %rax'); return;
        case '*': em.L('    imulq %rcx, %rax'); return;
        case '/': em.L('    cqto'); em.L('    idivq %rcx'); return;
        case '%': em.L('    cqto'); em.L('    idivq %rcx'); em.L('    movq %rdx, %rax'); return;
        case 'is':    return emitCmp(em, 'sete');
        case 'isnot': return emitCmp(em, 'setne');
        case '<':     return emitCmp(em, 'setl');
        case '>':     return emitCmp(em, 'setg');
        case '<=':    return emitCmp(em, 'setle');
        case '>=':    return emitCmp(em, 'setge');
      }
      break;
    }
    case 'call': {
      if (emitBuiltin(e, em, locals, tys, fnTypes)) return;
      const info = em.functions.get(e.name);
      if (!info) throw new Error(`native: unknown function ${e.name}`);
      if (e.args.length !== info.arity) throw new Error(`native: ${e.name} arity`);
      // Push args right-to-left (SysV-ish, but our own convention).
      for (let i = e.args.length - 1; i >= 0; i--) {
        emitExpr(e.args[i], em, locals, tys, fnTypes);
        em.L('    pushq %rax');
      }
      em.L(`    call ${info.label}`);
      if (e.args.length > 0) em.L(`    addq $${e.args.length * 8}, %rsp`);
      return;
    }
    // ---- Milestone 6f: first-class functions, closures, objects ----
    //
    // A function value is a heap closure: [i64 code ptr][i64 ncaps][caps...].
    // Calls through a value put the closure pointer in %r10; a lambda body
    // copies its captures out of %r10 in its prologue, so the argument
    // convention (args pushed right-to-left) is unchanged.
    case 'ref': {
      const info = em.functions.get(e.name);
      if (!info) throw new Error(`native: unknown function ${e.name}`);
      em.L('    movq $16, %rdi');
      em.L('    call sdev_alloc');
      em.L(`    leaq ${info.label}(%rip), %rcx`);
      em.L('    movq %rcx, (%rax)');
      em.L('    movq $0, 8(%rax)');
      return;
    }
    case 'lambda': {
      const label = `sdev_lam_${em.lambdas.length}`;
      em.lambdas.push({ label, params: e.params, caps: e.caps, body: e.body, tys: new Map(tys) });
      em.L(`    movq $${16 + 8 * e.caps.length}, %rdi`);
      em.L('    call sdev_alloc');
      em.L(`    leaq ${label}(%rip), %rcx`);
      em.L('    movq %rcx, (%rax)');
      em.L(`    movq $${e.caps.length}, 8(%rax)`);
      em.L('    pushq %rax');
      e.caps.forEach((c, i) => {
        emitExpr({ k: 'ident', name: c }, em, locals, tys, fnTypes);
        em.L('    movq (%rsp), %rcx');
        em.L(`    movq %rax, ${16 + 8 * i}(%rcx)`);
      });
      em.L('    popq %rax');
      return;
    }
    case 'callv': {
      for (let i = e.args.length - 1; i >= 0; i--) {
        emitExpr(e.args[i], em, locals, tys, fnTypes);
        em.L('    pushq %rax');
      }
      emitExpr(e.target, em, locals, tys, fnTypes);
      em.L('    movq %rax, %r10');
      em.L('    movq (%r10), %rax');
      em.L('    call *%rax');
      if (e.args.length > 0) em.L(`    addq $${e.args.length * 8}, %rsp`);
      return;
    }
    case 'new': {
      const ms = em.classes.get(e.cls);
      if (!ms) throw new Error(`native: unknown kind ${e.cls}`);
      em.L('    call sdev_tnew');
      em.L('    pushq %rax');
      for (const mm of ms) {
        const info = em.functions.get(mm.fn);
        if (!info) throw new Error(`native: kind ${e.cls} missing method ${mm.key}`);
        em.L('    movq $16, %rdi');
        em.L('    call sdev_alloc');
        em.L(`    leaq ${info.label}(%rip), %rcx`);
        em.L('    movq %rcx, (%rax)');
        em.L('    movq $0, 8(%rax)');
        em.L('    movq %rax, %rdx');
        em.L(`    leaq ${em.strLabel(mm.key)}(%rip), %rsi`);
        em.L('    movq (%rsp), %rdi');
        em.L('    call sdev_tset');
      }
      em.L('    popq %rax');
      return;
    }
    case 'field': {
      emitExpr(e.target, em, locals, tys, fnTypes);
      em.L('    movq %rax, %rdi');
      em.L(`    leaq ${em.strLabel(e.name)}(%rip), %rsi`);
      em.L('    call sdev_tget');
      return;
    }
    case 'mcall': {
      // Push args right-to-left, then the receiver, so `self` is arg 0.
      for (let i = e.args.length - 1; i >= 0; i--) {
        emitExpr(e.args[i], em, locals, tys, fnTypes);
        em.L('    pushq %rax');
      }
      emitExpr({ k: 'ident', name: e.recv }, em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitExpr({ k: 'ident', name: e.recv }, em, locals, tys, fnTypes);
      em.L('    movq %rax, %rdi');
      em.L(`    leaq ${em.strLabel(e.m)}(%rip), %rsi`);
      em.L('    call sdev_tget');
      em.L('    movq %rax, %r10');
      em.L('    movq (%r10), %rax');
      em.L('    call *%rax');
      em.L(`    addq $${(e.args.length + 1) * 8}, %rsp`);
      return;
    }
  }
  throw new Error(`native: cannot compile ${e.k}`);
}


// Evaluate `e` and leave a *string pointer* in %rax, converting ints on the
// fly. This is what makes `"n=" + 3` work natively.
function emitStrExpr(e, em, locals, tys, fnTypes) {
  emitExpr(e, em, locals, tys, fnTypes);
  const t = typeOf(e, tys, fnTypes);
  if (t !== 'str') {
    em.L('    movq %rax, %rdi');
    em.L(`    call ${t === 'float' ? 'sdev_str_float' : 'sdev_str_int'}`);
  }
}

// Evaluate `e` and leave *double bits* in %rax, widening integers on the fly.
function emitFloatExpr(e, em, locals, tys, fnTypes) {
  emitExpr(e, em, locals, tys, fnTypes);
  if (typeOf(e, tys, fnTypes) !== 'float') {
    em.L('    cvtsi2sdq %rax, %xmm0');
    em.L('    movq %xmm0, %rax');
  }
}

// Milestone 6c builtins. Returns true when it handled the call.
function emitBuiltin(e, em, locals, tys, fnTypes) {
  const n = e.name;
  const a = e.args;
  const one = () => emitExpr(a[0], em, locals, tys, fnTypes);
  switch (n) {
    case 'length':            // length(x) — strings and lists share the header
      one();
      em.L('    movq (%rax), %rax');
      return true;
    case 'abs':
      one();
      em.L('    movq %rax, %rcx');
      em.L('    sarq $63, %rcx');
      em.L('    xorq %rcx, %rax');
      em.L('    subq %rcx, %rax');
      return true;
    case 'ord':               // ord(s, i) — byte at index i
      one();
      em.L('    pushq %rax');
      emitExpr(a[1], em, locals, tys, fnTypes);
      em.L('    popq %rcx');
      em.L('    movzbq 8(%rcx,%rax,1), %rax');
      return true;
    case 'chr':
      one();
      em.L('    movq %rax, %rdi');
      em.L('    call sdev_chr');
      return true;
    case 'str':
      emitStrExpr(a[0], em, locals, tys, fnTypes);
      return true;
    // ---- Milestone 6e: floats ----
    case 'sqrt': case 'floor': case 'ceil': case 'round':
    case 'sin': case 'cos': case 'exp': case 'log': {
      emitFloatExpr(a[0], em, locals, tys, fnTypes);
      em.L('    movq %rax, %rdi');
      em.L(`    call sdev_f${n}`);
      return true;
    }
    case 'pow': {
      emitFloatExpr(a[0], em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitFloatExpr(a[1], em, locals, tys, fnTypes);
      em.L('    movq %rax, %rsi');
      em.L('    popq %rdi');
      em.L('    call sdev_fpow');
      return true;
    }
    case 'random':
      em.L('    call sdev_random');
      return true;
    case 'num':
      emitStrExpr(a[0], em, locals, tys, fnTypes);
      em.L('    movq %rax, %rdi');
      em.L('    call sdev_num');
      return true;
    case 'int': {                   // int(f) — truncate a float toward zero
      emitFloatExpr(a[0], em, locals, tys, fnTypes);
      em.L('    movq %rax, %xmm0');
      em.L('    cvttsd2si %xmm0, %rax');
      return true;
    }
    case 'list_new':
    case 'mklist': {          // list_new(n) — n zeroed slots
      one();
      em.L('    pushq %rax');
      em.L('    leaq 8(,%rax,8), %rdi');
      em.L('    call sdev_alloc');
      em.L('    popq %rcx');
      em.L('    movq %rcx, (%rax)');
      return true;
    }
    // ---- Milestone 6d: strings ----
    case 'upper':
    case 'lower':
    case 'trim':
      one();
      em.L('    movq %rax, %rdi');
      em.L(`    call sdev_${n}`);
      return true;
    case 'contains':
    case 'index_of':
    case 'split': {
      emitStrExpr(a[0], em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitStrExpr(a[1], em, locals, tys, fnTypes);
      em.L('    movq %rax, %rsi');
      em.L('    popq %rdi');
      em.L(`    call sdev_${n === 'index_of' ? 'index_of' : n}`);
      return true;
    }
    case 'join': {
      emitExpr(a[0], em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitStrExpr(a[1], em, locals, tys, fnTypes);
      em.L('    movq %rax, %rsi');
      em.L('    popq %rdi');
      em.L('    call sdev_join');
      return true;
    }
    case 'replace': {
      emitStrExpr(a[0], em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitStrExpr(a[1], em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitStrExpr(a[2], em, locals, tys, fnTypes);
      em.L('    movq %rax, %rdx');
      em.L('    popq %rsi');
      em.L('    popq %rdi');
      em.L('    call sdev_replace');
      return true;
    }
    case 'substring': {
      emitStrExpr(a[0], em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitExpr(a[1], em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitExpr(a[2], em, locals, tys, fnTypes);
      em.L('    movq %rax, %rdx');
      em.L('    popq %rsi');
      em.L('    popq %rdi');
      em.L('    call sdev_substr');
      return true;
    }
    // ---- Milestone 6d: integer math ----
    case 'min':
    case 'max': {
      emitExpr(a[0], em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitExpr(a[1], em, locals, tys, fnTypes);
      em.L('    popq %rcx');
      em.L('    cmpq %rax, %rcx');
      em.L(`    ${n === 'min' ? 'cmovlq' : 'cmovgq'} %rcx, %rax`);
      return true;
    }
    // ---- Milestone 6d: tomes ----
    case 'tome_new':
      em.L('    call sdev_tnew');
      return true;
    case 'keys':
    case 'values':
      one();
      em.L('    movq %rax, %rdi');
      em.L(`    call sdev_t${n === 'keys' ? 'keys' : 'vals'}`);
      return true;
    case 'has': {
      emitExpr(a[0], em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitStrExpr(a[1], em, locals, tys, fnTypes);
      em.L('    movq %rax, %rsi');
      em.L('    popq %rdi');
      em.L('    call sdev_thas');
      return true;
    }
    default:
      return false;
  }
}

function emitCmp(em, setInstr) {
  em.L('    cmpq %rcx, %rax');
  em.L(`    ${setInstr} %al`);
  em.L('    movzbq %al, %rax');
}

function emitStmt(s, em, locals, ctx) {
  const tys = ctx.tys;
  const fnTypes = ctx.fnTypes;
  switch (s.k) {
    case 'say': {
      // Milestone 6c: pick say_str vs say_int from the inferred value kind,
      // not just from "is this a literal".
      const st = typeOf(s.expr, tys, fnTypes);
      emitExpr(s.expr, em, locals, tys, fnTypes);
      em.L(`    movq %rax, %rdi`);
      em.L(`    call ${st === 'str' ? 'sdev_say_str' : st === 'float' ? 'sdev_say_float' : 'sdev_say_int'}`);
      return;
    }
    case 'setIndex': {
      const target = { k: 'ident', name: s.name };
      const isTome = typeOf(target, tys, fnTypes) === 'tome';
      if (isTome) {
        tys.set(tomeValKey({ target, idx: s.idx }), typeOf(s.expr, tys, fnTypes));
      }
      emitExpr(target, em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitExpr(s.idx, em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitExpr(s.expr, em, locals, tys, fnTypes);
      if (isTome) {
        em.L('    movq %rax, %rdx');    // value
        em.L('    popq %rsi');          // key
        em.L('    popq %rdi');          // tome
        em.L('    call sdev_tset');
      } else {
        em.L('    popq %rdx');          // index
        em.L('    popq %rcx');          // list
        em.L('    movq %rax, 8(%rcx,%rdx,8)');
      }
      return;
    }
    case 'foreach': {
      // Milestone 6d: `for each x in xs ... end` over a list (or a tome's
      // keys), lowered to a counted index loop over two hidden slots.
      const iterTy = typeOf(s.iter, tys, fnTypes);
      const idxName = `@fe_i${s.d}`;
      const seqName = `@fe_s${s.d}`;
      const seqExpr = iterTy === 'tome'
        ? { k: 'call', name: 'keys', args: [s.iter] }
        : s.iter;
      emitStmt({ k: 'set', name: seqName, expr: seqExpr }, em, locals, ctx);
      emitStmt({ k: 'set', name: idxName, expr: { k: 'num', v: 0 } }, em, locals, ctx);
      const top = em.gensym('fetop');
      const end = em.gensym('feend');
      em.L(`${top}:`);
      emitExpr({ k: 'ident', name: idxName }, em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitExpr({ k: 'call', name: 'length', args: [{ k: 'ident', name: seqName }] }, em, locals, tys, fnTypes);
      em.L('    movq %rax, %rcx');
      em.L('    popq %rax');
      em.L('    cmpq %rcx, %rax');
      em.L(`    jge ${end}`);
      emitStmt({
        k: 'set',
        name: s.name,
        expr: { k: 'index', target: { k: 'ident', name: seqName }, idx: { k: 'ident', name: idxName } },
      }, em, locals, ctx);
      if (iterTy === 'tome') tys.set(s.name, 'str');
      const cont = em.gensym('fecont');
      (ctx.loops ||= []).push({ brk: end, cont });
      s.body.forEach(x => emitStmt(x, em, locals, ctx));
      ctx.loops.pop();
      em.L(`${cont}:`);
      emitStmt({
        k: 'set',
        name: idxName,
        expr: { k: 'bin', op: '+', l: { k: 'ident', name: idxName }, r: { k: 'num', v: 1 } },
      }, em, locals, ctx);
      em.L(`    jmp ${top}`);
      em.L(`${end}:`);
      return;
    }

    case 'set': {
      // Milestone 6f: remember what a function value returns so `call f(...)`
      // can pick the right printer.
      if (s.expr.k === 'ref') {
        tys.set(`@fnval:${s.name}`, fnTypes.get(s.expr.name) || 'int');
      } else if (s.expr.k === 'lambda') {
        let rt = 'int';
        for (const st of s.expr.body) {
          if (st.k === 'return' && st.expr) { rt = typeOf(st.expr, tys, fnTypes); break; }
        }
        tys.set(`@fnval:${s.name}`, rt);
      }
      tys.set(s.name, typeOf(s.expr, tys, fnTypes));

      if (typeOf(s.expr, tys, fnTypes) === 'list') {
        tys.set(`@elem:${s.name}`, elemTypeOf(s.expr, tys, fnTypes));
      }
      if (s.expr.k === 'tome') {
        // Remember the kind of every literal entry so `say t["name"]` can
        // pick say_str vs say_int.
        for (const pr of s.expr.pairs) {
          if (pr.key.k === 'str') {
            tys.set(`@tome:${s.name}:${pr.key.v}`, typeOf(pr.val, tys, fnTypes));
          }
        }
      }
      emitExpr(s.expr, em, locals, tys, fnTypes);
      if (locals && locals.has(s.name)) {
        const slot = locals.get(s.name);
        em.L(`    movq %rax, -${8 * (slot + 1)}(%rbp)`);
      } else {
        em.L(`    movq %rax, ${em.globalLabel(s.name)}(%rip)`);
      }
      return;
    }
    case 'if': {
      const elseL = em.gensym('else');
      const endL = em.gensym('endif');
      emitExpr(s.cond, em, locals, tys, fnTypes);
      em.L('    testq %rax, %rax');
      em.L(`    jz ${elseL}`);
      s.then_.forEach(x => emitStmt(x, em, locals, ctx));
      em.L(`    jmp ${endL}`);
      em.L(`${elseL}:`);
      if (s.else_) s.else_.forEach(x => emitStmt(x, em, locals, ctx));
      em.L(`${endL}:`);
      return;
    }
    case 'while': {
      const top = em.gensym('wtop');
      const end = em.gensym('wend');
      em.L(`${top}:`);
      emitExpr(s.cond, em, locals, tys, fnTypes);
      em.L('    testq %rax, %rax');
      em.L(`    jz ${end}`);
      (ctx.loops ||= []).push({ brk: end, cont: top });
      s.body.forEach(x => emitStmt(x, em, locals, ctx));
      ctx.loops.pop();
      em.L(`    jmp ${top}`);
      em.L(`${end}:`);
      return;
    }
    // ---- Milestone 6f ----
    case 'break':
    case 'continue': {
      const loop = (ctx.loops || [])[(ctx.loops || []).length - 1];
      if (!loop) throw new Error(`native: ${s.k} outside of a loop`);
      em.L(`    jmp ${s.k === 'break' ? loop.brk : loop.cont}`);
      return;
    }
    case 'setField': {
      const ft = typeOf(s.expr, tys, fnTypes);
      if (ft !== 'int') fnTypes.set(`@field:${s.field}`, ft);
      emitExpr({ k: 'ident', name: s.name }, em, locals, tys, fnTypes);
      em.L('    pushq %rax');
      emitExpr(s.expr, em, locals, tys, fnTypes);
      em.L('    movq %rax, %rdx');
      em.L(`    leaq ${em.strLabel(s.field)}(%rip), %rsi`);
      em.L('    popq %rdi');
      em.L('    call sdev_tset');
      return;
    }
    // `attempt … rescue err … end` — the handler stack lives in the runtime;
    // a throw restores the saved %rsp/%rbp and jumps straight to the handler
    // with the message in %rax.
    case 'attempt': {
      const handler = em.gensym('rescue');
      const over = em.gensym('endtry');
      em.L(`    leaq ${handler}(%rip), %rdi`);
      em.L('    movq %rsp, %rsi');
      em.L('    movq %rbp, %rdx');
      em.L('    call sdev_try_push');
      s.body.forEach(x => emitStmt(x, em, locals, ctx));
      em.L('    call sdev_try_pop');
      em.L(`    jmp ${over}`);
      em.L(`${handler}:`);
      if (s.errName) {
        tys.set(s.errName, 'str');
        if (locals && locals.has(s.errName)) {
          em.L(`    movq %rax, -${8 * (locals.get(s.errName) + 1)}(%rbp)`);
        } else {
          em.L(`    movq %rax, ${em.globalLabel(s.errName)}(%rip)`);
        }
      }
      s.rescue_.forEach(x => emitStmt(x, em, locals, ctx));
      em.L(`${over}:`);
      return;
    }
    case 'throw': {
      emitStrExpr(s.expr, em, locals, tys, fnTypes);
      em.L('    movq %rax, %rdi');
      em.L('    call sdev_throw');
      return;
    }
    case 'return': {
      if (s.expr) emitExpr(s.expr, em, locals, tys, fnTypes);
      else em.L('    xorq %rax, %rax');
      em.L(`    jmp ${ctx.epilogue}`);
      return;
    }
    case 'exprStmt': {
      emitExpr(s.expr, em, locals, tys, fnTypes);
      return;
    }
  }
}

function collectSets(body, locals) {
  for (const s of body) {
    if ((s.k === 'set' || s.k === 'setIndex') && !locals.has(s.name)) locals.set(s.name, locals.size);
    if (s.k === 'if') { collectSets(s.then_, locals); if (s.else_) collectSets(s.else_, locals); }
    if (s.k === 'while') collectSets(s.body, locals);
    if (s.k === 'attempt') {
      collectSets(s.body, locals);
      if (s.errName && !locals.has(s.errName)) locals.set(s.errName, locals.size);
      collectSets(s.rescue_, locals);
    }
    if (s.k === 'foreach') {
      for (const nm of [s.name, `@fe_i${s.d}`, `@fe_s${s.d}`]) {
        if (!locals.has(nm)) locals.set(nm, locals.size);
      }
      collectSets(s.body, locals);
    }
  }

}

export function generateAsm(source) {
  const { ast, classes } = parseWithKinds(source);
  const em = new NativeEmitter();
  em.classes = classes;

  const funcs = ast.filter(s => s.k === 'func');
  const main  = ast.filter(s => s.k !== 'func');

  for (const f of funcs) {
    em.functions.set(f.name, { arity: f.params.length, label: `sdev_fn_${f.name}` });
  }
  em.fnTypes = inferFnTypes(funcs, main, classes);


  em.L('# Generated by lang/native/codegen-x64.mjs — do not edit by hand.');
  em.L('    .text');
  em.L('    .globl sdev_main');

  // Function bodies
  for (const f of funcs) {
    const info = em.functions.get(f.name);
    em.L(`${info.label}:`);
    em.L('    pushq %rbp');
    em.L('    movq %rsp, %rbp');
    em.L(`    subq $${8 * LOCAL_SLOTS}, %rsp`);
    // Params: caller pushed right→left, then `call` pushed return addr.
    // So arg[0] is at 16(%rbp), arg[1] at 24(%rbp), ...
    const locals = new Map();
    f.params.forEach((p, i) => locals.set(p, i));
    collectSets(f.body, locals);
    // Copy params from stack into local slots.
    f.params.forEach((_p, i) => {
      em.L(`    movq ${16 + 8 * i}(%rbp), %rax`);
      em.L(`    movq %rax, -${8 * (i + 1)}(%rbp)`);
    });
    const epilogue = em.gensym('ret');
    const ptys = new Map();
    f.params.forEach((p, i) => {
      const t = em.fnTypes.get(`@param:${f.name}:${i}`);
      if (t) ptys.set(p, t);
    });
    const ctx = { epilogue, tys: ptys, fnTypes: em.fnTypes };
    f.body.forEach(s => emitStmt(s, em, locals, ctx));
    // Implicit return 0
    em.L('    xorq %rax, %rax');
    em.L(`${epilogue}:`);
    em.L('    movq %rbp, %rsp');
    em.L('    popq %rbp');
    em.L('    ret');
  }

  // sdev_main — entry point called by _start in runtime.s
  em.L('sdev_main:');
  em.L('    pushq %rbp');
  em.L('    movq %rsp, %rbp');
  em.L(`    subq $${8 * LOCAL_SLOTS}, %rsp`);
  const mainLocals = null; // globals only
  const mainCtx = { epilogue: '.Lmain_ret', tys: new Map(), fnTypes: em.fnTypes };
  main.forEach(s => emitStmt(s, em, mainLocals, mainCtx));
  em.L('.Lmain_ret:');
  em.L('    xorq %rax, %rax');
  em.L('    movq %rbp, %rsp');
  em.L('    popq %rbp');
  em.L('    ret');

  // Milestone 6f — closure bodies. Params arrive on the stack like any other
  // function; captures are copied out of the closure pointer in %r10, which
  // the call site loaded just before `call *code`.
  for (let li = 0; li < em.lambdas.length; li++) {
    const lam = em.lambdas[li];
    em.L(`${lam.label}:`);
    em.L('    pushq %rbp');
    em.L('    movq %rsp, %rbp');
    em.L(`    subq $${8 * LOCAL_SLOTS}, %rsp`);
    const locals = new Map();
    lam.params.forEach((p, i) => locals.set(p, i));
    lam.caps.forEach((c) => { if (!locals.has(c)) locals.set(c, locals.size); });
    collectSets(lam.body, locals);
    lam.params.forEach((_p, i) => {
      em.L(`    movq ${16 + 8 * i}(%rbp), %rax`);
      em.L(`    movq %rax, -${8 * (i + 1)}(%rbp)`);
    });
    lam.caps.forEach((c, i) => {
      em.L(`    movq ${16 + 8 * i}(%r10), %rax`);
      em.L(`    movq %rax, -${8 * (locals.get(c) + 1)}(%rbp)`);
    });
    const epilogue = em.gensym('lamret');
    const ltys = new Map(lam.tys);
    const ctx = { epilogue, tys: ltys, fnTypes: em.fnTypes };
    lam.body.forEach(s => emitStmt(s, em, locals, ctx));
    em.L('    xorq %rax, %rax');
    em.L(`${epilogue}:`);
    em.L('    movq %rbp, %rsp');
    em.L('    popq %rbp');
    em.L('    ret');
  }



  // .rodata for string literals
  em.L('    .section .rodata');
  for (const [lit, lbl] of em.strings) {
    const utf8 = Buffer.from(lit, 'utf8');
    em.L(`${lbl}:`);
    em.L(`    .quad ${utf8.length}`);
    em.L(`    .ascii "${lit.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
    em.L('    .byte 0');
  }

  // .bss for globals
  em.L('    .bss');
  em.L('    .align 8');
  for (const [, lbl] of em.globals) {
    em.L(`${lbl}:`);
    em.L('    .quad 0');
  }

  return em.lines.join('\n') + '\n';
}
