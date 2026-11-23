// Shared SDEV v2 parser and `kind` desugarer used by both the bytecode oracle and native backend.

import { tokenize, SdevError } from './v2-lexer.mjs';
import { prelink, defaultReadModule } from './prelink.mjs';

// Desugars `kind Name` ... `end` blocks into top-level `Name_method` declarations at the token level.
export function desugarKinds(tokens) {
  const classes = new Map();
  const blank = (i) => { tokens[i] = { type: 'NL', value: '\n', line: tokens[i].line }; };
  const isEnd = (t) => t.type === 'KW' && t.value === 'end';
  const opener = (i) => {
    const t = tokens[i];
    // `to` only opens a block when starting a statement (not infix `set x to v`).
    if (t.type === 'KW' && t.value === 'to') return i === 0 || tokens[i - 1].type === 'NL';
    if (t.type === 'KW' && (t.value === 'while' || t.value === 'for')) return true;
    if (t.type === 'KW' && t.value === 'if') {
      // `else if` chains share the outer `end`.
      let k = i - 1;
      while (k >= 0 && tokens[k].type === 'NL') k--;
      return !(k >= 0 && tokens[k].type === 'KW' && tokens[k].value === 'else');
    }
    if (t.type === 'IDENT' && (t.value === 'attempt' || t.value === 'make')) return true;
    if (t.type === 'IDENT' && t.value === 'kind') return (i === 0 || tokens[i - 1].type === 'NL') && !!tokens[i + 1] && tokens[i + 1].type === 'IDENT';
    return false;
  };
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === 'IDENT' && t.value === 'kind' && (i === 0 || tokens[i - 1].type === 'NL') && tokens[i + 1] && tokens[i + 1].type === 'IDENT') {
      const cname = tokens[i + 1].value;
      const methods = [];
      classes.set(cname, methods);
      blank(i); blank(i + 1);
      let parent = null;
      let j = i + 2;
      if (tokens[i + 2] && tokens[i + 2].type === 'IDENT' && tokens[i + 2].value === 'extends'
          && tokens[i + 3] && tokens[i + 3].type === 'IDENT') {
        parent = tokens[i + 3].value;
        blank(i + 2); blank(i + 3);
        j = i + 4;
      }
      let depth = 0;
      while (j < tokens.length && tokens[j].type !== 'EOF') {
        // Static lexical `super.m(...)` -> `self.super_<Class>_m(...)` without token insertion.
        if (tokens[j].type === 'IDENT' && tokens[j].value === 'super'
            && tokens[j + 1] && tokens[j + 1].type === 'OP' && tokens[j + 1].value === '.'
            && tokens[j + 2] && tokens[j + 2].type === 'IDENT') {
          tokens[j] = { ...tokens[j], value: 'self' };
          tokens[j + 2] = { ...tokens[j + 2], value: 'super_' + cname + '_' + tokens[j + 2].value };
          j += 3; continue;
        }
        if (isEnd(tokens[j])) {
          if (depth === 0) { blank(j); j++; break; }
          depth--; j++; continue;
        }
        if (opener(j)) {
          if (depth === 0 && tokens[j].type === 'KW' && tokens[j].value === 'to'
              && tokens[j + 1] && tokens[j + 1].type === 'IDENT') {
            const m = tokens[j + 1].value;
            const fn = cname + '_' + m;
            tokens[j + 1] = { ...tokens[j + 1], value: fn };
            methods.push({ key: m, fn });
          }
          depth++; j++; continue;
        }
        j++;
      }
      if (parent !== null) {
        const pm = classes.get(parent);
        if (!pm) throw new SdevError(`unknown parent kind ${parent}`, t.line);
        const ownStop = methods.length;
        for (const e of pm) {
          if (e.sup) { methods.push({ key: e.key, fn: e.fn, sup: true }); continue; }
          let own = false;
          for (let q = 0; q < ownStop; q++) if (!methods[q].sup && methods[q].key === e.key) own = true;
          if (!own) methods.push({ key: e.key, fn: e.fn });
          methods.push({ key: 'super_' + cname + '_' + e.key, fn: e.fn, sup: true });
        }
      }
      i = j; continue;
    }
    i++;
  }
  return classes;
}

export function parse(source) {
  const t = tokenize(prelink(source));
  desugarKinds(t);
  return parseProgram(t);
}

export function parseWithKinds(source, readModule = defaultReadModule) {
  const t = tokenize(prelink(source, readModule));
  const classes = desugarKinds(t);
  return { ast: parseProgram(t), classes };
}

