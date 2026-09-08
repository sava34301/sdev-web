/**
 * Living documentation.
 *
 * The canonical reference is a template whose keywords are placeholders. A
 * dialect renders it with its own words, style and additions, and records the
 * template version it came from — so when the core docs move forward, every
 * generated copy knows it is stale.
 */
import { CATALOG, GROUP_LABELS, type CatalogGroup } from './catalog';
import { dialectize } from './canonicalize';
import { SAMPLE } from './sample';
import type { DialectSpec } from './spec';

/** Bump when the template below changes; generated docs compare against it. */
export const TEMPLATE_VERSION = '1.0.0';

const GROUP_ORDER: CatalogGroup[] = ['core', 'control', 'functions', 'errors', 'objects', 'modules', 'literals', 'operators', 'builtins'];

export function generateDialectDocs(spec: DialectSpec): string {
  const w = (canonical: string) => spec.names[canonical] ?? canonical;
  const out: string[] = [];

  out.push(`# ${spec.meta.name}`);
  out.push('');
  out.push(`> A personal version of sdev — ${spec.meta.languages.join(', ')} · v${spec.meta.version}`);
  out.push('');
  if (spec.meta.description) { out.push(spec.meta.description); out.push(''); }
  out.push(`Generated from the sdev reference template v${TEMPLATE_VERSION}. This dialect compiles with the same self-hosted sdev toolchain: your words are rewritten to canonical sdev before compilation, so the WebAssembly runtime, the native x86-64 backend and the machine-learning stack all work unchanged.`);
  out.push('');

  out.push('## Your first program');
  out.push('');
  out.push('```');
  out.push(dialectize(SAMPLE, spec));
  out.push('```');
  out.push('');

  out.push('## Style');
  out.push('');
  out.push(`- Blocks close with ${spec.style.blockStyle === 'braces' ? '`}`' : '`' + w('end') + '`'}`);
  out.push(`- Comments start with \`${spec.style.commentMarker}\``);
  out.push(`- Strings use ${spec.style.stringQuote === '"' ? 'double' : 'single'} quotes`);
  out.push(`- Assignment: ${spec.style.assignment === 'set-to' ? `\`${w('set')} x ${w('to')} 1\`` : spec.style.assignment === 'equals' ? '`x = 1`' : '`1 -> x`'}`);
  out.push(`- Arguments are separated by ${spec.style.argSeparator === 'space' ? 'spaces' : 'commas'}`);
  out.push('');

  for (const group of GROUP_ORDER) {
    const rows = CATALOG.filter((e) => e.group === group);
    if (!rows.length) continue;
    out.push(`## ${GROUP_LABELS[group]}`);
    out.push('');
    out.push('| In this dialect | sdev | Meaning |');
    out.push('| --- | --- | --- |');
    for (const entry of rows) {
      const synonyms = spec.synonyms[entry.word] ?? [];
      const word = [w(entry.word), ...synonyms].map((x) => `\`${x}\``).join(' / ');
      out.push(`| ${word} | \`${entry.word}\` | ${entry.about} |`);
    }
    out.push('');
  }

  if (spec.constructs.functions.length) {
    out.push('## Added functions');
    out.push('');
    for (const fn of spec.constructs.functions) {
      out.push(`### \`${fn.name}\``);
      if (fn.about) out.push(fn.about);
      out.push('');
      out.push('```');
      out.push(dialectize(fn.source, spec));
      out.push('```');
      out.push('');
    }
  }

  if (spec.constructs.operators.length) {
    out.push('## Added operators');
    out.push('');
    out.push('| Operator | Desugars to |');
    out.push('| --- | --- |');
    for (const op of spec.constructs.operators) {
      out.push(`| \`a ${op.symbol} b\` | \`${op.fn}(a, b)\` |`);
    }
    out.push('');
  }

  out.push('## Sharing');
  out.push('');
  out.push(`This dialect is ${spec.meta.visibility}. Anyone who has it can open your files in their own words, and you can open theirs — every file carries the dialect it was written in.`);
  out.push('');

  return out.join('\n');
}

export interface DocFreshness {
  templateVersion: string;
  stale: boolean;
}

export function docFreshness(generatedFromTemplate: string): DocFreshness {
  return { templateVersion: TEMPLATE_VERSION, stale: generatedFromTemplate !== TEMPLATE_VERSION };
}

/* ------------------------------------------------------------------ cache --
 * Generated docs are stored per dialect version + template version, so a
 * reader gets the cached copy instantly and a copy made from an older core
 * template is marked stale and regenerated on the next read.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export interface CachedDocs {
  content: string;
  templateVersion: string;
  stale: boolean;
  regenerated: boolean;
}

/**
 * Read the cached rendering of a dialect's documentation, regenerating it when
 * it is missing or was made from an older core template. Falls back to a plain
 * local render if the cache is unreachable.
 */
export async function getOrGenerateDocs(db: Db, spec: DialectSpec, dialectId?: string | null): Promise<CachedDocs> {
  const fresh = () => ({ content: generateDialectDocs(spec), templateVersion: TEMPLATE_VERSION, stale: false, regenerated: true });
  if (!dialectId) return fresh();
  try {
    const { data } = await db
      .from('dialect_docs')
      .select('content, template_version, stale')
      .eq('dialect_id', dialectId)
      .eq('dialect_version', spec.meta.version)
      .order('created_at', { ascending: false })
      .limit(1);
    const row = Array.isArray(data) ? data[0] : null;
    if (row && !row.stale && !docFreshness(row.template_version).stale) {
      return { content: row.content, templateVersion: row.template_version, stale: false, regenerated: false };
    }
    // stale or absent: re-render from the current template and mark old rows stale
    const content = generateDialectDocs(spec);
    await db.from('dialect_docs').update({ stale: true }).eq('dialect_id', dialectId).neq('template_version', TEMPLATE_VERSION);
    await db.from('dialect_docs').upsert(
      { dialect_id: dialectId, dialect_version: spec.meta.version, template_version: TEMPLATE_VERSION, content, stale: false },
      { onConflict: 'dialect_id,dialect_version,template_version' },
    );
    return { content, templateVersion: TEMPLATE_VERSION, stale: false, regenerated: true };
  } catch {
    return fresh();
  }
}

