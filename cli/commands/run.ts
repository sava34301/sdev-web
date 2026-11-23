import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { Lexer } from '@/lang/core/lexer';
import { Parser } from '@/lang/core/parser';
import { Interpreter } from '@/lang/runtime/interpreter';
import { SdevError } from '@/lang/core/errors';
import { stripSignature } from '@/lang/dialect/signature';
import { die, flag, runOptions, SDEVC_MAGIC, value } from '../args';
import { runEditor } from '../editor';
import { explainAgent, localModules, prepare, prepareAsync, readSource, runPrepared, type PrepareOptions } from '../pipeline';
import { activeDialect, runtimePreference, setActiveSlug, setRuntimePreference } from '../store';
import { VERSION } from '../version';

export async function cmdRun(file?: string): Promise<void> {
  let targetFile = file;
  if (!targetFile) {
    const manifestPath = resolve(process.cwd(), 'sdev.json');
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        if (manifest.entry && existsSync(resolve(process.cwd(), manifest.entry))) {
          targetFile = manifest.entry;
        }
      } catch {
        // ignore invalid sdev.json
      }
    }
  }
  if (!targetFile && existsSync(resolve(process.cwd(), 'main.sdev'))) {
    targetFile = 'main.sdev';
  }
  if (!targetFile) die('sdev run <file> (or run inside an sdev project directory)');

  const opts = runOptions();
  const prepared = await prepareAsync(readSource(targetFile), opts);
  if (opts.explain) explainAgent(prepared.agent);
  const outcome = await runPrepared(prepared, targetFile, opts);
  if (!outcome.success) die(outcome.error ?? 'program failed');
  const outPath = value('-o', '--out');
  if (outPath && outcome.webHtml) {
    writeFileSync(resolve(process.cwd(), outPath), outcome.webHtml);
    console.log(`wrote web document -> ${outPath} (${(outcome.webHtml.length / 1024).toFixed(2)} KB)`);
  }
}

export async function cmdBuildWeb(file: string): Promise<void> {
  const opts = { ...runOptions(), runtime: 'v1' as const };
  const prepared = await prepareAsync(readSource(file), opts);
  const outcome = await runPrepared(prepared, file, opts);
  if (!outcome.success) die(outcome.error ?? 'web build failed');
  if (!outcome.webHtml || !outcome.webState) {
    die('file did not produce a web page — call page("Title") in your sdev program');
  }
  const out = value('-o', '--out') ?? basename(file).replace(/\.sdev$/, '') + '.html';
  const resolvedOut = resolve(process.cwd(), out);
  mkdirSync(dirname(resolvedOut), { recursive: true });
  writeFileSync(resolvedOut, outcome.webHtml);
  console.log(`✓ built web document -> ${out} (${(outcome.webHtml.length / 1024).toFixed(2)} KB)`);
}

export function parseFile(file: string, opts: PrepareOptions) {
  const prepared = prepare(readSource(file), opts);
  const lexer = new Lexer(prepared.code, { sourceLanguage: opts.lang ?? 'auto' });
  const ast = new Parser(lexer.tokenize()).parse();
  return { ast, prepared, detected: lexer.detectedLanguage ?? 'English' };
}

export async function cmdRepl(): Promise<void> {
  const dialect = activeDialect();
  console.log(`sdev ${VERSION} · runtime ${runtimePreference()} · dialect ${dialect ? dialect.meta.name : 'canonical'}`);
  console.log(':q quit  :rt v1|v2  :dialect <slug|none>  :clear  :load <file>');
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'sdev> ' });
  const interpreter = new Interpreter((m) => console.log(m));
  let buffer = '';
  rl.prompt();
  rl.on('line', async (line) => {
    const t = line.trim();
    if (t === ':q' || t === ':quit') return rl.close();
    if (t === ':clear') { buffer = ''; console.log('cleared'); return rl.prompt(); }
    if (t.startsWith(':rt ')) { setRuntimePreference(t.slice(4).trim() === 'v2' ? 'v2' : 'v1'); console.log('runtime:', runtimePreference()); return rl.prompt(); }
    if (t.startsWith(':dialect ')) {
      const slug = t.slice(9).trim();
      setActiveSlug(slug === 'none' ? null : slug);
      console.log('dialect:', activeSlug() ?? 'canonical');
      return rl.prompt();
    }
    if (t.startsWith(':load ')) {
      try { buffer += stripSignature(readSource(t.slice(6).trim())) + '\n'; console.log('loaded'); }
      catch (e) { console.error(String(e)); }
      return rl.prompt();
    }
    buffer += line + '\n';

    let ast;
    try {
      const prepared = prepare(buffer, runOptions());
      if (prepared.runtime === 'v2') {
        const r = await runPrepared(prepared, null, runOptions());
        if (!r.success) console.error('error:', r.error);
        buffer = '';
        return rl.prompt();
      }
      ast = new Parser(new Lexer(prepared.code).tokenize()).parse();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (e instanceof SdevError && /unterminated|unexpected.*(?:eof|end)|expected.*;;/i.test(msg)) {
        return rl.prompt();
      }
      console.error('error:', msg);
      buffer = '';
      return rl.prompt();
    }

    try {
      interpreter.interpret(ast);
    } catch (e) {
      console.error('error:', e instanceof Error ? e.message : String(e));
    }
    buffer = '';
    rl.prompt();
  });
  rl.on('close', () => { console.log('bye'); process.exit(0); });
}

