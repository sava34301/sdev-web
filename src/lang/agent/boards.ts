/**
 * Hardware `board "<id>" { ... }` / `board "<id>" :: ... ;;` blocks are not
 * sdev for the understander to read: they are firmware, turned into Arduino
 * C++ by `src/lang/hardware/transpile.ts` and stripped before any sdev runtime
 * runs. The understander therefore sets them aside before reading a file and
 * puts them back, byte for byte, afterwards — so neither its rules nor the AI
 * can rewrite `pin 13 write high` or count `pin`/`wait` as unknown names.
 */
import { extractBoardBlock } from '../hardware/transpile';

const MARK = '# sdev:board-block ';
const MARK_RE = /^[ \t]*# sdev:board-block (\d+)[ \t]*$/;

export interface MaskedBoards {
  source: string;
  blocks: string[];
}

/** Replace each board block with a one-line comment marker plus blank lines (line numbers stay the same). */
export function maskBoardBlocks(source: string): MaskedBoards {
  const blocks: string[] = [];
  let out = source;
  let searchFrom = 0;
  for (let i = 0; i < 32; i++) {
    const found = extractBoardBlock(out.slice(searchFrom));
    if (!found) break;
    const start = searchFrom + found.startIndex;
    const end = searchFrom + found.endIndex;
    const text = out.slice(start, end);
    const lineBreaks = text.split('\n').length - 1;
    const marker = MARK + blocks.length;
    blocks.push(text);
    out = out.slice(0, start) + marker + '\n'.repeat(lineBreaks) + out.slice(end);
    searchFrom = start + marker.length;
  }
  return { source: out, blocks };
}

/** Put the original board blocks back. A marker the AI dropped is restored at the end of the file. */
export function unmaskBoardBlocks(source: string, blocks: string[]): string {
  if (blocks.length === 0) return source;
  const used = new Set<number>();
  const lines = source.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = MARK_RE.exec(lines[i]);
    const n = m ? Number(m[1]) : -1;
    if (n < 0 || n >= blocks.length || used.has(n)) { out.push(lines[i]); continue; }
    used.add(n);
    const block = blocks[n];
    out.push(block);
    // the marker was followed by blank lines standing in for the block's other lines
    let blanks = block.split('\n').length - 1;
    while (blanks > 0 && i + 1 < lines.length && lines[i + 1].trim() === '') { i++; blanks--; }
  }
  let result = out.join('\n');
  const missing = blocks.filter((_, n) => !used.has(n));
  if (missing.length) result = result.replace(/\s*$/, '') + '\n\n' + missing.join('\n\n') + '\n';
  return result;
}

/** The file without its board blocks — what the sdev side of the file looks like. */
export function withoutBoardBlocks(source: string): string {
  return maskBoardBlocks(source).source;
}
