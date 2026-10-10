import { useEffect, useState } from 'react';
import { BRAIN_KEYS, brainSettings, probeLocal } from '@/lang/agent/brain';
import { browserBrainStatus, browserBrainSupported, loadBrowserBrain, onBrowserBrain, type BrowserBrainStatus } from '@/lang/agent/browser-brain';

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs font-mono text-muted-foreground">{label}</span>
      <button
        aria-label={label}
        onClick={onClick}
        className={`w-8 h-4 rounded-full transition-colors relative ${on ? 'bg-primary' : 'bg-muted/50'}`}
      >
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-background transition-transform shadow ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

/** Where the code understander's AI runs: inside this browser (default), an own model server, or the website. */
export function AgentBrainSettings() {
  const initial = brainSettings();
  const [browser, setBrowser] = useState(initial.browser);
  const [allowOnline, setAllowOnline] = useState(initial.allowOnline);
  const [b, setB] = useState<BrowserBrainStatus>(browserBrainStatus());
  const [advanced, setAdvanced] = useState(initial.customLocal);
  const [url, setUrl] = useState(initial.customLocal ? initial.localUrl : '');
  const [model, setModel] = useState(initial.localModel);
  const [serverStatus, setServerStatus] = useState('');

  useEffect(() => onBrowserBrain(setB), []);
  const save = (k: string, v: string) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* private mode */ } };

  const supported = browserBrainSupported();
  const stateText =
    !supported ? 'Not available in this browser (needs WebGPU — Chrome, Edge, or recent Safari).'
    : b.state === 'ready' ? 'Ready — runs on this computer, works offline.'
    : b.state === 'loading' ? `Preparing… ${Math.round(b.progress * 100)}% (first time only)`
    : b.state === 'failed' || b.state === 'unsupported' ? b.text
    : 'Starts by itself the first time a file needs it (about 1 GB, kept by the browser).';

  return (
    <div>
      <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Code understander AI</label>
      <p className="text-[11px] text-muted-foreground mb-2">
        Simple code is understood instantly with no AI. For harder files a small AI runs right inside this browser, on your computer — nothing to install, no account, private.
      </p>
      <Toggle on={browser} label="Built-in AI in this browser" onClick={() => { const v = !browser; setBrowser(v); save(BRAIN_KEYS.browser, v ? '1' : '0'); }} />
      {browser && (
        <>
          <p className="text-[11px] text-muted-foreground mb-1">{stateText}</p>
          {b.state === 'loading' && (
            <div className="h-1 w-full bg-muted/40 rounded mb-1 overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(b.progress * 100)}%` }} />
            </div>
          )}
          {supported && (b.state === 'idle' || b.state === 'failed') && (
            <button onClick={() => void loadBrowserBrain()} className="w-full mb-2 px-2 py-1 text-xs font-mono border border-border/50 rounded hover:bg-muted/40">
              Prepare now
            </button>
          )}
        </>
      )}
      <Toggle on={allowOnline} label="Also use website AI (uses credits)" onClick={() => { const v = !allowOnline; setAllowOnline(v); save(BRAIN_KEYS.online, v ? '1' : '0'); }} />

      <button onClick={() => setAdvanced(!advanced)} className="text-[11px] text-muted-foreground underline mt-1">
        {advanced ? 'Hide' : 'Advanced:'} own model server
      </button>
      {advanced && (
        <div className="mt-1">
          <input
            value={url}
            placeholder="http://127.0.0.1:11434/v1/chat/completions"
            onChange={(e) => { setUrl(e.target.value); save(BRAIN_KEYS.url, e.target.value); }}
            className="w-full mb-1 px-2 py-1 text-xs font-mono bg-muted/30 border border-border/50 rounded"
            aria-label="Model server address"
          />
          <input
            value={model}
            onChange={(e) => { setModel(e.target.value); save(BRAIN_KEYS.model, e.target.value); }}
            className="w-full mb-1 px-2 py-1 text-xs font-mono bg-muted/30 border border-border/50 rounded"
            aria-label="Model name"
          />
          <button
            onClick={async () => { setServerStatus('Checking…'); const f = await probeLocal(url || undefined); setServerStatus(f ? `Connected — ${f.length} model(s).` : 'No model server answered at that address.'); }}
            className="w-full mb-1 px-2 py-1 text-xs font-mono border border-border/50 rounded hover:bg-muted/40"
          >
            Test connection
          </button>
          {serverStatus && <p className="text-[11px] text-muted-foreground">{serverStatus}</p>}
        </div>
      )}
    </div>
  );
}
