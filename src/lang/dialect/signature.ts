/**
 * The invisible file signature.
 *
 * Every sdev file the IDE saves carries one leading marker line that records
 * the runtime, the dialect it was written in, pinned libraries and a checksum
 * of the body. The lexer sees an ordinary comment; the IDE sees metadata and
 * hides the line from the editor.
 *
 * Shape (one line, opaque on purpose):
 *   #⟨sdev⟩ <base64url payload>
 */

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
  /** fnv-1a checksum of the body, hex */
  sum?: string;
  /** last write, epoch ms */
  ts?: number;
}

export const SIGNATURE_PREFIX = '#\u27E8sdev\u27E9 ';
const SIGNATURE_RE = /^#\u27E8sdev\u27E9\s+(\S+)\s*$/;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function checksum(body: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < body.length; i++) {
    h ^= body.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Does this text start with a signature line? */
export function hasSignature(source: string): boolean {
  return SIGNATURE_RE.test(source.split('\n', 1)[0] ?? '');
}

/** Read the signature, or null for a plain canonical file. */
export function readSignature(source: string): FileSignature | null {
  const first = source.split('\n', 1)[0] ?? '';
  const m = first.match(SIGNATURE_RE);
  if (!m) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(m[1])) as FileSignature;
    return parsed && parsed.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

/** The file without its signature line — what the editor shows and the compiler runs. */
export function stripSignature(source: string): string {
  if (!hasSignature(source)) return source;
  const idx = source.indexOf('\n');
  return idx === -1 ? '' : source.slice(idx + 1);
}

/** Write (or repair) the signature on a file. */
export function writeSignature(source: string, sig: Omit<FileSignature, 'v' | 'sum' | 'ts'>): string {
  const body = stripSignature(source);
  const full: FileSignature = {
    v: 1,
    ...sig,
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
