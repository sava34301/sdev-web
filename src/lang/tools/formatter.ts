// Lightweight sdev formatter — reindents based on `::` opens and `;;` closes,
// trims trailing whitespace, normalises blank lines.

export function formatSdev(code: string, indentSize = 2): string {
  const lines = code.split('\n');
  const indentUnit = ' '.repeat(indentSize);
  let depth = 0;
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, ''); // rtrim
    const trimmed = line.trim();

    // Count balance of this line (ignoring contents of strings/comments)
    let opens = 0, closes = 0;
    let inStr: string | null = null;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i], nx = trimmed[i + 1];
      if (inStr) {
        if (ch === '\\') { i++; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'") { inStr = ch; continue; }
      if (ch === '/' && nx === '/') break;
      if (ch === ':' && nx === ':') { opens++; i++; }
      else if (ch === ';' && nx === ';') { closes++; i++; }
    }

    // If the line *starts* with closer(s), dedent first
    const startCloses = trimmed.startsWith(';;') ? 1 : 0;
    const localDepth = Math.max(0, depth - startCloses);

    if (trimmed === '') {
      out.push('');
    } else {
      out.push(indentUnit.repeat(localDepth) + trimmed);
    }

    depth = Math.max(0, depth + opens - closes);
  }

  // Collapse 3+ blank lines into 2
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
