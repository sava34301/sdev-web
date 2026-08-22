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

import { parse } from '../bootstrap/compile.mjs';

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
const INT_BUILTINS = new Set(['length', 'ord', 'abs', 'contains', 'index_of', 'has', 'min', 'max']);
const LIST_BUILTINS = new Set(['list_new', 'mklist', 'split', 'keys', 'values']);
const TOME_BUILTINS = new Set(['tome_new', 'tset']);

function typeOf(e, tys, fnTypes) {
  switch (e.k) {
    case 'str': return 'str';
    case 'list': return 'list';
    case 'tome': return 'tome';
    case 'ident': return tys.get(e.name) || 'int';
    case 'index': {
      // Milestone 6d: a tome read yields the kind stored under that key; a
      // list read yields the list's recorded element kind.
      const tt = typeOf(e.target, tys, fnTypes);
      if (tt === 'tome') return tys.get(tomeValKey(e)) || 'int';
      const base = e.target.k === 'ident' ? e.target.name : null;
      return (base && tys.get(`@elem:${base}`)) || 'int';
    }
    case 'un': return 'int';
    case 'bin':
      if (e.op === '+') {
        if (typeOf(e.l, tys, fnTypes) === 'str' || typeOf(e.r, tys, fnTypes) === 'str') return 'str';
      }
      return 'int';
    case 'call':
      if (STR_BUILTINS.has(e.name)) return 'str';
      if (LIST_BUILTINS.has(e.name)) return 'list';
      if (TOME_BUILTINS.has(e.name)) return 'tome';
      if (INT_BUILTINS.has(e.name)) return 'int';
      return (fnTypes && fnTypes.get(e.name)) || 'int';
    default: return 'int';
  }
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
function inferFnTypes(funcs) {
  const fnTypes = new Map();
  for (let pass = 0; pass < 2; pass++) {
    for (const f of funcs) {
      const tys = new Map();
      let t = 'int';
      const walk = (body) => {
        for (const s of body) {
          if (s.k === 'set') tys.set(s.name, typeOf(s.expr, tys, fnTypes));
          if (s.k === 'if') { walk(s.then_); if (s.else_) walk(s.else_); }
          if (s.k === 'while') walk(s.body);
          if (s.k === 'foreach') walk(s.body);
          if (s.k === 'return' && s.expr) {
            const rt = typeOf(s.expr, tys, fnTypes);
            if (rt !== 'int') t = rt;
          }
        }
      };
      walk(f.body);
      fnTypes.set(f.name, t);
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
      if (e.op === '-') { emitExpr(e.x, em, locals, tys, fnTypes); em.L('    negq %rax'); return; }
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
  }
  throw new Error(`native: cannot compile ${e.k}`);
}

// Evaluate `e` and leave a *string pointer* in %rax, converting ints on the
// fly. This is what makes `"n=" + 3` work natively.
function emitStrExpr(e, em, locals, tys, fnTypes) {
  emitExpr(e, em, locals, tys, fnTypes);
  if (typeOf(e, tys, fnTypes) !== 'str') {
    em.L('    movq %rax, %rdi');
    em.L('    call sdev_str_int');
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
      const isStr = typeOf(s.expr, tys, fnTypes) === 'str';
      emitExpr(s.expr, em, locals, tys, fnTypes);
      em.L(`    movq %rax, %rdi`);
      em.L(`    call ${isStr ? 'sdev_say_str' : 'sdev_say_int'}`);
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
      s.body.forEach(x => emitStmt(x, em, locals, ctx));
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
      s.body.forEach(x => emitStmt(x, em, locals, ctx));
      em.L(`    jmp ${top}`);
      em.L(`${end}:`);
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
    if (s.k === 'foreach') {
      for (const nm of [s.name, `@fe_i${s.d}`, `@fe_s${s.d}`]) {
        if (!locals.has(nm)) locals.set(nm, locals.size);
      }
      collectSets(s.body, locals);
    }
  }
}

export function generateAsm(source) {
  const ast = parse(source);
  const em = new NativeEmitter();

  const funcs = ast.filter(s => s.k === 'func');
  const main  = ast.filter(s => s.k !== 'func');

  for (const f of funcs) {
    em.functions.set(f.name, { arity: f.params.length, label: `sdev_fn_${f.name}` });
  }
  em.fnTypes = inferFnTypes(funcs);

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
    const ctx = { epilogue, tys: new Map(), fnTypes: em.fnTypes };
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
