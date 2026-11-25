import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { emptyDialect, isPublishable, type DialectSpec } from '@/lang/dialect/spec';
import { getStoredString, loadJson, saveJson, setStoredString } from '@/lib/storage';

const LOCAL_KEY = 'sdev_dialects';
const ACTIVE_KEY = 'sdev_active_dialect';

export function readLocalDialects(): DialectSpec[] {
  return loadJson<DialectSpec[]>(LOCAL_KEY, []);
}

export function writeLocalDialects(specs: DialectSpec[]): void {
  saveJson(LOCAL_KEY, specs);
}

export function getActiveDialectSlug(): string | null {
  return getStoredString(ACTIVE_KEY);
}

export function setActiveDialectSlug(slug: string | null): void {
  setStoredString(ACTIVE_KEY, slug);
}

export function getActiveDialect(): DialectSpec | null {
  const slug = getActiveDialectSlug();
  if (!slug) return null;
  return readLocalDialects().find((d) => d.meta.slug === slug) ?? null;
}

export function findLocalDialect(slug: string): DialectSpec | null {
  return readLocalDialects().find((d) => d.meta.slug === slug) ?? null;
}

export interface DialectsContextValue {
  dialects: DialectSpec[];
  active: DialectSpec | null;
  activeSlug: string | null;
  syncing: boolean;
  create: (meta: Partial<DialectSpec['meta']>, base?: DialectSpec) => Promise<{ spec: DialectSpec; saved: boolean; cloud: boolean; error: string | null }>;
  save: (spec: DialectSpec) => Promise<{ saved: boolean; cloud: boolean; error: string | null }>;
  publish: (spec: DialectSpec) => Promise<DialectSpec>;
  remove: (slug: string) => Promise<void>;
  install: (reference: string) => Promise<DialectSpec>;
  activate: (slug: string | null) => void;
  refresh: () => Promise<void>;
}

const DialectsContext = createContext<DialectsContextValue | null>(null);

export function useStandaloneDialects(enabled = true): DialectsContextValue {
  const { user } = useAuth();
  const [dialects, setDialects] = useState<DialectSpec[]>(() => (enabled ? readLocalDialects() : []));
  const [activeSlug, setActive] = useState<string | null>(() => (enabled ? getActiveDialectSlug() : null));
  const [syncing, setSyncing] = useState(false);

  const persist = useCallback((next: DialectSpec[]) => {
    setDialects(next);
    writeLocalDialects(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || !user) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.from('dialects').select('slug, spec').eq('user_id', user.id);
      if (error) throw error;
      if (Array.isArray(data) && data.length) {
        const cloud = data.map((row) => row.spec as unknown as DialectSpec).filter(Boolean);
        const bySlug = new Map<string, DialectSpec>();
        for (const spec of [...readLocalDialects(), ...cloud]) bySlug.set(spec.meta.slug, spec);
        persist([...bySlug.values()]);
      }
    } catch {
      /* local storage stays authoritative when offline */
    } finally {
      setSyncing(false);
    }
  }, [enabled, user, persist]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  const save = useCallback(async (spec: DialectSpec) => {
    const next = readLocalDialects().filter((d) => d.meta.slug !== spec.meta.slug);
    persist([...next, spec]);
    if (!user) return { saved: true, cloud: false as const, error: null as string | null };
    try {
      const { error } = await supabase.from('dialects').upsert({
        user_id: user.id,
        slug: spec.meta.slug,
        name: spec.meta.name,
        description: spec.meta.description ?? '',
        languages: spec.meta.languages,
        visibility: spec.meta.visibility,
        extends_slug: spec.meta.extends,
        latest_version: spec.meta.version,
        spec: spec as unknown as Json,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,slug' });
      if (error) return { saved: true, cloud: false as const, error: error.message };
      return { saved: true, cloud: true as const, error: null };
    } catch (e) {
      return { saved: true, cloud: false as const, error: e instanceof Error ? e.message : 'offline' };
    }
  }, [user, persist]);

  const create = useCallback(async (meta: Partial<DialectSpec['meta']>, base?: DialectSpec) => {
    const blank = emptyDialect(meta);
    const spec: DialectSpec = base
      ? { ...structuredClone(base), meta: { ...structuredClone(base).meta, ...blank.meta } }
      : blank;
    const result = await save(spec);
    return { spec, ...result };
  }, [save]);

  const publish = useCallback(async (spec: DialectSpec) => {
    if (!isPublishable(spec)) throw new Error('Fix the validation errors before publishing.');
    const published: DialectSpec = { ...spec, meta: { ...spec.meta, visibility: spec.meta.visibility === 'private' ? 'public' : spec.meta.visibility } };
    await save(published);
    if (!user) return published;
    try {
      const { data, error } = await supabase.from('dialects').select('id').eq('user_id', user.id).eq('slug', published.meta.slug).maybeSingle();
      if (error) throw error;
      if (data?.id) {
        const { error: verError } = await supabase.from('dialect_versions').insert({
          dialect_id: data.id,
          version: published.meta.version,
          spec: published as unknown as Json,
        });
        if (verError) throw verError;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record dialect version');
    }
    return published;
  }, [save, user]);

  const remove = useCallback(async (slug: string) => {
    persist(readLocalDialects().filter((d) => d.meta.slug !== slug));
    if (getActiveDialectSlug() === slug) { setActiveDialectSlug(null); setActive(null); }
    if (!user) return;
    try {
      const { error } = await supabase.from('dialects').delete().eq('user_id', user.id).eq('slug', slug);
      if (error) throw error;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete dialect from cloud');
    }
  }, [user, persist]);

  const install = useCallback(async (reference: string) => {
    const { parseReference } = await import('@/lang/dialect/address');
    const parsed = parseReference(reference);
    if (!parsed) throw new Error('Use @username/dialect or an 8-character share code.');
    let rawSpec: Json | null = null;
    if (parsed.kind === 'code') {
      const { data } = await supabase.from('dialects').select('spec').eq('share_code', parsed.code).maybeSingle();
      rawSpec = data?.spec ?? null;
    } else {
      const { data: owner } = await supabase.from('usernames').select('user_id').eq('username', parsed.address.username).maybeSingle();
      if (!owner) throw new Error(`No user named @${parsed.address.username}.`);
      const { data } = await supabase.from('dialects').select('spec').eq('user_id', owner.user_id).eq('slug', parsed.address.slug).maybeSingle();
      rawSpec = data?.spec ?? null;
    }
    const spec = rawSpec as unknown as DialectSpec | null;
    if (!spec) throw new Error('That dialect is not available.');
    persist([...readLocalDialects().filter((d) => d.meta.slug !== spec.meta.slug), spec]);
    return spec;
  }, [persist]);

  const activate = useCallback((slug: string | null) => {
    setActiveDialectSlug(slug);
    setActive(slug);
  }, []);

  const active = activeSlug ? dialects.find((d) => d.meta.slug === activeSlug) ?? null : null;

  return useMemo(
    () => ({ dialects, active, activeSlug, syncing, create, save, publish, remove, install, activate, refresh }),
    [dialects, active, activeSlug, syncing, create, save, publish, remove, install, activate, refresh],
  );
}

export function DialectsProvider({ children }: { children: ReactNode }) {
  const value = useStandaloneDialects();
  return <DialectsContext.Provider value={value}>{children}</DialectsContext.Provider>;
}

export function useDialectsContext(): DialectsContextValue | null {
  return useContext(DialectsContext);
}
