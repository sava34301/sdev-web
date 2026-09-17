/**
 * Extensions — user-authored sdev functions and operators.
 *
 * An extension is plain sdev source. Enabled extensions are cached locally so
 * they work offline, and are wired into the *prelude* of whatever runs: their
 * function bodies are prepended to the program, and any operator they declare
 * is desugared to a call before the untouched toolchain sees the source.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ExtensionRecord {
  id: string;
  name: string;
  kind: 'function' | 'operator';
  symbol: string | null;
  about: string | null;
  source: string;
  visibility?: 'private' | 'unlisted' | 'public';
  /** user id the record was synced from; absent for installed/local ones */
  owner?: string;
}

const CACHE_KEY = 'sdev_extensions_cache';
const ENABLED_KEY = 'sdev_extensions_enabled';

const db = supabase;

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

/** Everything the browser knows about, online or not. */
export function cachedExtensions(): ExtensionRecord[] {
  return readJson<ExtensionRecord[]>(CACHE_KEY, []);
}

export function enabledIds(): string[] {
  return readJson<string[]>(ENABLED_KEY, []);
}

export function setExtensionEnabled(id: string, on: boolean): void {
  const next = new Set(enabledIds());
  if (on) next.add(id); else next.delete(id);
  writeJson(ENABLED_KEY, [...next]);
}

export function isExtensionEnabled(id: string): boolean {
  return enabledIds().includes(id);
}

/** Pull the signed-in user's extensions into the cache, keeping installed
 *  public ones and local (`sdev ext add`) ones — those live only in the cache. */
export async function syncExtensions(userId: string | null): Promise<ExtensionRecord[]> {
  if (!userId) return cachedExtensions();
  try {
    const { data } = await db
      .from('sdev_extensions')
      .select('id, name, kind, symbol, about, source, visibility, user_id')
      .eq('user_id', userId);
    if (Array.isArray(data)) {
      const own = (data as (ExtensionRecord & { user_id?: string })[]).map((e) => ({ ...e, owner: userId }));
      const ownIds = new Set(own.map((e) => e.id));
      // Keep everything not owned by this user (installed public / local);
      // refresh own rows from the server and drop own rows deleted upstream.
      const foreign = cachedExtensions().filter((e) => !ownIds.has(e.id) && e.owner !== userId);
      const merged = [...foreign, ...own];
      writeJson(CACHE_KEY, merged);
      const live = new Set(merged.map((e) => e.id));
      writeJson(ENABLED_KEY, enabledIds().filter((id) => live.has(id)));
      return merged;
    }
  } catch {
    /* offline: the cache is authoritative */
  }
  return cachedExtensions();
}

/** Install someone else's public extension locally (cache only, never their account). */
export function installExtension(ext: ExtensionRecord): void {
  const next = cachedExtensions().filter((e) => e.id !== ext.id);
  writeJson(CACHE_KEY, [...next, ext]);
  setExtensionEnabled(ext.id, true);
}

export function activeExtensions(): ExtensionRecord[] {
  const on = new Set(enabledIds());
  return cachedExtensions().filter((e) => on.has(e.id));
}

/** The sdev source every enabled extension contributes ahead of user code. */
export function extensionPrelude(): string {
  const bodies = activeExtensions().map((e) => e.source.trim()).filter(Boolean);
  return bodies.length ? bodies.join('\n\n') + '\n' : '';
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ATOM = String.raw`(?:[\p{L}\p{N}_]+(?:\([^()]*\))?|"[^"]*")`;

/** `a <sym> b` -> `name(a, b)` for enabled operator extensions. */
export function desugarExtensionOperators(source: string): string {
  const ops = activeExtensions()
    .filter((e) => e.kind === 'operator' && e.symbol)
    .sort((a, b) => (b.symbol!.length - a.symbol!.length));
  if (!ops.length) return source;
  return source
    .split('\n')
    .map((line) => {
      if (/^\s*#/.test(line)) return line;
      let out = line;
      for (const op of ops) {
        const re = new RegExp(`(${ATOM})\\s*${escapeRe(op.symbol!)}\\s*(${ATOM})`, 'gu');
        for (let pass = 0; pass < 8; pass++) {
          const next = out.replace(re, (_m, a, b) => `${op.name}(${a}, ${b})`);
          if (next === out) break;
          out = next;
        }
      }
      return out;
    })
    .join('\n');
}

/** Full wiring: operators desugared, function bodies prepended. */
export function applyExtensions(source: string): string {
  const prelude = extensionPrelude();
  const body = desugarExtensionOperators(source);
  return prelude ? `${prelude}\n${body}` : body;
}
