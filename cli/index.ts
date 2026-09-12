/**
 * sdev — the official command line for the sdev language.
 *
 * Everything the web IDE can do, from a terminal: run programs on either
 * runtime, compile containers, build native binaries, format and inspect
 * files, and work with personal dialects, extensions and libraries.
 */
import './env';
import { SDEV_HOME } from './env';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, basename, dirname, extname } from 'node:path';
import { createInterface } from 'node:readline';
import { Lexer } from '@/lang/lexer';
import { Parser } from '@/lang/parser';
import { Interpreter } from '@/lang/interpreter';
import { SdevError } from '@/lang/errors';
import { translateSource, detectLanguage, SUPPORTED_LANGUAGES } from '@/lang/translator';
import { formatSdev } from '@/components/ide/formatSdev';
import {
  readSignature, writeSignature, stripSignature, hasSignature,
  isSignatureStale, repairSignature, checksum,
} from '@/lang/dialect/signature';
import { validateDialect, isPublishable, inherit, preludeSource, type DialectSpec } from '@/lang/dialect/spec';
import { canonicalize, dialectize, translateDialect } from '@/lang/dialect/canonicalize';
import { generateDialectDocs, docFreshness, TEMPLATE_VERSION } from '@/lang/dialect/docs';
import { parseReference, parseAddress, formatAddress } from '@/lang/dialect/address';
import { CATALOG, GROUP_LABELS } from '@/lang/dialect/catalog';
import {
  cachedLibraries, cacheBundle, forgetBundle, fetchLibrary,
  exportOfflineBundle, importOfflineBundle, libraryReferences,
} from '@/lang/dialect/registry';
import {
  cachedExtensions, enabledIds, setExtensionEnabled, syncExtensions,
  installExtension, activeExtensions, extensionPrelude, type ExtensionRecord,
} from '@/lang/dialect/extensions';
import {
  listDialects, saveDialect, removeDialect, findDialect, newDialect,
  activeSlug, setActiveSlug, activeDialect, runtimePreference, setRuntimePreference,
} from './store';
import { db, currentUser, requireUser, signIn, signOut, myUsername } from './cloud';
import { prepare, runPrepared, readSource, localModules, type PrepareOptions } from './pipeline';

const VERSION = '5.0.0';
const SDEVC_MAGIC = 'SDEVC4';

const argv = process.argv.slice(2);

function flag(name: string, short?: string): boolean {
  return argv.some((a) => a === name || (short && a === short));
}
function value(name: string, short?: string): string | undefined {
  const i = argv.findIndex((a) => a === name || (short && a === short));
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
}
const FLAGS_WITH_VALUES = new Set(['--dialect', '--lang', '--to', '--from', '-o', '--out', '--as', '--ld', '--runtime', '--name', '--about']);
/** Positional arguments, in order, skipping flags and their values. */
function positionals(): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('-')) {
      if (FLAGS_WITH_VALUES.has(a)) i++;
      continue;
    }
    if (i > 0 && FLAGS_WITH_VALUES.has(argv[i - 1])) continue;
    out.push(a);
  }
  return out;
}

function runOptions(): PrepareOptions {
  const rt = value('--runtime');
  return {
    dialect: value('--dialect'),
    noExt: flag('--no-ext'),
    lang: value('--lang'),
    runtime: rt === 'v1' || rt === 'v2' ? rt : undefined,
  };
}

function die(msg: string): never {
  console.error('error: ' + msg);
  process.exit(1);
}

