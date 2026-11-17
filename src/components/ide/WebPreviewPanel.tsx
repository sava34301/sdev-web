import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Globe,
  ExternalLink,
  RefreshCw,
  Download,
  Monitor,
  Tablet,
  Smartphone,
  Code2,
  Eye,
  Columns,
  Terminal,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WebState } from '@/lang/web';
import { renderWebDocument, stripSafeMarkers } from '@/lang/web';

interface Props {
  state: WebState | null;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';
type ViewTab = 'preview' | 'split' | 'html' | 'css' | 'js';

interface ConsoleEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
  ts: number;
}

export function WebPreviewPanel({ state }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [viewTab, setViewTab] = useState<ViewTab>('preview');
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<ConsoleEntry[]>([]);
  const [copied, setCopied] = useState(false);

  const doc = useMemo(() => (state ? renderWebDocument(state) : ''), [state]);
  const bodyHtml = useMemo(
    () => (state ? stripSafeMarkers(state.stack[0]?.join('\n') ?? '') : ''),
    [state]
  );
  const cssSource = useMemo(() => (state ? state.css.join('\n\n') : ''), [state]);
  const jsSource = useMemo(() => (state ? state.js.join('\n\n') : ''), [state]);

  useEffect(() => {
    setLogs([]);
  }, [doc]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== 'object' || data.source !== 'sdev-web-preview') return;
      if (data.type === 'console') {
        setLogs((prev) => [
          ...prev.slice(-99),
          {
            level: data.level || 'log',
            text: String(data.text ?? ''),
            ts: Number(data.ts || Date.now()),
          },
        ]);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!state || !state.produced) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 p-6">
        <Globe className="w-10 h-10 opacity-30" />
        <div className="text-sm">No web page yet</div>
        <div className="text-xs opacity-60 text-center max-w-md">
          Call <code className="font-mono text-primary">page("My Site")</code> in your code to start
          building HTML/CSS/JS. Use <code className="font-mono text-primary">theme("sdev-dark")</code>,{' '}
          <code className="font-mono text-primary">navbar(...)</code>,{' '}
          <code className="font-mono text-primary">hero_section(...)</code>,{' '}
          <code className="font-mono text-primary">div</code>,{' '}
          <code className="font-mono text-primary">style(...)</code>, or{' '}
          <code className="font-mono text-primary">onclick("#id", () -&gt; :: ... ;;)</code>.
        </div>
      </div>
    );
  }

  const openInNewTab = () => {
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const reload = () => {
    setLogs([]);
    if (iframeRef.current) iframeRef.current.srcdoc = doc;
  };

  const downloadFile = (content: string, ext: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (state.title || 'page').replace(/[^\w.-]+/g, '_') + ext;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySource = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const viewportWidth =
    viewport === 'mobile' ? '375px' : viewport === 'tablet' ? '768px' : '100%';

  const errorCount = logs.filter((l) => l.level === 'error').length;

  const activeCodeText =
    viewTab === 'css'
      ? cssSource || '/* No custom CSS rules emitted (using theme defaults) */'
      : viewTab === 'js'
        ? jsSource || '// No custom JavaScript emitted'
        : doc;

  return (
    <div className="h-full flex flex-col bg-muted/10">
      {/* ── Top Studio Toolbar ── */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-card/40 flex-wrap">
        <Globe className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px] mr-2">
          {state.title}
        </span>

        {/* View Mode Switcher */}
        <div className="flex items-center rounded-md border border-border/60 bg-background/50 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setViewTab('preview')}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
              viewTab === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Live Preview"
          >
            <Eye className="w-3 h-3" /> Preview
          </button>
          <button
            type="button"
            onClick={() => setViewTab('split')}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
              viewTab === 'split' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Split Preview + Source"
          >
            <Columns className="w-3 h-3" /> Split
          </button>
          <button
            type="button"
            onClick={() => setViewTab('html')}
            className={`px-2 py-0.5 rounded font-mono transition-colors ${
              viewTab === 'html' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            HTML
          </button>
          <button
            type="button"
            onClick={() => setViewTab('css')}
            className={`px-2 py-0.5 rounded font-mono transition-colors ${
              viewTab === 'css' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            CSS
          </button>
          <button
            type="button"
            onClick={() => setViewTab('js')}
            className={`px-2 py-0.5 rounded font-mono transition-colors ${
              viewTab === 'js' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            JS
          </button>
        </div>

        {/* Viewport Size Switcher */}
        {(viewTab === 'preview' || viewTab === 'split') && (
          <div className="flex items-center rounded-md border border-border/60 bg-background/50 p-0.5 ml-1">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`p-1 rounded transition-colors ${
                viewport === 'desktop' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Desktop viewport (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`p-1 rounded transition-colors ${
                viewport === 'tablet' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Tablet viewport (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`p-1 rounded transition-colors ${
                viewport === 'mobile' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Mobile viewport (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Live Iframe Console Drawer Toggle */}
        <Button
          size="sm"
          variant={showConsole ? 'secondary' : 'ghost'}
          className="h-7 gap-1.5 text-xs"
          onClick={() => setShowConsole((s) => !s)}
        >
          <Terminal className="w-3.5 h-3.5" />
          Console
          {logs.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                errorCount > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-foreground'
              }`}
            >
              {logs.length}
            </span>
          )}
        </Button>

        <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={reload}>
          <RefreshCw className="w-3.5 h-3.5" /> Reload
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs"
          onClick={() => downloadFile(doc, '.html', 'text/html')}
        >
          <Download className="w-3.5 h-3.5" /> .html
        </Button>
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={openInNewTab}>
          <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
        </Button>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {(viewTab === 'preview' || viewTab === 'split') && (
          <div
            className={`${
              viewTab === 'split' ? 'w-1/2 border-r border-border/50' : 'w-full'
            } h-full flex items-center justify-center bg-zinc-950/40 overflow-auto`}
          >
            <div
              style={{ width: viewportWidth }}
              className={`h-full bg-white transition-all duration-200 ${
                viewport !== 'desktop' ? 'border-x border-border shadow-2xl' : ''
              }`}
            >
              <iframe
                ref={iframeRef}
                title="sdev web preview"
                sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                srcDoc={doc}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}

        {(viewTab === 'split' || viewTab === 'html' || viewTab === 'css' || viewTab === 'js') && (
          <div
            className={`${
              viewTab === 'split' ? 'w-1/2' : 'w-full'
            } h-full flex flex-col bg-card/80 overflow-hidden`}
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-primary" />
                {viewTab === 'css'
                  ? 'Generated CSS'
                  : viewTab === 'js'
                    ? 'Generated JavaScript'
                    : viewTab === 'split'
                      ? `Body HTML (${bodyHtml.length} chars)`
                      : `Full Document (${doc.length} chars)`}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 gap-1 text-xs"
                onClick={() => copySource(viewTab === 'split' ? bodyHtml : activeCodeText)}
              >
                {copied ? <Check className="w-3 h-3 text-brand-green" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <pre className="flex-1 p-3 font-mono text-xs overflow-auto text-foreground/90 whitespace-pre-wrap">
              {viewTab === 'split' ? bodyHtml : activeCodeText}
            </pre>
          </div>
        )}
      </div>

      {/* ── Collapsible Web Console Drawer ── */}
      {showConsole && (
        <div className="h-36 border-t border-border/60 bg-card/90 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1 border-b border-border/40 text-xs font-mono text-muted-foreground">
            <span>Web Console ({logs.length})</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs gap-1"
              onClick={() => setLogs([])}
            >
              <Trash2 className="w-3 h-3" /> Clear
            </Button>
          </div>
          <div className="flex-1 p-2 font-mono text-xs overflow-auto space-y-1">
            {logs.length === 0 ? (
              <div className="text-muted-foreground/50 italic">
                No console messages from the web page yet. Use speak() or console.log() inside client_fn / onclick.
              </div>
            ) : (
              logs.map((entry, idx) => (
                <div
                  key={idx}
                  className={
                    entry.level === 'error'
                      ? 'text-destructive'
                      : entry.level === 'warn'
                        ? 'text-amber-400'
                        : 'text-foreground/90'
                  }
                >
                  <span className="opacity-50 mr-2">[{entry.level}]</span>
                  {entry.text}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
