// ============================================================
// sdev → Arduino C/C++ (.ino) transpiler
// ============================================================
// Recognises a `board "<id>" { ... }` or `board "<id>" :: ... ;;` block
// embedded in sdev source.

import type { BoardDescriptor } from './board-db';
import { findLibrary } from './arduino-api';

export interface TranspileResult {
  ino: string;
  libraries: string[];      // library names extracted from `use "..."`
  warnings: string[];
}

export interface BoardBlock {
  boardId: string;
  body: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Locate the first `board "..." { ... }` or `board "..." :: ... ;;` block
 * in source.
 */
export function extractBoardBlock(source: string): BoardBlock | null {
  const braceMatch = /\bboard\s+"([^"]+)"\s*\{/.exec(source);
  const colonMatch = /\bboard\s+"([^"]+)"\s*::/.exec(source);

  if (!braceMatch && !colonMatch) return null;

  const useBrace =
    braceMatch && (!colonMatch || braceMatch.index <= colonMatch.index);

  if (useBrace && braceMatch) {
    const open = braceMatch.index + braceMatch[0].length - 1;
    let depth = 1;
    let i = open + 1;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '/' && source[i + 1] === '/') {
        const nl = source.indexOf('\n', i);
        i = nl === -1 ? source.length : nl;
        continue;
      } else if (ch === '/' && source[i + 1] === '*') {
        const end = source.indexOf('*/', i + 2);
        i = end === -1 ? source.length : end + 2;
        continue;
      } else if (ch === '"') {
        i++;
        while (i < source.length && source[i] !== '"') {
          if (source[i] === '\\') i++;
          i++;
        }
      }
      i++;
    }
    if (depth !== 0) return null;
    return {
      boardId: braceMatch[1],
      body: source.slice(open + 1, i - 1),
      startIndex: braceMatch.index,
      endIndex: i,
    };
  }

  // `board "<id>" :: ... ;;`
  const m = colonMatch!;
  const bodyStart = m.index + m[0].length;
  let depth = 1;
  let i = bodyStart;
  let lastBlockToken: '::' | ';;' | 'stmt' = '::';
  let lineStart = bodyStart;

  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '\n') {
      lineStart = i + 1;
      i++;
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      const nl = source.indexOf('\n', i);
      i = nl === -1 ? source.length : nl;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    if (ch === '"') {
      i++;
      while (i < source.length && source[i] !== '"') {
        if (source[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    // Check `;;`
    if (ch === ';' && source[i + 1] === ';') {
      depth--;
      lastBlockToken = ';;';
      if (depth === 0) {
        return {
          boardId: m[1],
          body: source.slice(bodyStart, i),
          startIndex: m.index,
          endIndex: i + 2,
        };
      }
      i += 2;
      continue;
    }
    // Check `::` (ignore C++ scope resolution `Ident::Ident`)
    if (ch === ':' && source[i + 1] === ':') {
      const prevChar = i > 0 ? source[i - 1] : ' ';
      const nextChar = i + 2 < source.length ? source[i + 2] : ' ';
      const isCppScope = /\w/.test(prevChar) && /\w/.test(nextChar);
      if (!isCppScope) {
        const linePrefix = source.slice(lineStart, i).trim();
        const isContinuation = /^(?:otherwise|elif|else)\b/.test(linePrefix);
        if (!isContinuation || lastBlockToken === ';;') {
          depth++;
        }
        lastBlockToken = '::';
      }
      i += 2;
      continue;
    }
    if (!/\s/.test(ch)) {
      const linePrefix = source.slice(lineStart, i + 1).trim();
      if (!/^(?:otherwise|elif|else)\b/.test(linePrefix)) {
        lastBlockToken = 'stmt';
      }
    }
    i++;
  }

  return null;
}

const SDEV_TYPE_MAP: Record<string, string> = {
  bool: 'bool',
  boolean: 'bool',
  byte: 'byte',
  uint8: 'uint8_t',
  u8: 'uint8_t',
  char: 'char',
  int: 'int',
  i16: 'int16_t',
  i32: 'int32_t',
  uint: 'unsigned int',
  'unsigned int': 'unsigned int',
  long: 'long',
  ulong: 'unsigned long',
  'unsigned long': 'unsigned long',
  short: 'short',
  word: 'word',
  u16: 'uint16_t',
  u32: 'uint32_t',
  float: 'float',
  decimal: 'float',
  num: 'float',
  number: 'float',
  double: 'double',
  text: 'String',
  string: 'String',
  str: 'String',
  String: 'String',
  size_t: 'size_t',
  void: 'void',
};

function mapType(rawType: string): string {
  const t = rawType.trim();
  return SDEV_TYPE_MAP[t] ?? t;
}

function mapPin(rawPin: string): string {
  const p = rawPin.trim();
  if (p === 'led') return 'LED_BUILTIN';
  return transpileExpr(p);
}

export function transpileBoard(block: BoardBlock, board: BoardDescriptor): TranspileResult {
  const warnings: string[] = [];
  const libraries: string[] = [];
  const includedHeaders = new Set<string>();
  const out: string[] = [];

  out.push(`// auto-generated from sdev for ${board.label} (${board.fqbn})`);
  out.push(`// do not edit by hand`);
  out.push('');

  // Extract raw `cpp { ... }` blocks first so we don't mangle their contents.
  const cppBlocks: string[] = [];
  const bodyWithPlaceholders = replaceCppBlocks(block.body, cppBlocks);

  // Pass 1: collect `use "..."` directives so #include lines come first.
  const useRe = /^[\t ]*use\s+"([^"]+)"\s*;?\s*$/gm;
  let mu: RegExpExecArray | null;
  while ((mu = useRe.exec(bodyWithPlaceholders)) !== null) {
    const rawName = mu[1].trim();
    const lib = findLibrary(rawName);
    const canonicalName = lib ? lib.name : rawName.replace(/\.hpp$|\.h$/i, '');
    if (!libraries.includes(canonicalName)) {
      libraries.push(canonicalName);
    }
    const headers = lib
      ? lib.headers
      : [/\.(h|hpp)$/i.test(rawName) ? rawName : `${rawName}.h`];
    for (const h of headers) {
      if (!includedHeaders.has(h)) {
        includedHeaders.add(h);
        out.push(`#include <${h}>`);
      }
    }
  }
  if (includedHeaders.size > 0) out.push('');

  // Check if `speak` or `say` is used and `Serial.begin` / `serial begin` is absent.
  const stripped = bodyWithPlaceholders.replace(useRe, '');
  const usesSpeakOrSay = /(?:^|\s)(?:speak\s*\(|speak\s+[^\s]|say\s+[^\s]|say\s*\()/m.test(stripped);
  const hasSerialBegin = /\b(?:Serial\.begin|serial\s+begin)\b/.test(stripped);
  const autoSerialBegin = usesSpeakOrSay && !hasSerialBegin;

  // Pass 2: walk statements line by line.
  const lines = stripped.split(/\r?\n/);
  let depth = 0;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      out.push('');
      continue;
    }

    // Check for raw C++ block placeholder
    const cppMatch = /^([ \t]*)__SDEV_CPP_BLOCK_(\d+)__\s*$/.exec(line);
    if (cppMatch) {
      const indent = cppMatch[1];
      const rawCpp = cppBlocks[Number(cppMatch[2])] ?? '';
      const cppLines = rawCpp.replace(/^\r?\n|\r?\n\s*$/g, '').split(/\r?\n/);
      for (const cl of cppLines) {
        out.push(cl.trim() ? `${indent}${cl}` : '');
      }
      continue;
    }

    const translated = translateLine(line, depth, warnings, autoSerialBegin);

    // If the translated line starts with `} else`, and the previous non-empty
    // line in `out` was a standalone `}`, merge them so `;;` followed by
    // `otherwise ::` doesn't emit `} } else {`.
    if (/^\s*\}\s*else\b/.test(translated)) {
      for (let k = out.length - 1; k >= 0; k--) {
        if (!out[k].trim()) continue;
        if (/^\s*\}\s*$/.test(out[k])) {
          out.splice(k, 1);
        }
        break;
      }
    }

    out.push(translated);
    depth += countUnquoted(translated, '{') - countUnquoted(translated, '}');
    if (depth < 0) depth = 0;
  }

  return { ino: out.join('\n') + '\n', libraries, warnings };
}

