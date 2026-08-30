/**
 * Addressing for dialects, extensions and libraries.
 *   @username/slug          — human address
 *   @username/slug@1.2.0    — pinned version
 *   8-character share code  — paste-friendly
 */

export interface Address {
  username: string;
  slug: string;
  version: string | null;
}

const ADDRESS_RE = /^@([a-z0-9][a-z0-9-]{0,30})\/([a-z0-9][a-z0-9-]{0,38})(?:@(\d+\.\d+\.\d+))?$/;
const SHARE_CODE_RE = /^[0-9a-f]{8}$/;

export function parseAddress(input: string): Address | null {
  const m = input.trim().match(ADDRESS_RE);
  if (!m) return null;
  return { username: m[1], slug: m[2], version: m[3] ?? null };
}

export function formatAddress(a: Address): string {
  return `@${a.username}/${a.slug}${a.version ? `@${a.version}` : ''}`;
}

export function isShareCode(input: string): boolean {
  return SHARE_CODE_RE.test(input.trim().toLowerCase());
}

/** Accepts either form and reports what it is. */
export function parseReference(input: string): { kind: 'address'; address: Address } | { kind: 'code'; code: string } | null {
  const trimmed = input.trim();
  const address = parseAddress(trimmed);
  if (address) return { kind: 'address', address };
  if (isShareCode(trimmed)) return { kind: 'code', code: trimmed.toLowerCase() };
  return null;
}