export async function cmdWatch(file: string): Promise<void> {
  const { watch } = await import('node:fs');
  const path = resolve(process.cwd(), file);
  const once = async () => {
    console.log(`\n--- ${new Date().toLocaleTimeString()} ---`);
    try { await cmdRun(file); } catch (e) { console.error(String(e)); }
  };
  await once();
  let timer: NodeJS.Timeout | null = null;
  watch(path, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void once(); }, 80);
  });
  console.log(`watching ${basename(path)} — Ctrl+C to stop`);
}

export function cmdCompile(file: string): void {
  const opts = runOptions();
  const { ast, prepared, detected } = parseFile(file, opts);
  const container = {
    magic: SDEVC_MAGIC,
    version: VERSION,
    language: detected,
    runtime: prepared.runtime,
    dialect: prepared.dialect?.meta.slug ?? null,
    source: prepared.code,
    ast,
    compiledAt: new Date().toISOString(),
  };
  const out = value('-o', '--out') ?? file.replace(/\.sdev$/, '') + '.sdevc';
  const json = JSON.stringify(container);
  writeFileSync(out, json);
  console.log(`compiled -> ${out} (${(json.length / 1024).toFixed(2)} KB, ${detected}, runtime ${prepared.runtime})`);
}

function loadContainer(file: string): { source: string; runtime: 'v1' | 'v2' } {
  const raw = readSource(file);
  let c: { magic?: string; source?: string; runtime?: string };
  try { c = JSON.parse(raw); } catch { return die('not a .sdevc container'); }
  if (c.magic !== SDEVC_MAGIC) die(`bad container (magic ${c.magic ?? '?'}, expected ${SDEVC_MAGIC})`);
  return { source: c.source ?? '', runtime: c.runtime === 'v2' ? 'v2' : 'v1' };
}

export async function cmdRunBc(file: string): Promise<void> {
  const c = loadContainer(file);
  const opts = { ...runOptions(), dialect: 'none', runtime: runOptions().runtime ?? c.runtime };
  const outcome = await runPrepared(prepare(c.source, opts), file, opts);
  if (!outcome.success) die(outcome.error ?? 'program failed');
}

function hexdump(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = [...bytes.slice(i, i + 16)].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    lines.push(i.toString(16).padStart(6, '0') + '  ' + chunk);
  }
  lines.push(`; ${bytes.length} bytes of sdev bytecode`);
  return lines.join('\n');
}

export async function cmdDisasm(file: string): Promise<void> {
  const source = extname(file) === '.sdevc' ? loadContainer(file).source : stripSignature(readSource(file));
  const prepared = prepare(source, { ...runOptions(), dialect: extname(file) === '.sdevc' ? 'none' : undefined });
  let text: string;
  if (prepared.runtime === 'v2') {
    const { compile, setSeedLoader } = await import('../../src/lang-bridge/compile-self.mjs');
    const { seedWasmPath } = await import('../env');
    setSeedLoader(async () => readFileSync(seedWasmPath()));
    const program = await compile(prepared.code, localModules(file, prepared.code));
    text = hexdump(program.bytecode);
  } else {
    const { Compiler } = await import('@/lang/runtime/compiler');
    const { disassemble } = await import('@/lang/runtime/bytecode');
    const ast = new Parser(new Lexer(prepared.code).tokenize()).parse();
    text = disassemble(new Compiler().compile(ast).entry);
  }
  const out = value('-o', '--out');
  if (out) { writeFileSync(out, text); console.log('wrote', out); } else console.log(text);
}

export async function cmdNative(file: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — plain JS modules
  const { generateAsm } = await import('../../src/lang-bridge/native/codegen-x64.mjs');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { link } = await import('../../src/lang-bridge/native/link.mjs');
  const prepared = prepare(readSource(file), runOptions());
  const modules = localModules(file, prepared.code);
  const asm = generateAsm(prepared.code, {
    readModule: (p: string) => {
      if (modules[p]) return modules[p];
      throw new Error(`cannot resolve module "${p}"`);
    },
  });
  const outBin = value('-o', '--out') ?? resolve(dirname(resolve(file)), basename(file).replace(/\.sdev$/, ''));
  const asmPath = outBin + '.s';
  writeFileSync(asmPath, asm);
  if (flag('--emit-asm')) { console.log('wrote', asmPath); return; }
  link(asm, outBin, { as: value('--as'), ld: value('--ld'), tmpDir: dirname(outBin) });
  console.log('wrote', outBin);
}

export async function cmdEdit(file: string | undefined): Promise<void> {
  if (!file) die('sdev edit <file.sdev>');
  await runEditor({ ...runOptions(), path: file });
}
