/**
 * CLI-side view of the same local state the IDE keeps in localStorage:
 * dialects, the active dialect, and the preferred runtime.
 */
import './env';
import { emptyDialect, type DialectSpec } from '@/lang/dialect/spec';

const DIALECTS_KEY = 'sdev_dialects';
const ACTIVE_KEY = 'sdev_active_dialect';
const RUNTIME_KEY = 'sdev_runtime';

export function listDialects(): DialectSpec[] {
  try {
    return JSON.parse(localStorage.getItem(DIALECTS_KEY) ?? '[]') as DialectSpec[];
  } catch {
    return [];
  }
}

export function writeDialects(specs: DialectSpec[]): void {
  localStorage.setItem(DIALECTS_KEY, JSON.stringify(specs));
}

export function saveDialect(spec: DialectSpec): void {
  writeDialects([...listDialects().filter((d) => d.meta.slug !== spec.meta.slug), spec]);
}

export function removeDialect(slug: string): boolean {
  const before = listDialects();
  const after = before.filter((d) => d.meta.slug !== slug);
  writeDialects(after);
  if (activeSlug() === slug) setActiveSlug(null);
  return after.length !== before.length;
}

export function findDialect(slug: string): DialectSpec | null {
  return listDialects().find((d) => d.meta.slug === slug) ?? null;
}

export function newDialect(name: string, slug: string): DialectSpec {
  const spec = emptyDialect({ name, slug });
  saveDialect(spec);
  return spec;
}

export function activeSlug(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveSlug(slug: string | null): void {
  if (slug) localStorage.setItem(ACTIVE_KEY, slug);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function activeDialect(): DialectSpec | null {
  const slug = activeSlug();
  return slug ? findDialect(slug) : null;
}

export function runtimePreference(): 'v1' | 'v2' {
  const v = localStorage.getItem(RUNTIME_KEY);
  return v === 'v2' || v === 'v2-wasm' ? 'v2' : 'v1';
}

export function setRuntimePreference(rt: 'v1' | 'v2'): void {
  localStorage.setItem(RUNTIME_KEY, rt);
}
