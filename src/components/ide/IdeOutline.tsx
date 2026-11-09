import { Box, FunctionSquare, Variable, Hash } from 'lucide-react';

export interface Symbol {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'method';
  line: number;
  detail?: string;
}

function extractSymbols(code: string): Symbol[] {
  const out: Symbol[] = [];
  const lines = code.split('\n');
  let inClass: string | null = null;
  let classIndent = -1;

  lines.forEach((line, i) => {
    const indent = line.length - line.trimStart().length;
    if (inClass !== null && indent <= classIndent) inClass = null;

    let m;
    if ((m = line.match(/^\s*essence\s+([A-Za-z_]\w*)/))) {
      out.push({ name: m[1], kind: 'class', line: i + 1, detail: 'essence' });
      inClass = m[1]; classIndent = indent;
    } else if ((m = line.match(/^\s*conjure\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/))) {
      out.push({
        name: inClass ? `${inClass}.${m[1]}` : m[1],
        kind: inClass ? 'method' : 'function',
        line: i + 1,
        detail: `(${m[2].trim()})`,
      });
    } else if ((m = line.match(/^\s*forge\s+([A-Za-z_]\w*)\s+be\s+(.+)/))) {
      if (!inClass) out.push({ name: m[1], kind: 'variable', line: i + 1, detail: 'forge' });
    }
  });
  return out;
}

interface Props {
  code: string;
  onJump: (line: number) => void;
}

const ICONS = {
  function: FunctionSquare,
  method:   FunctionSquare,
  class:    Box,
  variable: Variable,
};

const COLORS = {
  function: 'text-neon-cyan',
  method:   'text-neon-cyan',
  class:    'text-neon-magenta',
  variable: 'text-neon-orange',
};

export function IdeOutline({ code, onJump }: Props) {
  const symbols = extractSymbols(code);

  return (
    <div className="flex flex-col h-full bg-background/20 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2 flex-shrink-0">
        <Hash className="w-3 h-3 text-muted-foreground" />
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Outline</span>
        <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">{symbols.length}</span>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {symbols.length === 0 ? (
          <div className="px-3 py-4 text-[11px] text-muted-foreground/50 italic font-mono">
            No symbols found in this file.
          </div>
        ) : symbols.map((s, i) => {
          const Icon = ICONS[s.kind];
          return (
            <div key={i} onClick={() => onJump(s.line)}
                 className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-muted/30 text-xs font-mono group">
              <Icon className={`w-3 h-3 flex-shrink-0 ${COLORS[s.kind]}`} />
              <span className="text-foreground truncate">{s.name}</span>
              {s.detail && <span className="text-[10px] text-muted-foreground/50 truncate">{s.detail}</span>}
              <span className="ml-auto text-[10px] text-muted-foreground/40">{s.line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
