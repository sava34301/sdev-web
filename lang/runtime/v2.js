// SDEV v2 "Prism" — reference runtime.
// Pure JavaScript. Zero TypeScript. Zero external deps.
// This file is the FIRST milestone toward the fully self-hosted WASM compiler
// described in .lovable/plan.md. It implements the beginner-first v2 surface
// syntax end-to-end so the IDE can start running v2 code immediately.
//
// Surface (per approved plan):
//   say <expr>                       # print
//   ask <prompt>                     # read line
//   set <name> to <expr>             # declare or reassign
//   if <cond> ... else ... end
//   for each <name> in <expr> ... end
//   while <cond> ... end
//   to <name> [with <p1> <p2>...] ... end       # function
//   return <expr>
//   <name> with <arg1> <arg2>...     # call (space-separated args)
//   <name>(a, b)                     # call (paren form also allowed)
//   # comment
//
// Values: numbers, strings, true/false, nothing, lists [1,2,3], dicts {k: v}.
// Operators: + - * / %, is, is not, <, >, <=, >=, "or more", "or less",
//            and, or, not, |> pipeline.

// ---------- Lexer ----------

const KEYWORDS = new Set([
  'say', 'ask', 'set', 'to', 'if', 'else', 'end', 'for', 'each', 'in',
  'while', 'return', 'with', 'true', 'false', 'nothing', 'is', 'not',
  'and', 'or', 'more', 'less', 'match',
]);

function tokenize(src) {
  const tokens = [];
  let i = 0, line = 1, col = 1;
  const push = (type, value) => tokens.push({ type, value, line, col });

  while (i < src.length) {
    const c = src[i];

    // Newlines are significant (statement terminators)
    if (c === '\n') { push('NL', '\n'); i++; line++; col = 1; continue; }
    // Skip other whitespace
    if (c === ' ' || c === '\t' || c === '\r') { i++; col++; continue; }
    // Line comments
    if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }

    // Numbers
    if (/[0-9]/.test(c)) {
      let s = '';
      while (i < src.length && /[0-9.]/.test(src[i])) { s += src[i++]; col++; }
      const tok = { type: 'NUM', value: parseFloat(s), line, col, isFloat: s.includes('.') };
      tokens.push(tok);
      continue;
    }

    // Strings
    if (c === '"' || c === "'") {
      const quote = c; i++; col++;
      let s = '';
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\' && i + 1 < src.length) {
          const n = src[i + 1];
          s += n === 'n' ? '\n' : n === 't' ? '\t' : n === '\\' ? '\\' : n === quote ? quote : n;
          i += 2; col += 2;
        } else {
          if (src[i] === '\n') { line++; col = 0; }
          s += src[i++]; col++;
        }
      }
      i++; col++;
      push('STR', s); continue;
    }

    // Identifiers / keywords
    if (/[A-Za-z_]/.test(c)) {
      let s = '';
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) { s += src[i++]; col++; }
      if (KEYWORDS.has(s)) push('KW', s);
      else if (s === 'yep' || s === 'nope') push('KW', s === 'yep' ? 'true' : 'false'); // v1 alias
      else push('IDENT', s);
      continue;
    }

    // Multi-char operators
    if (c === '|' && src[i + 1] === '>') { push('OP', '|>'); i += 2; col += 2; continue; }
    if (c === '<' && src[i + 1] === '=') { push('OP', '<='); i += 2; col += 2; continue; }
    if (c === '>' && src[i + 1] === '=') { push('OP', '>='); i += 2; col += 2; continue; }
    if (c === '-' && src[i + 1] === '>') { push('OP', '->'); i += 2; col += 2; continue; }

    // Single-char punctuation
    if ('+-*/%(),[]{}:.<>|'.includes(c)) {
      push('OP', c); i++; col++; continue;
    }

    throw new SdevError(`Unexpected character '${c}'`, line);
  }
  push('EOF', null);
  return tokens;
}

// ---------- Parser ----------

class SdevError extends Error {
  constructor(msg, line) { super(`[sdev v2] line ${line ?? '?'}: ${msg}`); this.line = line; }
}

