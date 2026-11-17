/**
 * Ready-made dialects.
 *
 * These are real, complete dialects — every catalog word has a word, the
 * style is set, and each one ships a sample program written in its own
 * surface. Installing one drops it straight into the local dialect store, so
 * the IDE and the CLI can run it immediately.
 */
import { emptyDialect, type DialectSpec } from './spec';
import { getDialectRunner } from './dialect-runner';

export interface DialectPreset {
  spec: DialectSpec;
  /** a program written in this dialect's own words */
  sample: string;
}

/* ------------------------------------------------------------------ */
/* Сдев — sdev written in Bulgarian                                    */
/* ------------------------------------------------------------------ */

function bulgarianPreset(): DialectPreset {
  const [namePairs, synPairs, sample] = getDialectRunner().call('dialect_preset_bg_data') as [
    Array<[string, string]>,
    Array<[string, string[]]>,
    string
  ];
  const spec = emptyDialect({
    name: 'Сдев',
    slug: 'sdev-bg',
    languages: ['bg', 'en'],
    description: 'sdev, дума по дума на български.',
    version: '1.0.0',
    visibility: 'public',
  });
  for (const [k, v] of namePairs) spec.names[k] = v;
  for (const [k, v] of synPairs) spec.synonyms[k] = v;
  spec.style = { ...spec.style, commentMarker: '#', assignment: 'set-to', stringQuote: '"', blockStyle: 'word' };
  spec.constructs.functions = [
    {
      name: 'сбор',
      about: 'сумата на списък от числа',
      source: ['to сбор with numbers', '  set total to 0', '  for each n in numbers', '    set total to total + n', '  end', '  return total', 'end'].join('\n'),
    },
  ];
  return { spec, sample };
}

export const DIALECT_PRESETS: Record<string, DialectPreset> = {
  get 'sdev-bg'() {
    return bulgarianPreset();
  },
};

export function presetList(): DialectPreset[] {
  return Object.values(DIALECT_PRESETS);
}

export function findPreset(slug: string): DialectPreset | null {
  return DIALECT_PRESETS[slug] ?? null;
}
