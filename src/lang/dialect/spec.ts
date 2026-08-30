/**
 * The dialect spec: one versioned JSON document that describes a personal
 * version of sdev. A dialect is DATA — the self-hosted lexer/parser/codegen
 * are never forked.
 */
import { CATALOG, CATALOG_BY_WORD, CATALOG_WORDS } from './catalog';

export type BlockStyle = 'word' | 'braces';
export type AssignmentForm = 'set-to' | 'equals' | 'arrow';

export interface DialectNames {
  /** canonical word -> dialect word */
  [canonicalWord: string]: string;
}

export interface DialectSynonyms {
  /** canonical word -> extra accepted spellings */
  [canonicalWord: string]: string[];
}

export interface DialectStyle {
  blockStyle: BlockStyle;
  commentMarker: string;
  stringQuote: '"' | "'";
  assignment: AssignmentForm;
  /** decorative only — the canonical parser accepts both */
  argSeparator: 'space' | 'comma';
}

export interface DialectConstructFn {
  /** name callable from dialect source */
  name: string;
  /** sdev source for the function, using canonical words */
  source: string;
  about?: string;
}

export interface DialectConstructOp {
  symbol: string;
  precedence: number;
  /** canonical function name the operator desugars to */
  fn: string;
  about?: string;
}

export interface DialectMeta {
  name: string;
  slug: string;
  /** BCP-47-ish tags, e.g. ["bg", "en"] */
  languages: string[];
  description?: string;
  version: string;
  /** slug of a dialect this one extends */
  extends?: string | null;
  visibility: 'private' | 'unlisted' | 'public';
}

export interface DialectSpec {
  specVersion: 1;
  meta: DialectMeta;
  names: DialectNames;
  synonyms: DialectSynonyms;
  style: DialectStyle;
  constructs: {
    functions: DialectConstructFn[];
    operators: DialectConstructOp[];
  };
}

export const DEFAULT_STYLE: DialectStyle = {
  blockStyle: 'word',
  commentMarker: '#',
  stringQuote: '"',
  assignment: 'set-to',
  argSeparator: 'space',
};

export function emptyDialect(partial: Partial<DialectMeta> = {}): DialectSpec {
  return {
    specVersion: 1,
    meta: {
      name: partial.name ?? 'My sdev',
      slug: partial.slug ?? 'my-sdev',
      languages: partial.languages ?? ['en'],
      description: partial.description ?? '',
      version: partial.version ?? '1.0.0',
      extends: partial.extends ?? null,
      visibility: partial.visibility ?? 'private',
    },
    names: Object.fromEntries(CATALOG_WORDS.map((w) => [w, w])),
    synonyms: {},
    style: { ...DEFAULT_STYLE },
    constructs: { functions: [], operators: [] },
  };
}

/** Merge a child spec over the dialect it extends. */
export function inherit(base: DialectSpec, child: DialectSpec): DialectSpec {
  return {
    ...child,
    names: { ...base.names, ...child.names },
    synonyms: { ...base.synonyms, ...child.synonyms },
    style: { ...base.style, ...child.style },
    constructs: {
      functions: [...base.constructs.functions, ...child.constructs.functions],
      operators: [...base.constructs.operators, ...child.constructs.operators],
    },
  };
}

export interface ValidationIssue {
  level: 'error' | 'warning';
  field: string;
  message: string;
}

