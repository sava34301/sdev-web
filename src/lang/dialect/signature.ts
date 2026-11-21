/**
 * The invisible file signature.
 *
 * Every sdev file the IDE saves carries one leading marker line that records
 * the runtime, the dialect it was written in, pinned libraries, a checksum of
 * the body, and — when the understander or translator rewrote the file — a
 * compact instruction recipe that deterministically reproduces the exact
 * canonical sdev output from the written body.
 *
 * The lexer sees an ordinary comment; the IDE sees metadata and hides the
 * line from the editor.
 *
 * Shape (one line, opaque on purpose):
 *   #⟨sdev⟩ <base64url payload>
 */

/**
 * One deterministic line-edit instruction relative to the written body:
 *   [startLine, deleteCount]             -> delete lines [startLine .. startLine + deleteCount)
 *   [startLine, deleteCount, insertText] -> replace those lines with insertText (joined by '\n')
 *
 * Ops are stored in ascending order of `startLine` (referencing the original
 * written body's 0-based line indices).
 */
export type TranslationOp = [startLine: number, deleteCount: number, insertText?: string];

export interface FileSignature {
  /** signature format version */
  v: 1;
  /** runtime the file targets: "v1" | "v2" */
  rt: string;
  /** dialect address, e.g. "@sava/bulgarski" — null means canonical sdev */
  dialect: string | null;
  /** dialect version the file was written against */
  dialectVersion?: string | null;
  /** library pins, e.g. ["@sava/matrixkit@1.2.0"] */
  libs?: string[];
  /** dialect this file was translated from, if any */
  origin?: string | null;
  /**
   * Compact instruction recipe that transforms the written body into the exact
   * canonical sdev output. Preferred over embedding the full `translated` text.
   */
  recipe?: TranslationOp[] | null;
  /**
   * Canonical sdev translation produced by the understander / translator.
   * On write, automatically encoded as `recipe` whenever smaller; on read,
   * reconstructed transparently from `recipe` when present.
   */
  translated?: string | null;
  /** Which brain produced the stored reading ('none' | 'local' | 'online') */
  brain?: 'none' | 'local' | 'online' | null;
  /** Detected human language when translated from a non-English script */
  lang?: string | null;
  /** fnv-1a checksum of the body, hex */
  sum?: string;
  /** last write, epoch ms */
  ts?: number;
}

export const SIGNATURE_PREFIX = '#\u27E8sdev\u27E9 ';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * 32-bit FNV-1a checksum matching `dialect_fnv1a_hex` in `lang/dialect/dialect.sdev`.
 * Runs natively in JS so opening or editing files in the IDE never boots the
 * SDEV tree-walking interpreter on the UI thread.
 */