function replaceCppBlocks(source: string, store: string[]): string {
  let result = '';
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const m = /^([ \t]*)cpp\s*\{/.exec(rest);
    if (m && (i === 0 || source[i - 1] === '\n')) {
      const indent = m[1];
      const openBrace = i + m[0].length - 1;
      let depth = 1;
      let j = openBrace + 1;
      while (j < source.length && depth > 0) {
        const ch = source[j];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (ch === '/' && source[j + 1] === '/') {
          const nl = source.indexOf('\n', j);
          j = nl === -1 ? source.length : nl;
          continue;
        } else if (ch === '"') {
          j++;
          while (j < source.length && source[j] !== '"') {
            if (source[j] === '\\') j++;
            j++;
          }
        }
        j++;
      }
      if (depth === 0) {
        const idx = store.length;
        store.push(source.slice(openBrace + 1, j - 1));
        result += `${indent}__SDEV_CPP_BLOCK_${idx}__`;
        i = j;
        continue;
      }
    }
    const nl = source.indexOf('\n', i);
    if (nl === -1) {
      result += source.slice(i);
      break;
    }
    result += source.slice(i, nl + 1);
    i = nl + 1;
  }
  return result;
}

function countUnquoted(s: string, ch: string): number {
  let n = 0;
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' && s[i - 1] !== '\\') inStr = !inStr;
    else if (!inStr && s[i] === ch) n++;
  }
  return n;
}

