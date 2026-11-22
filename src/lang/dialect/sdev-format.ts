/**
 * Pure-SDEV (.sdev) dialect file format.
 *
 * A dialect does not need a JSON file: it can live as a real `#!sdev v2` file
 * that holds its metadata, style, word mappings, synonyms, operators, and
 * custom functions directly in sdev v2 syntax — ready to feed straight into
 * the v2 compiler with zero AI understander involvement.
 */
import { CATALOG_WORDS } from './catalog';
import {
  DEFAULT_STYLE,
  emptyDialect,
  type AssignmentForm,
  type BlockStyle,
  type DialectConstructFn,
  type DialectConstructOp,
  type DialectSpec,
} from './spec';

const RESERVED_DIALECT_FNS = new Set([
  'dialect_meta',
  'dialect_style',
  'dialect_words',
  'dialect_synonyms',
  'dialect_operators',
]);

function quoteSdev(value: string): string {
  return (
    '"' +
    value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t') +
    '"'
  );
}

function unquoteSdev(raw: string): string {
  const inner = raw.slice(1, -1);
  let out = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '\\' && i + 1 < inner.length) {
      const next = inner[++i];
      if (next === 'n') out += '\n';
      else if (next === 'r') out += '\r';
      else if (next === 't') out += '\t';
      else out += next;
    } else {
      out += ch;
    }
  }
  return out;
}

/** Serialize a single DialectSpec into a valid `#!sdev v2` file. */
export function serializeDialectToSdev(spec: DialectSpec): string {
  const lines: string[] = [
    '#!sdev v2',
    `# Personal SDEV Dialect: ${spec.meta.name} (${spec.meta.slug})`,
    '# Pure .sdev dialect definition — feeds directly into the sdev v2 compiler.',
    '',
    'to dialect_meta',
    `  return [${[
      spec.meta.name,
      spec.meta.slug,
      spec.meta.version,
      (spec.meta.languages ?? ['en']).join(','),
      spec.meta.visibility ?? 'private',
      spec.meta.extends ?? '',
      spec.meta.description ?? '',
    ].map(quoteSdev).join(', ')}]`,
    'end',
    '',
    'to dialect_style',
    `  return [${[
      spec.style.blockStyle ?? DEFAULT_STYLE.blockStyle,
      spec.style.commentMarker ?? DEFAULT_STYLE.commentMarker,
      spec.style.stringQuote ?? DEFAULT_STYLE.stringQuote,
      spec.style.assignment ?? DEFAULT_STYLE.assignment,
      spec.style.argSeparator ?? DEFAULT_STYLE.argSeparator,
    ].map(quoteSdev).join(', ')}]`,
    'end',
    '',
  ];

  // Words that differ from canonical
  const wordPairs: Array<[string, string]> = [];
  for (const canonical of CATALOG_WORDS) {
    const mapped = spec.names[canonical];
    if (mapped && mapped !== canonical) wordPairs.push([canonical, mapped]);
  }
  lines.push('to dialect_words');
  if (wordPairs.length === 0) {
    lines.push('  return []');
  } else {
    lines.push('  return [');
    wordPairs.forEach(([c, w], idx) => {
      const comma = idx < wordPairs.length - 1 ? ',' : '';
      lines.push(`    [${quoteSdev(c)}, ${quoteSdev(w)}]${comma}`);
    });
    lines.push('  ]');
  }
  lines.push('end', '');

  // Synonyms
  const synEntries = Object.entries(spec.synonyms ?? {}).filter(([, list]) => list && list.length > 0);
  lines.push('to dialect_synonyms');
  if (synEntries.length === 0) {
    lines.push('  return []');
  } else {
    lines.push('  return [');
    synEntries.forEach(([canonical, list], idx) => {
      const comma = idx < synEntries.length - 1 ? ',' : '';
      lines.push(`    [${[canonical, ...list].map(quoteSdev).join(', ')}]${comma}`);
    });
    lines.push('  ]');
  }
  lines.push('end', '');

  // Operators
  const ops = spec.constructs?.operators ?? [];
  lines.push('to dialect_operators');
  if (ops.length === 0) {
    lines.push('  return []');
  } else {
    lines.push('  return [');
    ops.forEach((op, idx) => {
      const comma = idx < ops.length - 1 ? ',' : '';
      lines.push(
        `    [${[op.symbol, String(op.precedence ?? 2), op.fn, op.about ?? ''].map(quoteSdev).join(', ')}]${comma}`,
      );
    });
    lines.push('  ]');
  }
  lines.push('end');

  // Custom functions — written directly as sdev v2 functions for the compiler
  const fns = spec.constructs?.functions ?? [];
  if (fns.length > 0) {
    lines.push('', '# Custom dialect functions');
    for (const fn of fns) {
      if (fn.about) lines.push(`# about: ${fn.about}`);
      lines.push(fn.source.trim(), '');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

/** True when a `.sdev` file looks like a dialect definition. */
export function isDialectSdevFile(source: string): boolean {
  return /^\s*to\s+dialect_(?:meta|words)\b/m.test(source);
}

/** Extract all quoted string literals from a flat `[ "a", "b" ]` slice. */
function extractStringList(text: string): string[] {
  const out: string[] = [];
  const re = /"(?:\\.|[^"\\])*"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(unquoteSdev(m[0]));
  return out;
}

/** Extract nested string lists `[ ["a", "b"], ["c", "d"] ]` from a function body. */
function extractNestedStringLists(body: string): string[][] {
  const rows: string[][] = [];
  let depth = 0;
  let inStr = false;
  let escaped = false;
  let rowStart = -1;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '#') {
      while (i < body.length && body[i] !== '\n') i++;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === '[') {
      depth++;
      if (depth === 2) rowStart = i;
    } else if (ch === ']') {
      if (depth === 2 && rowStart >= 0) {
        rows.push(extractStringList(body.slice(rowStart, i + 1)));
        rowStart = -1;
      }
      depth = Math.max(0, depth - 1);
    }
  }
  return rows;
}