function parse(tokens) {
  let p = 0;
  const peek = (n = 0) => tokens[p + n];
  const eat = (type, value) => {
    const t = tokens[p];
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new SdevError(`expected ${value ?? type}, got ${t.type}:${t.value}`, t.line);
    }
    p++; return t;
  };
  const match = (type, value) => {
    const t = tokens[p];
    if (t.type === type && (value === undefined || t.value === value)) { p++; return t; }
    return null;
  };
  const skipNL = () => { while (peek().type === 'NL') p++; };

  const program = { type: 'Program', body: [], line: 1 };
  skipNL();
  while (peek().type !== 'EOF') {
    program.body.push(statement());
    while (peek().type === 'NL') p++;
  }
  return program;

  function statement() {
    const t = peek();
    if (t.type === 'KW') {
      switch (t.value) {
        case 'say':    return sayStmt();
        case 'ask':    return { type: 'ExprStmt', expr: expression(), line: t.line };
        case 'set':    return setStmt();
        case 'if':     return ifStmt();
        case 'for':    return forStmt();
        case 'while':  return whileStmt();
        case 'to':     return funcDecl();
        case 'return': p++; return { type: 'Return', value: peek().type === 'NL' ? null : expression(), line: t.line };
      }
    }
    // Fallback: expression statement (function call, etc.)
    return { type: 'ExprStmt', expr: expression(), line: t.line };
  }

  function sayStmt() {
    const t = eat('KW', 'say');
    const arg = peek().type === 'NL' ? { type: 'Str', value: '', line: t.line } : expression();
    return { type: 'Say', arg, line: t.line };
  }

  function setStmt() {
    const t = eat('KW', 'set');
    const name = eat('IDENT').value;
    eat('KW', 'to');
    const value = expression();
    return { type: 'Set', name, value, line: t.line };
  }

  function ifStmt() {
    const t = eat('KW', 'if');
    const cond = expression();
    skipNL();
    const thenBody = [];
    while (!(peek().type === 'KW' && (peek().value === 'else' || peek().value === 'end'))) {
      thenBody.push(statement()); skipNL();
    }
    let elseBody = null;
    if (match('KW', 'else')) {
      skipNL();
      elseBody = [];
      while (!(peek().type === 'KW' && peek().value === 'end')) {
        elseBody.push(statement()); skipNL();
      }
    }
    eat('KW', 'end');
    return { type: 'If', cond, thenBody, elseBody, line: t.line };
  }

  function forStmt() {
    const t = eat('KW', 'for');
    eat('KW', 'each');
    const name = eat('IDENT').value;
    eat('KW', 'in');
    const iter = expression();
    skipNL();
    const body = [];
    while (!(peek().type === 'KW' && peek().value === 'end')) { body.push(statement()); skipNL(); }
    eat('KW', 'end');
    return { type: 'For', name, iter, body, line: t.line };
  }

  function whileStmt() {
    const t = eat('KW', 'while');
    const cond = expression();
    skipNL();
    const body = [];
    while (!(peek().type === 'KW' && peek().value === 'end')) { body.push(statement()); skipNL(); }
    eat('KW', 'end');
    return { type: 'While', cond, body, line: t.line };
  }

  function funcDecl() {
    const t = eat('KW', 'to');
    const name = eat('IDENT').value;
    const params = [];
    if (match('KW', 'with')) {
      while (peek().type === 'IDENT') { params.push(eat('IDENT').value); }
    }
    skipNL();
    const body = [];
    while (!(peek().type === 'KW' && peek().value === 'end')) { body.push(statement()); skipNL(); }
    eat('KW', 'end');
    return { type: 'Func', name, params, body, line: t.line };
  }

  // Precedence: or > and > not > compare > pipeline > add > mul > unary > call > primary
  function expression() { return orExpr(); }

  function orExpr() {
    let left = andExpr();
    while (peek().type === 'KW' && peek().value === 'or') {
      const line = peek().line; p++;
      // "or more" / "or less" are suffix comparators handled in compareExpr; if we see them here bail
      if (peek().type === 'KW' && (peek().value === 'more' || peek().value === 'less')) { p--; break; }
      const right = andExpr();
      left = { type: 'Bin', op: 'or', left, right, line };
    }
    return left;
  }
  function andExpr() {
    let left = notExpr();
    while (peek().type === 'KW' && peek().value === 'and') {
      const line = peek().line; p++;
      const right = notExpr();
      left = { type: 'Bin', op: 'and', left, right, line };
    }
    return left;
  }
  function notExpr() {
    if (peek().type === 'KW' && peek().value === 'not') {
      const line = peek().line; p++;
      return { type: 'Un', op: 'not', operand: notExpr(), line };
    }
    return compareExpr();
  }
  function compareExpr() {
    let left = pipeExpr();
    // Support: x is y, x is not y, x < y, x >= y, x or more, x or less
    while (true) {
      const t = peek();
      if (t.type === 'KW' && t.value === 'is') {
        p++;
        let op = 'is';
        if (peek().type === 'KW' && peek().value === 'not') { p++; op = 'isnot'; }
        const right = pipeExpr();
        left = { type: 'Bin', op, left, right, line: t.line };
      } else if (t.type === 'OP' && ['<', '>', '<=', '>='].includes(t.value)) {
        p++;
        const right = pipeExpr();
        left = { type: 'Bin', op: t.value, left, right, line: t.line };
      } else if (t.type === 'KW' && t.value === 'or' &&
                 peek(1).type === 'KW' && (peek(1).value === 'more' || peek(1).value === 'less')) {
        // "x or more" == "left >= right-implicit"? No — pattern is "N or more".
        // We treat "<expr> or more" as ">= <expr on the RIGHT of prior compare>".
        // For usability we support `x is 18 or more` and `x is 18 or less`:
        // rewrite: if last node is `x is 18`, replace 'is' with '>=' / '<='.
        p++; const dir = eat('KW').value; // 'more' | 'less'
        if (left.type === 'Bin' && left.op === 'is') {
          left = { type: 'Bin', op: dir === 'more' ? '>=' : '<=', left: left.left, right: left.right, line: t.line };
        } else {
          throw new SdevError(`"or ${dir}" must follow "is <number>"`, t.line);
        }
      } else break;
    }
    return left;
  }
  function pipeExpr() {
    let left = addExpr();
    while (peek().type === 'OP' && peek().value === '|>') {
      const line = peek().line; p++;
      const right = addExpr();
      left = { type: 'Pipe', left, right, line };
    }
    return left;
  }
  function addExpr() {
    let left = mulExpr();
    while (peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) {
      const op = peek().value, line = peek().line; p++;
      const right = mulExpr();
      left = { type: 'Bin', op, left, right, line };
    }
    return left;
  }
  function mulExpr() {
    let left = unaryExpr();
    while (peek().type === 'OP' && (peek().value === '*' || peek().value === '/' || peek().value === '%')) {
      const op = peek().value, line = peek().line; p++;
      const right = unaryExpr();
      left = { type: 'Bin', op, left, right, line };
    }
    return left;
  }
  function unaryExpr() {
    if (peek().type === 'OP' && peek().value === '-') {
      const line = peek().line; p++;
      return { type: 'Un', op: '-', operand: unaryExpr(), line };
    }
    return callExpr();
  }
  function callExpr() {
    let expr = primary();
    while (true) {
      if (peek().type === 'OP' && peek().value === '(') {
        const line = peek().line; p++;
        const args = [];
        if (!(peek().type === 'OP' && peek().value === ')')) {
          args.push(expression());
          while (peek().type === 'OP' && peek().value === ',') { p++; args.push(expression()); }
        }
        eat('OP', ')');
        expr = { type: 'Call', callee: expr, args, line };
      } else if (peek().type === 'OP' && peek().value === '[') {
        const line = peek().line; p++;
        const idx = expression();
        eat('OP', ']');
        expr = { type: 'Index', obj: expr, index: idx, line };
      } else if (peek().type === 'OP' && peek().value === '.') {
        const line = peek().line; p++;
        const name = eat('IDENT').value;
        expr = { type: 'Member', obj: expr, name, line };
      } else if (expr.type === 'Ident' && peek().type === 'KW' && peek().value === 'with') {
        // `greet with "a" 2 x` — space-separated call form
        const line = peek().line; p++;
        const args = [];
        while (canStartExpr(peek())) {
          args.push(atom()); // one atom per arg, no chained ops (keeps it beginner-simple)
        }
        expr = { type: 'Call', callee: expr, args, line };
      } else break;
    }
    return expr;
  }
  function canStartExpr(t) {
    return t.type === 'NUM' || t.type === 'STR' || t.type === 'IDENT'
      || (t.type === 'KW' && (t.value === 'true' || t.value === 'false' || t.value === 'nothing'))
      || (t.type === 'OP' && (t.value === '(' || t.value === '['));
  }
  function atom() {
    const t = peek();
    if (t.type === 'NUM') { p++; return { type: 'Num', value: t.value, line: t.line }; }
    if (t.type === 'STR') { p++; return { type: 'Str', value: t.value, line: t.line }; }
    if (t.type === 'IDENT') { p++; return { type: 'Ident', name: t.value, line: t.line }; }
    if (t.type === 'KW' && t.value === 'true')    { p++; return { type: 'Bool', value: true, line: t.line }; }
    if (t.type === 'KW' && t.value === 'false')   { p++; return { type: 'Bool', value: false, line: t.line }; }
    if (t.type === 'KW' && t.value === 'nothing') { p++; return { type: 'Nothing', line: t.line }; }
    if (t.type === 'OP' && t.value === '(') { p++; const e = expression(); eat('OP', ')'); return e; }
    if (t.type === 'OP' && t.value === '[') {
      p++; const items = [];
      if (!(peek().type === 'OP' && peek().value === ']')) {
        items.push(expression());
        while (peek().type === 'OP' && peek().value === ',') { p++; items.push(expression()); }
      }
      eat('OP', ']');
      return { type: 'List', items, line: t.line };
    }
    throw new SdevError(`unexpected ${t.type}:${t.value}`, t.line);
  }
  function primary() { return atom(); }
}