/** Split top-level comma-separated arguments (respecting parens, brackets, quotes). */
function splitArgs(raw: string): string[] {
  const args: string[] = [];
  let cur = '';
  let depth = 0;
  let inStr: string | null = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) {
      cur += ch;
      if (ch === inStr && raw[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      cur += ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      args.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

/** Strip trailing `// ...` comment outside string literals. */
function splitLineComment(s: string): { code: string; comment: string } {
  let inStr: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (ch === inStr && s[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === '/' && s[i + 1] === '/') {
      return { code: s.slice(0, i).trimEnd(), comment: ' ' + s.slice(i) };
    }
  }
  return { code: s, comment: '' };
}

/** Transform sdev expressions inside conditions, right-hand sides, and arguments. */
export function transpileExpr(expr: string): string {
  // Split into string literals and non-string segments so string contents are untouched.
  const parts: { text: string; isString: boolean }[] = [];
  let cur = '';
  let inStr: string | null = null;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (inStr) {
      cur += ch;
      if (ch === inStr && expr[i - 1] !== '\\') {
        parts.push({ text: cur, isString: true });
        cur = '';
        inStr = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      if (cur) parts.push({ text: cur, isString: false });
      cur = ch;
      inStr = ch;
      continue;
    }
    cur += ch;
  }
  if (cur) parts.push({ text: cur, isString: Boolean(inStr) });

  const transformed = parts
    .map((p) => {
      if (p.isString) return p.text;
      let t = p.text;

      // pulsein <pin> <mode> [<timeout>]
      t = t.replace(
        /\bpulsein\s+(\S+)\s+(high|low|HIGH|LOW)(?:\s+([^\s,);]+))?/g,
        (_, pin, mode, timeout) => {
          const pPin = pin === 'led' ? 'LED_BUILTIN' : pin;
          const mMode = mode.toUpperCase();
          return timeout ? `pulseIn(${pPin}, ${mMode}, ${timeout})` : `pulseIn(${pPin}, ${mMode})`;
        }
      );

      // pin <p> read  /  read pin <p>
      t = t.replace(/\bpin\s+([A-Za-z0-9_]+)\s+read\b/g, (_, pin) =>
        `digitalRead(${pin === 'led' ? 'LED_BUILTIN' : pin})`
      );
      t = t.replace(/\bread\s+pin\s+([A-Za-z0-9_]+)\b/g, (_, pin) =>
        `digitalRead(${pin === 'led' ? 'LED_BUILTIN' : pin})`
      );

      // analog <p> read  /  read analog <p>
      t = t.replace(/\banalog\s+([A-Za-z0-9_]+)\s+read\b/g, (_, pin) =>
        `analogRead(${/^\d+$/.test(pin) ? `A${pin}` : pin})`
      );
      t = t.replace(/\bread\s+analog\s+([A-Za-z0-9_]+)\b/g, (_, pin) =>
        `analogRead(${/^\d+$/.test(pin) ? `A${pin}` : pin})`
      );

      // read <n> (legacy form)
      t = t.replace(/\bread\s+(\d+|A\d+|led|LED_BUILTIN)\b/g, (_, pin) =>
        `digitalRead(${pin === 'led' ? 'LED_BUILTIN' : pin})`
      );

      // serial read / serial avail / serial available
      t = t.replace(/\bserial\s+read\b/g, 'Serial.read()');
      t = t.replace(/\bserial\s+avail(?:able)?\b/g, 'Serial.available()');

      // now() / nowus()
      t = t.replace(/\bnow\s*\(\s*\)/g, 'millis()');
      t = t.replace(/\bnowus\s*\(\s*\)/g, 'micros()');

      // Operators and boolean constants
      t = t.replace(/(?<!\.)\bequals\b(?!\s*\()/g, '==');
      t = t.replace(/(?<!\.)\bdiffers\b(?!\s*\()/g, '!=');
      t = t.replace(/\balso\b/g, '&&');
      t = t.replace(/\beither\b/g, '||');
      t = t.replace(/\bisnt\s+/g, '!');
      t = t.replace(/\byep\b/g, 'true');
      t = t.replace(/\bnope\b/g, 'false');

      return t;
    })
    .join('');

  // Handle `randint(a, b)` -> `random(a, (b) + 1)` across the assembled expression
  return replaceRandint(transformed);
}

function replaceRandint(s: string): string {
  const re = /\brandint\s*\(/g;
  let m: RegExpExecArray | null;
  let out = '';
  let last = 0;
  while ((m = re.exec(s)) !== null) {
    out += s.slice(last, m.index);
    const openParen = m.index + m[0].length - 1;
    let depth = 1;
    let j = openParen + 1;
    while (j < s.length && depth > 0) {
      if (s[j] === '(') depth++;
      else if (s[j] === ')') depth--;
      j++;
    }
    if (depth === 0) {
      const inner = s.slice(openParen + 1, j - 1);
      const args = splitArgs(inner);
      if (args.length === 2) {
        out += `random(${args[0]}, (${args[1]}) + 1)`;
      } else if (args.length === 1) {
        out += `random((${args[0]}) + 1)`;
      } else {
        out += `random(${inner})`;
      }
      last = j;
      re.lastIndex = j;
    } else {
      out += m[0];
      last = openParen + 1;
    }
  }
  out += s.slice(last);
  return out;
}

function mapParams(rawParams: string): string {
  if (!rawParams.trim()) return '';
  return splitArgs(rawParams)
    .map((p) => {
      const colonMatch = /^(\w+)\s*:\s*(.+)$/.exec(p);
      if (colonMatch) {
        return `${mapType(colonMatch[2])} ${colonMatch[1]}`;
      }
      return p;
    })
    .join(', ');
}

function stripOuterParens(cond: string): string {
  const c = cond.trim();
  if (!c.startsWith('(') || !c.endsWith(')')) return c;
  let depth = 0;
  for (let i = 0; i < c.length; i++) {
    if (c[i] === '(') depth++;
    else if (c[i] === ')') {
      depth--;
      if (depth === 0 && i < c.length - 1) return c;
    }
  }
  return c.slice(1, -1).trim();
}

function translateLine(
  line: string,
  _depth: number,
  warnings: string[],
  autoSerialBegin = false
): string {
  const indentMatch = /^[ \t]*/.exec(line);
  const indent = indentMatch ? indentMatch[0] : '';
  const rawBody = line.slice(indent.length);

  // Full-line comments (`// ...`, `/* ... */`)
  if (rawBody.startsWith('//') || rawBody.startsWith('/*')) {
    return `${indent}${rawBody}`;
  }
  // C preprocessor directives vs sdev `#` comments
  if (rawBody.startsWith('#')) {
    if (/^#\s*(include|define|undef|if|ifdef|ifndef|else|elif|endif|pragma|error|line)\b/.test(rawBody)) {
      return `${indent}${rawBody}`;
    }
    return `${indent}// ${rawBody.slice(1).trimStart()}`;
  }

  const { code: body, comment } = splitLineComment(rawBody);

  // Block closers: `;;` or `}` or v2 `end`
  if (body === ';;' || body === '}' || body === 'end') {
    return `${indent}}${comment}`;
  }
  if (body === '::' || body === '{') {
    return `${indent}{${comment}`;
  }

  // `device <name> be <Class>(<args>)` or `device <name> be <Class>`
  let m = /^device\s+(\w+)\s+be\s+([\w:<>]+)\s*\((.*)\)\s*;?\s*$/.exec(body);
  if (m) {
    const [, name, cls, args] = m;
    const tArgs = splitArgs(args).map(transpileExpr).join(', ');
    return `${indent}${cls} ${name}(${tArgs});${comment}`;
  }
  m = /^device\s+(\w+)\s+be\s+([\w:<>]+)\s*;?\s*$/.exec(body);
  if (m) {
    const [, name, cls] = m;
    return `${indent}${cls} ${name};${comment}`;
  }

  // `conjure name(args) [-> Type] ::` / `conjure name(args) {` / `to name [with args]`
  m = /^conjure\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([\w\s]+?))?\s*(?:::|\{)?\s*$/.exec(body);
  if (m) {
    const [, name, args, retAnnotation] = m;
    const ret = retAnnotation
      ? mapType(retAnnotation)
      : name === 'setup' || name === 'loop'
      ? 'void'
      : 'auto';
    const header = `${indent}${ret} ${name}(${mapParams(args)}) {${comment}`;
    if (name === 'setup' && autoSerialBegin) {
      return `${header}\n${indent}  Serial.begin(9600);`;
    }
    return header;
  }

  m = /^to\s+(\w+)(?:\s+with\s+(.+?))?\s*(?:::|\{)?\s*$/.exec(body);
  if (m) {
    const [, name, args] = m;
    const ret = name === 'setup' || name === 'loop' ? 'void' : 'auto';
    const header = `${indent}${ret} ${name}(${args ? mapParams(args) : ''}) {${comment}`;
    if (name === 'setup' && autoSerialBegin) {
      return `${header}\n${indent}  Serial.begin(9600);`;
    }
    return header;
  }

  // Control flow:
  // `otherwise ponder <cond> ::` / `elif <cond> ::` / `else if <cond> ::` / `else if (<cond>) {`
  m = /^(?:;;\s*|\}\s*)?(?:otherwise\s+ponder|elif|else\s+if)\s+(.+?)\s*(?:::|\{)?\s*$/.exec(body);
  if (m) {
    const cond = transpileExpr(stripOuterParens(m[1]));
    return `${indent}} else if (${cond}) {${comment}`;
  }

  // `otherwise ::` / `else ::` / `else {` / `otherwise`
  m = /^(?:;;\s*|\}\s*)?(?:otherwise|else)\s*(?:::|\{)?\s*$/.exec(body);
  if (m) {
    return `${indent}} else {${comment}`;
  }

  // `ponder <cond> ::` / `if <cond> ::` / `if (<cond>) {`
  m = /^(?:ponder|if)\s+(.+?)\s*(?:::|\{)\s*$/.exec(body);
  if (m) {
    const cond = transpileExpr(stripOuterParens(m[1]));
    return `${indent}if (${cond}) {${comment}`;
  }

  // `within <v> be sequence(a, b, step) ::` / `range(...)`
  m = /^(?:within|for|iterate)\s+(\w+)\s+(?:be|in|through)\s+(?:sequence|range)\s*\((.*)\)\s*(?:::|\{)?\s*$/.exec(body);
  if (m) {
    const [, v, rawArgs] = m;
    const args = splitArgs(rawArgs).map(transpileExpr);
    if (args.length === 1) {
      return `${indent}for (long ${v} = 0; ${v} < ${args[0]}; ${v}++) {${comment}`;
    }
    if (args.length === 2) {
      return `${indent}for (long ${v} = ${args[0]}; ${v} < ${args[1]}; ${v}++) {${comment}`;
    }
    if (args.length >= 3) {
      const [a, b, step] = args;
      return `${indent}for (long ${v} = ${a}; (${step}) >= 0 ? ${v} < ${b} : ${v} > ${b}; ${v} += (${step})) {${comment}`;
    }
  }

  // `cycle <cond> ::` / `while <cond> ::` / `while (<cond>) {`
  m = /^(?:cycle|while)\s+(.+?)\s*(?:::|\{)\s*$/.exec(body);
  if (m) {
    const cond = transpileExpr(stripOuterParens(m[1]));
    return `${indent}while (${cond}) {${comment}`;
  }

  // `forever ::`
  if (/^forever\s*(?:::|\{)?\s*$/.test(body)) {
    return `${indent}while (true) {${comment}`;
  }

  // `yeet` / `skip` / `yield` / `return`
  if (/^yeet\s*;?\s*$/.test(body)) return `${indent}break;${comment}`;
  if (/^skip\s*;?\s*$/.test(body)) return `${indent}continue;${comment}`;
  m = /^(?:yield|return)\b\s*(.*?)\s*;?\s*$/.exec(body);
  if (m && !m[1].startsWith('(')) {
    return m[1]
      ? `${indent}return ${transpileExpr(m[1])};${comment}`
      : `${indent}return;${comment}`;
  }
  if (/^return\b/.test(body)) {
    const retExpr = body.replace(/^return\b\s*/, '').replace(/;\s*$/, '');
    return retExpr
      ? `${indent}return ${transpileExpr(retExpr)};${comment}`
      : `${indent}return;${comment}`;
  }

  // Hardware statements:
  // `pin <n> be output|input|input_pullup|input_pulldown`
  m = /^pin\s+(\S+)\s+be\s+(output|input|input_pullup|input_pulldown)\s*;?\s*$/i.exec(body);
  if (m) {
    const mode = m[2].toUpperCase();
    return `${indent}pinMode(${mapPin(m[1])}, ${mode});${comment}`;
  }

  // `pin <n> on` / `pin <n> off` / `pin <n> toggle`
  m = /^pin\s+(\S+)\s+(on|off|toggle)\s*;?\s*$/i.exec(body);
  if (m) {
    const p = mapPin(m[1]);
    const act = m[2].toLowerCase();
    if (act === 'on') return `${indent}digitalWrite(${p}, HIGH);${comment}`;
    if (act === 'off') return `${indent}digitalWrite(${p}, LOW);${comment}`;
    return `${indent}digitalWrite(${p}, !digitalRead(${p}));${comment}`;
  }

  // `pin <n> write high|low|<expr>`
  m = /^pin\s+(\S+)\s+write\s+(.+?)\s*;?\s*$/.exec(body);
  if (m) {
    const rawVal = m[2].trim();
    const val =
      rawVal.toLowerCase() === 'high'
        ? 'HIGH'
        : rawVal.toLowerCase() === 'low'
        ? 'LOW'
        : transpileExpr(rawVal);
    return `${indent}digitalWrite(${mapPin(m[1])}, ${val});${comment}`;
  }

  // `pin <n> analog <expr>` / `pin <n> pwm <expr>` / `analog <n> write <expr>`
  m = /^pin\s+(\S+)\s+(?:analog|pwm)\s+(.+?)\s*;?\s*$/.exec(body);
  if (m) return `${indent}analogWrite(${mapPin(m[1])}, ${transpileExpr(m[2])});${comment}`;
  m = /^analog\s+(\S+)\s+write\s+(.+?)\s*;?\s*$/.exec(body);
  if (m) return `${indent}analogWrite(${mapPin(m[1])}, ${transpileExpr(m[2])});${comment}`;

  // `analog reference <mode>`
  m = /^analog\s+reference\s+(\S+)\s*;?\s*$/i.exec(body);
  if (m) return `${indent}analogReference(${m[1].toUpperCase()});${comment}`;

  // `wait <n> seconds` / `wait <n> second`
  m = /^wait\s+(.+?)\s+seconds?\s*;?\s*$/i.exec(body);
  if (m) return `${indent}delay((${transpileExpr(m[1])}) * 1000);${comment}`;

  // `wait <n> us` / `wait_us <us>`
  m = /^wait\s+(.+?)\s+us\s*;?\s*$/i.exec(body);
  if (m) return `${indent}delayMicroseconds(${transpileExpr(m[1])});${comment}`;
  m = /^wait_us\s+(.+?)\s*;?\s*$/.exec(body);
  if (m) return `${indent}delayMicroseconds(${transpileExpr(m[1])});${comment}`;

  // `wait <ms> ms` / `wait <ms>`
  m = /^wait\s+(.+?)(?:\s+ms)?\s*;?\s*$/.exec(body);
  if (m) return `${indent}delay(${transpileExpr(m[1])});${comment}`;

  // `serial begin / print / println / write`
  m = /^serial\s+begin\s+(.+?)\s*;?\s*$/.exec(body);
  if (m) return `${indent}Serial.begin(${transpileExpr(m[1])});${comment}`;
  m = /^serial\s+println\s+(.+?)\s*;?\s*$/.exec(body);
  if (m) return `${indent}Serial.println(${transpileExpr(m[1])});${comment}`;
  m = /^serial\s+print\s+(.+?)\s*;?\s*$/.exec(body);
  if (m) return `${indent}Serial.print(${transpileExpr(m[1])});${comment}`;
  m = /^serial\s+write\s+(.+?)\s*;?\s*$/.exec(body);
  if (m) return `${indent}Serial.write(${transpileExpr(m[1])});${comment}`;

  // `speak(...)` / `say ...`
  m = /^speak\s*\((.*)\)\s*;?\s*$/.exec(body);
  if (m) {
    return formatSerialPrintArgs(indent, m[1], comment);
  }
  m = /^(?:say|speak)\s+(.+?)\s*;?\s*$/.exec(body);
  if (m) {
    return formatSerialPrintArgs(indent, m[1], comment);
  }

  // `tone <pin> <freq> [<duration>]` / `notone <pin>`
  m = /^tone\s+(\S+)\s+(\S+)(?:\s+(\S+))?\s*;?\s*$/.exec(body);
  if (m && !m[1].startsWith('(')) {
    return m[3]
      ? `${indent}tone(${mapPin(m[1])}, ${transpileExpr(m[2])}, ${transpileExpr(m[3])});${comment}`
      : `${indent}tone(${mapPin(m[1])}, ${transpileExpr(m[2])});${comment}`;
  }
  m = /^notone\s+(\S+)\s*;?\s*$/i.exec(body);
  if (m && !m[1].startsWith('(')) {
    return `${indent}noTone(${mapPin(m[1])});${comment}`;
  }

  // `shiftout <data> <clk> <order> <val>`
  m = /^shiftout\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+?)\s*;?\s*$/i.exec(body);
  if (m) {
    const [, dataPin, clkPin, order, val] = m;
    return `${indent}shiftOut(${mapPin(dataPin)}, ${mapPin(clkPin)}, ${order.toUpperCase()}, ${transpileExpr(val)});${comment}`;
  }

  // `attach <pin> <mode> <fn>` / `detach <pin>`
  m = /^attach\s+(\S+)\s+(\S+)\s+(\S+)\s*;?\s*$/i.exec(body);
  if (m) {
    const [, pin, mode, fn] = m;
    return `${indent}attachInterrupt(digitalPinToInterrupt(${mapPin(pin)}), ${fn}, ${mode.toUpperCase()});${comment}`;
  }
  m = /^detach\s+(\S+)\s*;?\s*$/i.exec(body);
  if (m && !m[1].startsWith('(')) {
    return `${indent}detachInterrupt(digitalPinToInterrupt(${mapPin(m[1])}));${comment}`;
  }

  // Variable declarations with optional qualifiers (`fixed`, `keep`, `volatile`):
  // `[fixed|keep|volatile]* forge <name>[: <type>] be <expr>`
  m = /^((?:(?:fixed|keep|volatile)\s+)*)(?:forge\s+)?((?:(?:fixed|keep|volatile)\s+)*)(\w+)(?:\s*:\s*([\w\s]+?))?\s+be\s+(.+?)\s*;?\s*$/.exec(body);
  if (m && (body.startsWith('forge ') || m[1].trim() || m[2].trim() || m[4])) {
    const rawQuals = `${m[1]} ${m[2]}`.trim();
    const quals = parseQualifiers(rawQuals);
    const qualPrefix = quals ? `${quals} ` : '';
    const name = m[3];
    const typeAnnot = m[4] ? mapType(m[4]) : null;
    const rhs = m[5].trim();

    // Array literal `[a, b, c]`
    if (rhs.startsWith('[') && rhs.endsWith(']')) {
      const items = splitArgs(rhs.slice(1, -1)).map(transpileExpr).join(', ');
      const cType = typeAnnot ?? 'auto';
      return `${indent}${qualPrefix}${cType} ${name}[] = {${items}};${comment}`;
    }

    const cType = typeAnnot ?? 'auto';
    return `${indent}${qualPrefix}${cType} ${name} = ${transpileExpr(rhs)};${comment}`;
  }

  // Uninitialised typed forge: `forge <name>: <type>`
  m = /^((?:(?:fixed|keep|volatile)\s+)*)forge\s+(\w+)\s*:\s*([\w\s]+?)\s*;?\s*$/.exec(body);
  if (m) {
    const quals = parseQualifiers(m[1]);
    const qualPrefix = quals ? `${quals} ` : '';
    return `${indent}${qualPrefix}${mapType(m[3])} ${m[2]};${comment}`;
  }

  // `set <name> to <expr>`
  m = /^((?:(?:fixed|keep|volatile)\s+)*)set\s+(\w+)\s+to\s+(.+?)\s*;?\s*$/.exec(body);
  if (m) {
    const quals = parseQualifiers(m[1]);
    const qualPrefix = quals ? `${quals} ` : '';
    return `${indent}${qualPrefix}auto ${m[2]} = ${transpileExpr(m[3])};${comment}`;
  }

  // `define <name> = <expr>`
  m = /^((?:(?:fixed|keep|volatile)\s+)*)define\s+(\w+)\s*=\s*(.+?)\s*;?\s*$/.exec(body);
  if (m) {
    const quals = parseQualifiers(m[1]);
    const qualPrefix = quals ? `${quals} ` : '';
    return `${indent}${qualPrefix}auto ${m[2]} = ${transpileExpr(m[3])};${comment}`;
  }

  // Reassignment `<lhs> be <rhs>` (e.g. `count be count + 1`, `arr[i] be 0`)
  m = /^([A-Za-z_][\w.[\]]*)\s+be\s+(.+?)\s*;?\s*$/.exec(body);
  if (m) {
    return `${indent}${m[1]} = ${transpileExpr(m[2])};${comment}`;
  }

  // C++ style control headers (`if (...) {`, `while (...) {`, `for (...) {`, `switch (...) {`, `do {`)
  if (/^(if|else|while|for|switch|do)\b/.test(body)) {
    return `${indent}${transpileExpr(body)}${comment}`;
  }

  // Already ends with `;`, `{`, or `}`
  if (/[;{}]$/.test(body)) {
    return `${indent}${transpileExpr(body)}${comment}`;
  }

  // Function/method call or C++ expression statement (e.g. `Wire.begin()`, `x++`, `a = 1`)
  if (/^[A-Za-z_][\w.:<>]*\s*\(/.test(body) || /[=+\-*/&|^%<>]/.test(body)) {
    return `${indent}${transpileExpr(body)};${comment}`;
  }

  warnings.push(`unrecognised statement, passed through with ';': ${body}`);
  return `${indent}${transpileExpr(body)};${comment}`;
}

function parseQualifiers(raw: string): string {
  if (!raw.trim()) return '';
  return raw
    .trim()
    .split(/\s+/)
    .map((q) => (q === 'fixed' ? 'const' : q === 'keep' ? 'static' : q))
    .join(' ');
}

function formatSerialPrintArgs(indent: string, rawArgs: string, comment: string): string {
  const args = splitArgs(rawArgs).map(transpileExpr);
  if (args.length === 0) {
    return `${indent}Serial.println();${comment}`;
  }
  if (args.length === 1) {
    return `${indent}Serial.println(${args[0]});${comment}`;
  }
  const parts: string[] = [];
  for (let i = 0; i < args.length - 1; i++) {
    parts.push(`Serial.print(${args[i]});`);
    parts.push(`Serial.print(" ");`);
  }
  parts.push(`Serial.println(${args[args.length - 1]});`);
  return `${indent}${parts.join(' ')}${comment}`;
}
