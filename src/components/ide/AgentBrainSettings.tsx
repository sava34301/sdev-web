import { useEffect, useState } from 'react';
import { BRAIN_KEYS, brainSettings, probeLocal } from '@/lang/agent/brain';
import {
  BROWSER_MODEL_KEY, browserBrainSupported, chosenSize, loadBrowserBrain, onBrowserBrain,
  type BrowserBrainState, type BrowserModelSize,
} from '@/lang/agent/browser-brain';

const SIZES: { id: BrowserModelSize; label: string; about: string }[] = [
  { id: 'small', label: 'Small', about: '~0.4 GB · fastest' },
  { id: 'standard', label: 'Standard', about: '~1 GB · recommended' },
  { id: 'large', label: 'Large', about: '~2 GB · smartest' },
];

/** Where the code understander's AI runs: in this browser (free), a local app, or the website (uses credits). */
export function AgentBrainSettings() {
  const initial = brainSettings();
  const [size, setSize] = useState<BrowserModelSize>(chosenSize());
  const [brain, setBrain] = useState<BrowserBrainState>({ status: 'idle' });
  const [advanced, setAdvanced] = useState(false);
  const [url, setUrl] = useState(initial.localUrl);
  const [model, setModel] = useState(initial.localModel);
  const [allowOnline, setAllowOnline] = useState(initial.allowOnline);
  const [status, setStatus] = useState('');
  const supported = browserBrainSupported();

  useEffect(() => onBrowserBrain(setBrain), []);
  const save = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

  const test = async () => {
    setStatus('Checking…');
    const found = await probeLocal(url);
    setStatus(found ? `Connected — ${found.length} model${found.length === 1 ? '' : 's'} found.` : 'Nothing answered at that address.');
  };

  const brainText =
    !supported ? 'This browser cannot run AI models. Use a recent Chrome or Edge on a computer.'
    : brain.status === 'ready' ? 'Ready — running on this computer.'
    : brain.status === 'loading' ? `Downloading… ${Math.round(brain.progress * 100)}%`
    : brain.status === 'error' ? `Could not start: ${brain.reason}`
    : 'Downloads once the first time it is needed, then works offline.';

  return (
    <div>
      <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Code understander AI</label>
      <p className="text-[11px] text-muted-foreground mb-2">
        Simple code is understood instantly. For harder files an AI runs right here in your browser, on your own computer — nothing to install, free and private.
      </p>
      <div className="grid grid-cols-3 gap-1 mb-1">
        {SIZES.map((s) => (
          <button
            key={s.id}
            title={s.about}
            disabled={!supported}
            onClick={() => { setSize(s.id); save(BROWSER_MODEL_KEY, s.id); }}
            className={`text-[10px] font-mono py-1.5 rounded border transition-colors ${size === s.id ? 'border-primary text-primary bg-primary/10' : 'border-border/40 text-muted-foreground hover:border-primary/50'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/70 mb-1">{SIZES.find((s) => s.id === size)?.about}</p>
      {brain.status === 'loading' && (
        <div className="h-1 w-full bg-muted/40 rounded mb-1 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(brain.progress * 100)}%` }} />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mb-1">{brainText}</p>
      {supported && brain.status !== 'ready' && brain.status !== 'loading' && (
        <button onClick={() => { loadBrowserBrain(size)?.catch(() => {}); }} className="w-full mb-2 px-2 py-1 text-xs font-mono border border-border/50 rounded hover:bg-muted/40">
          Download now
        </button>
      )}

      <div className="flex items-center justify-between py-1">
        <span className="text-xs font-mono text-muted-foreground">Also use website AI (uses credits)</span>
        <button
          aria-label="Also use website AI"
          onClick={() => { const v = !allowOnline; setAllowOnline(v); save(BRAIN_KEYS.online, v ? '1' : '0'); }}
          className={`w-8 h-4 rounded-full transition-colors relative ${allowOnline ? 'bg-primary' : 'bg-muted/50'}`}
        >
          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-background transition-transform shadow ${allowOnline ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <button onClick={() => setAdvanced(!advanced)} className="text-[10px] font-mono text-muted-foreground hover:text-foreground mt-1">
        {advanced ? '▾' : '▸'} Advanced: use an AI app on this computer instead (Ollama, LM Studio)
      </button>
      {advanced && (
        <div className="mt-1">
          <input value={url} onChange={(e) => { setUrl(e.target.value); save(BRAIN_KEYS.url, e.target.value); }}
            className="w-full mb-1 px-2 py-1 text-xs font-mono bg-muted/30 border border-border/50 rounded" aria-label="Local AI address" />
          <input value={model} onChange={(e) => { setModel(e.target.value); save(BRAIN_KEYS.model, e.target.value); }}
            className="w-full mb-1 px-2 py-1 text-xs font-mono bg-muted/30 border border-border/50 rounded" aria-label="Local AI model" />
          <button onClick={test} className="w-full mb-1 px-2 py-1 text-xs font-mono border border-border/50 rounded hover:bg-muted/40">Test connection</button>
          {status && <p className="text-[11px] text-muted-foreground">{status}</p>}
        </div>
      )}
    </div>
  );
}
