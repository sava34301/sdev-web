import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Cpu,
  BookOpen,
  Code2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Copy,
  Check,
  Plus,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import {
  API_REGISTRY,
  DIAGNOSTIC_LIST,
  searchApis,
  suggestNearestApis,
  type ApiEntry,
  type ApiModule,
  type ApiTarget,
  type ApiStatus,
} from '@/lang/registry/api-registry';

export interface RuntimeExplorerPanelProps {
  onInsertCode?: (code: string) => void;
  defaultTarget?: ApiTarget | 'all';
  initialQuery?: string;
}

const MODULES: { value: ApiModule | 'all'; label: string }[] = [
  { value: 'all', label: 'All Modules' },
  { value: 'core', label: 'Core & I/O' },
  { value: 'text', label: 'Text & Regex' },
  { value: 'list', label: 'Lists' },
  { value: 'tome', label: 'Tomes & Data' },
  { value: 'math', label: 'Math' },
  { value: 'matrix', label: 'Matrix' },
  { value: 'graphics', label: 'Graphics 2D' },
  { value: 'turtle', label: 'Turtle' },
  { value: 'ui', label: 'UI Toolkit' },
  { value: 'web', label: 'Web DSL' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'ml', label: 'ML / Tensors' },
  { value: 'ffi', label: 'Native FFI' },
  { value: 'webgpu', label: 'WebGPU' },
  { value: 'kernel', label: 'OS Kernel' },
  { value: 'leaflet', label: 'Leaflet Geo' },
];

const TARGETS: { value: ApiTarget | 'all'; label: string; short: string }[] = [
  { value: 'all', label: 'All Targets', short: 'ALL' },
  { value: 'v1', label: 'v1 Interpreter', short: 'v1' },
  { value: 'v2-wasm', label: 'v2 Seed WASM', short: 'WASM' },
  { value: 'native-x64', label: 'Native x86-64', short: 'x64' },
  { value: 'browser', label: 'Browser IDE', short: 'WEB' },
  { value: 'cli', label: 'Node CLI', short: 'CLI' },
  { value: 'hardware', label: 'MCU / Arduino', short: 'MCU' },
];

const STATUS_BADGE: Record<
  ApiStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  implemented: {
    label: 'Implemented',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Icon: CheckCircle2,
  },
  partial: {
    label: 'Partial',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Icon: Clock,
  },
  planned: {
    label: 'Planned',
    className: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    Icon: Sparkles,
  },
};

