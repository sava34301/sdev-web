import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Trash2, Clock, ChevronRight, TerminalSquare } from 'lucide-react';
import type { Interpreter } from '@/lang/interpreter';

interface Props {
  lines: string[];
  error?: string;
  execTime?: number | null;
  onClear: () => void;
}

interface ReplLine {
  kind: 'in' | 'out' | 'err' | 'sys';
  text: string;
}

export function IdeTerminal({ lines, error, execTime, onClear }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [repl, setRepl] = useState<ReplLine[]>([
    { kind: 'sys', text: 'sdev REPL — try `forge x be 5`, `speak(x * 2)`, or `:help`' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const interpRef = useRef<Interpreter | null>(null);

  // Lazily create the persistent REPL environment
  const ensureEnv = (Runtime: typeof Interpreter) => {
    if (!interpRef.current) {
      const out = (msg: string) => setRepl(r => [...r, { kind: 'out', text: msg }]);
      interpRef.current = new Runtime(out);
    }
    return { interp: interpRef.current };
  };

  const runRepl = async (src: string) => {
    if (!src.trim() || busyRef.current) return;
    setRepl(r => [...r, { kind: 'in', text: src }]);
    setHistory(h => [...h, src]);
    setHistIdx(-1);

    if (src.trim() === ':clear') { setRepl([{ kind: 'sys', text: 'REPL cleared.' }]); return; }
    if (src.trim() === ':reset') { interpRef.current = null; setRepl([{ kind: 'sys', text: 'REPL state reset.' }]); return; }
    if (src.trim() === ':help') {
      setRepl(r => [...r,
        { kind: 'sys', text: 'Commands: :help, :clear, :reset' },
        { kind: 'sys', text: 'sdev: forge name be 5  ·  speak(name)  ·  conjure greet(n) :: yield "hi " + n ;;' },
      ]);
      return;
    }

    try {
      busyRef.current = true;
      setBusy(true);
      const [{ Lexer }, { Parser }, { Interpreter }] = await Promise.all([
        import('@/lang/lexer'), import('@/lang/parser'), import('@/lang/interpreter'),
      ]);
      const { interp } = ensureEnv(Interpreter);
      const tokens = new Lexer(src).tokenize();
      const ast = new Parser(tokens).parse();
      interp.interpret(ast);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRepl(r => [...r, { kind: 'err', text: msg }]);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); runRepl(input); setInput(''); }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const ni = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(ni); setInput(history[ni]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx === -1) return;
      const ni = histIdx + 1;
      if (ni >= history.length) { setHistIdx(-1); setInput(''); }
      else { setHistIdx(ni); setInput(history[ni]); }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault(); setRepl([]);
    }
  };

  const hasOutput = lines.length > 0 || error;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, error, repl]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/30 bg-muted/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/70">
            <TerminalSquare className="w-3 h-3" />
            sdev terminal · REPL
          </span>
          {hasOutput && !error && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-neon-green/70">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {lines.length} line{lines.length !== 1 ? 's' : ''}
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-destructive/80">
              <AlertTriangle className="w-2.5 h-2.5" /> Error
            </span>
          )}
          {execTime != null && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/50">
              <Clock className="w-2.5 h-2.5" /> {execTime}ms
            </span>
          )}
        </div>
        <button
          onClick={() => { onClear(); setRepl([{ kind: 'sys', text: 'Cleared.' }]); }}
          className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Clear (Ctrl+L)"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Output area */}
      <div className="flex-1 min-h-0 overflow-auto p-3 font-mono text-xs space-y-0.5"
           onClick={() => inputRef.current?.focus()}>
        {/* Last run */}
        {lines.map((line, i) => (
          <div key={'r' + i} className="flex items-start gap-2 whitespace-pre-wrap leading-5 group">
            <ChevronRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100" />
            <span className="text-foreground">{line}</span>
          </div>
        ))}
        {error && (
          <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-destructive whitespace-pre-wrap">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-bold text-[10px] uppercase tracking-wider mb-1">Runtime Error</div>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* REPL transcript */}
        {hasOutput && repl.length > 0 && <div className="my-2 border-t border-border/20" />}
        {repl.map((l, i) => {
          if (l.kind === 'in') return (
            <div key={'l' + i} className="flex items-start gap-2 leading-5">
              <span className="text-primary flex-shrink-0">›</span>
              <span className="text-foreground/90 whitespace-pre-wrap">{l.text}</span>
            </div>
          );
          if (l.kind === 'err') return (
            <div key={'l' + i} className="flex items-start gap-2 leading-5 text-destructive">
              <span className="flex-shrink-0">✗</span><span className="whitespace-pre-wrap">{l.text}</span>
            </div>
          );
          if (l.kind === 'sys') return (
            <div key={'l' + i} className="text-muted-foreground/60 italic leading-5">{l.text}</div>
          );
          return (
            <div key={'l' + i} className="flex items-start gap-2 leading-5">
              <ChevronRight className="w-3 h-3 text-neon-green/70 mt-0.5 flex-shrink-0" />
              <span className="text-foreground whitespace-pre-wrap">{l.text}</span>
            </div>
          );
        })}

        {/* REPL input */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-primary">›</span>
          <input
            ref={inputRef}
            value={input}
            disabled={busy}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="type sdev expression…  (↑/↓ history · :help)"
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40 font-mono text-xs"
            spellCheck={false}
          />
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
