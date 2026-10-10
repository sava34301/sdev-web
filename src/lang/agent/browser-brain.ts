/**
 * The understander's AI, running inside the user's browser (WebGPU, via
 * WebLLM). Nothing to install and no website AI credits: the model is fetched
 * once into the browser's cache, then runs on the user's own graphics chip —
 * also offline.
 */
import type { BrainRequest, BrainReply } from './brain';

export const BROWSER_MODEL = 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC';

type Engine = {
  chat: { completions: { create: (r: unknown) => Promise<{ choices: { message: { content: string | null } }[] }> } };
};

export interface BrowserBrainStatus {
  state: 'idle' | 'loading' | 'ready' | 'unsupported' | 'failed';
  /** 0..1 while loading */
  progress: number;
  text: string;
}

let status: BrowserBrainStatus = { state: 'idle', progress: 0, text: '' };
const listeners = new Set<(s: BrowserBrainStatus) => void>();
function set(s: Partial<BrowserBrainStatus>) {
  status = { ...status, ...s };
  for (const l of listeners) l(status);
}
export function browserBrainStatus(): BrowserBrainStatus { return status; }
export function onBrowserBrain(fn: (s: BrowserBrainStatus) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function browserBrainSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator && typeof window !== 'undefined';
}

let enginePromise: Promise<Engine | null> | null = null;

/** Start (or reuse) the in-browser model. Resolves null when it cannot run here. */
export function loadBrowserBrain(): Promise<Engine | null> {
  if (enginePromise) return enginePromise;
  if (!browserBrainSupported()) {
    set({ state: 'unsupported', text: 'This browser has no WebGPU, so the built-in AI cannot run here.' });
    return Promise.resolve(null);
  }
  set({ state: 'loading', progress: 0, text: 'Preparing the built-in AI…' });
  enginePromise = (async () => {
    try {
      const adapter = await (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
      if (!adapter) {
        set({ state: 'unsupported', text: 'No graphics chip available to the browser, so the built-in AI cannot run here.' });
        return null;
      }
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      const engine = await CreateMLCEngine(BROWSER_MODEL, {
        initProgressCallback: (p: { progress: number; text: string }) => set({ state: 'loading', progress: p.progress, text: p.text }),
      });
      set({ state: 'ready', progress: 1, text: 'The built-in AI is ready.' });
      return engine as unknown as Engine;
    } catch (e) {
      enginePromise = null;
      set({ state: 'failed', text: 'The built-in AI could not start: ' + (e instanceof Error ? e.message : String(e)) });
      return null;
    }
  })();
  return enginePromise;
}

export async function callBrowser(req: BrainRequest, parse: (text: string) => BrainReply | null): Promise<BrainReply | null> {
  const engine = await loadBrowserBrain();
  if (!engine) return null;
  try {
    const { brainInstructions, brainInput } = await import('./brain-prompt');
    const r = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: brainInstructions(req.format) + '\n\nAnswer with JSON only: {"canonical": "<the whole program>", "notes": "<one short sentence>"}' },
        { role: 'user', content: brainInput(req) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2048,
    });
    return parse(r.choices[0]?.message?.content ?? '');
  } catch {
    return null;
  }
}
