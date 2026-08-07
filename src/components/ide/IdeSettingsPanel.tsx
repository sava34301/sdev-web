import { Settings } from 'lucide-react';
import type { IdeSettings } from './types';

interface Props {
  settings: IdeSettings;
  onChange: (s: IdeSettings) => void;
}

const FONT_FAMILIES = ['JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Consolas', 'monospace'];
const THEMES = [
  { id: 'dark',     label: 'Sky Dark',  color: 'linear-gradient(135deg,#0a1626,#13283f)' },
  { id: 'midnight', label: 'Midnight',  color: 'linear-gradient(135deg,#070a18,#1a1f3e)' },
  { id: 'sky',      label: 'Open Sky',  color: 'linear-gradient(135deg,#0e3a5c,#3aa9e0)' },
  { id: 'sunset',   label: 'Sunset',    color: 'linear-gradient(135deg,#2a1410,#e8742a)' },
  { id: 'light',    label: 'Cloud',     color: 'linear-gradient(135deg,#eaf4fb,#ffffff)' },
];

export function IdeSettingsPanel({ settings, onChange }: Props) {
  const set = <K extends keyof IdeSettings>(key: K, val: IdeSettings[K]) =>
    onChange({ ...settings, [key]: val });

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/20">
        <Settings className="w-3.5 h-3.5 text-neon-cyan" />
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Font Size */}
        <div>
          <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Font Size</label>
          <div className="flex items-center gap-2">
            <input
              type="range" min={10} max={24} value={settings.fontSize}
              onChange={e => set('fontSize', Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="text-xs font-mono text-foreground w-6 text-right">{settings.fontSize}</span>
          </div>
        </div>

        {/* Tab Size */}
        <div>
          <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Tab Size</label>
          <div className="flex gap-2">
            {[2, 4, 8].map(n => (
              <button
                key={n}
                onClick={() => set('tabSize', n)}
                className={`flex-1 py-1 text-xs font-mono rounded border transition-colors ${settings.tabSize === n ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div>
          <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Font Family</label>
          <select
            value={settings.fontFamily}
            onChange={e => set('fontFamily', e.target.value)}
            className="w-full bg-background/60 border border-border/40 rounded px-2 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary/50"
          >
            {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Theme */}
        <div>
          <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Theme</label>
          <div className="space-y-1.5">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => set('theme', t.id as IdeSettings['theme'])}
                className={`w-full flex items-center gap-2 p-2 rounded border transition-colors ${settings.theme === t.id ? 'border-primary/60 bg-primary/10' : 'border-border/30 hover:border-border/60 hover:bg-muted/20'}`}
              >
                <div className="w-6 h-6 rounded border border-border/40 shadow-inner" style={{ background: t.color }} />
                <span className="text-xs font-mono text-foreground">{t.label}</span>
                {settings.theme === t.id && <span className="ml-auto text-xs text-primary">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Features</label>
          {([
            ['lineNumbers', 'Line Numbers'] as [keyof IdeSettings, string],
            ['wordWrap', 'Word Wrap'] as [keyof IdeSettings, string],
            ['autoSave', 'Auto Save'] as [keyof IdeSettings, string],
            
          ]).map(([key, label]) => (
            <div key={String(key)} className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">{label}</span>
              <button
                onClick={() => set(key, !settings[key] as IdeSettings[typeof key])}
                className={`w-8 h-4 rounded-full transition-colors relative ${settings[key] ? 'bg-primary' : 'bg-muted/50'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow ${settings[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Language runtime */}
        <div>
          <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Language Runtime</label>
          <div className="grid grid-cols-3 gap-1">
            {(['auto', 'v1', 'v2'] as const).map(id => {
              const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('sdev_runtime')) || 'auto';
              const current = stored === 'v2-wasm' ? 'v2' : stored;
              const active = current === id;
              const titles: Record<string, string> = {
                auto: 'Per-file (#!sdev v2 / #!sdev v1 header) or default v1',
                v1: 'Legacy runtime (forge / conjure / :: / ;;)',
                v2: 'Self-hosted: the sdev compiler written in sdev, running on the seed VM. No JavaScript.',
              };
              const labels: Record<string, string> = { auto: 'AUTO', v1: 'V1', v2: 'V2 · SELF-HOSTED' };

              return (
                <button
                  key={id}
                  onClick={() => {
                    if (id === 'auto') localStorage.removeItem('sdev_runtime');
                    else localStorage.setItem('sdev_runtime', id);
                    onChange({ ...settings });
                  }}
                  className={`text-[10px] font-mono py-1.5 rounded border transition-colors ${active ? 'border-primary text-primary bg-primary/10' : 'border-border/40 text-muted-foreground hover:border-primary/50'}`}
                  title={titles[id]}
                >
                  {labels[id]}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-1.5 leading-tight">
            The web IDE runs on WebAssembly — the browser's native assembly. For native x86-64 assembly (out-of-browser), use the desktop CLI: <code>node scripts/sdev-native.mjs prog.sdev</code>.
          </p>
        </div>


        {/* Reset */}
        <button
          onClick={() => onChange({ fontSize: 14, tabSize: 2, wordWrap: false, theme: 'dark', minimap: false, lineNumbers: true, autoSave: true, fontFamily: 'JetBrains Mono', liquidGlass: false })}
          className="w-full py-1.5 text-xs font-mono text-muted-foreground border border-border/40 rounded hover:border-destructive/50 hover:text-destructive transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
