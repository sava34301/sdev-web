/**
 * Hardware `board "<id>" { ... }` / `board "<id>" :: ... ;;` blocks are
 * firmware, not sdev: they are turned into Arduino C++ by
 * `src/lang/hardware/transpile.ts` and stripped before any sdev runtime runs.
 *
 * The understander therefore sets them aside before its sdev rules and AI
 * read the file, and reads them with the hardware reader instead
 * (`src/lang/hardware/understand.ts`): lines the transpiler already knows stay
 * exactly as written, loose ones ("turn on the led", "wait one second",
 * Python-style `loop:` blocks) become the hardware language.
 */
import { findBoardSpans, readBoardBlock, type BoardNote } from '../hardware/understand';

const MARK = '# sdev:board-block ';
const MARK_RE = /^[ \t]*# sdev:board-block (\d+)[ \t]*$/;

export interface BoardPiece {
  text: string;
  strict: boolean;
  /** 1-based line of the block's header in the file */
  line: number;
}

export interface MaskedBoards {
  source: string;
  blocks: BoardPiece[];
}

/** Replace each board block with a one-line comment marker plus blank lines (line numbers stay the same). */
export function maskBoardBlocks(source: string): MaskedBoards {
  const spans = findBoardSpans(source);
  if (spans.length === 0) return { source, blocks: [] };
  const blocks: BoardPiece[] = [];
  let out = '';
  let last = 0;
  for (const s of spans) {
    out += source.slice(last, s.start);
    const text = source.slice(s.start, s.end);
    const line = source.slice(0, s.start).split('\n').length;
    out += MARK + blocks.length + '\n'.repeat(text.split('\n').length - 1);
    blocks.push({ text, strict: s.strict, line });
    last = s.end;
  }
  return { source: out + source.slice(last), blocks };
}

/** Read every set-aside block with the hardware reader. */
export function readBoardPieces(blocks: BoardPiece[]): { texts: string[]; notes: BoardNote[]; unresolved: number[] } {
  const texts: string[] = [];
  const notes: BoardNote[] = [];
  const unresolved: number[] = [];
  for (const b of blocks) {
    const r = readBoardBlock(b.text, b.line, b.strict);
    texts.push(r.text);
    notes.push(...r.notes);
    unresolved.push(...r.unresolved);
  }
  return { texts, notes, unresolved };
}

/** Put the board blocks back (`texts[i]` replaces marker i). A marker the AI dropped is restored at the end of the file. */
export function unmaskBoardBlocks(source: string, texts: string[]): string {
  if (texts.length === 0) return source;
  const used = new Set<number>();
  const lines = source.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = MARK_RE.exec(lines[i]);
    const n = m ? Number(m[1]) : -1;
    if (n < 0 || n >= texts.length || used.has(n)) { out.push(lines[i]); continue; }
    used.add(n);
    out.push(texts[n]);
    // drop the blank lines that stood in for the block's other lines
    let blanks = 0;
    let k = i + 1;
    while (k < lines.length && lines[k].trim() === '') { blanks++; k++; }
    const need = Math.min(blanks, MARKER_BLANKS.get(source)?.[n] ?? blanks);
    i += need;
  }
  let result = out.join('\n');
  const missing = texts.filter((_, n) => !used.has(n));
  if (missing.length) result = result.replace(/\s*$/, '') + '\n\n' + missing.join('\n\n') + '\n';
  return result;
}

// how many blank lines each marker stood for, per masked source
const MARKER_BLANKS = new Map<string, number[]>();

/** Mask, remembering marker sizes so unmasking removes exactly the stand-in blank lines. */
export function maskForReading(source: string): MaskedBoards {
  const masked = maskBoardBlocks(source);
  if (masked.blocks.length) {
    MARKER_BLANKS.set(masked.source, masked.blocks.map((b) => b.text.split('\n').length - 1));
    if (MARKER_BLANKS.size > 50) MARKER_BLANKS.delete(MARKER_BLANKS.keys().next().value as string);
  }
  return masked;
}

/** The file without its board blocks — what the sdev side of the file looks like. */
export function withoutBoardBlocks(source: string): string {
  return maskBoardBlocks(source).source;
}
