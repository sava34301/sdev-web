import { AlertTriangle, Info, AlertCircle, FileX2 } from 'lucide-react';
import { stripBoardBlocks } from '@/lang/hardware/strip';

import { lintEditorSource, type Problem } from './lintSdev';
export type { Problem } from './lintSdev';

/** Synchronous compatibility entry point for existing tools. */
export function lintSdev(code: string): Problem[] {
  return lintEditorSource(stripBoardBlocks(code));
}

const SEVERITY_ICON = { error: AlertCircle, warning: AlertTriangle, info: Info };
const SEVERITY_COLOR = { error: 'text-destructive', warning: 'text-neon-orange', info: 'text-muted-foreground' };

interface Props {
  problems: Problem[];
  onJump: (line: number) => void;
}

export function IdeProblems({ problems, onJump }: Props) {
  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2">
        <FileX2 className="w-8 h-8 opacity-30" />
        <span className="text-xs font-mono">No problems detected ✓</span>
      </div>
    );
  }
  return (
    <div className="h-full overflow-auto bg-background/30">
      {problems.map((p, i) => {
        const Icon = SEVERITY_ICON[p.severity];
        return (
          <div key={i} onClick={() => onJump(p.line)}
               className="flex items-start gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/30 border-b border-border/20 text-xs font-mono">
            <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${SEVERITY_COLOR[p.severity]}`} />
            <span className="text-foreground/90 flex-1">{p.message}</span>
            <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">Ln {p.line}</span>
          </div>
        );
      })}
    </div>
  );
}
