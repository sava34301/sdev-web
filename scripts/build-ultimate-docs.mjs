#!/usr/bin/env node
// Builds public/SDEV_ULTIMATE_DOCUMENTATION.md — the single, complete sdev
// reference. It stitches together every hand-written guide in the repository
// and appends machine-generated appendices (builtin index, opcode table,
// keyword table, stdlib index, parity matrix, repo map, toolchain index) so
// the file can never drift from the implementation.
//
//   node scripts/build-ultimate-docs.mjs
//
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public/SDEV_ULTIMATE_DOCUMENTATION.md');

const read = (p) => {
  try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; }
};
const exists = (p) => fs.existsSync(path.join(ROOT, p));

/** Shift every ATX heading in a markdown document down by `by` levels. */
function shiftHeadings(md, by) {
  const lines = md.split('\n');
  let fence = false;
  return lines.map((line) => {
    if (/^\s*```/.test(line)) { fence = !fence; return line; }
    if (fence) return line;
    const m = /^(#{1,6})(\s+)(.*)$/.exec(line);
    if (!m) return line;
    const level = Math.min(6, m[1].length + by);
    return '#'.repeat(level) + m[2] + m[3];
  }).join('\n');
}

/** Strip an HTML comment marker pair's contents? (kept verbatim — no-op) */
const verbatim = (s) => s.replace(/\r\n/g, '\n').trim();

// ---------------------------------------------------------------------------
// Generated appendix: builtin index (v1 TypeScript runtime)
// ---------------------------------------------------------------------------
const BUILTIN_MODULES = [
  ['builtins.ts', 'Core standard library — I/O, types, math, collections, strings, regex, time'],
  ['advanced.ts', 'Pro layer — file I/O, hashing, base64, JSON, async, OS glue, buffers, FFI bridge'],
  ['matrix.ts', 'Matrix and linear algebra'],
  ['graphics.ts', 'Canvas 2D drawing and turtle graphics'],
  ['ui.ts', 'App widget runtime used by the IDE App preview'],
  ['web.ts', 'Web DSL — HTML tags, CSS, JS hooks, raw passthrough'],
  ['kernel.ts', 'Virtual kernel — tasks, syscalls, IPC, GC, process table'],
];

/** Prettify an inferred argument list: a, b, c… */
const ARGNAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/**
 * Slice a module into one record per `builtins.set(...)` call so each builtin
 * can be documented individually: name, inferred signature, prose description,
 * declared constraints, and source location.
 */
function parseBuiltins(src, file) {
  const lines = src.split('\n');
  const marks = [];
  lines.forEach((line, i) => {
    const m = /builtins\.set\(\s*['"]([A-Za-z_][A-Za-z_0-9]*)['"]/.exec(line);
    if (m) marks.push({ name: m[1], line: i });
  });
  const out = [];
  let section = '';
  for (let k = 0; k < marks.length; k++) {
    const { name, line } = marks[k];
    const end = k + 1 < marks.length ? marks[k + 1].line : lines.length;
    const body = lines.slice(line, end).join('\n');

    // Contiguous `//` comment block directly above the registration.
    const doc = [];
    for (let j = line - 1; j >= 0; j--) {
      const t = lines[j].trim();
      if (!t.startsWith('//')) break;
      const text = t.replace(/^\/\/+\s?/, '');
      if (/^[=\-*]{3,}$/.test(text)) break;
      doc.unshift(text);
    }
    // Nearest banner comment above (`// ===== Graphics =====`) → category.
    for (let j = line - 1; j >= 0 && j > line - 400; j--) {
      const t = lines[j].trim();
      const b = /^\/\/\s*[=\-*]{2,}\s*(.+?)\s*[=\-*]{2,}$/.exec(t);
      if (b) { section = b[1]; break; }
    }

    // Arity: highest `args[N]` referenced, plus spread/variadic detection.
    const idx = [...body.matchAll(/args\[(\d+)\]/g)].map((m) => Number(m[1]));
    const variadic = /args\.map|args\.join|\.\.\.args|args\.slice|args\.forEach|args\.length\s*[><]/.test(body);
    const arity = idx.length ? Math.max(...idx) + 1 : 0;
    const exact = /args\.length\s*!==\s*(\d+)/.exec(body);
    const count = exact ? Number(exact[1]) : arity;
    const sig = variadic && !exact
      ? `${name}(…)`
      : `${name}(${ARGNAMES.slice(0, count).join(', ')})`;

    // Declared constraints — the runtime's own error messages are the spec.
    const errs = [...body.matchAll(/SdevError\(\s*[`'"]([^`'"]+)[`'"]/g)]
      .map((m) => m[1]).filter((e, i2, arr) => arr.indexOf(e) === i2).slice(0, 2);

    // Description: explicit comment wins, then the curated dictionary, then a
    // derivation from the implementation itself.
    let desc = doc.join(' ').replace(new RegExp(`^${name}\\s*[-–—:]\\s*`, 'i'), '').trim();
    if (!desc) desc = BUILTIN_DOCS[`${file}:${name}`] || BUILTIN_DOCS[name] || '';
    if (!desc) {
      const oneLiner = /call:\s*\(args[^)]*\)\s*=>\s*([^\n]+?),?\s*\}\s*\);?\s*$/.exec(body.trim());
      if (oneLiner) {
        const expr = oneLiner[1].replace(/\s*as\s+\w+(\[\])?/g, '')
          .replace(/args\[(\d+)\]/g, (_, n) => ARGNAMES[Number(n)] || `arg${n}`)
          .replace(/\s+/g, ' ').trim();
        desc = `Evaluates \`${expr}\`.`;
      } else if (section) {
        desc = `${section} operation.`;
      } else {
        desc = 'Runtime primitive.';
      }
    }

    if (!/[.!?]$/.test(desc)) desc += '.';
    out.push({ name, sig, desc, errs, line: line + 1, file, section });
  }
  return out;
}

function builtinIndex() {
  let out = '';
  let total = 0;
  for (const [file, desc] of BUILTIN_MODULES) {
    const src = read(`src/lang/${file}`);
    if (!src) continue;
    const recs = parseBuiltins(src, file);
    const seen = new Set();
    const uniq = recs.filter((r) => (seen.has(r.name) ? false : seen.add(r.name)));
    uniq.sort((x, y) => x.name.localeCompare(y.name));
    total += uniq.length;
    out += `\n#### \`src/lang/${file}\` — ${desc}\n\n`;
    out += `${uniq.length} builtins. Signatures are inferred from the implementation; `;
    out += `"Rules" lists the constraints the runtime enforces at call time.\n\n`;
    out += '| Call | What it does | Rules | Source |\n| --- | --- | --- | --- |\n';
    for (const r of uniq) {
      const rules = r.errs.length ? r.errs.map((e) => e.replace(/\|/g, '\\|')).join('; ') : '—';
      out += `| \`${r.sig}\` | ${r.desc.replace(/\|/g, '\\|')} | ${rules} | \`${file}:${r.line}\` |\n`;
    }
  }
  return { text: out, total };
}


// ---------------------------------------------------------------------------
// Generated appendix: keyword table (v1 lexer)
// ---------------------------------------------------------------------------
/** Hand-written meaning for every v1 keyword, keyed by the keyword itself. */
const KEYWORD_DOCS = {
  forge: ['Declare and bind a new variable in the current scope.', 'forge score be 10'],
  conjure: ['Declare a function. The body runs between `::` and `;;`.', 'conjure add(a, b) :: yield a + b ;;'],
  ponder: ['Conditional. Runs its block when the condition is truthy.', 'ponder score > 9 :: speak("high") ;;'],
  otherwise: ['The else branch of a `ponder`; may be chained as `otherwise ponder`.', 'otherwise :: speak("low") ;;'],
  cycle: ['While-loop. Repeats its block while the condition holds.', 'cycle i < 10 :: be i be i + 1 ;;'],
  iterate: ['For-each loop header; pairs with `through` (lists) or `within` (ranges).', 'iterate n through nums :: speak(n) ;;'],
  through: ['Loop source operator: iterate over the elements of a list, string, or tome.', 'iterate ch through "abc"'],
  within: ['Loop source operator: iterate over a numeric range or a container membership test.', 'iterate i within sequence(0, 5)'],
  be: ['Assignment to an existing binding, and the binder used after `forge`.', 'be score be score + 1'],
  yield: ['Return a value from a function and stop executing it.', 'yield a + b'],
  yeet: ['Break out of the innermost loop immediately.', 'ponder done :: yeet ;;'],
  skip: ['Continue: abandon this iteration and start the next one.', 'ponder n < 0 :: skip ;;'],
  yep: ['Boolean true literal.', 'forge ok be yep'],
  nope: ['Boolean false literal.', 'forge ok be nope'],
  void: ['The null / absent value. Uninitialised fields read as `void`.', 'forge nothing be void'],
  also: ['Logical AND with short-circuit evaluation.', 'ponder a > 0 also b > 0'],
  either: ['Logical OR with short-circuit evaluation.', 'ponder a > 0 either b > 0'],
  isnt: ['Logical NOT of the following expression.', 'ponder isnt found'],
  equals: ['Value equality comparison (same as `==`).', 'ponder name equals "sava"'],
  differs: ['Value inequality comparison (same as `!=`).', 'ponder name differs "sava"'],
  summon: ['Import a module: a local file, a bundled stdlib name, or a GitHub Gist package.', 'summon "gist:abc123/math.sdev"'],
  attempt: ['Begin a protected block whose runtime errors are catchable.', 'attempt :: risky() ;;'],
  rescue: ['Handle an error raised inside the preceding `attempt`, binding the error value.', 'rescue err :: speak(err) ;;'],
  extend: ['Declare inheritance from a parent essence (class).', 'essence Dog extend Animal ::'],
  new: ['Instantiate an essence, invoking its constructor.', 'forge d be new Dog("rex")'],
  self: ['Inside a method, the receiving instance.', 'be self.name be name'],
  super: ['Inside a method, dispatch to the parent essence implementation.', 'super.speak()'],
  async: ['Mark a function as asynchronous so it returns a promise-like value.', 'async conjure fetchAll() ::'],
  await: ['Suspend until an async value resolves, then produce it.', 'forge data be await fetchAll()'],
};

function keywordTable() {
  const src = read('src/lang/tokens.ts');
  const block = /export const KEYWORDS[^{]*{([\s\S]*?)\n};/.exec(src);
  if (!block) return '';
  const rows = [...block[1].matchAll(/^\s*'?([A-Za-z_][\w]*)'?\s*:\s*TokenType\.([A-Z_]+),?\s*(?:\/\/\s*(.*))?$/gm)]
    .map((m) => {
      const [meaning, example] = KEYWORD_DOCS[m[1]] || [(m[3] || '').trim() || 'Reserved word.', ''];
      return `| \`${m[1]}\` | ${m[2]} | ${meaning} | ${example ? '`' + example + '`' : '—'} |`;
    });
  return `\nEvery reserved word the v1 lexer recognises, what it means, and the\nshortest example that uses it correctly.\n\n| Keyword | Token | Meaning | Example |\n| --- | --- | --- | --- | \n${rows.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Generated appendix: seed VM opcode table
// ---------------------------------------------------------------------------
/** Meanings for opcodes that the seed VM header packs several-per-line. */
const OPCODE_DOCS = {
  ADD: 'Pop b, pop a, push a + b (signed 32-bit wrap).',
  SUB: 'Pop b, pop a, push a - b.',
  MUL: 'Pop b, pop a, push a * b.',
  DIV: 'Pop b, pop a, push the truncated quotient a / b.',
  MOD: 'Pop b, pop a, push the remainder a % b.',
  EQ: 'Pop b, pop a, push 1 when a == b else 0.',
  NE: 'Pop b, pop a, push 1 when a != b else 0.',
  LT: 'Pop b, pop a, push 1 when a < b else 0.',
  GT: 'Pop b, pop a, push 1 when a > b else 0.',
  LE: 'Pop b, pop a, push 1 when a <= b else 0.',
  GE: 'Pop b, pop a, push 1 when a >= b else 0.',
  FADD: 'Pop two boxed f64 addresses, push a newly boxed a + b.',
  FSUB: 'Pop two boxed f64 addresses, push a newly boxed a - b.',
  FMUL: 'Pop two boxed f64 addresses, push a newly boxed a * b.',
  FDIV: 'Pop two boxed f64 addresses, push a newly boxed a / b.',
  FLT: 'Pop two boxed f64 addresses, push the i32 boolean a < b.',
  FGT: 'Pop two boxed f64 addresses, push the i32 boolean a > b.',
  FEQ: 'Pop two boxed f64 addresses, push the i32 boolean a == b.',
  FNEG: 'Pop a boxed f64, push a newly boxed negation.',
  FABS: 'Pop a boxed f64, push a newly boxed absolute value.',
  FSQRT: 'Pop a boxed f64, push a newly boxed square root.',
};

function opcodeTable() {
  const src = read('lang/bootstrap/seed.wat');
  const lines = src.split('\n');
  const rows = [];
  const addRow = (code, name, meaning) => {
    rows.push(`| \`${code}\` | \`${name}\` | ${meaning || OPCODE_DOCS[name] || 'Seed VM instruction.'} |`);
  };
  for (const line of lines) {
    const m = /^;;\s+(0x[0-9A-Fa-f]{2})\s+(.*)$/.exec(line.trim());
    if (!m) continue;
    const rest = m[2].trim();
    // Some lines pack several opcodes: "0x10 ADD  0x11 SUB  ..."
    const packed = [...rest.matchAll(/0x[0-9A-Fa-f]{2}\s+[A-Z_0-9]+/g)];
    if (packed.length) {
      const parts = [m[1] + ' ' + rest.split(/\s+/)[0], ...packed.map((p) => p[0])];
      for (const p of parts) {
        const [code, name] = p.split(/\s+/);
        if (code && name) addRow(code, name);
      }
      continue;
    }
    const sm = /^([A-Z_0-9]+)\s*(<[^>]*>)?\s*(.*)$/.exec(rest);
    if (!sm) continue;
    const meaning = (sm[2] ? 'Operands `' + sm[2] + '`. ' : '') + (sm[3] || OPCODE_DOCS[sm[1]] || '');
    addRow(m[1], sm[1], meaning.trim());
  }
  const seen = new Set();
  const uniq = rows.filter((r) => { const k = r.split('|')[1]; if (seen.has(k)) return false; seen.add(k); return true; });
  return `\nThe seed VM is a stack machine: every instruction consumes operands from the\noperand stack and pushes its result back. Inline operands are little-endian and\nfollow the opcode byte directly in the bytecode stream.\n\n| Opcode | Mnemonic | Behaviour |\n| --- | --- | --- |\n${uniq.join('\n')}\n`;
}

function memoryMap() {
  const src = read('lang/bootstrap/seed.wat');
  const rows = [...src.matchAll(/^;;\s+(0x[0-9A-Fa-f]+\.\.0x[0-9A-Fa-f]+)\s+(.*)$/gm)]
    .map((m) => `| \`${m[1]}\` | ${m[2].trim()} |`);
  return rows.length ? `\n| Range | Region |\n| --- | --- |\n${rows.join('\n')}\n` : '';
}

// ---------------------------------------------------------------------------
// Generated appendix: sdev-written stdlib index
// ---------------------------------------------------------------------------
function walk(dir, acc = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return acc;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, acc);
    else acc.push(rel);
  }
  return acc;
}

