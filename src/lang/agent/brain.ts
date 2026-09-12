/**
 * The AI brain.
 *
 * Two interchangeable implementations, both optional:
 *   online — the `sdev-agent` edge function on the website (Lovable AI).
 *   local  — an HTTP model endpoint on the user's own machine
 *            (SDEV_AGENT_LOCAL_URL, default http://localhost:11434/sdev-agent).
 *
 * The brain never runs the user's code and never sees anything but the source
 * it is asked to canonicalize. Rules + memory always work without it.
 */
import type { BrainMode } from './directives';

export interface BrainRequest {
  /** the user's original source */
  source: string;
  /** what the rule engine already produced */
  draft: string;
  /** 1-based lines the rules could not resolve */
  unresolved: number[];
  /** words this user is known to use, canonical -> their spelling */
  vocabulary: Record<string, string>;
}

export interface BrainReply {
  canonical: string;
  words?: Record<string, string>;
  notes?: string;
}

export const DEFAULT_LOCAL_URL = 'http://127.0.0.1:11434/sdev-agent';

function localUrlFromEnv(): string | null {
  try {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    return env?.SDEV_AGENT_LOCAL_URL ?? null;
  } catch {
    return null;
  }
}

export function online(): boolean {
  const nav = (globalThis as { navigator?: { onLine?: boolean } }).navigator;
  return nav?.onLine ?? true;
}

async function callLocal(req: BrainRequest, url: string): Promise<BrainReply | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as BrainReply;
    return typeof json?.canonical === 'string' ? json : null;
  } catch {
    return null;
  }
}

async function callOnline(req: BrainRequest): Promise<BrainReply | null> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase.functions.invoke('sdev-agent', { body: req });
    if (error) return null;
    const reply = data as BrainReply;
    return typeof reply?.canonical === 'string' ? reply : null;
  } catch {
    return null;
  }
}

export interface BrainOutcome {
  reply: BrainReply | null;
  used: 'none' | 'local' | 'online';
}

/**
 * Ask whichever brain is reachable. `auto` prefers the website when there is
 * internet and falls back to the user's own machine when there is not.
 */
export async function think(req: BrainRequest, mode: BrainMode, localUrl?: string): Promise<BrainOutcome> {
  if (mode === 'none') return { reply: null, used: 'none' };
  const url = localUrl ?? localUrlFromEnv() ?? DEFAULT_LOCAL_URL;

  if (mode === 'local') {
    const reply = await callLocal(req, url);
    return { reply, used: reply ? 'local' : 'none' };
  }
  if (mode === 'online') {
    const reply = await callOnline(req);
    return { reply, used: reply ? 'online' : 'none' };
  }

  if (online()) {
    const reply = await callOnline(req);
    if (reply) return { reply, used: 'online' };
  }
  const reply = await callLocal(req, url);
  return { reply, used: reply ? 'local' : 'none' };
}
