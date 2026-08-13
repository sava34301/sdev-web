#!/usr/bin/env node

// scripts/sdev-native.mjs
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");

// lang/runtime/v2.js
var KEYWORDS = /* @__PURE__ */ new Set([
  "say",
  "ask",
  "set",
  "to",
  "if",
  "else",
  "end",
  "for",
  "each",
  "in",
  "while",
  "return",
  "with",
  "true",
  "false",
  "nothing",
  "is",
  "not",
  "and",
  "or",
  "more",
  "less",
  "match"
]);
function tokenize(src) {
  const tokens = [];
  let i = 0, line = 1, col = 1;
  const push = (type, value) => tokens.push({ type, value, line, col });
  while (i < src.length) {
    const c = src[i];
    if (c === "\n") {
      push("NL", "\n");
      i++;
      line++;
      col = 1;
      continue;
    }
    if (c === " " || c === "	" || c === "\r") {
      i++;
      col++;
      continue;
    }
    if (c === "#") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let s = "";
      while (i < src.length && /[0-9.]/.test(src[i])) {
        s += src[i++];
        col++;
      }
      const tok = { type: "NUM", value: parseFloat(s), line, col, isFloat: s.includes(".") };
      tokens.push(tok);
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      col++;
      let s = "";
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\" && i + 1 < src.length) {
          const n = src[i + 1];
          s += n === "n" ? "\n" : n === "t" ? "	" : n === "\\" ? "\\" : n === quote ? quote : n;
          i += 2;
          col += 2;
        } else {
          if (src[i] === "\n") {
            line++;
            col = 0;
          }
          s += src[i++];
          col++;
        }
      }
      i++;
      col++;
      push("STR", s);
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let s = "";
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) {
        s += src[i++];
        col++;
      }
      if (KEYWORDS.has(s)) push("KW", s);
      else if (s === "yep" || s === "nope") push("KW", s === "yep" ? "true" : "false");
      else push("IDENT", s);
      continue;
    }
    if (c === "|" && src[i + 1] === ">") {
      push("OP", "|>");
      i += 2;
      col += 2;
      continue;
    }
    if (c === "<" && src[i + 1] === "=") {
      push("OP", "<=");
      i += 2;
      col += 2;
      continue;
    }
    if (c === ">" && src[i + 1] === "=") {
      push("OP", ">=");
      i += 2;
      col += 2;
      continue;
    }
    if (c === "-" && src[i + 1] === ">") {
      push("OP", "->");
      i += 2;
      col += 2;
      continue;
    }
    if ("+-*/%(),[]{}:.<>|".includes(c)) {
      push("OP", c);
      i++;
      col++;
      continue;
    }
    throw new SdevError(`Unexpected character '${c}'`, line);
  }
  push("EOF", null);
  return tokens;
}
var SdevError = class extends Error {
  constructor(msg, line) {
    super(`[sdev v2] line ${line ?? "?"}: ${msg}`);
    this.line = line;
  }
};