// ---------- Interpreter ----------

class ReturnSignal { constructor(v) { this.value = v; } }

class Env {
  constructor(parent) { this.vars = Object.create(parent ? parent.vars : null); this.parent = parent; }
  get(name, line) {
    if (name in this.vars) return this.vars[name];
    throw new SdevError(`unknown name '${name}'`, line);
  }
  set(name, value) { this.vars[name] = value; }
  has(name) { return name in this.vars; }
}

function makeBuiltins(env, output) {
  env.set('print', (...args) => { output(args.map(display).join(' ')); return null; });
  env.set('length', (v) => v == null ? 0 : (typeof v === 'string' || Array.isArray(v)) ? v.length : Object.keys(v).length);
  env.set('upper', (s) => String(s).toUpperCase());
  env.set('lower', (s) => String(s).toLowerCase());
  env.set('number', (s) => Number(s));
  env.set('text', (v) => display(v));
  env.set('round', (n) => Math.round(n));
  env.set('floor', (n) => Math.floor(n));
  env.set('ceil', (n) => Math.ceil(n));
  env.set('abs', (n) => Math.abs(n));
  env.set('max', (...a) => Math.max(...a));
  env.set('min', (...a) => Math.min(...a));
  env.set('sum', (arr) => (arr || []).reduce((a, b) => a + b, 0));
  env.set('range', (a, b) => { const out = []; if (b === undefined) { for (let i = 0; i < a; i++) out.push(i); } else { for (let i = a; i < b; i++) out.push(i); } return out; });
  env.set('keep', (pred) => (arr) => arr.filter((x) => truthy(pred(x))));
  env.set('map', (fn) => (arr) => arr.map((x) => fn(x)));
  env.set('double', (x) => Array.isArray(x) ? x.map((v) => v * 2) : x * 2);
  env.set('pi', Math.PI);
  env.set('tau', Math.PI * 2);
}

