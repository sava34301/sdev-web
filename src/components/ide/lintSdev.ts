export interface Problem {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  col?: number;
  file?: string;
}

export interface LintEditorOptions {
  /** True when a personal dialect is active in the IDE. */
  dialectActive?: boolean;
}

/** Existing editor diagnostics after hardware blocks have been removed. */
export function lintEditorSource(code: string, opts: LintEditorOptions = {}): Problem[] {
  if (/^\s*(\/\/[^\n]*\n\s*)*!#ai\b/.test(code)) return lintCanonical(code, opts).filter((p) => p.severity === 'error');
  return lintCanonical(code, opts);
}

/** Ordinary files need no hardware reader or execution engine. */
export async function lintEditorFile(code: string, opts: LintEditorOptions = {}): Promise<Problem[]> {
  if (/^[ \t]*board\s+/m.test(code)) {
    const { stripBoardBlocks } = await import('@/lang/hardware/strip');
    code = stripBoardBlocks(code);
  }
  return lintEditorSource(code, opts);
}

function stripLineComment(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '#') return line.slice(0, i);
    if (ch === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

function lintCanonical(code: string, opts: LintEditorOptions = {}): Problem[] {
  const problems: Problem[] = [];
  const lines = code.split('\n');
  const isV2OrDialect =
    Boolean(opts.dialectActive) ||
    /^\s*#!sdev\s+v2\b/m.test(code) ||
    /^\s*#!dialect\b/m.test(code) ||
    (/^\s*(set\s+\S+\s+to|to\s+\S+|say\s+)/m.test(code) && !/::|;;/.test(code));

  let openBlocks = 0;
  let openParens = 0;
  let openBrackets = 0;
  let openString: string | null = null;
  let stringStartLine = 0;

  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const line = rawLine;

    // Strip line comment (`//` or `#`, respecting quoted strings)
    const code = stripLineComment(line);

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

    if (!isV2OrDialect) {
      // Block tracking ::  / ;; (v1 only)
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

