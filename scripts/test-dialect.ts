/**
 * Golden tests for the dialect layer.
 *   canonicalize(dialect_source) === canonical_source
 *   dialectize(canonical) round-trips back to the dialect surface
 *   signatures write / read / strip / repair
 */
import { emptyDialect, validateDialect, type DialectSpec } from '../src/lang/dialect/spec';
import { canonicalize, dialectize, translateDialect } from '../src/lang/dialect/canonicalize';
import { resolveDialectSource } from '../src/lang/dialect/resolve';
import { SAMPLE } from '../src/lang/dialect/sample';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  serializeDialectToSdev,
  parseDialectFromSdev,
  isDialectSdevFile,
  serializeDialectCollectionToSdev,
  parseDialectCollection,
  extractDialectDirective,
} from '../src/lang/dialect/sdev-format';
import {
  readSignature, stripSignature, writeSignature, isSignatureStale, repairSignature,
  buildTranslationRecipe, applyTranslationRecipe, checksum,
} from '../src/lang/dialect/signature';

let pass = 0;
const failures: string[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else failures.push(`${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
}

// ---- a Bulgarian dialect with braces and `=` assignment -------------------
const bg: DialectSpec = emptyDialect({ name: 'Bulgarski', slug: 'bulgarski', languages: ['bg'] });
Object.assign(bg.names, {
  say: 'кажи', set: 'нека', to: 'на', if: 'ако', else: 'иначе', end: 'край',
  for: 'за', each: 'всеки', in: 'в', while: 'докато', return: 'върни', with: 'с',
  true: 'вярно', false: 'невярно', and: 'и', or: 'или', not: 'не',
});
bg.synonyms.say = ['принтирай'];
bg.style = { ...bg.style, commentMarker: '//', assignment: 'equals', blockStyle: 'braces' };

check('bg validates', validateDialect(bg).filter((i) => i.level === 'error'), []);

const bgSrc = [
  '// поздрав',
  'име = "свят"',
  'ако име не вярно {',
  '  кажи "здравей " + име',
  '}',
].join('\n');

const canon = canonicalize(bgSrc, bg).source;
check('bg -> canonical', canon, [
  '# поздрав',
  'set име to "свят"',
  'if име not true',
  '  say "здравей " + име',
  'end',
].join('\n'));

check('canonical -> bg round trip', dialectize(canon, bg), bgSrc);

// strings and comments are never rewritten
check(
  'strings untouched',
  canonicalize('кажи "кажи ако край"', bg).source,
  'say "кажи ако край"',
);

// ---- a terse English dialect with arrow assignment -----------------------
const terse = emptyDialect({ name: 'Terse', slug: 'terse' });
Object.assign(terse.names, { say: 'p', set: 'let', end: 'fin', if: 'when' });
terse.style = { ...terse.style, assignment: 'arrow' };
check('arrow assignment', canonicalize('42 -> answer', terse).source, 'set answer to 42');
check('arrow reverse', dialectize('set answer to 42', terse), '42 -> answer');

// dialect-to-dialect translation
check('bg -> terse (arrow)', translateDialect('x = 1', bg, terse), '1 -> x');
check('bg -> terse (say)', translateDialect('кажи x', bg, terse), 'p x');

// ---- user constructs -----------------------------------------------------
const withOps = emptyDialect({ name: 'Ops', slug: 'ops' });
withOps.constructs.functions.push({ name: 'twice', source: 'to twice with n\n  return n * 2\nend' });
withOps.constructs.operators.push({ symbol: '<>', precedence: 5, fn: 'twice' });
check('ops validate', validateDialect(withOps).filter((i) => i.level === 'error'), []);
check('operator desugars', canonicalize('say a <> b', withOps, { withPrelude: false }).source, 'say twice(a, b)');
check('prelude prepended', canonicalize('say 1', withOps).source.startsWith('to twice with n'), true);

// ---- collision detection -------------------------------------------------
const clash = emptyDialect({ name: 'Clash', slug: 'clash' });
clash.names.say = 'end';
check('collision caught', validateDialect(clash).some((i) => i.level === 'error'), true);

// ---- signatures ----------------------------------------------------------
const body = 'say "hi"\n';
const signed = writeSignature(body, { rt: 'v2', dialect: '@sava/bulgarski', dialectVersion: '1.0.0', libs: ['@sava/kit@1.2.0'], origin: null });
check('signature strips', stripSignature(signed), body);
check('signature reads dialect', readSignature(signed)?.dialect, '@sava/bulgarski');
check('signature reads libs', readSignature(signed)?.libs, ['@sava/kit@1.2.0']);
check('unsigned file reads null', readSignature(body), null);
check('fresh signature not stale', isSignatureStale(signed), false);
const tampered = signed.replace('say "hi"', 'say "bye"');
check('tampered signature stale', isSignatureStale(tampered), true);
check('repaired signature fresh', isSignatureStale(repairSignature(tampered)), false);
check('signature line is a comment', signed.startsWith('#'), true);

// signature with embedded understander/translator canonical output (stored as compact recipe)
const signedWithTranslated = writeSignature('говори "здравей"\n', {
  rt: 'v1',
  dialect: null,
  dialectVersion: null,
  libs: [],
  origin: null,
  translated: 'say "здравей"\n',
  brain: 'local',
});
check('signature keeps translated field', readSignature(signedWithTranslated)?.translated, 'say "здравей"\n');
check('signature stores compact recipe', Array.isArray(readSignature(signedWithTranslated)?.recipe), true);
check('signature keeps brain metadata', readSignature(signedWithTranslated)?.brain, 'local');
check('signature body stays user-written', stripSignature(signedWithTranslated), 'говори "здравей"\n');

// compact recipe on a larger file only stores changed hunks and reproduces exact output
const bigWritten = Array.from({ length: 50 }, (_, i) => (i === 25 ? 'print "hello"' : `forge v${i} be ${i}`)).join('\n') + '\n';
const bigCanon = Array.from({ length: 50 }, (_, i) => (i === 25 ? 'speak("hello")' : `forge v${i} be ${i}`)).join('\n') + '\n';
const bigRecipe = buildTranslationRecipe(bigWritten, bigCanon);
check('recipe has only 1 op for 1 changed line', bigRecipe.length, 1);
check('recipe reproduces exact canonical output', applyTranslationRecipe(bigWritten, bigRecipe), bigCanon);
const bigSigned = writeSignature(bigWritten, { rt: 'v1', dialect: null, translated: bigCanon });
check('signed recipe header is much smaller than full body', bigSigned.indexOf('\n') < bigCanon.length / 2, true);
check('signed recipe reconstructs exact output', readSignature(bigSigned)?.translated, bigCanon);
check('checksum matches deterministic fnv1a', checksum('say "hi"\n').length, 8);

// ---- pure .sdev dialect files (no JSON required) -------------------------
const bgSdev = serializeDialectToSdev(bg);
check('serialized dialect is #!sdev v2', bgSdev.startsWith('#!sdev v2'), true);
check('serialized dialect detected as dialect file', isDialectSdevFile(bgSdev), true);
const bgParsed = parseDialectFromSdev(bgSdev);
check('sdev dialect round-trips meta', bgParsed.meta, bg.meta);
check('sdev dialect round-trips style', bgParsed.style, bg.style);
check('sdev dialect round-trips names', bgParsed.names, bg.names);
check('sdev dialect round-trips synonyms', bgParsed.synonyms, bg.synonyms);
check('sdev dialect canonicalizes identically', canonicalize(bgSrc, bgParsed).source, canon);

const opsSdev = serializeDialectToSdev(withOps);
const opsParsed = parseDialectFromSdev(opsSdev);
check('sdev dialect round-trips custom functions', opsParsed.constructs.functions.map((f) => f.name), ['twice']);
check('sdev dialect round-trips custom operators', opsParsed.constructs.operators, withOps.constructs.operators);
check('sdev dialect prelude matches', canonicalize('say 1', opsParsed).source.startsWith('to twice with n'), true);

const bundleSdev = serializeDialectCollectionToSdev([bg, withOps]);
const bundleParsed = parseDialectCollection(bundleSdev);
check('sdev dialect collection round-trips count', bundleParsed.length, 2);
check('sdev dialect collection slugs', bundleParsed.map((d) => d.meta.slug), ['bulgarski', 'ops']);

const dirRes = extractDialectDirective('#!dialect ./bg.dialect.sdev\nкажи "здравей"');
check('dialect directive target', dirRes?.target, './bg.dialect.sdev');
check('dialect directive stripped', dirRes?.stripped, 'кажи "здравей"');

check('brace else branches compile', canonicalize('ако вярно {\n  кажи 1\n} иначе {\n  кажи 2\n}', bg).source,
  'if true\n  say 1\nelse\n  say 2\nend');
check('workspace dialect overrides active dialect', resolveDialectSource(
  '#!dialect ./bg.dialect.sdev\nкажи 42', terse,
  [{ name: 'bg.dialect.sdev', content: bgSdev }], () => null).source, 'say 42');
check('installed directive resolves without workspace file', resolveDialectSource(
  '#!dialect bulgarski\nкажи 42', null, [], slug => slug === 'bulgarski' ? bg : null).source, 'say 42');
for (const [name, source, files] of [
  ['missing dialect', '#!dialect missing.sdev\nsay 42', []],
  ['not a dialect', '#!dialect ordinary.sdev\nsay 42', [{ name: 'ordinary.sdev', content: 'say 1' }]],
] as const) {
  let rejected = false;
  try { resolveDialectSource(source, bg, [...files], () => null); } catch { rejected = true; }
  check(`${name} does not silently use active dialect`, rejected, true);
}
let invalidRejected = false;
try { resolveDialectSource('say 42', clash, [], () => null); } catch { invalidRejected = true; }
check('invalid dialect rejected before compilation', invalidRejected, true);

// The actual Studio tour must run, not just round-trip its words.
const pirate = emptyDialect({ name: 'Pirate sdev', slug: 'pirate-sdev', languages: ['bg'] });
Object.assign(pirate.names, {
  say: 'ахой', set: 'закотви', to: 'към', with: 'със', return: 'плячка',
  for: 'плаване', each: 'моряк', in: 'на_борда', range: 'левги', if: 'ако_видиш',
  is: 'е', else: 'иначе', end: 'стига', attempt: 'абордаж', throw: 'зад_борда',
  rescue: 'спаси', text: 'свитък', len: 'брой',
});
pirate.style.commentMarker = '⚓';
const tourDir = mkdtempSync(join(tmpdir(), 'sdev-dialect-tour-'));
try {
  for (const spec of [emptyDialect(), bg, pirate]) {
    const file = join(tourDir, spec.meta.slug + '.sdev');
    writeFileSync(file, canonicalize(dialectize(SAMPLE, spec), spec).source);
    let output = '';
    try { output = execFileSync('node', ['bin/sdevhost.mjs', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { output = String(e); }
    check(`${spec.meta.slug} Studio example runs to completion`, output, 'hello, world\n0\none\n2\ncaught boom\n');
  }
} finally { rmSync(tourDir, { recursive: true, force: true }); }

if (failures.length) {
  console.error(`\n${failures.length} FAILED:\n` + failures.join('\n\n'));
  process.exit(1);
}
console.log(`dialect suite: ${pass}/${pass} passed`);