export function parseProgram(tokens) {
  let p = 0;
  const peek = (n = 0) => tokens[p + n];
  const eat = (type, value) => {
    const t = tokens[p];
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new SdevError(`bootstrap: expected ${value ?? type}, got ${t.type}:${t.value}`, t.line);
    }
    p++; return t;
  };
  const match = (type, value) => {
    const t = tokens[p];
    if (t.type === type && (value === undefined || t.value === value)) { p++; return t; }
    return null;
  };
  const skipNL = () => { while (peek().type === 'NL') p++; };
  let feDepth = 0;

  const stmts = [];
  skipNL();
  while (peek().type !== 'EOF') { stmts.push(statement()); skipNL(); }
  return stmts;

  function statement() {
    const t = peek();
    if (t.type === 'IDENT' && t.value === 'break')    { p++; return { k: 'break', line: t.line }; }
    if (t.type === 'IDENT' && t.value === 'continue') { p++; return { k: 'continue', line: t.line }; }
    if (t.type === 'IDENT' && t.value === 'attempt')   return attemptStmt();
    if (t.type === 'IDENT' && t.value === 'throw')     { p++; return { k: 'throw', expr: expr(), line: t.line }; }
    if (t.type === 'KW') {
      if (t.value === 'say')    { p++; return { k: 'say', expr: expr(), line: t.line }; }

      if (t.value === 'set')    {
        p++;
        const name = eat('IDENT').value;
        if (peek().type === 'OP' && peek().value === '.') {
          p++;
          const field = eat('IDENT').value;
          eat('KW', 'to');
          return { k: 'setField', name, field, expr: expr(), line: t.line };
        }
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
      if (peek().type === 'KW' && peek().value === 'if') { else_ = [ifStmt()]; chained = true; }
      else { skipNL(); else_ = []; while (!(peek().type === 'KW' && peek().value === 'end')) { else_.push(statement()); skipNL(); } }
    }
    if (!chained) eat('KW', 'end');
    return { k: 'if', cond, then_, else_, line: t.line };
  }
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
    if (a.k === 'ident' && peek().type === 'OP' && peek().value === '(') {
      p++;
      const args = [];
      if (!(peek().type === 'OP' && peek().value === ')')) {
        args.push(expr());
        while (peek().type === 'OP' && peek().value === ',') { p++; args.push(expr()); }
      }
      eat('OP', ')');
      a = { k: 'call', name: a.name, args, line: a.line };
    }
    else if (a.k === 'ident' && peek().type === 'KW' && peek().value === 'with') {
      p++;
      const args = [];
      while (canStartAtom(peek())) args.push(atom());
      a = { k: 'call', name: a.name, args, line: a.line };
    }
    while (true) {
      if (peek().type === 'OP' && peek().value === '[') {
        p++;
        const idx = expr();
        eat('OP', ']');
        a = { k: 'index', target: a, idx };
        continue;
      }
      if (peek().type === 'OP' && peek().value === '.' && peek(1) && peek(1).type === 'IDENT') {
        p++;
        const nm = eat('IDENT').value;
        if (peek().type === 'OP' && peek().value === '(') {
          if (a.k !== 'ident') throw new SdevError('method call needs a variable receiver', 0);
          p++;
          const args = [];
          if (!(peek().type === 'OP' && peek().value === ')')) {
            args.push(expr());
            while (peek().type === 'OP' && peek().value === ',') { p++; args.push(expr()); }
          }
          eat('OP', ')');
          a = { k: 'mcall', recv: a.name, m: nm, args };
        } else {
          a = { k: 'field', target: a, name: nm };
        }
        continue;
      }
      break;
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
      if (t.isFloat) return { k: 'fnum', v: t.value };
      if (Number.isInteger(t.value)) return { k: 'num', v: t.value };
      return { k: 'fnum', v: t.value };
    }
    if (t.type === 'STR') { p++; return { k: 'str', v: t.value }; }
    if (t.type === 'KW' && t.value === 'true')    { p++; return { k: 'num', v: 1 }; }
    if (t.type === 'KW' && t.value === 'false')   { p++; return { k: 'num', v: 0 }; }
    if (t.type === 'KW' && t.value === 'nothing') { p++; return { k: 'num', v: 0 }; }
    if (t.type === 'IDENT' && t.value === 'make') {
      p++;
      const params = [];
      if (peek().type === 'KW' && peek().value === 'with') {
        p++;
        while (peek().type === 'IDENT' && peek().value !== 'capture') params.push(eat('IDENT').value);
      }
      const caps = [];
      if (peek().type === 'IDENT' && peek().value === 'capture') {
        p++;
        while (peek().type === 'IDENT') caps.push(eat('IDENT').value);
      }
      skipNL();
      const body = [];
      while (!(peek().type === 'KW' && peek().value === 'end')) { body.push(statement()); skipNL(); }
      eat('KW', 'end');
      return { k: 'lambda', params, caps, body, line: t.line };
    }
    if (t.type === 'IDENT' && t.value === 'ref' && peek(1) && peek(1).type === 'IDENT') {
      p++; const name = eat('IDENT').value;
      return { k: 'ref', name, line: t.line };
    }
    if (t.type === 'IDENT' && t.value === 'call' && peek(1) && peek(1).type === 'IDENT') {
      p++; const target = { k: 'ident', name: eat('IDENT').value };
      eat('OP', '(');
      const args = [];
      if (!(peek().type === 'OP' && peek().value === ')')) {
        args.push(expr());
        while (peek().type === 'OP' && peek().value === ',') { p++; args.push(expr()); }
      }
      eat('OP', ')');
      return { k: 'callv', target, args, line: t.line };
    }
    if (t.type === 'IDENT' && t.value === 'new' && peek(1) && peek(1).type === 'IDENT') {
      p++;
      const cls = eat('IDENT').value;
      if (peek().type === 'OP' && peek().value === '(') { p++; eat('OP', ')'); }
      return { k: 'new', cls, line: t.line };
    }
    if (t.type === 'IDENT') { p++; return { k: 'ident', name: t.value }; }
    if (t.type === 'OP' && t.value === '(') { p++; const e = expr(); eat('OP', ')'); return e; }
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
