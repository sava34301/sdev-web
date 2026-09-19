/**
 * Ready-made dialects.
 *
 * These are real, complete dialects — every catalog word has a word, the
 * style is set, and each one ships a sample program written in its own
 * surface. Installing one drops it straight into the local dialect store, so
 * the IDE and the CLI can run it immediately.
 */
import { emptyDialect, type DialectSpec } from './spec';

export interface DialectPreset {
  spec: DialectSpec;
  /** a program written in this dialect's own words */
  sample: string;
}

/* ------------------------------------------------------------------ */
/* Сдев — sdev written in Bulgarian                                    */
/* ------------------------------------------------------------------ */

function bulgarian(): DialectSpec {
  const spec = emptyDialect({
    name: 'Сдев',
    slug: 'sdev-bg',
    languages: ['bg', 'en'],
    description: 'sdev, дума по дума на български.',
    version: '1.0.0',
    visibility: 'public',
  });

  Object.assign(spec.names, {
    say: 'кажи', ask: 'питай', set: 'нека', to: 'на',
    if: 'ако', else: 'иначе', end: 'край', for: 'за', each: 'всяко', in: 'във',
    while: 'докато', break: 'спри', continue: 'продължи', match: 'сравни',
    with: 'с', return: 'върни', make: 'създай', capture: 'улови', ref: 'препратка', call: 'извикай',
    attempt: 'опитай', rescue: 'хвани', throw: 'хвърли',
    kind: 'вид', has: 'има', does: 'прави', new: 'нов', self: 'аз', extends: 'наследява', super: 'родител',
    use: 'ползвай',
    true: 'вярно', false: 'невярно', nothing: 'нищо',
    is: 'е', not: 'не', and: 'и', or: 'или', more: 'повече', less: 'по_малко',
  });

  spec.synonyms.say = ['принтирай'];
  spec.synonyms.return = ['резултат'];

  spec.style = { ...spec.style, commentMarker: '#', assignment: 'set-to', stringQuote: '"', blockStyle: 'word' };

  // A real construct, written in canonical sdev, callable by its Bulgarian name.
  spec.constructs.functions = [
    {
      name: 'сбор',
      about: 'сумата на списък от числа',
      source: ['to сбор with numbers', '  set total to 0', '  for each n in numbers', '    set total to total + n', '  end', '  return total', 'end'].join('\n'),
    },
  ];

  return spec;
}

const BULGARIAN_SAMPLE = [
  '# първата ми програма на Сдев',
  'нека име на "свят"',
  '',
  'на поздрав с кой',
  '  кажи "здравей, " + кой',
  'край',
  '',
  'поздрав(име)',
  '',
  'за всяко н във range(3)',
  '  ако н е 1',
  '    кажи "едно"',
  '  иначе',
  '    кажи н',
  '  край',
  'край',
  '',
  'кажи сбор([1, 2, 3, 4])',
].join('\n');

export const DIALECT_PRESETS: Record<string, DialectPreset> = {
  'sdev-bg': { spec: bulgarian(), sample: BULGARIAN_SAMPLE },
};

export function presetList(): DialectPreset[] {
  return Object.values(DIALECT_PRESETS);
}

export function findPreset(slug: string): DialectPreset | null {
  return DIALECT_PRESETS[slug] ?? null;
}
