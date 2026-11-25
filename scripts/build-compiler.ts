// Bundles the sdev compiler + VM + interpreter into a single Node.js CLI.
// Output: public/sdev-compiler.mjs — fully self-contained, no dependencies.
//
// v4.0 — Interpreter-first runtime. Every execution path defaults to the
// full tree-walk Interpreter (100% feature parity with the web IDE). The
// VM/bytecode path is preserved as an opt-in (`--vm`) for performance work.
//
// .sdevc format (v4) — JSON container with magic header:
//   { magic:"SDEVC4", version, source, language, ast }
// `run-bc` re-runs the embedded source/AST through the Interpreter, so any
// feature the interpreter supports (classes, async, await, summon, kernel,
// matrix, graphics, etc.) also works after compile.
import { build } from 'esbuild';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';

const ENTRY = `
import { Lexer } from '../src/lang/core/lexer';
import { Parser } from '../src/lang/core/parser';
import { Compiler } from '../src/lang/runtime/compiler';
import { VM } from '../src/lang/runtime/vm';
import { Interpreter } from '../src/lang/runtime/interpreter';
import { disassemble } from '../src/lang/runtime/bytecode';
import { SdevError } from '../src/lang/core/errors';
import { translateSource, detectLanguage, SUPPORTED_LANGUAGES } from '../src/lang/tools/translator';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import { createInterface } from 'readline';

const VERSION = '4.0.0';
const SDEVC_MAGIC = 'SDEVC4';
const args = process.argv.slice(2);

function help() {
  console.log(\`sdev compiler & runtime v\${VERSION}
  (Interpreter-first — full feature parity with the web IDE)

USAGE:
  sdev <command> [options] <file>

COMMANDS:
  run <file>                  Run any .sdev or .sdevc file (auto-detect)
  exec <file.sdev>            Alias for 'run' (kept for back-compat)
  compile <file.sdev> [-o]    Compile to .sdevc container (AST + source)
  run-bc <file.sdevc>         Execute a compiled .sdevc file (full features)
  disasm <file.sdev|.sdevc>   Best-effort bytecode disassembly (.sdevir)
  translate <file> --to <L>   Translate source to another language
  check <file.sdev>           Parse only — report syntax errors
  ast <file.sdev>             Print AST as JSON
  repl                        Interactive REPL (full interpreter)
  languages                   List supported source languages
  version                     Print version

OPTIONS:
  --lang <Name>               Source language (default: auto-detect)
  --vm                        Use stack-based VM instead of the interpreter
                              (faster, but limited feature subset)
  -o, --out <file>            Output file path
  -h, --help                  Show this help

EXAMPLES:
  sdev run hello.sdev                    # full interpreter
  sdev compile hello.sdev -o hello.sdevc # produce container
  sdev run hello.sdevc                   # runs through interpreter
  sdev run hello.sdev --vm               # opt into bytecode VM
  sdev translate hello.sdev --to Bulgarian -o hello.bg.sdev
  sdev repl
\`);
}

function readFlag(name: string, short?: string): string | undefined {
  const i = args.findIndex(a => a === name || (short && a === short));
  if (i >= 0 && i + 1 < args.length) return args[i + 1];
  return undefined;
}
function hasFlag(name: string, short?: string): boolean {
  return args.some(a => a === name || (short && a === short));
}

if (args.length === 0 || hasFlag('--help', '-h')) { help(); process.exit(0); }
if (args[0] === 'version' || hasFlag('--version', '-v')) {
  console.log(\`sdev v\${VERSION}\`); process.exit(0);
}
if (args[0] === 'languages') {
  console.log('Supported source languages:');
  for (const l of SUPPORTED_LANGUAGES) console.log('  -', l);
  process.exit(0);
}

const cmd = args[0];
const FLAG_NAMES = new Set(['--lang', '-o', '--out', '--to']);
const fileArg = args.find((a, i) => i > 0 && !a.startsWith('-') && !FLAG_NAMES.has(args[i-1]));
const sourceLang = readFlag('--lang') ?? 'auto';
const outPath = readFlag('-o') ?? readFlag('--out');
const useVm = hasFlag('--vm');

function abs(file: string): string {
  const p = resolve(process.cwd(), file);
  if (!existsSync(p)) { console.error(\`File not found: \${p}\`); process.exit(1); }
  return p;
}
function loadSource(file: string): string {
  return readFileSync(abs(file), 'utf-8');
}

interface SdevcContainer {
  magic: string;
  version: string;
  language: string;
  source: string;
  ast: unknown;
  compiledAt: string;
}

function parseSource(src: string) {
  const lex = new Lexer(src, { sourceLanguage: sourceLang });
  const tokens = lex.tokenize();
  const ast = new Parser(tokens).parse();
  return { ast, detected: lex.detectedLanguage ?? 'English' };
}

function loadContainer(file: string): SdevcContainer {
  const raw = readFileSync(abs(file), 'utf-8');
  let c: SdevcContainer;
  try { c = JSON.parse(raw); } catch { console.error('Invalid .sdevc container (not JSON)'); process.exit(1); }
  if (!c || c.magic !== SDEVC_MAGIC) {
    console.error(\`Invalid .sdevc container (magic mismatch, got \${c?.magic ?? '?'}, expected \${SDEVC_MAGIC})\`);
    process.exit(1);
  }
  return c;
}

function runWithInterpreter(ast: any) {
  new Interpreter((m) => console.log(m)).interpret(ast);
}
function runWithVm(ast: any) {
  try {
    const chunk = new Compiler().compile(ast);
    new VM((m) => console.log(m)).run(chunk);
  } catch (e) {
    console.error('[--vm] feature unsupported by bytecode VM, falling back to interpreter:');
    console.error('   ', e instanceof Error ? e.message : String(e));
    runWithInterpreter(ast);
  }
}
function execAst(ast: any) {
  if (useVm) runWithVm(ast); else runWithInterpreter(ast);
}

function reportError(e: unknown): never {
  if (e instanceof SdevError) console.error('error:', e.message);
  else if (e instanceof Error) console.error('error:', e.message);
  else console.error('error:', String(e));
  process.exit(1);
}

function runFile(file: string) {
  if (extname(file) === '.sdevc') {
    const c = loadContainer(file);
    // Prefer re-parsing the embedded source so we use the current runtime's
    // AST shape (guarantees full interpreter parity even if the AST evolved).
    const { ast } = parseSource(c.source);
    execAst(ast);
  } else {
    const { ast } = parseSource(loadSource(file));
    execAst(ast);
  }
}

try {
  switch (cmd) {
    case 'run':
    case 'exec': {
      if (!fileArg) { console.error('Missing file'); process.exit(1); }
      runFile(fileArg);
      break;
    }
    case 'compile': {
      if (!fileArg) { console.error('Missing file'); process.exit(1); }
      const src = loadSource(fileArg);
      const { ast, detected } = parseSource(src);
      const container: SdevcContainer = {
        magic: SDEVC_MAGIC,
        version: VERSION,
        language: detected,
        source: src,
        ast,
        compiledAt: new Date().toISOString(),
      };
      const out = outPath ?? fileArg.replace(/\\.sdev$/, '') + '.sdevc';
      const json = JSON.stringify(container);
      writeFileSync(out, json);
      console.log(\`compiled -> \${out} (\${(json.length/1024).toFixed(2)} KB, magic=\${SDEVC_MAGIC}, lang=\${detected})\`);
      break;
    }
    case 'run-bc': {
      if (!fileArg) { console.error('Missing file'); process.exit(1); }
      const c = loadContainer(fileArg);
      const { ast } = parseSource(c.source);
      execAst(ast);
      break;
    }
    case 'disasm': {
      if (!fileArg) { console.error('Missing file'); process.exit(1); }
      let ast: any;
      if (extname(fileArg) === '.sdevc') ast = parseSource(loadContainer(fileArg).source).ast;
      else ast = parseSource(loadSource(fileArg)).ast;
      let out: string;
      try {
        const chunk = new Compiler().compile(ast);
        out = disassemble(chunk.entry);
      } catch (e) {
        out = \`; disassembly unavailable for this program\\n; \${e instanceof Error ? e.message : String(e)}\\n\`;
      }
      if (outPath) { writeFileSync(outPath, out); console.log('wrote', outPath); }
      else console.log(out);
      break;
    }
    case 'translate': {
      if (!fileArg) { console.error('Missing file'); process.exit(1); }
      const to = readFlag('--to');
      if (!to) { console.error('Missing --to <language>'); process.exit(1); }
      const src = loadSource(fileArg);
      const from = sourceLang === 'auto' ? (detectLanguage(src) ?? 'English') : sourceLang;
      const { translated } = translateSource(src, from, to);
      if (outPath) { writeFileSync(outPath, translated); console.log('wrote', outPath); }
      else process.stdout.write(translated);
      break;
    }
    case 'check': {
      if (!fileArg) { console.error('Missing file'); process.exit(1); }
      parseSource(loadSource(fileArg));
      console.log('OK — no syntax errors');
      break;
    }
    case 'ast': {
      if (!fileArg) { console.error('Missing file'); process.exit(1); }
      const { ast } = parseSource(loadSource(fileArg));
      const json = JSON.stringify(ast, null, 2);
      if (outPath) { writeFileSync(outPath, json); console.log('wrote', outPath); }
      else console.log(json);
      break;
    }
    case 'repl': {
      console.log(\`sdev REPL v\${VERSION} — :q quit  :vm toggle vm  :clear reset buffer\`);
      const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'sdev> ' });
      let vmMode = useVm;
      let buffer = '';
      const interp = new Interpreter((m) => console.log(m));
      rl.prompt();
      rl.on('line', (line) => {
        const t = line.trim();
        if (t === ':q' || t === ':quit') { rl.close(); return; }
        if (t === ':vm') { vmMode = !vmMode; console.log('vm mode:', vmMode); rl.prompt(); return; }
        if (t === ':clear') { buffer = ''; console.log('cleared'); rl.prompt(); return; }
        buffer += line + '\\n';
        try {
          const lex = new Lexer(buffer, { sourceLanguage: sourceLang });
          const ast = new Parser(lex.tokenize()).parse();
          if (vmMode) {
            try { new VM((m) => console.log(m)).run(new Compiler().compile(ast)); }
            catch { interp.interpret(ast); }
          } else {
            interp.interpret(ast);
          }
          buffer = '';
        } catch (e) {
          if (e instanceof SdevError) { console.error('error:', e.message); buffer = ''; }
          else { /* incomplete input — keep buffering */ }
        }
        rl.prompt();
      });
      rl.on('close', () => { console.log('bye'); process.exit(0); });
      break;
    }
    default: {
      // Unknown command — treat as a file path
      if (existsSync(resolve(process.cwd(), cmd))) {
        runFile(cmd);
      } else {
        console.error(\`Unknown command: \${cmd}\`);
        help();
        process.exit(1);
      }
    }
  }
} catch (e) { reportError(e); }
`;

writeFileSync('scripts/_compiler-entry.ts', ENTRY);

try {
  await build({
    entryPoints: ['scripts/_compiler-entry.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: 'public/sdev-compiler.mjs',
    banner: { js: '#!/usr/bin/env node\n// sdev compiler & runtime v4.0 — Interpreter-first, full feature parity\n// Bundled, self-contained CLI. Generated from scripts/build-compiler.ts' },
    minify: false,
    legalComments: 'none',
  });
} finally {
  if (existsSync('scripts/_compiler-entry.ts')) {
    try { unlinkSync('scripts/_compiler-entry.ts'); } catch { /* ignore */ }
  }
}

const out = readFileSync('public/sdev-compiler.mjs', 'utf-8');
console.log(`Built public/sdev-compiler.mjs (${(out.length/1024).toFixed(1)} KB)`);
