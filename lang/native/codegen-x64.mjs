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

const LOCAL_SLOTS = 16;

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
    if (!this.globals.has(name)) this.globals.set(name, `sdev_g_${name}`);
    return this.globals.get(name);
  }
}

function emitExpr(e, em, locals) {
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
      if (e.op === '-') { emitExpr(e.x, em, locals); em.L('    negq %rax'); return; }
      if (e.op === 'not') {
        emitExpr(e.x, em, locals);
        em.L('    testq %rax, %rax');
        em.L('    sete %al');
        em.L('    movzbq %al, %rax');
        return;
      }
      break;
    case 'bin': {
      if (e.op === 'and' || e.op === 'or') {
        const short = em.gensym(e.op);
        emitExpr(e.l, em, locals);
        em.L('    testq %rax, %rax');
        em.L(`    ${e.op === 'and' ? 'jz' : 'jnz'} ${short}`);
        emitExpr(e.r, em, locals);
        em.L(`${short}:`);
        return;
      }
      emitExpr(e.l, em, locals);
      em.L('    pushq %rax');
      emitExpr(e.r, em, locals);
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
      const info = em.functions.get(e.name);
      if (!info) throw new Error(`native: unknown function ${e.name}`);
      if (e.args.length !== info.arity) throw new Error(`native: ${e.name} arity`);
      // Push args right-to-left (SysV-ish, but our own convention).
      for (let i = e.args.length - 1; i >= 0; i--) {
        emitExpr(e.args[i], em, locals);
        em.L('    pushq %rax');
      }
      em.L(`    call ${info.label}`);
      if (e.args.length > 0) em.L(`    addq $${e.args.length * 8}, %rsp`);
      return;
    }
  }
  throw new Error(`native: cannot compile ${e.k}`);
}

function emitCmp(em, setInstr) {
  em.L('    cmpq %rcx, %rax');
  em.L(`    ${setInstr} %al`);
  em.L('    movzbq %al, %rax');
}

function emitStmt(s, em, locals, ctx) {
  switch (s.k) {
    case 'say': {
      emitExpr(s.expr, em, locals);
      // If the expr is a bare string literal, emit sdev_say_str; otherwise sdev_say_int.
      const isStr = s.expr.k === 'str';
      em.L(`    movq %rax, %rdi`);
      em.L(`    call ${isStr ? 'sdev_say_str' : 'sdev_say_int'}`);
      return;
    }
    case 'set': {
      emitExpr(s.expr, em, locals);
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
      emitExpr(s.cond, em, locals);
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
      emitExpr(s.cond, em, locals);
      em.L('    testq %rax, %rax');
      em.L(`    jz ${end}`);
      s.body.forEach(x => emitStmt(x, em, locals, ctx));
      em.L(`    jmp ${top}`);
      em.L(`${end}:`);
      return;
    }
    case 'return': {
      if (s.expr) emitExpr(s.expr, em, locals);
      else em.L('    xorq %rax, %rax');
      em.L(`    jmp ${ctx.epilogue}`);
      return;
    }
    case 'exprStmt': {
      emitExpr(s.expr, em, locals);
      return;
    }
  }
}

function collectSets(body, locals) {
  for (const s of body) {
    if (s.k === 'set' && !locals.has(s.name)) locals.set(s.name, locals.size);
    if (s.k === 'if') { collectSets(s.then_, locals); if (s.else_) collectSets(s.else_, locals); }
    if (s.k === 'while') collectSets(s.body, locals);
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
    const ctx = { epilogue };
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
  main.forEach(s => emitStmt(s, em, mainLocals, { epilogue: '.Lmain_ret' }));
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
