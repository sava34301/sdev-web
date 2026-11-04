import { AlertTriangle, Info, AlertCircle, FileX2 } from 'lucide-react';
import { stripBoardBlocks } from '@/lang/hardware/strip';

export interface Problem {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  col?: number;
  file?: string;
}

/** Lint sdev source for common issues — runs in real-time, no execution. */
export function lintSdev(code: string): Problem[] {
  // Board blocks are firmware, read by the hardware reader — not sdev to lint.
  code = stripBoardBlocks(code);
  // sdev:ai (`!#ai`) uses `=` and `{ }` on purpose — keep only real errors.
  if (/^\s*(\/\/[^\n]*\n\s*)*!#ai\b/.test(code)) return lintCanonical(code).filter((p) => p.severity === 'error');
  return lintCanonical(code);
}

function lintCanonical(code: string): Problem[] {
  const problems: Problem[] = [];
  const lines = code.split('\n');

  let openBlocks = 0;
  let openParens = 0;
  let openBrackets = 0;
  let openString: string | null = null;
  let stringStartLine = 0;

  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const line = rawLine;

    // Strip line comment for analysis
    const ci = line.indexOf('//');
    const code = ci >= 0 ? line.slice(0, ci) : line;

    // Tabs warning
    if (line.includes('\t')) {
      problems.push({ severity: 'info', line: lineNo, message: 'Tab character found — sdev recommends 2 spaces.' });
    }

    // Brackets / parens
    for (let i = 0; i < code.length; i++) {
      const ch = code[i];
      if (openString) {
        if (ch === '\\') { i++; continue; }
        if (ch === openString) openString = null;
        continue;
      }
      if (ch === '"' || ch === "'") { openString = ch; stringStartLine = lineNo; continue; }
      if (ch === '(') openParens++;
      else if (ch === ')') openParens--;
      else if (ch === '[') openBrackets++;
      else if (ch === ']') openBrackets--;
    }
    if (openString) {
      problems.push({ severity: 'error', line: stringStartLine, message: `Unterminated string starting on line ${stringStartLine}.` });
      openString = null;
    }

    // Block tracking ::  / ;;
    const opens = (code.match(/::/g) || []).length;
    const closes = (code.match(/;;/g) || []).length;
    openBlocks += opens - closes;

    // Stylistic: 'forge' without 'be'
    if (/^\s*forge\s+\w+\s*$/.test(code) && !/=\s*/.test(code)) {
      problems.push({ severity: 'warning', line: lineNo, message: '"forge" declaration appears to be missing "be <value>".' });
    }
    // Probable typo: 'function' / 'def'
    if (/^\s*(def|function|var|let|const)\s+/.test(code)) {
      problems.push({ severity: 'error', line: lineNo, message: 'Use "conjure" for functions and "forge … be …" for variables in sdev.' });
    }
    // = vs be
    if (/[A-Za-z_]\w*\s*=\s*[^=]/.test(code) && !/equals|differs|<=|>=|!=/.test(code)) {
      problems.push({ severity: 'warning', line: lineNo, message: 'Use "be" for assignment in sdev (e.g. `x be 5`), not `=`.' });
    }
  });

  if (openBlocks > 0) {
    problems.push({ severity: 'error', line: lines.length, message: `${openBlocks} unclosed block${openBlocks === 1 ? '' : 's'} — missing ";;"`});
  } else if (openBlocks < 0) {
    problems.push({ severity: 'error', line: lines.length, message: `${-openBlocks} extra ";;" — too many block closers` });
  }
  if (openParens !== 0) {
    problems.push({ severity: 'error', line: lines.length, message: openParens > 0 ? `${openParens} unclosed parenthesis` : `${-openParens} extra closing parens` });
  }
  if (openBrackets !== 0) {
    problems.push({ severity: 'error', line: lines.length, message: openBrackets > 0 ? `${openBrackets} unclosed brackets [` : `${-openBrackets} extra closing brackets ]` });
  }

  return problems.slice(0, 100);
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