// lang/bootstrap/compile.mjs
function parse(source) {
  return parseProgram(tokenize(source));
}
function parseProgram(tokens) {
  let p = 0;
  const peek = (n = 0) => tokens[p + n];
  const eat = (type, value) => {
    const t = tokens[p];
    if (t.type !== type || value !== void 0 && t.value !== value) {
      throw new SdevError(`bootstrap: expected ${value ?? type}, got ${t.type}:${t.value}`, t.line);
    }
    p++;
    return t;
  };
  const skipNL = () => {
    while (peek().type === "NL") p++;
  };
  let feDepth = 0;
  const stmts = [];
  skipNL();
  while (peek().type !== "EOF") {
    stmts.push(statement());
    skipNL();
  }
  return stmts;
  function statement() {
    const t = peek();
    if (t.type === "IDENT" && t.value === "break") {
      p++;
      return { k: "break", line: t.line };
    }
    if (t.type === "IDENT" && t.value === "continue") {
      p++;
      return { k: "continue", line: t.line };
    }
    if (t.type === "KW") {
      if (t.value === "say") {
        p++;
        return { k: "say", expr: expr(), line: t.line };
      }
      if (t.value === "set") {
        p++;
        const name = eat("IDENT").value;
        if (peek().type === "OP" && peek().value === "[") {
          p++;
          const idx = expr();
          eat("OP", "]");
          eat("KW", "to");
          return { k: "setIndex", name, idx, expr: expr(), line: t.line };
        }
        eat("KW", "to");
        return { k: "set", name, expr: expr(), line: t.line };
      }
      if (t.value === "if") return ifStmt();
      if (t.value === "while") return whileStmt();
      if (t.value === "for") return forEachStmt();
      if (t.value === "to") return funcDecl();
      if (t.value === "return") {
        p++;
        return { k: "return", expr: peek().type === "NL" ? null : expr(), line: t.line };
      }
    }
    const e = expr();
    return { k: "exprStmt", expr: e, line: t.line };
  }
  function ifStmt() {
    const t = eat("KW", "if");
    const cond = expr();
    skipNL();
    const then_ = [];
    while (!(peek().type === "KW" && (peek().value === "else" || peek().value === "end"))) {
      then_.push(statement());
      skipNL();
    }
    let else_ = null;
    let chained = false;
    if (peek().type === "KW" && peek().value === "else") {
      p++;
      if (peek().type === "KW" && peek().value === "if") {
        else_ = [ifStmt()];
        chained = true;
      } else {
        skipNL();
        else_ = [];
        while (!(peek().type === "KW" && peek().value === "end")) {
          else_.push(statement());
          skipNL();
        }
      }
    }
    if (!chained) eat("KW", "end");
    return { k: "if", cond, then_, else_, line: t.line };
  }
  function whileStmt() {
    const t = eat("KW", "while");
    const cond = expr();
    skipNL();
    const body = [];
    while (!(peek().type === "KW" && peek().value === "end")) {
      body.push(statement());
      skipNL();
    }
    eat("KW", "end");
    return { k: "while", cond, body, line: t.line };
  }
  function forEachStmt() {
    const t = eat("KW", "for");
    if (peek().type === "KW" && peek().value === "each") p++;
    const name = eat("IDENT").value;
    if (peek().type === "KW" && peek().value === "in") p++;
    const iter = expr();
    skipNL();
    feDepth++;
    const d = feDepth;
    const body = [];
    while (!(peek().type === "KW" && peek().value === "end")) {
      body.push(statement());
      skipNL();
    }
    eat("KW", "end");
    feDepth--;
    return { k: "foreach", name, iter, body, d, line: t.line };
  }
  function funcDecl() {
    const t = eat("KW", "to");
    const name = eat("IDENT").value;
    const params = [];
    if (peek().type === "KW" && peek().value === "with") {
      p++;
      while (peek().type === "IDENT") {
        params.push(eat("IDENT").value);
      }
    }
    skipNL();
    const body = [];
    while (!(peek().type === "KW" && peek().value === "end")) {
      body.push(statement());
      skipNL();
    }
    eat("KW", "end");
    return { k: "func", name, params, body, line: t.line };
  }
  function expr() {
    return or_();
  }
  function or_() {
    let l = and_();
    while (peek().type === "KW" && peek().value === "or") {
      p++;
      l = { k: "bin", op: "or", l, r: and_() };
    }
    return l;
  }
  function and_() {
    let l = not_();
    while (peek().type === "KW" && peek().value === "and") {
      p++;
      l = { k: "bin", op: "and", l, r: not_() };
    }
    return l;
  }
  function not_() {
    if (peek().type === "KW" && peek().value === "not") {
      p++;
      return { k: "un", op: "not", x: not_() };
    }
    return cmp_();
  }
  function cmp_() {
    let l = add_();
    while (true) {
      const t = peek();
      if (t.type === "KW" && t.value === "is") {
        p++;
        let op = "is";
        if (peek().type === "KW" && peek().value === "not") {
          p++;
          op = "isnot";
        }
        l = { k: "bin", op, l, r: add_() };
      } else if (t.type === "OP" && ["<", ">", "<=", ">="].includes(t.value)) {
        p++;
        l = { k: "bin", op: t.value, l, r: add_() };
      } else break;
    }
    return l;
  }
  function add_() {
    let l = mul_();
    while (peek().type === "OP" && (peek().value === "+" || peek().value === "-")) {
      const op = peek().value;
      p++;
      l = { k: "bin", op, l, r: mul_() };
    }
    return l;
  }
  function mul_() {
    let l = un_();
    while (peek().type === "OP" && (peek().value === "*" || peek().value === "/" || peek().value === "%")) {
      const op = peek().value;
      p++;
      l = { k: "bin", op, l, r: un_() };
    }
    return l;
  }
  function un_() {
    if (peek().type === "OP" && peek().value === "-") {
      p++;
      return { k: "un", op: "-", x: un_() };
    }
    return callOrAtom();
  }
  function callOrAtom() {
    let a = atom();
    if (a.k === "ident" && peek().type === "OP" && peek().value === "(") {
      p++;
      const args = [];
      if (!(peek().type === "OP" && peek().value === ")")) {
        args.push(expr());
        while (peek().type === "OP" && peek().value === ",") {
          p++;
          args.push(expr());
        }
      }
      eat("OP", ")");
      a = { k: "call", name: a.name, args };
    } else if (a.k === "ident" && peek().type === "KW" && peek().value === "with") {
      p++;
      const args = [];
      while (canStartAtom(peek())) args.push(atom());
      a = { k: "call", name: a.name, args };
    }
    while (peek().type === "OP" && peek().value === "[") {
      p++;
      const idx = expr();
      eat("OP", "]");
      a = { k: "index", target: a, idx };
    }
    return a;
  }
  function canStartAtom(t) {
    return t.type === "NUM" || t.type === "STR" || t.type === "IDENT" || t.type === "KW" && (t.value === "true" || t.value === "false" || t.value === "nothing") || t.type === "OP" && (t.value === "(" || t.value === "[");
  }
  function atom() {
    const t = peek();
    if (t.type === "NUM") {
      p++;
      if (t.isFloat) return { k: "fnum", v: t.value };
      if (Number.isInteger(t.value)) return { k: "num", v: t.value };
      return { k: "fnum", v: t.value };
    }
    if (t.type === "STR") {
      p++;
      return { k: "str", v: t.value };
    }
    if (t.type === "KW" && t.value === "true") {
      p++;
      return { k: "num", v: 1 };
    }
    if (t.type === "KW" && t.value === "false") {
      p++;
      return { k: "num", v: 0 };
    }
    if (t.type === "KW" && t.value === "nothing") {
      p++;
      return { k: "num", v: 0 };
    }
    if (t.type === "IDENT") {
      p++;
      return { k: "ident", name: t.value };
    }
    if (t.type === "OP" && t.value === "(") {
      p++;
      const e = expr();
      eat("OP", ")");
      return e;
    }
    if (t.type === "OP" && t.value === "[") {
      p++;
      const items = [];
      if (!(peek().type === "OP" && peek().value === "]")) {
        items.push(expr());
        while (peek().type === "OP" && peek().value === ",") {
          p++;
          items.push(expr());
        }
      }
      eat("OP", "]");
      return { k: "list", items, line: t.line };
    }
    if (t.type === "OP" && t.value === "{") {
      p++;
      const pairs = [];
      skipNL();
      if (!(peek().type === "OP" && peek().value === "}")) {
        pairs.push(tomePair());
        while (peek().type === "OP" && peek().value === ",") {
          p++;
          skipNL();
          pairs.push(tomePair());
        }
      }
      skipNL();
      eat("OP", "}");
      return { k: "tome", pairs, line: t.line };
    }
    throw new SdevError(`bootstrap: unexpected ${t.type}:${t.value}`, t.line);
  }
  function tomePair() {
    skipNL();
    let key;
    if (peek().type === "IDENT" && tokens[p + 1] && tokens[p + 1].type === "OP" && tokens[p + 1].value === ":") {
      key = { k: "str", v: eat("IDENT").value };
    } else {
      key = expr();
    }
    eat("OP", ":");
    const val = expr();
    skipNL();
    return { key, val };
  }
}

