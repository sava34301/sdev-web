/**
 * Thin bridge to `memory_promote_words` in `lang/agent/memory.sdev`.
 */
import { emptyDialect, type DialectSpec } from '@/lang/dialect/spec';
import { slugify } from '@/lib/utils';
import { CANONICAL, type Intent } from './vocabulary';
import type { AgentMemory } from './memory';
import type { UnderstandResult } from './types';
import { sdevPromoteWords } from './sdev-engine';

export interface PromoteOptions {
  name?: string;
  slug?: string;
  /** words the agent used while understanding this session */
  used?: Record<string, Intent>;
  memory?: AgentMemory;
  /** rename the canonical word instead of only accepting a synonym */
  rename?: boolean;
}

export function promoteToDialect(opts: PromoteOptions = {}): DialectSpec {
  const name = opts.name ?? 'My way of writing';
  const spec = emptyDialect({ name, slug: opts.slug ?? slugify(name), description: 'Learned by the understanding agent.' });
  const pairs: [string, string][] = [
    ...Object.entries(opts.used ?? {}).map(([w, i]) => [w, i] as [string, string]),
    ...Object.entries(opts.memory?.words ?? {}).map(([w, e]) => [w, e.intent] as [string, string]),
  ];
  const promoted = sdevPromoteWords(pairs, CANONICAL, Boolean(opts.rename));
  if (promoted) {
    Object.assign(spec.synonyms, promoted.synonyms);
    if (opts.rename) Object.assign(spec.names, promoted.names);
  }
  return spec;
}

/** Convenience: promote straight from a run of the agent. */
export function promoteFromResult(result: UnderstandResult, opts: PromoteOptions = {}): DialectSpec {
  return promoteToDialect({ ...opts, used: { ...result.learned, ...(opts.used ?? {}) } });
}
