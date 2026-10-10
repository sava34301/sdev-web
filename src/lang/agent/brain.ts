/**
 * The AI brain.
 *
 * Two interchangeable implementations, both optional:
 *   online — the `sdev-agent` edge function on the website (Lovable AI).
 *   local  — a model running on the user's own computer (Ollama, LM Studio,
 *            llama.cpp — anything with an OpenAI-style chat endpoint), or a
 *            custom endpoint that speaks BrainRequest/BrainReply directly.
 *            Free: it never touches the website's AI credits.
 *
 *   browser — a small coding model running inside the browser itself
 *            (browser-brain.ts, WebGPU). Nothing to install; this is what
 *            `auto` uses first on the website.
 *
 * `auto` only uses the computer's model (browser first, then a local app). The website's AI is used only when
 * the user turns it on (IDE setting, or `!#agent:online` in the file).
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
  /** what went wrong with the previous attempt: unknown names, parse or runtime errors */
  problems?: string[];
  /** 'ai': answer in sdev:ai (explicit { } blocks, fewer tokens) — used when writing whole programs */
  format?: 'canonical' | 'ai';
}

export interface BrainReply {
  canonical: string;
  words?: Record<string, string>;
  notes?: string;
}

/** Ollama's OpenAI-compatible endpoint; LM Studio uses :1234, llama.cpp :8080 */
export const DEFAULT_LOCAL_URL = 'http://127.0.0.1:11434/v1/chat/completions';
export const DEFAULT_LOCAL_MODEL = 'qwen2.5-coder:7b';

function env(name: string): string | null {
  try {
    const e = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    return e?.[name] ?? null;
  } catch {
    return null;
  }
}
function stored(key: string): string | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(key); } catch { return null; }
}

/** Settings for the brain, from the IDE (localStorage) or the CLI (environment). */
export interface BrainSettings {
  localUrl: string;
  localModel: string;
  /** may the website's AI (which uses credits) be used? */
  allowOnline: boolean;
}
export const BRAIN_KEYS = { url: 'sdev_agent_local_url', model: 'sdev_agent_local_model', online: 'sdev_agent_online' } as const;

export function brainSettings(): BrainSettings {
  return {
    localUrl: stored(BRAIN_KEYS.url) || env('SDEV_AGENT_LOCAL_URL') || DEFAULT_LOCAL_URL,
    localModel: stored(BRAIN_KEYS.model) || env('SDEV_AGENT_LOCAL_MODEL') || DEFAULT_LOCAL_MODEL,
    allowOnline: (stored(BRAIN_KEYS.online) ?? env('SDEV_AGENT_ONLINE') ?? '') === '1',
  };
}

export function online(): boolean {
  const nav = (globalThis as { navigator?: { onLine?: boolean } }).navigator;
  return nav?.onLine ?? true;
}

function parseReply(text: string): BrainReply | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    const j = JSON.parse(cleaned) as BrainReply;
    if (typeof j?.canonical === 'string') return j;
  } catch { /* the model answered with bare code */ }
  const code = cleaned.replace(/^```\w*\s*/, '').replace(/```\s*$/, '');
  return code.trim() ? { canonical: code } : null;
}

async function callLocal(req: BrainRequest, url: string, model: string): Promise<BrainReply | null> {
  try {
    // A custom endpoint that speaks the brain protocol directly.
    if (!/\/chat\/completions\/?$|\/api\/chat\/?$/.test(url)) {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) });
      if (!res.ok) return null;
      const json = (await res.json()) as BrainReply;
      return typeof json?.canonical === 'string' ? json : null;
    }
    const { brainInstructions, brainInput } = await import('./brain-prompt');
    const messages = [
      { role: 'system', content: brainInstructions(req.format) + '\n\nAnswer with JSON only: {"canonical": "<the whole program>", "notes": "<one short sentence>"}' },
      { role: 'user', content: brainInput(req) },
    ];
    const ollama = /\/api\/chat\/?$/.test(url);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollama
        ? { model, messages, stream: false, format: 'json' }
        : { model, messages, stream: false, response_format: { type: 'json_object' } }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { choices?: { message?: { content?: string } }[]; message?: { content?: string } };
    const text = json.choices?.[0]?.message?.content ?? json.message?.content ?? '';
    return parseReply(text);
  } catch {
    return null;
  }
}

/** Is a model reachable on this computer? Returns its model names, or null. */
export async function probeLocal(url = brainSettings().localUrl): Promise<string[] | null> {
  try {
    const base = url.replace(/\/v1\/chat\/completions\/?$|\/api\/chat\/?$/, '');
    const res = await fetch(base + '/v1/models');
    if (res.ok) {
      const j = await res.json() as { data?: { id: string }[] };
      return (j.data ?? []).map((m) => m.id);
    }
    const tags = await fetch(base + '/api/tags');
    if (!tags.ok) return null;
    const t = await tags.json() as { models?: { name: string }[] };
    return (t.models ?? []).map((m) => m.name);
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
/** true when the last think() wanted an AI but none was reachable */
export let lastBrainMissing = false;

export async function think(req: BrainRequest, mode: BrainMode, localUrl?: string): Promise<BrainOutcome> {
  lastBrainMissing = false;
  if (mode === 'none') return { reply: null, used: 'none' };
  const cfg = brainSettings();
  const url = localUrl ?? cfg.localUrl;

  // The computer's own model first — it is free. On the website that is the
  // model running inside the browser; a local app (Ollama…) comes next.
  if (mode === 'local' || mode === 'auto') {
    const inBrowser = typeof window !== 'undefined' && !localUrl ? await import('./browser-brain') : null;
    if (inBrowser?.browserBrainSupported()) {
      const reply = await inBrowser.callBrowser(req);
      if (reply) return { reply, used: 'local' };
    }
    const reply = await callLocal(req, url, cfg.localModel);
    if (reply || (mode === 'local' && typeof window === 'undefined')) { lastBrainMissing = !reply; return { reply, used: reply ? 'local' : 'none' }; }
  }
  // The website's AI uses credits: only when the file asks for it
  // (`!#agent:online`) or the user switched it on.
  if ((mode === 'online' || cfg.allowOnline) && online()) {
    const reply = await callOnline(req);
    if (reply) return { reply, used: 'online' };
  }
  lastBrainMissing = true;
  return { reply: null, used: 'none' };
}