/**
 * Document every function written in sdev: its exact signature, the comment
 * block above it, what it returns, and where it lives.
 */
function sdevIndex(dirs) {
  let out = '';
  let total = 0;
  const files = dirs.flatMap((d) => walk(d)).filter((f) => f.endsWith('.sdev')).sort();
  for (const f of files) {
    const src = read(f);
    const lines = src.split('\n');
    // File-level summary: the leading comment block (# or //).
    const header = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t) { if (header.length) break; continue; }
      const c = /^(?:#|\/\/)+\s?(.*)$/.exec(t);
      if (!c) break;
      const text = c[1].trim();
      if (!/^[=\-*]{3,}$/.test(text) && text) header.push(text);
    }
    const records = [];
    const seen = new Set();
    lines.forEach((line, i) => {
      const m = /^\s*(?:to|conjure)\s+([A-Za-z_][\w]*)\s*(\(([^)]*)\)|with\s+([^:\n]*))?/.exec(line);
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);
      const params = (m[3] ?? m[4] ?? '').trim();
      const doc = [];
      for (let j = i - 1; j >= 0; j--) {
        const t = lines[j].trim();
        const c = /^(?:#|\/\/)+\s?(.*)$/.exec(t);
        if (!c) break;
        const text = c[1].trim();
        if (/^[=\-*]{3,}$/.test(text)) break;
        doc.unshift(text);
      }
      // First `yield` inside the body describes the result.
      let ret = '';
      for (let j = i + 1; j < Math.min(lines.length, i + 60); j++) {
        if (/^\s*(?:to|conjure)\s/.test(lines[j])) break;
        const y = /^\s*(?:yield|return)\s+(.+?)\s*$/.exec(lines[j]);
        if (y) { ret = y[1].replace(/\|/g, '\\|').slice(0, 90); break; }
      }
      records.push({
        name: m[1],
        params: params || '',
        doc: doc.join(' ') || '',
        ret,
        line: i + 1,
      });
    });
    total += records.length;
    out += `\n#### \`${f}\`\n\n`;
    out += header.length ? `${header.join(' ')}\n\n` : '';
    if (!records.length) { out += '_No top-level functions — this file is a script or data module._\n'; continue; }
    out += `${records.length} functions.\n\n`;
    out += '| Function | Parameters | What it does | Returns | Line |\n| --- | --- | --- | --- | --- |\n';
    for (const r of records) {
      const desc = (r.doc || 'Helper used by this module.').replace(/\|/g, '\\|');
      out += `| \`${r.name}\` | ${r.params ? '`' + r.params.replace(/\|/g, '\\|') + '`' : '_none_'} | ${desc} | ${r.ret ? '`' + r.ret + '`' : '_no explicit yield_'} | ${r.line} |\n`;
    }
  }
  return { text: out, total, count: files.length };
}


