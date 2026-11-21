/**
 * Thin bridge for the AI brain (endpoint normalization, output sanitization,
 * reply parsing, Doctor fix parsing, and server probing live in `lang/agent/brain.sdev`).
 */
import type { BrainMode } from './directives';
import {
  sdevNormalizeLocalEndpoints,
  sdevSanitizeBrainOutput,
  sdevParseBrainReply,
  sdevDoctorSystemPrompt,
  sdevDoctorUserPrompt,
  sdevParseDoctorFix,
  sdevProbeServerType,
  sdevProbeCorsHint,
} from './sdev-engine';

export interface BrainRequest {
  source: string;
  draft: string;
  unresolved: number[];
  vocabulary: Record<string, string>;
  problems?: string[];
  format?: 'canonical' | 'ai';
}

export interface BrainReply {
  canonical: string;
  words?: Record<string, string>;
  notes?: string;
}

export interface FixResult {
  fixed_code: string;
  explanation: string;
  changes: string;
  how_it_works: string;
  confidence: 'high' | 'medium' | 'low';
}

export const DEFAULT_LOCAL_URL = 'http://127.0.0.1:11434/v1/chat/completions';
export const DEFAULT_LOCAL_MODEL = 'qwen2.5-coder:7b';

export interface NormalizedEndpoints {
  baseUrl: string;
  chatUrl: string;
  modelsUrl: string;
  tagsUrl: string;
  isOllamaNative: boolean;
}

export function normalizeLocalEndpoints(rawInput?: string): NormalizedEndpoints {
  return (
    sdevNormalizeLocalEndpoints(rawInput ?? '') ?? {
      baseUrl: 'http://127.0.0.1:11434',
      chatUrl: DEFAULT_LOCAL_URL,
      modelsUrl: 'http://127.0.0.1:11434/v1/models',
      tagsUrl: 'http://127.0.0.1:11434/api/tags',
      isOllamaNative: false,
    }
  );
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

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

export interface BrainSettings {
  localUrl: string;
  localModel: string;
  browser: boolean;
  customLocal: boolean;
  allowOnline: boolean;
}

export const BRAIN_KEYS = {
  url: 'sdev_agent_local_url',
  model: 'sdev_agent_local_model',
  online: 'sdev_agent_online',
  browser: 'sdev_agent_browser',
} as const;

export function brainSettings(): BrainSettings {
  return {
    localUrl: stored(BRAIN_KEYS.url) || env('SDEV_AGENT_LOCAL_URL') || DEFAULT_LOCAL_URL,
    localModel: stored(BRAIN_KEYS.model) || env('SDEV_AGENT_LOCAL_MODEL') || DEFAULT_LOCAL_MODEL,
    browser: (stored(BRAIN_KEYS.browser) ?? '1') !== '0',
    customLocal: !!(stored(BRAIN_KEYS.url) || env('SDEV_AGENT_LOCAL_URL')),
    // Website AI is opt-in (Settings toggle or `!#agent:online`) so everyday use costs no credits.
    allowOnline: (stored(BRAIN_KEYS.online) ?? env('SDEV_AGENT_ONLINE') ?? '') === '1',
  };
}

export function online(): boolean {
  const nav = (globalThis as { navigator?: { onLine?: boolean } }).navigator;
  return nav?.onLine ?? true;
}

export function sanitizeBrainOutput(code: string, format?: 'canonical' | 'ai'): string {
  return sdevSanitizeBrainOutput(code, format) ?? code;
}

export function parseReply(text: string, format?: 'canonical' | 'ai'): BrainReply | null {
  return sdevParseBrainReply(text, format) ?? null;
}

async function chatWithLocalServer(
  endpoints: NormalizedEndpoints,
  model: string,
  messages: { role: string; content: string }[],
  temperature: number,
  timeoutMs: number,
): Promise<string | null> {
  let res: Response | null = null;
  try {
    res = await fetchWithTimeout(endpoints.chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer not-needed' },
      body: JSON.stringify({ model: model || 'default', messages, temperature, stream: false, response_format: { type: 'json_object' } }),
    }, timeoutMs);
  } catch { /* ignore */ }

  if (res && res.status === 400) {
    try {
      res = await fetchWithTimeout(endpoints.chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer not-needed' },
        body: JSON.stringify({ model: model || 'default', messages, temperature, stream: false }),
      }, timeoutMs);
    } catch { /* ignore */ }
  }

  if ((!res || res.status === 404 || res.status === 405) && endpoints.baseUrl) {
    try {
      res = await fetchWithTimeout(endpoints.baseUrl + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model || 'default', messages, stream: false, format: 'json' }),
      }, timeoutMs);
    } catch { /* ignore */ }
  }

  if (!res || !res.ok) return null;
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; message?: { content?: string } };
  return json.choices?.[0]?.message?.content ?? json.message?.content ?? '';
}

