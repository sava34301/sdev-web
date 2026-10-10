/**
 * The in-browser brain: a small coding model that runs inside the user's own
 * browser on their graphics card (WebGPU), in a background worker. Nothing to
 * install; it downloads once (~1 GB), is cached by the browser, works offline
 * afterwards, and never uses the website's AI credits.
 */
import type { BrainReply, BrainRequest } from './brain';

export const BROWSER_MODELS = {
  small: 'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC',
  standard: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC',
  large: 'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC',
} as const;
export type BrowserModelSize = keyof typeof BROWSER_MODELS;
export const BROWSER_MODEL_KEY = 'sdev_agent_browser_model';

export type BrowserBrainState =
  | { status: 'idle' }
  | { status: 'loading'; progress: number; text: string }
  | { status: 'ready'; model: string }
  | { status: 'unsupported'; reason: string }
  | { status: 'error'; reason: string };

let state: BrowserBrainState = { status: 'idle' };
const listeners = new Set<(s: BrowserBrainState) => void>();
const setState = (s: BrowserBrainState) => { state = s; listeners.forEach((l) => l(s)); };
export const browserBrainState = () => state;
export function onBrowserBrain(fn: (s: BrowserBrainState) => void): () => void {
  listeners.add(fn); fn(state);
  return () => { listeners.delete(fn); };
}

export function browserBrainSupported(): boolean {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined' && !!(navigator as { gpu?: unknown }).gpu;
}

export function chosenSize(): BrowserModelSize {
  try {
    const v = localStorage.getItem(BROWSER_MODEL_KEY);
    if (v === 'small' || v === 'standard' || v === 'large') return v;
  } catch { /* private mode */ }
  return 'standard';
}

type Engine = { chat: { completions: { create: (r: unknown) => Promise<{ choices: { message: { content: string | null } }[] }> } }; unload?: () => Promise<void> };
let engine: Promise<Engine> | null = null;
let engineModel = '';

/** Start (or reuse) the in-browser model. Downloads it the first time. */
export function loadBrowserBrain(size: BrowserModelSize = chosenSize()): Promise<Engine> | null {
  if (!browserBrainSupported()) {
    setState({ status: 'unsupported', reason: 'This browser cannot run AI models (it needs WebGPU — use a recent Chrome or Edge on a computer).' });
    return null;
  }
  const model = BROWSER_MODELS[size];
  if (engine && engineModel === model) return engine;
  engineModel = model;
  setState({ status: 'loading', progress: 0, text: 'Starting…' });
  engine = (async () => {
    const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
    const worker = new Worker(new URL('./browser-brain.worker.ts', import.meta.url), { type: 'module' });
    const e = await CreateWebWorkerMLCEngine(worker, model, {
      initProgressCallback: (p: { progress: number; text: string }) => setState({ status: 'loading', progress: p.progress, text: p.text }),
    });
    setState({ status: 'ready', model });
    return e as unknown as Engine;
  })().catch((err) => {
    engine = null;
    setState({ status: 'error', reason: err instanceof Error ? err.message : String(err) });
    throw err;
  });
  return engine;
}

function parse(text: string): BrainReply | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    const j = JSON.parse(cleaned) as BrainReply;
    if (typeof j?.canonical === 'string') return j;
  } catch { /* bare code */ }
  return cleaned ? { canonical: cleaned.replace(/^```\w*\s*/, '').replace(/```\s*$/, '') } : null;
}

export async function callBrowser(req: BrainRequest): Promise<BrainReply | null> {
  const loading = loadBrowserBrain();
  if (!loading) return null;
  try {
    const e = await loading;
    const { brainInstructions, brainInput } = await import('./brain-prompt');
    const r = await e.chat.completions.create({
      messages: [
        { role: 'system', content: brainInstructions(req.format) + '\n\nAnswer with JSON only: {"canonical": "<the whole program>", "notes": "<one short sentence>"}' },
        { role: 'user', content: brainInput(req) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1500,
    });
    return parse(r.choices[0]?.message?.content ?? '');
  } catch {
    return null;
  }
}