function help(): void {
  console.log(`sdev v${VERSION} — the sdev language toolchain

USAGE
  sdev <command> [options]

RUNNING
  run <file>              Run a program (dialect + extensions + libraries applied)
  repl                    Interactive session
  check <file>            Parse only, report syntax errors
  ast <file>              Print the syntax tree as JSON
  fmt <file> [-w]         Format source (-w writes in place)
  watch <file>            Re-run on every save

BUILDING
  compile <file> [-o]     Build a .sdevc container
  run-bc <file.sdevc>     Run a container
  disasm <file>           Disassemble to bytecode text
  native <file> [-o]      Compile to a native x86-64 binary (--emit-asm for .s)

FILES
  info <file>             Show everything recorded about a file
  sign show|stamp|verify|strip <file>

DIALECTS
  dialect list                        Your dialects
  dialect new <slug> --name "Name"    Create one
  dialect use <slug|none>             Choose the active dialect
  dialect show <slug>                 Inspect words and style
  dialect validate <slug>             Check it is publishable
  dialect docs <slug> [-o file]       Generate its documentation
  dialect canon <file> [--from slug]  Dialect source -> canonical sdev
  dialect surface <file> --to <slug>  Canonical sdev -> dialect source
  dialect xlate <file> --from a --to b
  dialect words                       The catalog of changeable words
  dialect install <@user/slug|code>   Install someone else's dialect
  dialect publish <slug>              Publish yours
  dialect export|import <file>
  dialect remove <slug>

EXTENSIONS
  ext list | enable <id> | disable <id> | add <file> --name N [--about T] | sync | prelude

LIBRARIES
  lib list | add <@user/slug[@ver]> | remove <@user/slug> | pins <file>
  lib export <file> | lib import <file>

CLOUD
  auth login <email> | auth logout | auth whoami
  cloud list | cloud pull [name] | cloud push <file>

SETTINGS
  runtime [v1|v2]         Show or set the default runtime
  languages               Natural languages the lexer understands
  translate <file> --to <Language> [-o out]
  home                    Where the CLI keeps local state
  version

OPTIONS
  --dialect <slug|none>   Override the dialect for this run
  --runtime <v1|v2>       Override the runtime
  --no-ext                Ignore enabled extensions
  --lang <Language>       Source language for the lexer
  -o, --out <file>        Output path
`);
}

/* ------------------------------------------------------------------ */
/* running                                                             */
/* ------------------------------------------------------------------ */

async function cmdRun(file: string): Promise<void> {
  const opts = runOptions();
  const prepared = prepare(readSource(file), opts);
  const outcome = await runPrepared(prepared, file, opts);
  if (!outcome.success) die(outcome.error ?? 'program failed');
}

function parseFile(file: string, opts: PrepareOptions) {
  const prepared = prepare(readSource(file), opts);
  const lexer = new Lexer(prepared.code, { sourceLanguage: opts.lang ?? 'auto' });
  const ast = new Parser(lexer.tokenize()).parse();
  return { ast, prepared, detected: lexer.detectedLanguage ?? 'English' };
}

async function cmdRepl(): Promise<void> {
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
    const prepared = prepare(buffer, runOptions());
    if (prepared.runtime === 'v2') {
      const r = await runPrepared(prepared, null, runOptions());
      if (!r.success) console.error('error:', r.error);
      buffer = '';
      return rl.prompt();
    }
    try {
      const ast = new Parser(new Lexer(prepared.code).tokenize()).parse();
      interpreter.interpret(ast);
      buffer = '';
    } catch (e) {
      if (e instanceof SdevError) { console.error('error:', e.message); buffer = ''; }
      /* otherwise keep buffering — the statement is incomplete */
    }
    rl.prompt();
  });
  rl.on('close', () => { console.log('bye'); process.exit(0); });
}

