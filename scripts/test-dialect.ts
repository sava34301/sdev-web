/**
 * Golden tests for the dialect layer.
 *   canonicalize(dialect_source) === canonical_source
 *   dialectize(canonical) round-trips back to the dialect surface
 *   signatures write / read / strip / repair
 */
import { emptyDialect, validateDialect, type DialectSpec } from '../src/lang/dialect/spec';
import { canonicalize, dialectize, translateDialect } from '../src/lang/dialect/canonicalize';
import { readSignature, stripSignature, writeSignature, isSignatureStale, repairSignature } from '../src/lang/dialect/signature';

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
check(
  'bg -> terse',
  translateDialect('нека x = 1', bg, terse),
  'let x -> ',
) === undefined;
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

if (failures.length) {
  console.error(`\n${failures.length} FAILED:\n` + failures.join('\n\n'));
  process.exit(1);
}
console.log(`dialect suite: ${pass}/${pass} passed`);
