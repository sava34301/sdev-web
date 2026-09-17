/**
 * Library registry client.
 *
 * `use "@user/lib@1.2.0"` resolves through here: fetch once, cache locally,
 * and keep working offline. Bundles can be exported to disk for the native
 * CLI and the desktop IDE.
 */
import { supabase } from '@/integrations/supabase/client';
import { parseAddress, formatAddress, type Address } from './address';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const CACHE_KEY = 'sdev_library_cache';

export interface LibraryBundle {
  address: string;
  version: string;
  /** module path -> sdev source */
  modules: Record<string, string>;
  fetchedAt: number;
}

type Cache = Record<string, LibraryBundle>;

function readCache(): Cache {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Cache; } catch { return {}; }
}

function writeCache(cache: Cache): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function cachedLibraries(): LibraryBundle[] {
  return Object.values(readCache());
}

export function cacheBundle(bundle: LibraryBundle): void {
  const cache = readCache();
  cache[bundle.address] = bundle;
  writeCache(cache);
}

export function forgetBundle(address: string): void {
  const cache = readCache();
  delete cache[address];
  writeCache(cache);
}

/** Every `use "@user/lib[@version]"` in a source file. */
export function libraryReferences(source: string): Address[] {
  const refs: Address[] = [];
  const re = /\buse\s+"(@[^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const address = parseAddress(m[1]);
    if (address) refs.push(address);
  }
  return refs;
}

/** Fetch a published library version, falling back to the offline cache. */
export async function fetchLibrary(address: Address): Promise<LibraryBundle> {
  const key = formatAddress(address);
  const cache = readCache();
  try {
    const { data: owner } = await db.from('usernames').select('user_id').eq('username', address.username).maybeSingle();
    if (!owner) throw new Error(`No user named @${address.username}.`);
    const { data: lib } = await db.from('libraries').select('id, latest_version').eq('user_id', owner.user_id).eq('slug', address.slug).maybeSingle();
    if (!lib) throw new Error(`No library ${key}.`);
    const version = address.version ?? lib.latest_version;
    const { data: ver } = await db.from('library_versions').select('version, modules').eq('library_id', lib.id).eq('version', version).maybeSingle();
    if (!ver) throw new Error(`${key} has no version ${version}.`);
    const bundle: LibraryBundle = { address: key, version: ver.version, modules: ver.modules ?? {}, fetchedAt: Date.now() };
    cacheBundle(bundle);
    return bundle;
  } catch (e) {
    const offline = cache[key] ?? cache[formatAddress({ ...address, version: null })];
    if (offline) return offline;
    throw e instanceof Error ? e : new Error(`Could not resolve ${key}.`);
  }
}

/**
 * Module map for a program: every referenced library's modules keyed both by
 * their address form and by their plain path, so `use` resolves either way.
 */
export async function resolveLibraries(source: string): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const ref of libraryReferences(source)) {
    try {
      const bundle = await fetchLibrary(ref);
      const bare = `@${ref.username}/${ref.slug}`;
      for (const [path, code] of Object.entries(bundle.modules)) {
        map[path] = code;
        map[`${bare}/${path}`] = code;
      }
      const entry = bundle.modules['main.sdev'] ?? Object.values(bundle.modules)[0];
      if (entry) {
        map[bare] = entry;
        map[`${bare}@${bundle.version}`] = entry;
      }
    } catch {
      /* leave unresolved — the compiler reports the missing module */
    }
  }
  return map;
}

/** A single downloadable file containing every cached library. */
export function exportOfflineBundle(): string {
  return JSON.stringify({ format: 'sdev-offline-libraries', version: 1, libraries: cachedLibraries() }, null, 2);
}

export function importOfflineBundle(json: string): number {
  const parsed = JSON.parse(json) as { libraries?: LibraryBundle[] };
  const libs = parsed.libraries ?? [];
  for (const bundle of libs) cacheBundle(bundle);
  return libs.length;
}