async function callLocal(req: BrainRequest, url: string, model: string): Promise<BrainReply | null> {
  try {
    const endpoints = normalizeLocalEndpoints(url);
    if (!/\/chat\/completions\/?$|\/api\/chat\/?$/.test(endpoints.chatUrl) && !/\/chat\/completions\/?$|\/api\/chat\/?$/.test(url)) {
      try {
        const res = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }, 30000);
        if (res.ok) {
          const json = (await res.json()) as BrainReply;
          return typeof json?.canonical === 'string' ? json : null;
        }
      } catch { /* fall back to chat endpoint */ }
    }
    const { brainInstructions, brainInput } = await import('./brain-prompt');
    const text = await chatWithLocalServer(endpoints, model, [
      { role: 'system', content: brainInstructions(req.format) + '\n\nAnswer with JSON only: {"canonical": "<the whole program>", "notes": "<one short sentence>"}' },
      { role: 'user', content: brainInput(req) },
    ], 0.1, 45000);
    return text !== null ? parseReply(text, req.format) : null;
  } catch {
    return null;
  }
}

export interface LocalProbeResult {
  ok: boolean;
  models: string[];
  activeModel?: string;
  baseUrl: string;
  chatUrl: string;
  serverType?: 'LM Studio' | 'Ollama' | 'llama.cpp' | 'LocalAI' | 'OpenAI-Compatible';
  error?: string;
  isCors?: boolean;
  hint?: string;
}

export async function probeLocalServer(url = brainSettings().localUrl): Promise<LocalProbeResult> {
  const endpoints = normalizeLocalEndpoints(url);
  const result: LocalProbeResult = { ok: false, models: [], baseUrl: endpoints.baseUrl, chatUrl: endpoints.chatUrl };
  try {
    let modelsRes: Response | null = null;
    try {
      modelsRes = await fetchWithTimeout(endpoints.modelsUrl, { headers: { Authorization: 'Bearer not-needed' } }, 5000);
    } catch (e: unknown) {
      const errStr = e instanceof Error ? e.message : String(e);
      if (errStr.includes('fetch') || errStr.includes('NetworkError') || errStr.includes('Failed to fetch') || errStr.includes('abort')) {
        result.isCors = true;
        result.error = `Network or CORS block reaching ${endpoints.baseUrl}.`;
        result.serverType = endpoints.baseUrl.includes('1234') ? 'LM Studio' : endpoints.baseUrl.includes('11434') ? 'Ollama' : undefined;
        result.hint = sdevProbeCorsHint(endpoints.baseUrl) ?? undefined;
        return result;
      }
    }
    if (modelsRes && modelsRes.ok) {
      const data = (await modelsRes.json()) as { data?: Array<{ id?: string; name?: string }> };
      const list = (data.data ?? []).map((m) => m.id || m.name || '').filter(Boolean);
      if (list.length > 0) {
        result.ok = true;
        result.models = list;
        result.activeModel = list[0];
        result.serverType = sdevProbeServerType(endpoints.baseUrl) ?? 'OpenAI-Compatible';
        return result;
      }
    }
    try {
      const tagsRes = await fetchWithTimeout(endpoints.tagsUrl, {}, 5000);
      if (tagsRes && tagsRes.ok) {
        const data = (await tagsRes.json()) as { models?: Array<{ name?: string }> };
        const list = (data.models ?? []).map((m) => m.name || '').filter(Boolean);
        result.ok = true;
        result.models = list;
        result.activeModel = list[0];
        result.serverType = 'Ollama';
        return result;
      }
    } catch { /* ignore */ }
    result.error = `Server responded at ${endpoints.baseUrl}, but no models are loaded. Load a model in your server interface.`;
    return result;
  } catch (err: unknown) {
    result.error = err instanceof Error ? err.message : String(err);
    return result;
  }
}

export async function callLocalFix(
  code: string,
  error?: string,
  note?: string,
  url = brainSettings().localUrl,
  model = brainSettings().localModel,
): Promise<FixResult | null> {
  try {
    const endpoints = normalizeLocalEndpoints(url);
    const text = await chatWithLocalServer(endpoints, model, [
      { role: 'system', content: sdevDoctorSystemPrompt() ?? '' },
      { role: 'user', content: sdevDoctorUserPrompt(code, error, note) ?? code },
    ], 0.2, 35000);
    return text ? (sdevParseDoctorFix(text) ?? null) : null;
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

export let lastBrainMissing = false;

export async function think(req: BrainRequest, mode: BrainMode, localUrl?: string): Promise<BrainOutcome> {
  lastBrainMissing = false;
  if (mode === 'none') return { reply: null, used: 'none' };
  const cfg = brainSettings();
  const url = localUrl ?? cfg.localUrl;

  if (mode === 'local' || mode === 'auto') {
    if (cfg.customLocal || localUrl) {
      const reply = await callLocal(req, url, cfg.localModel);
      if (reply) return { reply, used: 'local' };
    }
    if (typeof window !== 'undefined' && cfg.browser) {
      const { callBrowser } = await import('./browser-brain');
      const reply = await callBrowser(req, parseReply);
      if (reply) return { reply, used: 'local' };
    }
    if (!cfg.customLocal && !localUrl) {
      const reply = await callLocal(req, url, cfg.localModel);
      if (reply) return { reply, used: 'local' };
    }
    if (mode === 'local') {
      lastBrainMissing = true;
      return { reply: null, used: 'none' };
    }
  }

  if ((mode === 'online' || cfg.allowOnline) && online()) {
    const reply = await callOnline(req);
    if (reply) return { reply, used: 'online' };
  }

  lastBrainMissing = true;
  return { reply: null, used: 'none' };
}
