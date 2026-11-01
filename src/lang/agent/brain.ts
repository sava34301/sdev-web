/**
 * The AI brain.
 *
 * Three interchangeable implementations, all optional:
 *   local  — a model server the user runs themselves (Ollama, LM Studio,
 *            llama.cpp — anything with an OpenAI-style chat endpoint), or a
 *            custom endpoint that speaks BrainRequest/BrainReply directly.
 *            Free: it never touches the website's AI credits.
 *   browser — a small model running inside the user's browser (WebGPU).
 *            Nothing to install; default if no local server configured.
 *   online — the `sdev-agent` edge function on the website (Lovable AI).
 *
 * `auto` only uses the computer's model. The website's AI is used only when
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

export interface FixResult {
  fixed_code: string;
  explanation: string;
  changes: string;
  how_it_works: string;
  confidence: 'high' | 'medium' | 'low';
}

/** Default local endpoints */
export const DEFAULT_LOCAL_URL = 'http://127.0.0.1:11434/v1/chat/completions';
export const DEFAULT_LOCAL_MODEL = 'qwen2.5-coder:7b';

export interface NormalizedEndpoints {
  baseUrl: string;
  chatUrl: string;
  modelsUrl: string;
  tagsUrl: string;
  isOllamaNative: boolean;
}

/**
 * Normalizes user-entered local server URLs (e.g. `http://localhost:1234`,
 * `http://localhost:1234/v1`, `http://127.0.0.1:11434`, `localhost:8080`)
 * into standard chat, models, and tag endpoints without double-slashes or 404s.
 */
export function normalizeLocalEndpoints(rawInput?: string): NormalizedEndpoints {
  let u = (rawInput ?? '').trim();
  if (!u) u = 'http://127.0.0.1:11434';
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
  u = u.replace(/\/+$/, '');

  // Full /api/chat path (Ollama native)
  if (/\/api\/chat$/i.test(u)) {
    const base = u.replace(/\/api\/chat$/i, '');
    return {
      baseUrl: base,
      chatUrl: u,
      modelsUrl: base + '/v1/models',
      tagsUrl: base + '/api/tags',
      isOllamaNative: true,
    };
  }

  // Full /v1/chat/completions path
  if (/\/v1\/chat\/completions$/i.test(u)) {
    const base = u.replace(/\/v1\/chat\/completions$/i, '');
    return {
      baseUrl: base,
      chatUrl: u,
      modelsUrl: base + '/v1/models',
      tagsUrl: base + '/api/tags',
      isOllamaNative: false,
    };
  }

  // Base URL ending with /v1
  let base = u;
  if (/\/v1$/i.test(base)) {
    base = base.replace(/\/v1$/i, '');
  }

  return {
    baseUrl: base,
    chatUrl: base + '/v1/chat/completions',
    modelsUrl: base + '/v1/models',
    tagsUrl: base + '/api/tags',
    isOllamaNative: false,
  };
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

/** Settings for the brain, from the IDE (localStorage) or the CLI (environment). */
export interface BrainSettings {
  localUrl: string;
  localModel: string;
  /** run the built-in AI inside the browser (default on) */
  browser: boolean;
  /** did the user set their own model server? */
  customLocal: boolean;
  /** may the website's AI (which uses credits) be used? */
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
    allowOnline: (stored(BRAIN_KEYS.online) ?? env('SDEV_AGENT_ONLINE') ?? '') === '1',
  };
}

export function online(): boolean {
  const nav = (globalThis as { navigator?: { onLine?: boolean } }).navigator;
  return nav?.onLine ?? true;
}

