/**
 * Promote what the agent learned into a real dialect.
 *
 * Everything the agent understands informally (the user's own words for
 * `say`, `set`, `if`, …) becomes dialect synonyms, so the code then runs
 * through the ordinary canonicalizer with no AI involved at all.
 */
import { emptyDialect, type DialectSpec } from '@/lang/dialect/spec';
import { CANONICAL, type Intent } from './vocabulary';
import type { AgentMemory } from './memory';
import type { UnderstandResult } from './types';

export interface PromoteOptions {
  name?: string;
  slug?: string;
  /** words the agent used while understanding this session */
  used?: Record<string, Intent>;
  memory?: AgentMemory;
  /** rename the canonical word instead of only accepting a synonym */
  rename?: boolean;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'my-sdev'
  );
}

export function promoteToDialect(opts: PromoteOptions = {}): DialectSpec {
  const name = opts.name ?? 'My way of writing';
  const spec = emptyDialect({ name, slug: opts.slug ?? slugify(name), description: 'Learned by the understanding agent.' });

  const pairs: [string, Intent][] = [
    ...Object.entries(opts.used ?? {}).map(([w, i]) => [w, i] as [string, Intent]),
    ...Object.entries(opts.memory?.words ?? {}).map(([w, e]) => [w, e.intent] as [string, Intent]),
  ];

  const byCanonical = new Map<string, Set<string>>();
  for (const [word, intent] of pairs) {
    const canonical = CANONICAL[intent];
    if (!canonical || word === canonical) continue;
    if (!/^[\p{L}\p{N}_]+$/u.test(word)) continue;
    if (!byCanonical.has(canonical)) byCanonical.set(canonical, new Set());
    byCanonical.get(canonical)!.add(word);
  }

  const taken = new Set<string>();
  for (const [canonical, words] of byCanonical) {
    const list = [...words].filter((w) => !taken.has(w));
    if (!list.length) continue;
    list.forEach((w) => taken.add(w));
    spec.synonyms[canonical] = list;
    if (opts.rename) spec.names[canonical] = list[0];
  }

  return spec;
}

/** Convenience: promote straight from a run of the agent. */
export function promoteFromResult(result: UnderstandResult, opts: PromoteOptions = {}): DialectSpec {
  return promoteToDialect({ ...opts, used: { ...result.learned, ...(opts.used ?? {}) } });
}
