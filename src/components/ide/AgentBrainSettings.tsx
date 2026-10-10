import { useState } from 'react';
import { BRAIN_KEYS, brainSettings, probeLocal } from '@/lang/agent/brain';

/** Where the code understander's AI runs: this computer (free) or the website (uses credits). */
export function AgentBrainSettings() {
  const initial = brainSettings();
  const [url, setUrl] = useState(initial.localUrl);
  const [model, setModel] = useState(initial.localModel);
  const [allowOnline, setAllowOnline] = useState(initial.allowOnline);
  const [status, setStatus] = useState<string>('');
  const [models, setModels] = useState<string[]>([]);

  const save = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

  const test = async () => {
    setStatus('Checking…');
    const found = await probeLocal(url);
    if (!found) {
      setStatus('No AI found on this computer. Install Ollama, run "ollama pull ' + model + '", and start it with OLLAMA_ORIGINS=* so the browser may talk to it.');
      return;
    }
    setModels(found);
    setStatus(found.includes(model) || found.some((m) => m.startsWith(model)) ? `Connected — ${model} is ready.` : `Connected, but "${model}" is not installed. Pick one below or run "ollama pull ${model}".`);
  };

  return (
    <div>
      <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Code understander AI</label>
      <p className="text-[11px] text-muted-foreground mb-2">
        Simple code is understood instantly with no AI. For harder files it asks an AI model running on your computer — free, private, works offline.
      </p>
      <input
        value={url}
        onChange={(e) => { setUrl(e.target.value); save(BRAIN_KEYS.url, e.target.value); }}
        className="w-full mb-1 px-2 py-1 text-xs font-mono bg-muted/30 border border-border/50 rounded"
        aria-label="Local AI address"
      />
      <input
        value={model}
        list="sdev-local-models"
        onChange={(e) => { setModel(e.target.value); save(BRAIN_KEYS.model, e.target.value); }}
        className="w-full mb-1 px-2 py-1 text-xs font-mono bg-muted/30 border border-border/50 rounded"
        aria-label="Local AI model"
      />
      <datalist id="sdev-local-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
      <button onClick={test} className="w-full mb-1 px-2 py-1 text-xs font-mono border border-border/50 rounded hover:bg-muted/40">
        Test connection
      </button>
      {status && <p className="text-[11px] text-muted-foreground mb-2">{status}</p>}
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
    </div>
  );
}