export function checksum(body: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < body.length; i++) {
    h ^= body.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Build a minimal list of line-edit instructions that transforms `writtenBody`
 * into the exact `translatedSource` string.
 */
export function buildTranslationRecipe(writtenBody: string, translatedSource: string): TranslationOp[] {
  if (writtenBody === translatedSource) return [];
  const a = writtenBody.split('\n');
  const b = translatedSource.split('\n');

  // Trim identical prefix and suffix lines first (O(n))
  let prefix = 0;
  const minLen = Math.min(a.length, b.length);
  while (prefix < minLen && a[prefix] === b[prefix]) prefix++;

  let suffix = 0;
  while (
    suffix < minLen - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix++;
  }

  const aMidEnd = a.length - suffix;
  const bMidEnd = b.length - suffix;

  // Within the changed middle region, split into smaller hunks wherever
  // unchanged lines still align (greedy lookahead keeps it O(n) even on large files).
  const ops: TranslationOp[] = [];
  let ai = prefix;
  let bi = prefix;

  const pushOp = (start: number, del: number, insLines: string[]) => {
    if (del === 0 && insLines.length === 0) return;
    if (insLines.length === 0) ops.push([start, del]);
    else ops.push([start, del, insLines.join('\n')]);
  };

  // Index occurrences of lines in b[bi..bMidEnd) for fast anchor lookup
  const bIndex = new Map<string, number[]>();
  for (let j = bi; j < bMidEnd; j++) {
    const line = b[j];
    let arr = bIndex.get(line);
    if (!arr) { arr = []; bIndex.set(line, arr); }
    if (arr.length < 16) arr.push(j);
  }

  while (ai < aMidEnd || bi < bMidEnd) {
    if (ai < aMidEnd && bi < bMidEnd && a[ai] === b[bi]) {
      ai++;
      bi++;
      continue;
    }
    const hunkAStart = ai;
    const hunkBStart = bi;
    // Search forward up to 32 lines for the next matching anchor line
    let foundA = -1;
    let foundB = -1;
    let bestDist = Infinity;
    const scanLimit = Math.min(aMidEnd, ai + 32);
    for (let i = ai; i < scanLimit; i++) {
      const candidates = bIndex.get(a[i]);
      if (!candidates) continue;
      for (const j of candidates) {
        if (j < bi) continue;
        if (j - bi > 32) break;
        const dist = (i - ai) + (j - bi);
        if (dist < bestDist) {
          bestDist = dist;
          foundA = i;
          foundB = j;
        }
        break;
      }
      if (bestDist <= 2) break;
    }

    if (foundA >= 0 && foundB >= 0) {
      pushOp(hunkAStart, foundA - hunkAStart, b.slice(hunkBStart, foundB));
      ai = foundA;
      bi = foundB;
    } else {
      pushOp(hunkAStart, aMidEnd - hunkAStart, b.slice(hunkBStart, bMidEnd));
      ai = aMidEnd;
      bi = bMidEnd;
    }
  }

  return ops;
}

/**
 * Replay a translation recipe on `writtenBody` to deterministically reproduce
 * the exact canonical sdev output.
 */
export function applyTranslationRecipe(writtenBody: string, recipe: TranslationOp[]): string {
  if (!recipe.length) return writtenBody;
  const lines = writtenBody.split('\n');
  const out: string[] = [];
  let cursor = 0;

  for (const op of recipe) {
    const [start, del, insertText] = op;
    if (start > cursor) {
      for (let i = cursor; i < Math.min(start, lines.length); i++) out.push(lines[i]);
    }
    if (insertText !== undefined) {
      const inserted = insertText.split('\n');
      for (let i = 0; i < inserted.length; i++) out.push(inserted[i]);
    }
    cursor = Math.max(cursor, start + del);
  }
  for (let i = cursor; i < lines.length; i++) out.push(lines[i]);
  return out.join('\n');
}

/** Does this text start with a signature line? */
export function hasSignature(source: string): boolean {
  return source.startsWith(SIGNATURE_PREFIX);
}

/** The file without its signature line — what the editor shows and the compiler runs. */
export function stripSignature(source: string): string {
  if (!source.startsWith(SIGNATURE_PREFIX)) return source;
  const nl = source.indexOf('\n');
  return nl < 0 ? '' : source.slice(nl + 1);
}

/** Read the signature, or null for a plain canonical file. */
export function readSignature(source: string): FileSignature | null {
  if (!source.startsWith(SIGNATURE_PREFIX)) return null;
  const nl = source.indexOf('\n');
  const first = nl < 0 ? source : source.slice(0, nl);
  const payload = first.slice(SIGNATURE_PREFIX.length).trim();
  if (!payload) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as FileSignature;
    if (!parsed || parsed.v !== 1) return null;
    // Reconstruct `translated` from compact `recipe` transparently when present
    if (!parsed.translated && Array.isArray(parsed.recipe) && parsed.recipe.length > 0) {
      const body = nl < 0 ? '' : source.slice(nl + 1);
      parsed.translated = applyTranslationRecipe(body, parsed.recipe);
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Write (or repair) the signature on a file. */
export function writeSignature(source: string, sig: Omit<FileSignature, 'v' | 'sum' | 'ts'>): string {
  const body = stripSignature(source);
  const { translated, recipe: explicitRecipe, ...rest } = sig;

  let recipe: TranslationOp[] | undefined;
  let rawTranslated: string | undefined;

  if (explicitRecipe && explicitRecipe.length > 0) {
    recipe = explicitRecipe;
  } else if (translated && translated !== body) {
    const built = buildTranslationRecipe(body, translated);
    // Verify 100% lossless round-trip; use recipe whenever it is compact and exact
    if (built.length > 0 && applyTranslationRecipe(body, built) === translated) {
      recipe = built;
    } else {
      rawTranslated = translated;
    }
  }

  const full: FileSignature = {
    v: 1,
    ...rest,
    ...(recipe ? { recipe } : {}),
    ...(rawTranslated ? { translated: rawTranslated } : {}),
    sum: checksum(body),
    ts: Date.now(),
  };
  return `${SIGNATURE_PREFIX}${toBase64Url(JSON.stringify(full))}\n${body}`;
}

/** True when the body no longer matches the recorded checksum. */
export function isSignatureStale(source: string): boolean {
  const sig = readSignature(source);
  if (!sig || !sig.sum) return false;
  return checksum(stripSignature(source)) !== sig.sum;
}

/** Re-stamp a damaged or stale signature while keeping its metadata. */
export function repairSignature(source: string): string {
  const sig = readSignature(source);
  if (!sig) return source;
  const { v: _v, sum: _sum, ts: _ts, ...rest } = sig;
  return writeSignature(source, rest);
}