interface TopLevelFn {
  name: string;
  about?: string;
  body: string;
  source: string;
}

/** Split top-level `to <name> ... end` blocks from an sdev v2 file. */
function extractTopLevelFunctions(source: string): TopLevelFn[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const fns: TopLevelFn[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const startMatch = line.match(/^\s*to\s+([\p{L}\p{N}_]+)\b/u);
    if (!startMatch) {
      i++;
      continue;
    }

    // Optional `# about: ...` comment immediately above the function
    let about: string | undefined;
    if (i > 0) {
      const prev = lines[i - 1].trim();
      const aboutMatch = prev.match(/^#\s*about:\s*(.+)$/i);
      if (aboutMatch) about = aboutMatch[1].trim();
    }

    const name = startMatch[1];
    const fnLines: string[] = [line];
    let depth = 1;
    i++;

    while (i < lines.length && depth > 0) {
      const cur = lines[i];
      const trimmed = cur.replace(/#.*$/, '').trim();
      if (/^(if|for|while|to|kind|does|attempt|make)\b/.test(trimmed)) {
        depth++;
      } else if (/^end\b/.test(trimmed)) {
        depth--;
      }
      fnLines.push(cur);
      i++;
    }

    const full = fnLines.join('\n');
    const body = fnLines.slice(1, fnLines.length - 1).join('\n');
    fns.push({ name, about, body, source: full });
  }

  return fns;
}

/** Parse a `.sdev` dialect file into a DialectSpec. */
export function parseDialectFromSdev(source: string): DialectSpec {
  const fns = extractTopLevelFunctions(source);
  const byName = new Map<string, TopLevelFn>();
  for (const fn of fns) byName.set(fn.name, fn);

  const metaVals = byName.has('dialect_meta') ? extractStringList(byName.get('dialect_meta')!.body) : [];
  const name = metaVals[0] || 'My sdev';
  const slug = metaVals[1] || 'my-sdev';
  const version = metaVals[2] || '1.0.0';
  const languages = (metaVals[3] || 'en')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const visRaw = metaVals[4];
  const visibility: DialectSpec['meta']['visibility'] =
    visRaw === 'public' || visRaw === 'unlisted' || visRaw === 'private' ? visRaw : 'private';
  const extendsSlug = metaVals[5] ? metaVals[5] : null;
  const description = metaVals[6] ?? '';

  const spec = emptyDialect({
    name,
    slug,
    version,
    languages: languages.length ? languages : ['en'],
    visibility,
    extends: extendsSlug,
    description,
  });

  if (byName.has('dialect_style')) {
    const styleVals = extractStringList(byName.get('dialect_style')!.body);
    if (styleVals[0] === 'word' || styleVals[0] === 'braces') spec.style.blockStyle = styleVals[0] as BlockStyle;
    if (styleVals[1]) spec.style.commentMarker = styleVals[1];
    if (styleVals[2] === '"' || styleVals[2] === "'") spec.style.stringQuote = styleVals[2];
    if (styleVals[3] === 'set-to' || styleVals[3] === 'equals' || styleVals[3] === 'arrow') {
      spec.style.assignment = styleVals[3] as AssignmentForm;
    }
    if (styleVals[4] === 'space' || styleVals[4] === 'comma') spec.style.argSeparator = styleVals[4];
  }

  if (byName.has('dialect_words')) {
    for (const row of extractNestedStringLists(byName.get('dialect_words')!.body)) {
      if (row.length >= 2 && row[0] && row[1]) spec.names[row[0]] = row[1];
    }
  }

  if (byName.has('dialect_synonyms')) {
    for (const row of extractNestedStringLists(byName.get('dialect_synonyms')!.body)) {
      if (row.length >= 2 && row[0]) spec.synonyms[row[0]] = row.slice(1).filter(Boolean);
    }
  }

  if (byName.has('dialect_operators')) {
    const ops: DialectConstructOp[] = [];
    for (const row of extractNestedStringLists(byName.get('dialect_operators')!.body)) {
      if (row.length >= 3 && row[0] && row[2]) {
        const prec = Number(row[1]);
        ops.push({
          symbol: row[0],
          precedence: Number.isFinite(prec) ? prec : 2,
          fn: row[2],
          ...(row[3] ? { about: row[3] } : {}),
        });
      }
    }
    spec.constructs.operators = ops;
  }

  const customFns: DialectConstructFn[] = [];
  for (const fn of fns) {
    if (RESERVED_DIALECT_FNS.has(fn.name)) continue;
    customFns.push({
      name: fn.name,
      source: fn.source,
      ...(fn.about ? { about: fn.about } : {}),
    });
  }
  spec.constructs.functions = customFns;

  return spec;
}

const COLLECTION_DIVIDER = '# === sdev-dialect ===';

/** Serialize one or more dialects into a single `.sdev` file. */
export function serializeDialectCollectionToSdev(specs: DialectSpec[]): string {
  if (specs.length === 1) return serializeDialectToSdev(specs[0]);
  return specs.map((s) => `${COLLECTION_DIVIDER}\n${serializeDialectToSdev(s)}`).join('\n');
}

/** Parse one or more dialects from a `.sdev` file (or a legacy JSON export). */
export function parseDialectCollection(raw: string): DialectSpec[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Backward-compatible legacy JSON import
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed) as { dialects?: DialectSpec[] } | DialectSpec | DialectSpec[];
    if (Array.isArray(parsed)) return parsed;
    if ('dialects' in parsed && Array.isArray(parsed.dialects)) return parsed.dialects;
    if ('meta' in parsed) return [parsed as DialectSpec];
    return [];
  }

  if (trimmed.includes(COLLECTION_DIVIDER)) {
    return trimmed
      .split(COLLECTION_DIVIDER)
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && isDialectSdevFile(part))
      .map(parseDialectFromSdev);
  }

  return isDialectSdevFile(trimmed) ? [parseDialectFromSdev(trimmed)] : [];
}

/**
 * Read an optional `#!dialect <path-or-slug>` header directive from a program
 * file and return the target plus the source with the directive line removed.
 */
export function extractDialectDirective(source: string): { target: string; stripped: string } | null {
  const lines = source.split('\n');
  const limit = Math.min(lines.length, 10);
  for (let i = 0; i < limit; i++) {
    const m = lines[i].trim().match(/^#!dialect\s+(.+?)\s*$/);
    if (m) {
      const target = m[1].replace(/^["']|["']$/g, '').trim();
      const rest = [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n');
      return { target, stripped: rest };
    }
  }
  return null;
}
