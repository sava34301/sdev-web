import { useState, useEffect, useRef } from 'react';
import { X, ArrowRight } from 'lucide-react';

interface Props {
  open: boolean;
  totalLines: number;
  onClose: () => void;
  onGo: (line: number) => void;
}

export function IdeGoToLine({ open, totalLines, onClose, onGo }: Props) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setVal('');
      requestAnimationFrame(() => ref.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= totalLines) {
      onGo(n);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-card border border-border/60 rounded-xl shadow-2xl p-3 w-80">
        <div className="flex items-center gap-2 mb-2">
          <ArrowRight className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-foreground">Go to Line</span>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-muted/30 text-muted-foreground"><X className="w-3 h-3" /></button>
        </div>
        <input
          ref={ref}
          autoFocus
          type="number"
          min={1}
          max={totalLines}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); }}
          placeholder={`Line number (1 - ${totalLines})`}
          className="w-full bg-background/50 border border-border/40 rounded px-2 py-1.5 text-sm font-mono outline-none focus:border-primary"
        />
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/50 font-mono">
          <span>↵ Go · ESC Cancel</span>
          <span>{totalLines} lines</span>
        </div>
      </div>
    </div>
  );
}
