// Offline library storage is independent of the dialect execution engine.
const CACHE_KEY = 'sdev_library_cache';

export interface LibraryBundle {
  address: string;
  version: string;
  /** module path -> sdev source */
  modules: Record<string, string>;
  fetchedAt: number;
}

export type Cache = Record<string, LibraryBundle>;

export function readCache(): Cache {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Cache; } catch { return {}; }
}

export function writeCache(cache: Cache): void {
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