// lang/native/codegen-x64.mjs
var LOCAL_SLOTS = 16;
var NativeEmitter = class {
  constructor() {
    this.lines = [];
    this.strings = /* @__PURE__ */ new Map();
    this.globals = /* @__PURE__ */ new Map();
    this.functions = /* @__PURE__ */ new Map();
    this.labelSeq = 0;
  }
  L(s = "") {
    this.lines.push(s);
  }
  gensym(prefix) {
    return `.L${prefix}${this.labelSeq++}`;
  }
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
};
function emitExpr(e, em, locals) {
  switch (e.k) {
    case "num":
      em.L(`    movq $${e.v | 0}, %rax`);
      return;
    case "str": {
      const lbl = em.strLabel(e.v);
      em.L(`    leaq ${lbl}(%rip), %rax`);
      return;
    }
    case "ident":
      if (locals && locals.has(e.name)) {
        const slot = locals.get(e.name);
        em.L(`    movq -${8 * (slot + 1)}(%rbp), %rax`);
      } else {
        em.L(`    movq ${em.globalLabel(e.name)}(%rip), %rax`);
      }
      return;
    case "un":
      if (e.op === "-") {
        emitExpr(e.x, em, locals);
        em.L("    negq %rax");
        return;
      }
      if (e.op === "not") {
        emitExpr(e.x, em, locals);
        em.L("    testq %rax, %rax");
        em.L("    sete %al");
        em.L("    movzbq %al, %rax");
        return;
      }
      break;
    case "bin": {
      if (e.op === "and" || e.op === "or") {
        const short = em.gensym(e.op);
        emitExpr(e.l, em, locals);
        em.L("    testq %rax, %rax");
        em.L(`    ${e.op === "and" ? "jz" : "jnz"} ${short}`);
        emitExpr(e.r, em, locals);
        em.L(`${short}:`);
        return;
      }
      emitExpr(e.l, em, locals);
      em.L("    pushq %rax");
      emitExpr(e.r, em, locals);
      em.L("    movq %rax, %rcx");
      em.L("    popq %rax");
      switch (e.op) {
        case "+":
          em.L("    addq %rcx, %rax");
          return;
        case "-":
          em.L("    subq %rcx, %rax");
          return;
        case "*":
          em.L("    imulq %rcx, %rax");
          return;
        case "/":
          em.L("    cqto");
          em.L("    idivq %rcx");
          return;
        case "%":
          em.L("    cqto");
          em.L("    idivq %rcx");
          em.L("    movq %rdx, %rax");
          return;
        case "is":
          return emitCmp(em, "sete");
        case "isnot":
          return emitCmp(em, "setne");
        case "<":
          return emitCmp(em, "setl");
        case ">":
          return emitCmp(em, "setg");
        case "<=":
          return emitCmp(em, "setle");
        case ">=":
          return emitCmp(em, "setge");
      }
      break;
    }
    case "call": {
      const info = em.functions.get(e.name);
      if (!info) throw new Error(`native: unknown function ${e.name}`);
      if (e.args.length !== info.arity) throw new Error(`native: ${e.name} arity`);
      for (let i = e.args.length - 1; i >= 0; i--) {
        emitExpr(e.args[i], em, locals);
        em.L("    pushq %rax");
      }
      em.L(`    call ${info.label}`);
      if (e.args.length > 0) em.L(`    addq $${e.args.length * 8}, %rsp`);
      return;
    }
  }
  throw new Error(`native: cannot compile ${e.k}`);
}
function emitCmp(em, setInstr) {
  em.L("    cmpq %rcx, %rax");
  em.L(`    ${setInstr} %al`);
  em.L("    movzbq %al, %rax");
}
function emitStmt(s, em, locals, ctx) {
  switch (s.k) {
    case "say": {
      emitExpr(s.expr, em, locals);
      const isStr = s.expr.k === "str";
      em.L(`    movq %rax, %rdi`);
      em.L(`    call ${isStr ? "sdev_say_str" : "sdev_say_int"}`);
      return;
    }
    case "set": {
      emitExpr(s.expr, em, locals);
      if (locals && locals.has(s.name)) {
        const slot = locals.get(s.name);
        em.L(`    movq %rax, -${8 * (slot + 1)}(%rbp)`);
      } else {
        em.L(`    movq %rax, ${em.globalLabel(s.name)}(%rip)`);
      }
      return;
    }
    case "if": {
      const elseL = em.gensym("else");
      const endL = em.gensym("endif");
      emitExpr(s.cond, em, locals);
      em.L("    testq %rax, %rax");
      em.L(`    jz ${elseL}`);
      s.then_.forEach((x) => emitStmt(x, em, locals, ctx));
      em.L(`    jmp ${endL}`);
      em.L(`${elseL}:`);
      if (s.else_) s.else_.forEach((x) => emitStmt(x, em, locals, ctx));
      em.L(`${endL}:`);
      return;
    }
    case "while": {
      const top = em.gensym("wtop");
      const end = em.gensym("wend");
      em.L(`${top}:`);
      emitExpr(s.cond, em, locals);
      em.L("    testq %rax, %rax");
      em.L(`    jz ${end}`);
      s.body.forEach((x) => emitStmt(x, em, locals, ctx));
      em.L(`    jmp ${top}`);
      em.L(`${end}:`);
      return;
    }
    case "return": {
      if (s.expr) emitExpr(s.expr, em, locals);
      else em.L("    xorq %rax, %rax");
      em.L(`    jmp ${ctx.epilogue}`);
      return;
    }
    case "exprStmt": {
      emitExpr(s.expr, em, locals);
      return;
    }
  }
}
function collectSets(body, locals) {
  for (const s of body) {
    if (s.k === "set" && !locals.has(s.name)) locals.set(s.name, locals.size);
    if (s.k === "if") {
      collectSets(s.then_, locals);
      if (s.else_) collectSets(s.else_, locals);
    }
    if (s.k === "while") collectSets(s.body, locals);
  }
}
function generateAsm(source) {
  const ast = parse(source);
  const em = new NativeEmitter();
  const funcs = ast.filter((s) => s.k === "func");
  const main2 = ast.filter((s) => s.k !== "func");
  for (const f of funcs) {
    em.functions.set(f.name, { arity: f.params.length, label: `sdev_fn_${f.name}` });
  }
  em.L("# Generated by lang/native/codegen-x64.mjs \u2014 do not edit by hand.");
  em.L("    .text");
  em.L("    .globl sdev_main");
  for (const f of funcs) {
    const info = em.functions.get(f.name);
    em.L(`${info.label}:`);
    em.L("    pushq %rbp");
    em.L("    movq %rsp, %rbp");
    em.L(`    subq $${8 * LOCAL_SLOTS}, %rsp`);
    const locals = /* @__PURE__ */ new Map();
    f.params.forEach((p, i) => locals.set(p, i));
    collectSets(f.body, locals);
    f.params.forEach((_p, i) => {
      em.L(`    movq ${16 + 8 * i}(%rbp), %rax`);
      em.L(`    movq %rax, -${8 * (i + 1)}(%rbp)`);
    });
    const epilogue = em.gensym("ret");
    const ctx = { epilogue };
    f.body.forEach((s) => emitStmt(s, em, locals, ctx));
    em.L("    xorq %rax, %rax");
    em.L(`${epilogue}:`);
    em.L("    movq %rbp, %rsp");
    em.L("    popq %rbp");
    em.L("    ret");
  }
  em.L("sdev_main:");
  em.L("    pushq %rbp");
  em.L("    movq %rsp, %rbp");
  em.L(`    subq $${8 * LOCAL_SLOTS}, %rsp`);
  const mainLocals = null;
  main2.forEach((s) => emitStmt(s, em, mainLocals, { epilogue: ".Lmain_ret" }));
  em.L(".Lmain_ret:");
  em.L("    xorq %rax, %rax");
  em.L("    movq %rbp, %rsp");
  em.L("    popq %rbp");
  em.L("    ret");
  em.L("    .section .rodata");
  for (const [lit, lbl] of em.strings) {
    const utf8 = Buffer.from(lit, "utf8");
    em.L(`${lbl}:`);
    em.L(`    .quad ${utf8.length}`);
    em.L(`    .ascii "${lit.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`);
    em.L("    .byte 0");
  }
  em.L("    .bss");
  em.L("    .align 8");
  for (const [, lbl] of em.globals) {
    em.L(`${lbl}:`);
    em.L("    .quad 0");
  }
  return em.lines.join("\n") + "\n";
}