export function parseReply(text: string): BrainReply | null {
  const trimmed = text.trim();
  // Strip outer markdown code fences (e.g. ```json ... ``` or ```sdev ... ``` or ``` ... ```)
  const fenceMatch = /^```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  const unwrapped = fenceMatch ? fenceMatch[1].trim() : trimmed;

  try {
    const j = JSON.parse(unwrapped) as BrainReply;
    if (typeof j?.canonical === 'string') return j;
  } catch {
    /* the model answered with bare code */
  }

  return unwrapped ? { canonical: unwrapped } : null;
}

async function callLocal(req: BrainRequest, url: string, model: string): Promise<BrainReply | null> {
  try {
    const endpoints = normalizeLocalEndpoints(url);

    // If the user specified a custom endpoint that is NOT OpenAI or Ollama
    if (!/\/chat\/completions\/?$|\/api\/chat\/?$/.test(endpoints.chatUrl) && !/\/chat\/completions\/?$|\/api\/chat\/?$/.test(url)) {
      try {
        const res = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        }, 30000);
        if (res.ok) {
          const json = (await res.json()) as BrainReply;
          return typeof json?.canonical === 'string' ? json : null;
        }
      } catch {
        // Fall back to OpenAI chat endpoint
      }
    }

    const { brainInstructions, brainInput } = await import('./brain-prompt');
    const messages = [
      {
        role: 'system',
        content: brainInstructions(req.format) + '\n\nAnswer with JSON only: {"canonical": "<the whole program>", "notes": "<one short sentence>"}',
      },
      { role: 'user', content: brainInput(req) },
    ];

    // Attempt 1: OpenAI chat completions format with json_object
    let res: Response | null = null;
    try {
      res = await fetchWithTimeout(endpoints.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer not-needed',
        },
        body: JSON.stringify({
          model: model || 'default',
          messages,
          temperature: 0.1,
          stream: false,
          response_format: { type: 'json_object' },
        }),
      }, 45000);
    } catch {
      // ignore
    }

    // Fallback 1: 400 Bad Request (model doesn't support response_format)
    if (res && res.status === 400) {
      try {
        res = await fetchWithTimeout(endpoints.chatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer not-needed',
          },
          body: JSON.stringify({
            model: model || 'default',
            messages,
            temperature: 0.1,
            stream: false,
          }),
        }, 45000);
      } catch {
        // ignore
      }
    }

    // Fallback 2: If /v1/chat/completions returned 404/405, try Ollama native /api/chat
    if ((!res || res.status === 404 || res.status === 405) && endpoints.baseUrl) {
      try {
        res = await fetchWithTimeout(endpoints.baseUrl + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || 'default',
            messages,
            stream: false,
            format: 'json',
          }),
        }, 45000);
      } catch {
        // ignore
      }
    }

    if (!res || !res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      message?: { content?: string };
    };
    const text = json.choices?.[0]?.message?.content ?? json.message?.content ?? '';
    return parseReply(text);
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

/**
 * Detailed probe of a local model server (LM Studio, Ollama, llama.cpp, LocalAI, vLLM).
 * Accurately detects connection status, model lists, and browser CORS limitations with actionable fixes.
 */
export async function probeLocalServer(url = brainSettings().localUrl): Promise<LocalProbeResult> {
  const endpoints = normalizeLocalEndpoints(url);
  const result: LocalProbeResult = {
    ok: false,
    models: [],
    baseUrl: endpoints.baseUrl,
    chatUrl: endpoints.chatUrl,
  };

  try {
    // 1. Try standard OpenAI /v1/models endpoint (LM Studio, llama.cpp, Ollama >=0.1.24, LocalAI)
    let modelsRes: Response | null = null;
    try {
      modelsRes = await fetchWithTimeout(endpoints.modelsUrl, {
        headers: { 'Authorization': 'Bearer not-needed' },
      }, 5000);
    } catch (e: unknown) {
      const errStr = e instanceof Error ? e.message : String(e);
      const isCorsOrNet = errStr.includes('fetch') || errStr.includes('NetworkError') || errStr.includes('Failed to fetch') || errStr.includes('abort');
      if (isCorsOrNet) {
        result.isCors = true;
        result.error = `Network or CORS block reaching ${endpoints.baseUrl}.`;
        if (endpoints.baseUrl.includes('1234')) {
          result.serverType = 'LM Studio';
          result.hint = 'In LM Studio: Open the Local Server tab and toggle ON "Enable CORS". Web browsers block requests from web apps unless CORS is enabled.';
        } else if (endpoints.baseUrl.includes('11434')) {
          result.serverType = 'Ollama';
          result.hint = 'In Ollama: Start Ollama with OLLAMA_ORIGINS="*" (e.g., in PowerShell: $env:OLLAMA_ORIGINS="*" ; ollama serve).';
        } else {
          result.hint = 'Ensure the model server is running and configured with Cross-Origin Resource Sharing (CORS) allowed.';
        }
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
        result.serverType = endpoints.baseUrl.includes('1234')
          ? 'LM Studio'
          : endpoints.baseUrl.includes('11434')
          ? 'Ollama'
          : endpoints.baseUrl.includes('8080')
          ? 'llama.cpp'
          : 'OpenAI-Compatible';
        return result;
      }
    }

    // 2. Try Ollama native /api/tags
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
    } catch {
      // ignore
    }

    result.error = `Server responded at ${endpoints.baseUrl}, but no models are loaded. Load a model in your server interface.`;
    return result;
  } catch (err: unknown) {
    result.error = err instanceof Error ? err.message : String(err);
    return result;
  }
}

/** Is a model reachable on this computer? Returns its model names, or null. */
export async function probeLocal(url = brainSettings().localUrl): Promise<string[] | null> {
  const res = await probeLocalServer(url);
  return res.ok && res.models.length > 0 ? res.models : null;
}

/**
 * Directly ask a local model server to diagnose, repair, and explain code for SDev Doctor.
 */
export async function callLocalFix(
  code: string,
  error?: string,
  note?: string,
  url = brainSettings().localUrl,
  model = brainSettings().localModel
): Promise<FixResult | null> {
  try {
    const endpoints = normalizeLocalEndpoints(url);
    const system = `You are SDev Doctor — an expert AI assistant that diagnoses and repairs code in the SDEV programming language.
SDEV is a modern multi-paradigm language. It supports clean syntax, immutable fixed bindings, functions, pattern matching, SQL queries, and math/graphics builtins.
Analyze the user's code, fix any syntax or logical bugs, and explain your changes clearly.
Return ONLY valid JSON matching this schema:
{
  "fixed_code": "<the complete repaired source code>",
  "explanation": "<2-4 sentences explaining what the program does>",
  "changes": "<markdown bullet list of exact fixes made and why>",
  "how_it_works": "<concise markdown explanation of how the repaired code runs>",
  "confidence": "high" | "medium" | "low"
}`;

    const userPrompt = [
      note ? `User Note: ${note}` : null,
      error ? `Reported Error: ${error}` : null,
      `Source Code:\n\`\`\`sdev\n${code}\n\`\`\``,
      'Please diagnose, repair, and explain the code as valid JSON.',
    ].filter(Boolean).join('\n\n');

    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt },
    ];

    let res: Response | null = null;
    try {
      res = await fetchWithTimeout(endpoints.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer not-needed',
        },
        body: JSON.stringify({
          model: model || 'default',
          messages,
          temperature: 0.2,
          stream: false,
          response_format: { type: 'json_object' },
        }),
      }, 35000);
    } catch {
      // ignore
    }

    if (res && res.status === 400) {
      try {
        res = await fetchWithTimeout(endpoints.chatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer not-needed',
          },
          body: JSON.stringify({
            model: model || 'default',
            messages,
            temperature: 0.2,
            stream: false,
          }),
        }, 35000);
      } catch {
        // ignore
      }
    }

    if ((!res || res.status === 404 || res.status === 405) && endpoints.baseUrl) {
      try {
        res = await fetchWithTimeout(endpoints.baseUrl + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || 'default',
            messages,
            stream: false,
            format: 'json',
          }),
        }, 35000);
      } catch {
        // ignore
      }
    }

    if (!res || !res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      message?: { content?: string };
    };
    const text = json.choices?.[0]?.message?.content ?? json.message?.content ?? '';
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    try {
      const parsed = JSON.parse(cleaned) as FixResult;
      if (typeof parsed?.fixed_code === 'string') {
        return {
          fixed_code: parsed.fixed_code,
          explanation: parsed.explanation || 'Analyzed and repaired by local model server.',
          changes: parsed.changes || '- Corrected syntax and formatting.',
          how_it_works: parsed.how_it_works || 'The program runs through statements sequentially.',
          confidence: (parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low') ? parsed.confidence : 'medium',
        };
      }
    } catch {
      if (cleaned.length > 0) {
        return {
          fixed_code: cleaned,
          explanation: 'Repaired by local model server.',
          changes: '- Automatically adapted code to valid SDEV syntax.',
          how_it_works: 'Runs sequentially.',
          confidence: 'medium',
        };
      }
    }
    return null;
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

/** true when the last think() wanted an AI but none was reachable */
export let lastBrainMissing = false;

/**
 * Ask whichever brain is reachable.
 * If user configured an explicit local server (LM Studio, Ollama, etc.), that is used first.
 * Then browser-brain (WebGPU).
 * Finally, website AI only when allowed or requested.
 */
export async function think(req: BrainRequest, mode: BrainMode, localUrl?: string): Promise<BrainOutcome> {
  lastBrainMissing = false;
  if (mode === 'none') return { reply: null, used: 'none' };
  const cfg = brainSettings();
  const url = localUrl ?? cfg.localUrl;

  // Free, on the user's own computer:
  if (mode === 'local' || mode === 'auto') {
    // 1. If user configured a custom local server, try it first
    if (cfg.customLocal || localUrl) {
      const reply = await callLocal(req, url, cfg.localModel);
      if (reply) return { reply, used: 'local' };
    }

    // 2. Otherwise try browser-brain (WebGPU)
    const inBrowser = typeof window !== 'undefined';
    if (inBrowser && cfg.browser) {
      const { callBrowser } = await import('./browser-brain');
      const reply = await callBrowser(req, parseReply);
      if (reply) return { reply, used: 'local' };
    }

    // 3. Fallback to default local URL (CLI or local default) if not custom
    if (!cfg.customLocal && !localUrl) {
      const reply = await callLocal(req, url, cfg.localModel);
      if (reply) return { reply, used: 'local' };
    }

    if (mode === 'local') {
      lastBrainMissing = true;
      return { reply: null, used: 'none' };
    }
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
