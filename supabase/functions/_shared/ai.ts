// Provider-neutral AI access for every sdev helper function.
//
// Your own provider (preferred): set these secrets and every helper uses them.
//   SDEV_AI_API_KEY   — API key for any OpenAI-compatible service (required)
//   SDEV_AI_BASE_URL  — e.g. https://api.openai.com/v1 (default), https://openrouter.ai/api/v1,
//                       https://generativelanguage.googleapis.com/v1beta/openai
//   SDEV_AI_MODEL     — model for every helper (default gpt-4o-mini)
//   SDEV_AI_MODEL_FAST / SDEV_AI_MODEL_STRONG — optional per-tier overrides
//
// Transitional: while SDEV_AI_API_KEY is not set, the old hosted gateway is used so
// the site keeps working. Set SDEV_AI_DISABLE_LEGACY=1 to switch that off completely.

const LEGACY_BASE = 'https://ai.gateway.lovable.dev/v1';

export type AiTier = 'fast' | 'default' | 'strong';

function env(name: string): string {
  return (Deno.env.get(name) ?? '').trim();
}

/** True when the project's own AI provider is configured. */
export function usingOwnProvider(): boolean {
  return env('SDEV_AI_API_KEY') !== '';
}

function legacyKey(): string {
  if (env('SDEV_AI_DISABLE_LEGACY') === '1') return '';
  return env('LOVABLE_API_KEY');
}

/** The key that will be used, or undefined when no AI provider is available. */
export function aiKey(): string | undefined {
  return env('SDEV_AI_API_KEY') || legacyKey() || undefined;
}

/** Full endpoint URL, e.g. aiUrl('/chat/completions'). */
export function aiUrl(path: string): string {
  const base = usingOwnProvider()
    ? (env('SDEV_AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, '')
    : LEGACY_BASE;
  return base + (path.startsWith('/') ? path : '/' + path);
}

export function aiHeaders(): Record<string, string> {
  const key = aiKey() ?? '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
  if (!usingOwnProvider()) {
    headers['Lovable-API-Key'] = key;
    headers['X-Lovable-AIG-SDK'] = 'fetch';
  }
  return headers;
}

/** Picks the model: your configured one, or the original model on the legacy gateway. */
export function aiModel(legacyModel: string, tier: AiTier = 'default'): string {
  if (!usingOwnProvider()) return legacyModel;
  const tiered = tier === 'fast' ? env('SDEV_AI_MODEL_FAST') : tier === 'strong' ? env('SDEV_AI_MODEL_STRONG') : '';
  return tiered || env('SDEV_AI_MODEL') || 'gpt-4o-mini';
}

export const AI_NOT_CONFIGURED =
  'AI is not configured. Add the SDEV_AI_API_KEY secret (and optionally SDEV_AI_BASE_URL / SDEV_AI_MODEL).';
