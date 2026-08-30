import type { ReactNode } from 'react';
import { Zap, Cpu, AlertTriangle, CheckCircle2, Clock, GitBranch, Wifi } from 'lucide-react';
import type { IdeFile, RunMode } from './types';

interface Props {
  statusMsg: string;
  runMode: RunMode;
  activeFile?: IdeFile;
  lines: number;
  chars: number;
  cursor: { line: number; col: number };
  selection: number;
  execTime: number | null;
  error: boolean;
  /** extra segments rendered on the right, e.g. the dialect switcher */
  extra?: ReactNode;
}

export function IdeStatusBar({ statusMsg, runMode, activeFile, lines, chars, cursor, selection, execTime, error, extra }: Props) {
  return (
    <div
      className="ide-statusbar flex items-center justify-between flex-shrink-0 font-mono select-none"
      data-state={error ? 'error' : 'ok'}
    >
      <div className="flex items-center h-full">
        <span className="ide-status-seg">
          <GitBranch className="w-3 h-3" /> main
        </span>
        <span className="ide-status-seg">
          {error
            ? <><AlertTriangle className="w-3 h-3 text-destructive-foreground" /> {statusMsg}</>
            : <><CheckCircle2 className="w-3 h-3 ide-status-accent" /> {statusMsg}</>}
        </span>
        <span className="ide-status-seg">
          {runMode === 'interpreter'
            ? <><Zap className="w-3 h-3 ide-status-accent" /> Interpreter</>
            : <><Cpu className="w-3 h-3 ide-status-accent" /> Compiler</>}
        </span>
        {execTime !== null && (
          <span className="ide-status-seg">
            <Clock className="w-3 h-3" /> {execTime}ms
          </span>
        )}
      </div>

      <div className="flex items-center h-full">
        {activeFile && (
          <>
            {selection > 0 && <span className="ide-status-seg">{selection} sel</span>}
            <span className="ide-status-seg">Ln {cursor.line}, Col {cursor.col}</span>
            <span className="ide-status-seg">{lines} L · {chars} ch</span>
            <span className="ide-status-seg">UTF-8</span>
            <span className="ide-status-seg">LF</span>
            <span className="ide-status-seg font-semibold ide-status-accent">sdev</span>
          </>
        )}
        <span className="ide-status-seg">
          <Wifi className="w-3 h-3" /> Online
        </span>
      </div>
    </div>
  );
}