const TARGET_BADGE_STYLE: Record<ApiTarget, string> = {
  v1: 'bg-primary/15 text-primary border-primary/30',
  'v2-wasm': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'native-x64': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  browser: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cli: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  hardware: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export function RuntimeExplorerPanel({
  onInsertCode,
  defaultTarget = 'all',
  initialQuery,
}: RuntimeExplorerPanelProps) {
  const [activeTab, setActiveTab] = useState<'apis' | 'diagnostics'>('apis');
  const [query, setQuery] = useState(initialQuery ?? '');
  const [selectedModule, setSelectedModule] = useState<ApiModule | 'all'>('all');
  const [selectedTarget, setSelectedTarget] = useState<ApiTarget | 'all'>(defaultTarget);
  const [selectedStatus, setSelectedStatus] = useState<ApiStatus | 'all'>('all');
  const [expandedName, setExpandedName] = useState<string | null>(initialQuery ?? 'speak');

  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
      if (initialQuery) {
        setExpandedName(initialQuery);
        setActiveTab('apis');
      }
    }
  }, [initialQuery]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filteredApis = useMemo(
    () =>
      searchApis(query, {
        module: selectedModule,
        target: selectedTarget,
        status: selectedStatus,
      }),
    [query, selectedModule, selectedTarget, selectedStatus]
  );

  const suggestions = useMemo(() => {
    if (filteredApis.length > 0 || !query.trim()) return [];
    return suggestNearestApis(query.trim(), 3);
  }, [filteredApis.length, query]);

  const filteredDiagnostics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DIAGNOSTIC_LIST;
    return DIAGNOSTIC_LIST.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.explanation.toLowerCase().includes(q)
    );
  }, [query]);

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-background/40 text-foreground select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Runtime & API Explorer
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
          {API_REGISTRY.length} APIs
        </span>
      </div>

      {/* Mode Switcher: APIs vs Diagnostics */}
      <div className="grid grid-cols-2 gap-1 p-1.5 border-b border-border/30 bg-muted/10">
        <button
          type="button"
          onClick={() => setActiveTab('apis')}
          className={`flex items-center justify-center gap-1.5 py-1 rounded text-xs font-mono transition-colors ${
            activeTab === 'apis'
              ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
          }`}
        >
          <BookOpen className="w-3 h-3" />
          <span>API Registry ({filteredApis.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`flex items-center justify-center gap-1.5 py-1 rounded text-xs font-mono transition-colors ${
            activeTab === 'diagnostics'
              ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
          }`}
        >
          <ShieldAlert className="w-3 h-3" />
          <span>Diagnostics ({DIAGNOSTIC_LIST.length})</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="p-2 space-y-2 border-b border-border/20">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              activeTab === 'apis'
                ? 'Search function, alias, or description…'
                : 'Search SDEV001–SDEV015…'
            }
            className="w-full bg-background/70 border border-border/40 rounded pl-8 pr-2 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/60"
          />
        </div>

        {activeTab === 'apis' && (
          <>
            {/* Target Pills */}
            <div className="flex flex-wrap gap-1">
              {TARGETS.map((t) => {
                const active = selectedTarget === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setSelectedTarget(t.value)}
                    title={t.label}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'bg-background/50 text-muted-foreground border-border/40 hover:text-foreground'
                    }`}
                  >
                    {t.short}
                  </button>
                );
              })}
            </div>

            {/* Module & Status Selectors */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1 bg-background/60 border border-border/40 rounded px-2 py-1">
                <Layers className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value as ApiModule | 'all')}
                  className="w-full bg-transparent text-[11px] font-mono text-foreground outline-none"
                >
                  {MODULES.map((m) => (
                    <option key={m.value} value={m.value} className="bg-background text-foreground">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as ApiStatus | 'all')}
                className="bg-background/60 border border-border/40 rounded px-2 py-1 text-[11px] font-mono text-foreground outline-none"
              >
                <option value="all" className="bg-background text-foreground">
                  All Statuses
                </option>
                <option value="implemented" className="bg-background text-foreground">
                  Implemented
                </option>
                <option value="partial" className="bg-background text-foreground">
                  Partial
                </option>
                <option value="planned" className="bg-background text-foreground">
                  Planned
                </option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/15">
        {activeTab === 'apis' ? (
          <>
            {filteredApis.length === 0 && (
              <div className="p-4 text-center space-y-3">
                <p className="text-xs font-mono text-muted-foreground">
                  No APIs matched <span className="text-foreground font-semibold">"{query}"</span>.
                </p>
                {suggestions.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-mono text-primary">Did you mean:</p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {suggestions.map((s) => (
                        <button
                          key={s.entry.name}
                          type="button"
                          onClick={() => {
                            setQuery(s.entry.name);
                            setExpandedName(s.entry.name);
                          }}
                          className="px-2 py-1 rounded text-xs font-mono bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
                        >
                          {s.entry.name}()
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {filteredApis.map((entry: ApiEntry) => {
              const isExpanded = expandedName === entry.name;
              const statusMeta = STATUS_BADGE[entry.status];
              const StatusIcon = statusMeta.Icon;

              return (
                <div key={entry.name} className="bg-background/20 hover:bg-muted/10 transition-colors">
                  {/* Summary Row */}
                  <button
                    type="button"
                    onClick={() => setExpandedName(isExpanded ? null : entry.name)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="text-xs font-mono font-semibold text-foreground truncate">
                        {entry.name}
                      </span>
                      {entry.deprecated && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          DEPRECATED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">
                        {entry.module}
                      </span>
                      <span
                        className={`flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusMeta.className}`}
                      >
                        <StatusIcon className="w-2.5 h-2.5" />
                        {statusMeta.label}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-2.5 text-xs border-t border-border/10 bg-muted/5">
                      {/* Signature */}
                      <div className="font-mono text-[11px] bg-background/80 border border-border/30 rounded px-2.5 py-1.5 text-primary break-all">
                        {entry.signature}
                      </div>

                      {/* Deprecation Notice */}
                      {entry.deprecated && (
                        <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold">
                              Deprecated since v{entry.deprecated.since} — use{' '}
                              <code className="underline">{entry.deprecated.replacement}()</code>
                            </div>
                            <div className="text-amber-200/80">{entry.deprecated.reason}</div>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      <p className="text-muted-foreground leading-relaxed select-text">
                        {entry.description}
                      </p>

                      {/* Aliases */}
                      {entry.aliases.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-muted-foreground">Aliases:</span>
                          {entry.aliases.map((al) => (
                            <span
                              key={al}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/40 text-foreground/80"
                            >
                              {al}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Parameters & Return */}
                      {entry.params.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                            Parameters
                          </div>
                          <div className="space-y-1">
                            {entry.params.map((p, idx) => (
                              <div
                                key={idx}
                                className="flex items-baseline gap-2 text-[11px] font-mono bg-background/40 px-2 py-1 rounded"
                              >
                                <span className="text-foreground font-semibold">
                                  {p.name}
                                  {p.optional ? '?' : ''}
                                </span>
                                <span className="text-primary/80">:{p.type}</span>
                                {p.description && (
                                  <span className="text-muted-foreground font-sans text-[11px]">
                                    — {p.description}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-muted-foreground">
                          Returns: <strong className="text-foreground">{entry.returns}</strong>
                        </span>
                        <span className="text-muted-foreground">Since v{entry.sinceVersion}</span>
                      </div>

                      {/* Target Compatibility Matrix */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          Supported Targets
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {entry.targets.map((t) => (
                            <span
                              key={t}
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${TARGET_BADGE_STYLE[t]}`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Example Code + Actions */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Code2 className="w-3 h-3" />
                            Example
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(entry.example, entry.name)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-muted/40 hover:bg-muted/70 text-foreground transition-colors"
                            >
                              {copiedKey === entry.name ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                            {onInsertCode && (
                              <button
                                type="button"
                                onClick={() => onInsertCode(entry.example)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Insert Example</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <pre className="p-2 rounded bg-background/90 border border-border/30 text-[11px] font-mono text-foreground overflow-x-auto select-text">
                          {entry.example}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          /* Diagnostics Catalogue Tab */
          <div className="divide-y divide-border/15">
            {filteredDiagnostics.map((d) => (
              <div key={d.code} className="p-3 space-y-2 bg-background/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-primary">{d.code}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${
                      d.severity === 'error'
                        ? 'bg-destructive/20 text-destructive'
                        : d.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-sky-500/20 text-sky-400'
                    }`}
                  >
                    {d.severity} · {d.category}
                  </span>
                </div>
                <div className="text-xs font-semibold text-foreground">{d.title}</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed select-text">
                  {d.explanation}
                </p>
                <div className="grid grid-cols-1 gap-1.5 text-[11px] font-mono">
                  <div className="p-1.5 rounded bg-destructive/10 border border-destructive/20 text-destructive">
                    <div className="text-[9px] uppercase opacity-70 mb-0.5">Avoid</div>
                    <pre className="whitespace-pre-wrap">{d.badExample}</pre>
                  </div>
                  <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <div className="text-[9px] uppercase opacity-70 mb-0.5">Prefer</div>
                    <pre className="whitespace-pre-wrap">{d.goodExample}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default RuntimeExplorerPanel;