const WORD_RE = /^[\p{L}\p{N}_][\p{L}\p{N}_]*$/u;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
const OP_RE = /^[^\p{L}\p{N}\s_"'#]{1,3}$/u;

/**
 * Publishing gate. A dialect that fails validation may be saved as a draft
 * but never published or compiled against.
 */
export function validateDialect(spec: DialectSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!SLUG_RE.test(spec.meta.slug)) {
    issues.push({ level: 'error', field: 'meta.slug', message: 'Slug must be 2–40 lowercase letters, digits or dashes.' });
  }
  if (!spec.meta.name.trim()) {
    issues.push({ level: 'error', field: 'meta.name', message: 'Give the dialect a display name.' });
  }
  if (!/^\d+\.\d+\.\d+$/.test(spec.meta.version)) {
    issues.push({ level: 'error', field: 'meta.version', message: 'Version must look like 1.0.0.' });
  }

  // ---- names -------------------------------------------------------
  const seen = new Map<string, string>();
  for (const entry of CATALOG) {
    const word = spec.names[entry.word];
    if (!word || !word.trim()) {
      issues.push({ level: 'error', field: `names.${entry.word}`, message: `"${entry.word}" has no word in this dialect.` });
      continue;
    }
    if (!WORD_RE.test(word)) {
      issues.push({ level: 'error', field: `names.${entry.word}`, message: `"${word}" is not a valid word — letters, digits and _ only, no spaces.` });
      continue;
    }
    const all = [word, ...(spec.synonyms[entry.word] ?? [])];
    for (const w of all) {
      if (!WORD_RE.test(w)) {
        issues.push({ level: 'error', field: `synonyms.${entry.word}`, message: `"${w}" is not a valid word.` });
        continue;
      }
      const owner = seen.get(w);
      if (owner && owner !== entry.word) {
        issues.push({ level: 'error', field: `names.${entry.word}`, message: `"${w}" is already used for "${owner}".` });
      } else {
        seen.set(w, entry.word);
      }
    }
  }

  // ---- style -------------------------------------------------------
  if (!spec.style.commentMarker || /[\p{L}\p{N}\s]/u.test(spec.style.commentMarker)) {
    issues.push({ level: 'error', field: 'style.commentMarker', message: 'Comment marker must be punctuation, e.g. # or //.' });
  }
  if (spec.style.blockStyle === 'braces' && seen.has('}')) {
    issues.push({ level: 'error', field: 'style.blockStyle', message: 'Brace style conflicts with a word named "}".' });
  }

  // ---- constructs --------------------------------------------------
  const fnNames = new Set<string>();
  for (const fn of spec.constructs.functions) {
    if (!WORD_RE.test(fn.name)) {
      issues.push({ level: 'error', field: `constructs.functions.${fn.name}`, message: `"${fn.name}" is not a valid function name.` });
    }
    if (seen.has(fn.name)) {
      issues.push({ level: 'error', field: `constructs.functions.${fn.name}`, message: `"${fn.name}" collides with the word for "${seen.get(fn.name)}".` });
    }
    if (fnNames.has(fn.name)) {
      issues.push({ level: 'error', field: `constructs.functions.${fn.name}`, message: `"${fn.name}" is declared twice.` });
    }
    fnNames.add(fn.name);
    if (!fn.source.trim()) {
      issues.push({ level: 'error', field: `constructs.functions.${fn.name}`, message: 'Function has no sdev body.' });
    }
  }

  const opSymbols = new Set<string>();
  for (const op of spec.constructs.operators) {
    if (!OP_RE.test(op.symbol)) {
      issues.push({ level: 'error', field: `constructs.operators.${op.symbol}`, message: `"${op.symbol}" must be 1–3 punctuation characters.` });
    }
    if (['+', '-', '*', '/', '%', '=', '<', '>', '(', ')', '[', ']', ',', '|>'].includes(op.symbol)) {
      issues.push({ level: 'error', field: `constructs.operators.${op.symbol}`, message: `"${op.symbol}" is already an sdev operator.` });
    }
    if (opSymbols.has(op.symbol)) {
      issues.push({ level: 'error', field: `constructs.operators.${op.symbol}`, message: `"${op.symbol}" is declared twice.` });
    }
    opSymbols.add(op.symbol);
    if (!fnNames.has(op.fn) && !CATALOG_BY_WORD[op.fn]) {
      issues.push({ level: 'warning', field: `constructs.operators.${op.symbol}`, message: `Desugars to "${op.fn}", which this dialect does not define.` });
    }
  }

  return issues;
}

export function isPublishable(spec: DialectSpec): boolean {
  return validateDialect(spec).every((i) => i.level !== 'error');
}

/** The sdev prelude a dialect contributes ahead of user code. */
export function preludeSource(spec: DialectSpec): string {
  if (spec.constructs.functions.length === 0) return '';
  return spec.constructs.functions.map((f) => f.source.trim()).join('\n\n') + '\n';
}
