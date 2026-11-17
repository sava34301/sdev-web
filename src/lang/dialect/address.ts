/**
 * Addressing for dialects, extensions and libraries.
 *   @username/slug          — human address
 *   @username/slug@1.2.0    — pinned version
 *   8-character share code  — paste-friendly
 */

import { getDialectRunner } from './dialect-runner';

export interface Address {
  username: string;
  slug: string;
  version: string | null;
}

export function parseAddress(input: string): Address | null {
  const res = getDialectRunner().call('dialect_parse_address', input) as string[];
  if (!res || res.length === 0) return null;
  return { username: res[0], slug: res[1], version: res[2] ? res[2] : null };
}

export function formatAddress(a: Address): string {
  return getDialectRunner().callStr('dialect_format_address', a.username, a.slug, a.version ?? '');
}

export function isShareCode(input: string): boolean {
  return Number(getDialectRunner().call('dialect_is_share_code', input)) === 1;
}

/** Accepts either form and reports what it is. */
export function parseReference(input: string): { kind: 'address'; address: Address } | { kind: 'code'; code: string } | null {
  const trimmed = input.trim();
  const address = parseAddress(trimmed);
  if (address) return { kind: 'address', address };
  if (isShareCode(trimmed)) return { kind: 'code', code: trimmed.toLowerCase() };
  return null;
}
