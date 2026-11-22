import { useEffect, useState } from 'react';
import { BRAIN_KEYS, brainSettings, probeLocalServer, type LocalProbeResult } from '@/lang/agent/brain';
import { browserBrainStatus, browserBrainSupported, loadBrowserBrain, onBrowserBrain, type BrowserBrainStatus } from '@/lang/agent/browser-brain';
import { initMicroBrainCache, getMicroBrainStats, type MicroBrainStats } from '@/lang/agent/micro-brain';
import { CheckCircle2, AlertCircle, Loader2, Server, HelpCircle, Zap } from 'lucide-react';

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

const PRESETS = [
  { name: 'LM Studio', url: 'http://localhost:1234', defaultModel: 'qwen2.5-coder-7b-instruct' },
  { name: 'Ollama', url: 'http://127.0.0.1:11434', defaultModel: 'qwen2.5-coder:7b' },
  { name: 'llama.cpp', url: 'http://localhost:8080', defaultModel: 'default' },
  { name: 'LocalAI', url: 'http://localhost:8080', defaultModel: 'gpt-4' },
];

/** Where the code understander's AI runs: inside this browser (default), an own model server, or the website. */
export function AgentBrainSettings() {
  const initial = brainSettings();
  const [browser, setBrowser] = useState(initial.browser);
  const [allowOnline, setAllowOnline] = useState(initial.allowOnline);
  const [b, setB] = useState<BrowserBrainStatus>(browserBrainStatus());
  const [advanced, setAdvanced] = useState(initial.customLocal);
  const [url, setUrl] = useState(initial.customLocal ? initial.localUrl : '');
  const [model, setModel] = useState(initial.localModel);
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<LocalProbeResult | null>(null);
  const [microBrain, setMicroBrain] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sdev_agent_micro_brain') !== '0';
    } catch {
      return true;
    }
  });
  const [microStats, setMicroStats] = useState<MicroBrainStats>(() => getMicroBrainStats());

  useEffect(() => {
    void initMicroBrainCache().then(setMicroStats);
  }, []);

  useEffect(() => onBrowserBrain(setB), []);
  const save = (k: string, v: string) => {
    try {
      if (v) {
        localStorage.setItem(k, v);
      } else {
        localStorage.removeItem(k);
      }
    } catch {
      /* private mode */
    }
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setUrl(preset.url);
    save(BRAIN_KEYS.url, preset.url);
    setModel(preset.defaultModel);
    save(BRAIN_KEYS.model, preset.defaultModel);
    void runProbe(preset.url);
  };

  const runProbe = async (targetUrl = url) => {
    setProbing(true);
    try {
      const res = await probeLocalServer(targetUrl || undefined);
      setProbeResult(res);
      if (res.ok && res.models.length > 0) {
        // If current model not in list, auto-select first available
        if (!res.models.includes(model)) {
          setModel(res.models[0]);
          save(BRAIN_KEYS.model, res.models[0]);
        }
      }
    } finally {
      setProbing(false);
    }
  };

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
        The code understander is the syntax-free version of sdev — write in whatever way makes sense to you and it translates your intent into canonical sdev. Simple patterns resolve instantly with rules; for free-form code, a small AI runs right inside this browser — nothing to install, private.
      </p>
      <Toggle
        on={microBrain}
        label="Pre-baked Micro-Brain (<50MB, instant)"
        onClick={() => {
          const v = !microBrain;
          setMicroBrain(v);
          save('sdev_agent_micro_brain', v ? '1' : '0');
        }}
      />
      {microBrain && (
        <div className="mb-2 px-2 py-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-mono text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400" />
            Cached ({(microStats.weightBytes / 1024).toFixed(1)} KB • 0 MB download)
          </span>
          <span>{microStats.webgpuAccelerated ? 'WebGPU' : 'SIMD'} ready</span>
        </div>
      )}
      <Toggle
        on={browser}
        label="Built-in AI in this browser"
        onClick={() => {
          const v = !browser;
          setBrowser(v);
          save(BRAIN_KEYS.browser, v ? '1' : '0');
        }}
      />
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
      <Toggle
        on={allowOnline}
        label="Also use website AI (uses credits)"
        onClick={() => {
          const v = !allowOnline;
          setAllowOnline(v);
          save(BRAIN_KEYS.online, v ? '1' : '0');
        }}
      />

      <div className="pt-2 border-t border-border/40 mt-2">
        <button
          onClick={() => setAdvanced(!advanced)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium underline"
        >
          <Server className="w-3 h-3" />
          {advanced ? 'Hide' : 'Configure'} local model server (LM Studio, Ollama, llama.cpp)
        </button>

        {advanced && (
          <div className="mt-2 space-y-2 p-2.5 rounded bg-muted/15 border border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Quick Presets:</span>
              <div className="flex gap-1 flex-wrap">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-muted/40 hover:bg-muted/80 border border-border/50"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">Server Address / URL:</label>
              <input
                value={url}
                placeholder="http://localhost:1234 or http://127.0.0.1:11434"
                onChange={(e) => {
                  setUrl(e.target.value);
                  save(BRAIN_KEYS.url, e.target.value);
                  setProbeResult(null);
                }}
                className="w-full px-2 py-1 text-xs font-mono bg-background border border-border/60 rounded"
                aria-label="Model server address"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">Model Name:</label>
              {probeResult?.ok && probeResult.models.length > 0 ? (
                <select
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    save(BRAIN_KEYS.model, e.target.value);
                  }}
                  className="w-full px-2 py-1 text-xs font-mono bg-background border border-border/60 rounded"
                >
                  {probeResult.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={model}
                  placeholder="e.g. qwen2.5-coder:7b"
                  onChange={(e) => {
                    setModel(e.target.value);
                    save(BRAIN_KEYS.model, e.target.value);
                  }}
                  className="w-full px-2 py-1 text-xs font-mono bg-background border border-border/60 rounded"
                  aria-label="Model name"
                />
              )}
            </div>

            <button
              onClick={() => void runProbe()}
              disabled={probing}
              className="w-full px-2 py-1 text-xs font-mono border border-border/60 rounded hover:bg-muted/50 flex items-center justify-center gap-1.5"
            >
              {probing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3" />}
              {probing ? 'Testing connection…' : 'Test connection & discover models'}
            </button>

            {probeResult && (
              <div
                className={`p-2 rounded text-[11px] leading-relaxed border ${
                  probeResult.ok
                    ? 'bg-brand-green/10 border-brand-green/30 text-foreground'
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}
              >
                <div className="flex items-start gap-1.5">
                  {probeResult.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-green flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    {probeResult.ok ? (
                      <div>
                        <strong>Connected!</strong> Found {probeResult.models.length} model(s) on{' '}
                        <span className="font-mono">{probeResult.serverType || 'server'}</span>.
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          Active endpoint: {probeResult.chatUrl}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <strong>{probeResult.error || 'Connection failed'}</strong>
                        {probeResult.hint && (
                          <div className="mt-1 pt-1 border-t border-destructive/20 text-[10px] text-foreground/80 flex items-start gap-1">
                            <HelpCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-muted-foreground" />
                            <span>{probeResult.hint}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