function display(v) {
  if (v === null || v === undefined) return 'nothing';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return '[' + v.map(display).join(', ') + ']';
  if (typeof v === 'function') return '<function>';
  if (typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => `${k}: ${display(x)}`).join(', ') + '}';
  return String(v);
}

function truthy(v) {
  if (v === null || v === undefined || v === false || v === 0 || v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function evalExpr(node, env) {
  switch (node.type) {
    case 'Num':     return node.value;
    case 'Str':     return node.value;
    case 'Bool':    return node.value;
    case 'Nothing': return null;
    case 'List':    return node.items.map((n) => evalExpr(n, env));
    case 'Ident':   return env.get(node.name, node.line);
    case 'Un': {
      const v = evalExpr(node.operand, env);
      if (node.op === '-') return -v;
      if (node.op === 'not') return !truthy(v);
      throw new SdevError(`bad unary ${node.op}`, node.line);
    }
    case 'Bin': {
      // short-circuit
      if (node.op === 'and') return truthy(evalExpr(node.left, env)) ? evalExpr(node.right, env) : evalExpr(node.left, env);
      if (node.op === 'or')  { const l = evalExpr(node.left, env); return truthy(l) ? l : evalExpr(node.right, env); }
      const l = evalExpr(node.left, env);
      const r = evalExpr(node.right, env);
      switch (node.op) {
        case '+': return typeof l === 'string' || typeof r === 'string' ? display(l) + display(r) : l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        case '%': return l % r;
        case 'is': return l === r;
        case 'isnot': return l !== r;
        case '<':  return l < r;
        case '>':  return l > r;
        case '<=': return l <= r;
        case '>=': return l >= r;
      }
      throw new SdevError(`bad op ${node.op}`, node.line);
    }
    case 'Pipe': {
      const l = evalExpr(node.left, env);
      const r = evalExpr(node.right, env);
      if (typeof r === 'function') return r(l);
      throw new SdevError(`right of |> must be a function`, node.line);
    }
    case 'Call': {
      const fn = evalExpr(node.callee, env);
      const args = node.args.map((a) => evalExpr(a, env));
      if (typeof fn !== 'function') throw new SdevError(`not callable`, node.line);
      return fn(...args);
    }
    case 'Index': {
      const obj = evalExpr(node.obj, env);
      const idx = evalExpr(node.index, env);
      return obj?.[idx];
    }
    case 'Member': {
      const obj = evalExpr(node.obj, env);
      return obj?.[node.name];
    }
  }
  throw new SdevError(`bad expr ${node.type}`, node.line);
}

function execStmt(node, env) {
  switch (node.type) {
    case 'Say':      env.get('print', node.line)(evalExpr(node.arg, env)); return;
    case 'Set':      env.set(node.name, evalExpr(node.value, env)); return;
    case 'ExprStmt': evalExpr(node.expr, env); return;
    case 'Return':   throw new ReturnSignal(node.value ? evalExpr(node.value, env) : null);
    case 'If': {
      if (truthy(evalExpr(node.cond, env))) node.thenBody.forEach((s) => execStmt(s, env));
      else if (node.elseBody) node.elseBody.forEach((s) => execStmt(s, env));
      return;
    }
    case 'For': {
      const it = evalExpr(node.iter, env);
      const items = Array.isArray(it) ? it : typeof it === 'string' ? [...it] : [];
      for (const v of items) {
        const loop = new Env(env); loop.set(node.name, v);
        for (const s of node.body) execStmt(s, loop);
      }
      return;
    }
    case 'While': {
      let guard = 0;
      while (truthy(evalExpr(node.cond, env))) {
        for (const s of node.body) execStmt(s, env);
        if (++guard > 1_000_000) throw new SdevError('while loop exceeded 1M iterations', node.line);
      }
      return;
    }
    case 'Func': {
      const fn = (...args) => {
        const local = new Env(env);
        node.params.forEach((p, i) => local.set(p, args[i]));
        try { for (const s of node.body) execStmt(s, local); }
        catch (e) { if (e instanceof ReturnSignal) return e.value; throw e; }
        return null;
      };
      env.set(node.name, fn);
      return;
    }
  }
  throw new SdevError(`bad stmt ${node.type}`, node.line);
}

// ---------- Public API ----------

export function run(source, options = {}) {
  const output = [];
  const emit = options.onOutput || ((line) => output.push(line));
  try {
    const tokens = tokenize(source);
    const ast = parse(tokens);
    const env = new Env(null);
    makeBuiltins(env, emit);
    for (const s of ast.body) execStmt(s, env);
    return { success: true, output, error: null };
  } catch (e) {
    const msg = e instanceof SdevError ? e.message : (e?.message || String(e));
    return { success: false, output, error: msg };
  }
}

export { tokenize, parse, SdevError };
export const VERSION = '2.0.0-alpha';