async function cmdWatch(file: string): Promise<void> {
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

/* ------------------------------------------------------------------ */
/* building                                                            */
/* ------------------------------------------------------------------ */

function cmdCompile(file: string): void {
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

async function cmdRunBc(file: string): Promise<void> {
  const c = loadContainer(file);
  const opts = { ...runOptions(), dialect: 'none', runtime: runOptions().runtime ?? c.runtime };
  const outcome = await runPrepared(prepare(c.source, opts), file, opts);
  if (!outcome.success) die(outcome.error ?? 'program failed');
}

async function cmdDisasm(file: string): Promise<void> {
  const source = extname(file) === '.sdevc' ? loadContainer(file).source : stripSignature(readSource(file));
  const prepared = prepare(source, { ...runOptions(), dialect: extname(file) === '.sdevc' ? 'none' : undefined });
  let text: string;
  if (prepared.runtime === 'v2') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — plain JS module
    const { compile, setSeedLoader } = await import('../lang/compiler/compile-self.mjs');
    const { seedWasmPath } = await import('./env');
    setSeedLoader(async () => readFileSync(seedWasmPath()));
    const program = await compile(prepared.code, localModules(file, prepared.code));
    text = hexdump(program.bytecode);
  } else {
    const { Compiler } = await import('@/lang/compiler');
    const { disassemble } = await import('@/lang/bytecode');
    const ast = new Parser(new Lexer(prepared.code).tokenize()).parse();
    text = disassemble(new Compiler().compile(ast).entry);
  }
  const out = value('-o', '--out');
  if (out) { writeFileSync(out, text); console.log('wrote', out); } else console.log(text);
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

async function cmdNative(file: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — plain JS modules
  const { generateAsm } = await import('../lang/native/codegen-x64.mjs');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { link } = await import('../lang/native/link.mjs');
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

/* ------------------------------------------------------------------ */
/* files                                                               */
/* ------------------------------------------------------------------ */

function cmdInfo(file: string): void {
  const raw = readSource(file);
  const sig = readSignature(raw);
  const body = stripSignature(raw);
  const dialect = sig?.dialect ? findDialect(sig.dialect.replace(/^@[^/]+\//, '')) : null;
  const rows: [string, string][] = [
    ['file', resolve(process.cwd(), file)],
    ['size', `${Buffer.byteLength(body)} bytes · ${body.split('\n').length} lines`],
    ['signed', hasSignature(raw) ? 'yes' : 'no'],
    ['runtime', sig?.rt ?? `${runtimePreference()} (default)`],
    ['dialect', sig?.dialect ? `${sig.dialect}${sig.dialectVersion ? ' v' + sig.dialectVersion : ''}${dialect ? '' : ' (not installed)'}` : 'canonical sdev'],
    ['origin', sig?.origin ?? '—'],
    ['checksum', sig?.sum ? `${sig.sum} · ${isSignatureStale(raw) ? 'STALE' : 'valid'}` : checksum(body) + ' (unrecorded)'],
    ['stamped', sig?.ts ? new Date(sig.ts).toLocaleString() : '—'],
    ['library pins', (sig?.libs?.length ? sig.libs : libraryReferences(body).map(formatAddress)).join(', ') || '—'],
    ['extensions', activeExtensions().map((e) => e.name).join(', ') || '—'],
  ];
  const width = Math.max(...rows.map((r) => r[0].length));
  for (const [k, v] of rows) console.log(k.padEnd(width) + '  ' + v);
}

function cmdSign(sub: string, file: string): void {
  const path = resolve(process.cwd(), file);
  const raw = readSource(file);
  if (sub === 'show') {
    const sig = readSignature(raw);
    console.log(sig ? JSON.stringify(sig, null, 2) : 'no signature');
    return;
  }
  if (sub === 'strip') { writeFileSync(path, stripSignature(raw)); console.log('signature removed'); return; }
  if (sub === 'verify') {
    if (!hasSignature(raw)) return console.log('no signature');
    console.log(isSignatureStale(raw) ? 'STALE — body changed since it was stamped' : 'valid');
    return;
  }
  if (sub === 'stamp') {
    const body = stripSignature(raw);
    const dialect = activeDialect();
    const previous = readSignature(raw);
    const signed = hasSignature(raw) && !value('--dialect') && !flag('--force')
      ? repairSignature(raw)
      : writeSignature(raw, {
          rt: value('--runtime') ?? previous?.rt ?? runtimePreference(),
          dialect: value('--dialect') ?? dialect?.meta.slug ?? previous?.dialect ?? null,
          dialectVersion: dialect?.meta.version ?? previous?.dialectVersion ?? null,
          libs: libraryReferences(body).map(formatAddress),
          origin: previous?.origin ?? null,
        });
    writeFileSync(path, signed);
    console.log('stamped', basename(path));
    return;
  }
  die('sign: use show | stamp | verify | strip');
}

/* ------------------------------------------------------------------ */
/* dialects                                                            */
/* ------------------------------------------------------------------ */

function requireLocalDialect(slug: string): DialectSpec {
  const spec = findDialect(slug);
  if (!spec) die(`no local dialect "${slug}"`);
  return spec;
}

async function cmdDialect(sub: string, rest: string[]): Promise<void> {
  switch (sub) {
    case undefined:
    case 'list': {
      const all = listDialects();
      if (!all.length) return console.log('no dialects yet — sdev dialect new <slug> --name "Name"');
      for (const d of all) {
        const mark = d.meta.slug === activeSlug() ? '*' : ' ';
        console.log(`${mark} ${d.meta.slug.padEnd(20)} ${d.meta.name}  v${d.meta.version}  ${d.meta.visibility}`);
      }
      return;
    }
    case 'new': {
      const slug = rest[0] ?? die('sdev dialect new <slug> --name "Name"');
      const spec = newDialect(value('--name') ?? slug, slug);
      console.log(`created ${spec.meta.slug} — edit words with: sdev dialect set ${slug} <canonical> <yourword>`);
      return;
    }
    case 'set': {
      const [slug, canonical, word] = rest;
      if (!slug || !canonical || !word) die('sdev dialect set <slug> <canonical-word> <your-word>');
      const spec = requireLocalDialect(slug);
      spec.names[canonical] = word;
      saveDialect(spec);
      console.log(`${canonical} -> ${word}`);
      return;
    }
    case 'use': {
      const slug = rest[0] ?? die('sdev dialect use <slug|none>');
      if (slug === 'none') { setActiveSlug(null); return console.log('using canonical sdev'); }
      requireLocalDialect(slug);
      setActiveSlug(slug);
      console.log('active dialect:', slug);
      return;
    }
    case 'show': {
      const spec = requireLocalDialect(rest[0] ?? die('sdev dialect show <slug>'));
      console.log(`${spec.meta.name} (${spec.meta.slug}) v${spec.meta.version} · ${spec.meta.visibility}`);
      console.log(`languages: ${spec.meta.languages.join(', ')}`);
      console.log(`style: blocks ${spec.style.blockStyle}, assignment ${spec.style.assignment}, comments "${spec.style.commentMarker}"`);
      const words = Object.entries(spec.names);
      console.log(words.length ? '\nwords:' : '\nno renamed words yet');
      for (const [k, v] of words) console.log(`  ${k.padEnd(16)} ${v}`);
      if (spec.constructs.functions.length) {
        console.log('\nadded functions:');
        for (const f of spec.constructs.functions) console.log(`  ${f.name}`);
      }
      if (spec.constructs.operators.length) {
        console.log('\noperators:');
        for (const o of spec.constructs.operators) console.log(`  ${o.symbol} -> ${o.call}`);
      }
      return;
    }
    case 'validate': {
      const spec = requireLocalDialect(rest[0] ?? die('sdev dialect validate <slug>'));
      const issues = validateDialect(spec);
      if (!issues.length) console.log('valid — ready to publish');
      for (const i of issues) console.log(`${i.level === 'error' ? 'error' : 'warn '}  ${i.message}`);
      if (!isPublishable(spec)) process.exitCode = 1;
      return;
    }
    case 'docs': {
      const spec = requireLocalDialect(rest[0] ?? die('sdev dialect docs <slug>'));
      const text = generateDialectDocs(spec);
      const out = value('-o', '--out');
      if (out) { writeFileSync(out, text); console.log('wrote', out, `(template v${TEMPLATE_VERSION})`); }
      else console.log(text);
      return;
    }
    case 'words': {
      let group = '';
      for (const entry of CATALOG) {
        if (entry.group !== group) { group = entry.group; console.log(`\n${GROUP_LABELS[entry.group]}`); }
        console.log(`  ${entry.word.padEnd(16)} ${entry.about ?? ''}`);
      }
      return;
    }
    case 'canon': {
      const file = rest[0] ?? die('sdev dialect canon <file> [--from slug]');
      const raw = stripSignature(readSource(file));
      const from = value('--from') ? requireLocalDialect(value('--from')!) : activeDialect();
      if (!from) die('no dialect selected — pass --from <slug>');
      emit(canonicalize(raw, from, { withPrelude: flag('--prelude') }).source);
      return;
    }
    case 'surface': {
      const file = rest[0] ?? die('sdev dialect surface <file> --to <slug>');
      const to = requireLocalDialect(value('--to') ?? die('--to <slug> is required'));
      emit(dialectize(stripSignature(readSource(file)), to));
      return;
    }
    case 'xlate': {
      const file = rest[0] ?? die('sdev dialect xlate <file> --from a --to b');
      const from = requireLocalDialect(value('--from') ?? die('--from <slug> is required'));
      const to = requireLocalDialect(value('--to') ?? die('--to <slug> is required'));
      emit(translateDialect(stripSignature(readSource(file)), from, to));
      return;
    }
    case 'prelude': {
      const spec = requireLocalDialect(rest[0] ?? die('sdev dialect prelude <slug>'));
      console.log(preludeSource(spec) || '(empty)');
      return;
    }
    case 'extend': {
      const [childSlug, baseSlug] = rest;
      if (!childSlug || !baseSlug) die('sdev dialect extend <slug> <base-slug>');
      const merged = inherit(requireLocalDialect(baseSlug), requireLocalDialect(childSlug));
      saveDialect(merged);
      console.log(`${childSlug} now extends ${baseSlug}`);
      return;
    }
    case 'install': {
      const ref = rest[0] ?? die('sdev dialect install <@user/slug|share-code>');
      const spec = await installDialect(ref);
      console.log(`installed ${spec.meta.slug} — ${spec.meta.name} v${spec.meta.version}`);
      return;
    }
    case 'publish': {
      const spec = requireLocalDialect(rest[0] ?? die('sdev dialect publish <slug>'));
      if (!isPublishable(spec)) die('fix the validation errors first: sdev dialect validate ' + spec.meta.slug);
      const user = await requireUser();
      const published: DialectSpec = { ...spec, meta: { ...spec.meta, visibility: spec.meta.visibility === 'private' ? 'public' : spec.meta.visibility } };
      await db.from('dialects').upsert({
        user_id: user.id, slug: published.meta.slug, name: published.meta.name,
        description: published.meta.description ?? '', languages: published.meta.languages,
        visibility: published.meta.visibility, extends_slug: published.meta.extends,
        latest_version: published.meta.version, spec: published, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,slug' });
      const { data } = await db.from('dialects').select('id').eq('user_id', user.id).eq('slug', published.meta.slug).maybeSingle();
      if (data?.id) await db.from('dialect_versions').insert({ dialect_id: data.id, version: published.meta.version, spec: published });
      saveDialect(published);
      const handle = await myUsername(user.id);
      console.log(`published ${handle ? '@' + handle + '/' : ''}${published.meta.slug} v${published.meta.version}`);
      return;
    }
    case 'export': {
      const out = value('-o', '--out') ?? rest[0] ?? 'sdev-dialects.json';
      writeFileSync(out, JSON.stringify({ format: 'sdev-dialects', version: 1, dialects: listDialects() }, null, 2));
      console.log('wrote', out);
      return;
    }
    case 'import': {
      const file = rest[0] ?? die('sdev dialect import <file>');
      const parsed = JSON.parse(readSource(file)) as { dialects?: DialectSpec[] };
      const specs = parsed.dialects ?? [];
      for (const s of specs) saveDialect(s);
      console.log(`imported ${specs.length} dialect(s)`);
      return;
    }
    case 'remove': {
      const slug = rest[0] ?? die('sdev dialect remove <slug>');
      console.log(removeDialect(slug) ? 'removed ' + slug : 'no such dialect');
      return;
    }
    default:
      die(`unknown dialect command "${sub}"`);
  }
}

async function installDialect(reference: string): Promise<DialectSpec> {
  const parsed = parseReference(reference);
  if (!parsed) die('use @username/dialect or an 8-character share code');
  let row: { spec: DialectSpec } | null = null;
  if (parsed.kind === 'code') {
    const { data } = await db.from('dialects').select('spec').eq('share_code', parsed.code).maybeSingle();
    row = data;
  } else {
    const { data: owner } = await db.from('usernames').select('user_id').eq('username', parsed.address.username).maybeSingle();
    if (!owner) die(`no user named @${parsed.address.username}`);
    const { data } = await db.from('dialects').select('spec').eq('user_id', owner.user_id).eq('slug', parsed.address.slug).maybeSingle();
    row = data;
  }
  if (!row?.spec) die('that dialect is not available');
  saveDialect(row.spec);
  return row.spec;
}

/* ------------------------------------------------------------------ */
/* extensions & libraries                                              */
/* ------------------------------------------------------------------ */

async function cmdExt(sub: string, rest: string[]): Promise<void> {
  switch (sub) {
    case undefined:
    case 'list': {
      const all = cachedExtensions();
      const on = new Set(enabledIds());
      if (!all.length) return console.log('no extensions cached — sdev ext sync (signed in) or sdev ext add <file>');
      for (const e of all) console.log(`${on.has(e.id) ? '[on ]' : '[off]'} ${e.id.slice(0, 8)}  ${e.name.padEnd(20)} ${e.kind}${e.symbol ? ' ' + e.symbol : ''}`);
      return;
    }
    case 'enable':
    case 'disable': {
      const id = rest[0] ?? die(`sdev ext ${sub} <id>`);
      const match = cachedExtensions().find((e) => e.id === id || e.id.startsWith(id) || e.name === id);
      if (!match) die('no such extension');
      setExtensionEnabled(match.id, sub === 'enable');
      console.log(`${match.name} ${sub}d`);
      return;
    }
    case 'add': {
      const file = rest[0] ?? die('sdev ext add <file.sdev> --name <name> [--about text]');
      const record: ExtensionRecord = {
        id: 'local-' + checksum(file + Date.now()),
        name: value('--name') ?? basename(file).replace(/\.sdev$/, ''),
        kind: value('--symbol') ? 'operator' : 'function',
        symbol: value('--symbol') ?? null,
        about: value('--about') ?? null,
        source: stripSignature(readSource(file)),
        visibility: 'private',
      };
      installExtension(record);
      setExtensionEnabled(record.id, true);
      console.log(`added and enabled ${record.name}`);
      return;
    }
    case 'sync': {
      const user = await currentUser();
      const all = await syncExtensions(user?.id ?? null);
      console.log(`synced ${all.length} extension(s)`);
      return;
    }
    case 'prelude':
      console.log(extensionPrelude() || '(no enabled extensions)');
      return;
    default:
      die(`unknown ext command "${sub}"`);
  }
}

async function cmdLib(sub: string, rest: string[]): Promise<void> {
  switch (sub) {
    case undefined:
    case 'list': {
      const all = cachedLibraries();
      if (!all.length) return console.log('no libraries cached — sdev lib add @user/slug');
      for (const b of all) console.log(`${b.address.padEnd(28)} v${b.version}  ${Object.keys(b.modules).length} module(s)`);
      return;
    }
    case 'add': {
      const ref = rest[0] ?? die('sdev lib add <@user/slug[@version]>');
      const address = parseAddress(ref);
      if (!address) die('use @username/library or @username/library@1.2.0');
      const bundle = await fetchLibrary(address);
      cacheBundle(bundle);
      console.log(`cached ${bundle.address} v${bundle.version}`);
      return;
    }
    case 'remove':
      forgetBundle(rest[0] ?? die('sdev lib remove <@user/slug>'));
      console.log('removed');
      return;
    case 'pins': {
      const refs = libraryReferences(stripSignature(readSource(rest[0] ?? die('sdev lib pins <file>'))));
      console.log(refs.length ? refs.map(formatAddress).join('\n') : 'no library references');
      return;
    }
    case 'export': {
      const out = value('-o', '--out') ?? rest[0] ?? 'sdev-libraries.json';
      writeFileSync(out, exportOfflineBundle());
      console.log('wrote', out);
      return;
    }
    case 'import':
      console.log(`imported ${importOfflineBundle(readSource(rest[0] ?? die('sdev lib import <file>')))} library bundle(s)`);
      return;
    default:
      die(`unknown lib command "${sub}"`);
  }
}

/* ------------------------------------------------------------------ */
/* cloud                                                               */
/* ------------------------------------------------------------------ */

async function cmdAuth(sub: string, rest: string[]): Promise<void> {
  switch (sub) {
    case 'login': {
      const email = rest[0] ?? (await ask('email: '));
      if (!email) die('sdev auth login <email>');
      const pw = await readPassword(value('--password'));
      const user = await signInWithPassword(email, pw);
      console.log('signed in as', user.email);
      return;
    }
    case 'signup': {
      const email = rest[0] ?? (await ask('email: '));
      if (!email) die('sdev auth signup <email>');
      const pw = await readPassword(value('--password'), 'choose a password: ');
      if (pw.length < 6) die('use at least 6 characters');
      const { needsConfirmation } = await signUpWithPassword(email, pw, value('--name'));
      console.log(needsConfirmation
        ? `account created — open the confirmation link we emailed to ${email}, then: sdev auth login ${email}`
        : `signed in as ${email}`);
      return;
    }
    case 'code': {
      const email = rest[0] ?? (await ask('email: '));
      if (!email) die('sdev auth code <email>');
      await sendEmailCode(email, flag('--new'));
      console.log(`a one-time code is on its way to ${email}`);
      const code = rest[1] ?? (await ask('code: '));
      if (!code) return console.log(`when it arrives, run: sdev auth code ${email} <code>`);
      const user = await verifyEmailCode(email, code);
      console.log('signed in as', user.email);
      return;
    }
    case 'token': {
      const access = rest[0] ?? (await ask('access token: '));
      const refresh = rest[1] ?? (await ask('refresh token: '));
      if (!access || !refresh) die('sdev auth token <access-token> <refresh-token>');
      const user = await signInWithTokens(access, refresh);
      console.log('signed in as', user.email);
      return;
    }
    case 'reset': {
      const email = rest[0] ?? (await ask('email: '));
      if (!email) die('sdev auth reset <email>');
      await sendPasswordReset(email);
      console.log(`password reset link sent to ${email}`);
      return;
    }
    case 'refresh': {
      const session = await ensureSession();
      console.log(session ? 'session refreshed for ' + session.user.email : 'not signed in');
      return;
    }
    case 'logout':
      await signOut();
      return console.log('signed out');
    case 'status':
    case undefined:
    case 'whoami': {
      const user = await currentUser();
      if (!user) {
        const stored = storedSummary();
        console.log(stored
          ? `signed out — the saved session for ${stored.email ?? 'your account'} expired.\nsign in again: sdev auth login ${stored.email ?? '<email>'}`
          : 'not signed in — sdev auth login <email>  or  sdev auth code <email>');
        return;
      }
      const handle = await myUsername(user.id);
      console.log(`${user.email}${handle ? ' · @' + handle : ''}`);
      if (sub === 'status') console.log('session file: ' + sessionFile());
      return;
    }
    default:
      die('auth: use login | signup | code | token | reset | refresh | status | logout');
  }
}

async function cmdCloud(sub: string, rest: string[]): Promise<void> {
  const user = await requireUser();
  if (sub === 'list' || sub === undefined) {
    const { data } = await db.from('code_files').select('name, updated_at, dialect_slug, runtime').eq('user_id', user.id).order('updated_at', { ascending: false });
    for (const f of data ?? []) console.log(`${String(f.name).padEnd(28)} ${new Date(f.updated_at).toLocaleString()}  ${f.runtime ?? 'v1'}  ${f.dialect_slug ?? 'canonical'}`);
    if (!data?.length) console.log('no files in the cloud yet');
    return;
  }
  if (sub === 'pull') {
    const { data } = await db.from('code_files').select('name, content').eq('user_id', user.id);
    const wanted = rest[0];
    const rows = (data ?? []).filter((f: { name: string }) => !wanted || f.name === wanted);
    if (!rows.length) die('nothing to pull');
    const dir = value('-o', '--out') ?? '.';
    mkdirSync(dir, { recursive: true });
    for (const f of rows) {
      writeFileSync(resolve(dir, f.name), stripSignature(f.content ?? ''));
      console.log('pulled', f.name);
    }
    return;
  }
  if (sub === 'push') {
    const file = rest[0] ?? die('sdev cloud push <file>');
    const body = stripSignature(readSource(file));
    const dialect = activeDialect();
    const libs = libraryReferences(body).map(formatAddress);
    const runtime = runtimePreference();
    const signed = writeSignature(body, {
      rt: runtime,
      dialect: dialect?.meta.slug ?? null,
      dialectVersion: dialect?.meta.version ?? null,
      libs,
      origin: null,
    });
    const name = basename(file);
    const mirror = { dialect_slug: dialect?.meta.slug ?? null, dialect_version: dialect?.meta.version ?? null, runtime, lib_pins: libs };
    const { data: existing } = await db.from('code_files').select('id').eq('user_id', user.id).eq('name', name).maybeSingle();
    if (existing?.id) await db.from('code_files').update({ content: signed, ...mirror }).eq('id', existing.id).eq('user_id', user.id);
    else await db.from('code_files').insert({ user_id: user.id, name, content: signed, language: 'sdev', ...mirror });
    console.log('pushed', name);
    return;
  }
  die('cloud: use list | pull | push');
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function emit(text: string): void {
  const out = value('-o', '--out');
  if (out) { writeFileSync(out, text); console.log('wrote', out); }
  else process.stdout.write(text.endsWith('\n') ? text : text + '\n');
}

function prompt(question: string, hidden = false): Promise<string> {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const out = process.stdout as NodeJS.WriteStream & { muted?: boolean };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rl as any)._writeToOutput = (s: string) => { if (!out.muted) process.stdout.write(s.includes(question) ? s : '*'); };
      out.muted = false;
      setTimeout(() => { out.muted = false; }, 0);
    }
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); res(answer); });
  });
}

/* ------------------------------------------------------------------ */
/* dispatch                                                            */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const pos = positionals();
  const cmd = pos[0];

  if (!cmd || flag('--help', '-h')) return help();
  if (flag('--version', '-v')) return console.log('sdev v' + VERSION);

  switch (cmd) {
    case 'run':
    case 'exec':
      return cmdRun(pos[1] ?? die('sdev run <file>'));
    case 'repl':
      return cmdRepl();
    case 'watch':
      return cmdWatch(pos[1] ?? die('sdev watch <file>'));
    case 'check': {
      parseFile(pos[1] ?? die('sdev check <file>'), runOptions());
      console.log('OK — no syntax errors');
      return;
    }
    case 'ast': {
      const { ast } = parseFile(pos[1] ?? die('sdev ast <file>'), runOptions());
      emit(JSON.stringify(ast, null, 2));
      return;
    }
    case 'fmt': {
      const file = pos[1] ?? die('sdev fmt <file>');
      const raw = readSource(file);
      const formatted = formatSdev(stripSignature(raw));
      if (flag('-w', '--write')) {
        const sig = readSignature(raw);
        writeFileSync(resolve(process.cwd(), file), sig ? repairSignature(raw.split('\n')[0] + '\n' + formatted) : formatted);
        console.log('formatted', basename(file));
      } else process.stdout.write(formatted.endsWith('\n') ? formatted : formatted + '\n');
      return;
    }
    case 'compile':
      return cmdCompile(pos[1] ?? die('sdev compile <file>'));
    case 'run-bc':
      return cmdRunBc(pos[1] ?? die('sdev run-bc <file.sdevc>'));
    case 'disasm':
      return cmdDisasm(pos[1] ?? die('sdev disasm <file>'));
    case 'native':
      return cmdNative(pos[1] ?? die('sdev native <file>'));
    case 'info':
      return cmdInfo(pos[1] ?? die('sdev info <file>'));
    case 'sign':
      return cmdSign(pos[1] ?? 'show', pos[2] ?? die('sdev sign <show|stamp|verify|strip> <file>'));
    case 'dialect':
      return cmdDialect(pos[1], pos.slice(2));
    case 'ext':
      return cmdExt(pos[1], pos.slice(2));
    case 'lib':
      return cmdLib(pos[1], pos.slice(2));
    case 'auth':
      return cmdAuth(pos[1] ?? 'whoami', pos.slice(2));
    case 'cloud':
      return cmdCloud(pos[1], pos.slice(2));
    case 'runtime': {
      const rt = pos[1];
      if (rt === 'v1' || rt === 'v2') { setRuntimePreference(rt); console.log('default runtime:', rt); }
      else console.log('default runtime:', runtimePreference());
      return;
    }
    case 'languages':
      for (const l of SUPPORTED_LANGUAGES) console.log(' -', l);
      return;
    case 'translate': {
      const file = pos[1] ?? die('sdev translate <file> --to <Language>');
      const to = value('--to') ?? die('--to <Language> is required');
      const src = stripSignature(readSource(file));
      const from = value('--from') ?? detectLanguage(src) ?? 'English';
      emit(translateSource(src, from, to).translated);
      return;
    }
    case 'home':
      console.log(SDEV_HOME);
      return;
    case 'version':
      console.log('sdev v' + VERSION);
      return;
    case 'help':
      return help();
    default: {
      if (existsSync(resolve(process.cwd(), cmd))) return cmdRun(cmd);
      console.error(`unknown command "${cmd}"`);
      help();
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error('error:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