// lang/native/link.mjs
var import_node_child_process = require("node:child_process");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_meta = {};
var RUNTIME_S = (0, import_node_path.resolve)(new URL("./runtime.s", import_meta.url).pathname);
function run(cmd, args, opts = {}) {
  const r = (0, import_node_child_process.spawnSync)(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) {
    const msg = `${cmd} ${args.join(" ")} failed (${r.status}):
${r.stderr || r.stdout}`;
    throw new Error(msg);
  }
  return r.stdout;
}
function link(asmText, outPath, opts = {}) {
  const as = opts.as || "as";
  const ld = opts.ld || "ld";
  const tmp = opts.tmpDir || (0, import_node_path.dirname)(outPath);
  (0, import_node_fs.mkdirSync)(tmp, { recursive: true });
  const progS = (0, import_node_path.resolve)(tmp, "_sdev_prog.s");
  const progO = (0, import_node_path.resolve)(tmp, "_sdev_prog.o");
  const rtO = (0, import_node_path.resolve)(tmp, "_sdev_runtime.o");
  (0, import_node_fs.writeFileSync)(progS, asmText);
  run(as, ["--64", "-o", progO, progS]);
  run(as, ["--64", "-o", rtO, RUNTIME_S]);
  run(ld, ["-o", outPath, rtO, progO]);
  return outPath;
}

// scripts/sdev-native.mjs
function usage() {
  console.error("usage: sdev-native <file.sdev> [-o out] [--emit-asm] [--as PATH] [--ld PATH]");
  process.exit(2);
}
function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) usage();
  let src = null, out = null, emitAsm = false, asBin, ldBin;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o") out = argv[++i];
    else if (a === "--emit-asm") emitAsm = true;
    else if (a === "--as") asBin = argv[++i];
    else if (a === "--ld") ldBin = argv[++i];
    else if (a.startsWith("-")) usage();
    else src = a;
  }
  if (!src) usage();
  const source = (0, import_node_fs2.readFileSync)(src, "utf8");
  const asm = generateAsm(source);
  const base = (0, import_node_path2.basename)(src).replace(/\.sdev$/, "");
  const outBin = out || (0, import_node_path2.resolve)((0, import_node_path2.dirname)(src), base);
  const asmPath = outBin + ".s";
  (0, import_node_fs2.writeFileSync)(asmPath, asm);
  if (emitAsm) {
    console.log(`wrote ${asmPath}`);
    return;
  }
  link(asm, outBin, { as: asBin, ld: ldBin, tmpDir: (0, import_node_path2.dirname)(outBin) });
  console.log(`wrote ${outBin}`);
}
main();