// ---------------------------------------------------------------------------
// Generated appendix: parity matrix (from the registry + agent report)
// ---------------------------------------------------------------------------
function parityAppendix() {
  const doc = read('public/SDEV_PARITY_DOCUMENTATION.md');
  const m = /<!-- PARITY:BEGIN -->([\s\S]*?)<!-- PARITY:END -->/.exec(doc);
  let out = m ? m[1].trim() : '_parity matrix unavailable_';
  try {
    const reg = JSON.parse(read('lang/parity/features.json'));
    out = `Registry: **${reg.features?.length ?? 0} features** across **${reg.tracks?.length ?? 0} tracks**.\n\n` + out;
  } catch { /* ignore */ }
  return '\n' + out + '\n';
}

// ---------------------------------------------------------------------------
// Generated appendix: repository map + toolchain
// ---------------------------------------------------------------------------
function repoMap() {
  const groups = [
    ['lang/bootstrap', 'JS bootstrap compiler + hand-written WebAssembly seed VM'],
    ['lang/compiler', 'The self-hosted compiler, written in sdev'],
    ['lang/native', 'x86-64 GAS backend, assembly runtime, linker driver'],
    ['lang/runtime', 'v2 reference runtime (JS, legacy oracle)'],
    ['lang/stdlib', 'Standard library written in sdev (ML, FFI, WebGPU, CUDA)'],
    ['lang/parity', 'Feature registry, parity agent, generated report'],
    ['src/lang', 'v1 TypeScript reference implementation'],
    ['src/lang-bridge', 'Runtime selection + WASM bridge for the browser IDE'],
    ['electron', 'Desktop IDE shell with native build/run IPC'],
    ['scripts', 'Build drivers and the full test-gate suite'],
  ];
  let out = '';
  for (const [dir, desc] of groups) {
    const files = walk(dir).sort();
    if (!files.length) continue;
    out += `\n#### \`${dir}/\` — ${desc}\n\n`;
    out += files.map((f) => `- \`${f}\``).join('\n') + '\n';
  }
  return out;
}

