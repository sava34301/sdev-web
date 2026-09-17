import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { emptyDialect, isPublishable, type DialectSpec } from '@/lang/dialect/spec';
import { parseReference } from '@/lang/dialect/address';

const LOCAL_KEY = 'sdev_dialects';
const ACTIVE_KEY = 'sdev_active_dialect';

/* The dialect tables ship with this draft; the generated types lag behind it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function readLocalDialects(): DialectSpec[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as DialectSpec[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalDialects(specs: DialectSpec[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(specs));
}

export function getActiveDialectSlug(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveDialectSlug(slug: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (slug) localStorage.setItem(ACTIVE_KEY, slug);
  else localStorage.removeItem(ACTIVE_KEY);
}

/** The dialect a file should be read/written with, or null for canonical sdev. */
export function getActiveDialect(): DialectSpec | null {
  const slug = getActiveDialectSlug();
  if (!slug) return null;
  return readLocalDialects().find((d) => d.meta.slug === slug) ?? null;
}

export function findLocalDialect(slug: string): DialectSpec | null {
  return readLocalDialects().find((d) => d.meta.slug === slug) ?? null;
}

export function useDialects() {
  const { user } = useAuth();
  const [dialects, setDialects] = useState<DialectSpec[]>(() => readLocalDialects());
  const [activeSlug, setActive] = useState<string | null>(() => getActiveDialectSlug());
  const [syncing, setSyncing] = useState(false);

  const persist = useCallback((next: DialectSpec[]) => {
    setDialects(next);
    writeLocalDialects(next);
  }, []);

  /** Pull the signed-in user's cloud dialects and merge them in. */
  const refresh = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { data } = await db.from('dialects').select('slug, spec').eq('user_id', user.id);
      if (Array.isArray(data) && data.length) {
        const cloud = data.map((row: { spec: DialectSpec }) => row.spec).filter(Boolean);
        const bySlug = new Map<string, DialectSpec>();
        for (const spec of [...readLocalDialects(), ...cloud]) bySlug.set(spec.meta.slug, spec);
        persist([...bySlug.values()]);
      }
    } catch {
      /* tables arrive with the draft; local storage keeps working meanwhile */
    } finally {
      setSyncing(false);
    }
  }, [user, persist]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback((name: string, slug: string) => {
    const spec = emptyDialect({ name, slug });
    persist([...readLocalDialects().filter((d) => d.meta.slug !== slug), spec]);
    return spec;
  }, [persist]);

  const save = useCallback(async (spec: DialectSpec) => {
    const next = readLocalDialects().filter((d) => d.meta.slug !== spec.meta.slug);
    persist([...next, spec]);
    if (!user) return;
    try {
      await db.from('dialects').upsert({
        user_id: user.id,
        slug: spec.meta.slug,
        name: spec.meta.name,
        description: spec.meta.description ?? '',
        languages: spec.meta.languages,
        visibility: spec.meta.visibility,
        extends_slug: spec.meta.extends,
        latest_version: spec.meta.version,
        spec,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,slug' });
    } catch {
      /* offline / pre-migration: the local copy is authoritative */
    }
  }, [user, persist]);

  const publish = useCallback(async (spec: DialectSpec) => {
    if (!isPublishable(spec)) throw new Error('Fix the validation errors before publishing.');
    const published: DialectSpec = { ...spec, meta: { ...spec.meta, visibility: spec.meta.visibility === 'private' ? 'public' : spec.meta.visibility } };
    await save(published);
    if (!user) return published;
    try {
      const { data } = await db.from('dialects').select('id').eq('user_id', user.id).eq('slug', published.meta.slug).maybeSingle();
      if (data?.id) {
        await db.from('dialect_versions').insert({ dialect_id: data.id, version: published.meta.version, spec: published });
      }
    } catch { /* pre-migration */ }
    return published;
  }, [save, user]);

  const remove = useCallback(async (slug: string) => {
    persist(readLocalDialects().filter((d) => d.meta.slug !== slug));
    if (getActiveDialectSlug() === slug) { setActiveDialectSlug(null); setActive(null); }
    if (!user) return;
    try { await db.from('dialects').delete().eq('user_id', user.id).eq('slug', slug); } catch { /* pre-migration */ }
  }, [user, persist]);

  /** Fetch someone else's dialect by @user/slug or share code and install it locally. */
  const install = useCallback(async (reference: string) => {
    const parsed = parseReference(reference);
    if (!parsed) throw new Error('Use @username/dialect or an 8-character share code.');
    let row: { spec: DialectSpec } | null = null;
    if (parsed.kind === 'code') {
      const { data } = await db.from('dialects').select('spec').eq('share_code', parsed.code).maybeSingle();
      row = data;
    } else {
      const { data: owner } = await db.from('usernames').select('user_id').eq('username', parsed.address.username).maybeSingle();
      if (!owner) throw new Error(`No user named @${parsed.address.username}.`);
      const { data } = await db.from('dialects').select('spec').eq('user_id', owner.user_id).eq('slug', parsed.address.slug).maybeSingle();
      row = data;
    }
    if (!row?.spec) throw new Error('That dialect is not available.');
    persist([...readLocalDialects().filter((d) => d.meta.slug !== row!.spec.meta.slug), row.spec]);
    return row.spec;
  }, [persist]);

  const activate = useCallback((slug: string | null) => {
    setActiveDialectSlug(slug);
    setActive(slug);
  }, []);

  const active = activeSlug ? dialects.find((d) => d.meta.slug === activeSlug) ?? null : null;

  return { dialects, active, activeSlug, syncing, create, save, publish, remove, install, activate, refresh };
}
