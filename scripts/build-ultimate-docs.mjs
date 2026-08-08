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

function builtinIndex() {
  let out = '';
  let total = 0;
  for (const [file, desc] of BUILTIN_MODULES) {
    const src = read(`src/lang/${file}`);
    if (!src) continue;
    const names = [...src.matchAll(/builtins\.set\(\s*['"]([A-Za-z_][A-Za-z_0-9]*)['"]/g)].map((m) => m[1]);
    const uniq = [...new Set(names)].sort();
    total += uniq.length;
    out += `\n#### \`src/lang/${file}\` — ${desc}\n\n`;
    out += `${uniq.length} builtins.\n\n`;
    out += uniq.map((n) => '`' + n + '`').join(' · ') + '\n';
  }
  return { text: out, total };
}

// ---------------------------------------------------------------------------
// Generated appendix: keyword table (v1 lexer)
// ---------------------------------------------------------------------------
function keywordTable() {
  const src = read('src/lang/tokens.ts');
  const block = /export const KEYWORDS[^{]*{([\s\S]*?)\n};/.exec(src);
  if (!block) return '';
  const rows = [...block[1].matchAll(/^\s*'?([A-Za-z_][\w]*)'?\s*:\s*TokenType\.([A-Z_]+),?\s*(?:\/\/\s*(.*))?$/gm)]
    .map((m) => `| \`${m[1]}\` | ${m[2]} | ${(m[3] || '').trim()} |`);
  return `\n| Keyword | Token | Note |\n| --- | --- | --- |\n${rows.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Generated appendix: seed VM opcode table
// ---------------------------------------------------------------------------
function opcodeTable() {
  const src = read('lang/bootstrap/seed.wat');
  const lines = src.split('\n');
  const rows = [];
  for (const line of lines) {
    const m = /^;;\s+(0x[0-9A-Fa-f]{2})\s+(.*)$/.exec(line.trim());
    if (!m) continue;
    const rest = m[2].trim();
    // Some lines pack several opcodes: "0x10 ADD  0x11 SUB  ..."
    const packed = [...('0x' + '').length ? rest.matchAll(/0x[0-9A-Fa-f]{2}\s+[A-Z_0-9]+/g) : []];
    if (packed.length) {
      const parts = [m[1] + ' ' + rest.split(/\s+/)[0], ...packed.map((p) => p[0])];
      for (const p of parts) {
        const [code, name] = p.split(/\s+/);
        if (code && name) rows.push(`| \`${code}\` | \`${name}\` | |`);
      }
      continue;
    }
    const sm = /^([A-Z_0-9]+)\s*(<[^>]*>)?\s*(.*)$/.exec(rest);
    if (!sm) continue;
    rows.push(`| \`${m[1]}\` | \`${sm[1]}\` | ${(sm[2] ? '`' + sm[2] + '` — ' : '') + (sm[3] || '')} |`);
  }
  const seen = new Set();
  const uniq = rows.filter((r) => { const k = r.split('|')[1]; if (seen.has(k)) return false; seen.add(k); return true; });
  return `\n| Opcode | Mnemonic | Operands / meaning |\n| --- | --- | --- |\n${uniq.join('\n')}\n`;
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

function sdevIndex(dirs) {
  let out = '';
  let total = 0;
  const files = dirs.flatMap((d) => walk(d)).filter((f) => f.endsWith('.sdev')).sort();
  for (const f of files) {
    const src = read(f);
    const fns = [...src.matchAll(/^\s*(?:to|conjure)\s+([A-Za-z_][\w]*)/gm)].map((m) => m[1]);
    const uniq = [...new Set(fns)];
    total += uniq.length;
    const firstComment = (/^#\s*(.+)$/m.exec(src) || [, ''])[1];
    out += `\n#### \`${f}\`${firstComment ? ` — ${firstComment}` : ''}\n\n`;
    out += uniq.length
      ? `${uniq.length} functions: ` + uniq.map((n) => '`' + n + '`').join(' · ') + '\n'
      : '_no top-level functions_\n';
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