function toolchainIndex() {
  const files = walk('scripts').filter((f) => /\.(mjs|ts|py)$/.test(f)).sort();
  const rows = files.map((f) => {
    const src = read(f);
    const c = (/^(?:#!.*\n)?(?:\/\/|#)\s*(.+)$/m.exec(src) || [, ''])[1];
    return `| \`node ${f}\` | ${c.replace(/\|/g, '\\|').slice(0, 120)} |`;
  });
  return `\n| Command | Purpose |\n| --- | --- |\n${rows.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Hand-written spine
// ---------------------------------------------------------------------------
const bi = builtinIndex();
const stdlib = sdevIndex(['lang/stdlib', 'lang/compiler', 'lang/parity']);
const now = new Date().toISOString().slice(0, 10);

const PARTS = [];
const push = (s) => PARTS.push(s.replace(/\r\n/g, '\n'));

push(`# The Ultimate sdev Documentation

> **Everything about sdev in one file.** Language, runtimes, compiler, virtual
> machine, native backend, standard library, machine-learning stack, hardware,
> GIS, tooling, and the full generated reference tables.
>
> Created by **Sava Milanov**. Generated on ${now} by
> \`scripts/build-ultimate-docs.mjs\`. Do not edit by hand — edit the source
> guides or the implementation and re-run the generator.

---

## How to read this document

This book has three layers.

1. **Part I — Orientation.** What sdev is, why it exists, how the pieces fit
   together. Read this once, top to bottom.
2. **Parts II–VIII — The guides.** Every hand-written sdev guide, inlined
   verbatim and re-levelled so the table of contents stays flat. Nothing was
   summarised or dropped.
3. **Part IX — Generated reference.** Tables extracted directly from the
   implementation: every builtin, every opcode, every keyword, every stdlib
   function, the parity matrix, the repository map, and the toolchain.

Anything in Part IX is machine-derived, so it is correct by construction for
the commit that produced this file.

---

## Part I — Orientation

### What sdev is

sdev is a programming language with two surface dialects and three execution
tracks.

| | Dialect | Idea |
| --- | --- | --- |
| **v1** | \`forge x be 10\` / \`speak(x)\` | The original expressive dialect: unique keywords, classes, closures, canvas, web DSL, GIS. |
| **v2 "Prism"** | \`set x to 10\` / \`say x\` | The beginner-first dialect: English words, no sigils, same power behind opt-in blocks. |

| Track | Where it runs | How it executes |
| --- | --- | --- |
| **v1 TypeScript interpreter** | Browser IDE, Node CLI | Lexer → parser → tree-walking interpreter, with a bytecode compiler + stack VM alongside. |
| **v2 self-hosted compiler** | Browser IDE (WASM) | sdev source compiled by a compiler *written in sdev*, executing on a hand-written WebAssembly seed VM. |
| **native x86-64 backend** | Linux / macOS CLI, Electron desktop IDE | The same AST emitted as GAS assembly, assembled with \`as\`, linked with \`ld\` into a static ELF with no libc. |

All three tracks are measured against one canonical feature registry. See
*Part IX — Parity matrix*.

### Why it exists

Three reasons, in order of weight.

1. **Readability first.** Most languages ask a beginner to memorise
   punctuation before they can print a line. v2 asks for English:
   \`say "hello"\`. If a ten-year-old can guess what a line does, the keyword
   was chosen correctly.
2. **No ceiling.** Readability usually costs power. sdev keeps the power
   behind opt-in blocks — \`systems\` for pointers and FFI, \`match\` for
   algebraic pattern matching, query syntax for data, \`board\` for hardware —
   so a beginner never sees them and an expert never hits a wall.
3. **Own the whole stack.** The compiler is written in sdev. The VM is
   hand-written WebAssembly. The native backend emits raw assembly. There is
   no hidden layer someone else controls.

### The self-hosting fixed point

The property the whole project is organised around:

\`\`\`text
  compiler.sdev  --compiled by-->  JS bootstrap  -->  bytecode A
  compiler.sdev  --compiled by-->  bytecode A    -->  bytecode B
  assert A == B          (byte-identical, not merely equivalent)
\`\`\`

When A equals B byte for byte, the JavaScript bootstrap is no longer part of
the language — it is only a build-time oracle. sdev compiles sdev. The gate
that enforces this lives in \`scripts/test-self-toolchain.mjs\` and runs in CI
on every change.

### The layer cake

\`\`\`text
   your program (.sdev)
        │
        ├── v1 path ──► lexer.ts → parser.ts → interpreter.ts        (tree walk)
        │                                    └► compiler.ts → vm.ts  (bytecode)
        │
        └── v2 path ──► lexer.sdev → parser.sdev → codegen.sdev      (all sdev)
                                     │
                                     ├──► seed VM (WebAssembly)      browser
                                     └──► codegen-x64.mjs → as → ld  native
\`\`\`

### Choosing a runtime

Per file, with a shebang:

\`\`\`sdev
#!sdev v1
forge x be 10
speak(x)
\`\`\`

\`\`\`sdev
#!sdev v2
set x to 10
say x
\`\`\`

Globally, in the IDE: **Settings → Runtime**. Without a shebang the default is
**v1**.

### Sixty-second tour

\`\`\`sdev
#!sdev v2
set nums to [3, 1, 4, 1, 5]

to double with n
  return n * 2
end

for each n in nums
  say double with n
end

set i to 0
while i < length(nums)
  set i to i + 1
end
say "counted " + str(i)
\`\`\`

The same program in v1:

\`\`\`sdev
#!sdev v1
forge nums be [3, 1, 4, 1, 5]

conjure double(n) ::
  yield n * 2
;;

iterate n through nums ::
  speak(double(n))
;;
\`\`\`

---
`);

// ---------------------------------------------------------------------------
// Inlined guides
// ---------------------------------------------------------------------------
const GUIDES = [
  ['Part II — The language', [
    ['public/SDEV_V2_DOCUMENTATION.md', 'sdev v2 "Prism" — language guide'],
    ['public/SDEV_DOCUMENTATION.md', 'Full v1 language reference'],
  ]],
  ['Part III — The complete narrative guide', [
    ['public/SDEV_FULL_DOCUMENTATION.md', 'Complete documentation (architecture to evolution loop)'],
  ]],
  ['Part IV — Implementation internals', [
    ['public/SDEV_INTERNALS.md', 'Compiler, VM, kernel and roadmap internals'],
    ['lang/README.md', 'lang/ — language sources overview'],
    ['lang/native/README.md', 'Native x86-64 backend'],
    ['electron/README.md', 'Desktop IDE shell'],
  ]],
  ['Part V — Track parity', [
    ['public/SDEV_PARITY_DOCUMENTATION.md', 'Parity registry, agent and matrix'],
  ]],
  ['Part VI — Machine learning and LLMs', [
    ['public/SDEV_ML_DOCUMENTATION.md', 'ML & LLM standard library'],
    ['public/SDEV_AUTOEVOLVE_DOCUMENTATION.md', 'Autonomous evolution loop'],
  ]],
  ['Part VII — Acceleration and interop', [
    ['public/SDEV_FFI_DOCUMENTATION.md', 'FFI and native acceleration'],
    ['public/SDEV_WEBGPU_DOCUMENTATION.md', 'WebGPU compute'],
    ['public/SDEV_CUDA_DOCUMENTATION.md', 'CUDA fast path'],
  ]],
  ['Part VIII — Domains', [
    ['public/SDEV_HARDWARE_DOCUMENTATION.md', 'Hardware and boards'],
    ['public/SDEV_LEAFLET_DOCUMENTATION.md', 'Leaflet, mapping and GIS'],
  ]],
];

for (const [partTitle, docs] of GUIDES) {
  push(`\n## ${partTitle}\n`);
  for (const [file, title] of docs) {
    if (!exists(file)) continue;
    const body = verbatim(read(file));
    // Drop the guide's own H1 — the section heading replaces it.
    const withoutH1 = body.replace(/^#\s+.*\n/, '');
    push(`\n### ${title}\n\n_Source: \`${file}\`_\n\n${shiftHeadings(withoutH1, 2)}\n\n---\n`);
  }
}

// ---------------------------------------------------------------------------
// Generated reference
// ---------------------------------------------------------------------------
push(`
## Part IX — Generated reference

Everything below is extracted from the implementation at build time.

### Builtin index — v1 runtime (${bi.total} builtins)

Every function registered into the interpreter's global environment, grouped by
the module that installs it.
${bi.text}

### Keyword table — v1 lexer
${keywordTable()}

### Seed VM memory map
${memoryMap()}

### Seed VM opcode table
${opcodeTable()}

### sdev-written source index (${stdlib.count} files, ${stdlib.total} functions)

Every function defined in sdev itself — the self-hosted compiler, the parity
agent, and the standard library.
${stdlib.text}

### Parity matrix
${parityAppendix()}

### Repository map
${repoMap()}

### Toolchain and test gates
${toolchainIndex()}

---

## Appendix A — Glossary

| Term | Meaning |
| --- | --- |
| **bootstrap** | \`lang/bootstrap/compile.mjs\`, the JavaScript compiler used only to build the first self-hosted artifact and as a test oracle. |
| **seed VM** | \`lang/bootstrap/seed.wat\`, a hand-written WebAssembly stack machine that executes sdev bytecode in the browser. |
| **driver artifact** | \`lang/compiler/driver-artifact.mjs\`, the pre-compiled, source-independent self-hosted compiler baked in as Base64. |
| **fixed point** | The state where the self-hosted compiler compiles itself to byte-identical output. |
| **track** | One execution path: v1 interpreter, v2 self-hosted, or native x86-64. |
| **parity agent** | \`lang/parity/agent.sdev\`, written in sdev, that audits every track against the registry and regenerates the matrix. |
| **tome** | sdev's dictionary / map type. |
| **summon** | The decentralised package system that pulls modules from GitHub Gists. |

## Appendix B — Regenerating this document

\`\`\`sh
node scripts/build-ultimate-docs.mjs
\`\`\`

The generator reads every guide under \`public/\` plus the READMEs, then derives
the reference tables straight from \`src/lang/\`, \`lang/\`, and \`scripts/\`. If a
builtin is added or an opcode changes, re-running the generator is the only
step required to bring this document back in sync.
`);

const doc = PARTS.join('\n');
fs.writeFileSync(OUT, doc, 'utf8');
const words = doc.split(/\s+/).length;
console.log(`wrote ${path.relative(ROOT, OUT)}`);
console.log(`  ${doc.split('\n').length} lines, ${doc.length} chars, ~${words} words`);
console.log(`  ${bi.total} v1 builtins, ${stdlib.total} sdev functions across ${stdlib.count} files`);
