import { findBoardSpans, readBoardBlock, type BoardNote } from '../hardware/understand';
import { sdevBoardsUnmask } from './sdev-engine';

const MARK = '# sdev:board-block ';

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

/** Put the board blocks back (`texts[i]` replaces marker i). */
export function unmaskBoardBlocks(source: string, blocks: BoardPiece[], texts: string[] = blocks.map((b) => b.text)): string {
  if (texts.length === 0) return source;
  return sdevBoardsUnmask(source, blocks.map((b) => b.text.split('\n').length), texts) ?? source;
}

/** The file without its board blocks — what the sdev side of the file looks like. */
export function withoutBoardBlocks(source: string): string {
  return maskBoardBlocks(source).source;
}
