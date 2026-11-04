// Strip every `board "<id>" { ... }` or `board "<id>" :: ... ;;` block from
// sdev source so the rest of the language pipeline (lexer / parser /
// interpreter / compiler) never has to know about the hardware DSL. The blocks
// are extracted separately for transpilation to Arduino .ino by
// `src/lang/hardware/transpile.ts`.
//
// Blocks the author has not closed yet (`board "uno"` / `loop:` written
// Python-style) are found too, so the editor and runtimes never read
// half-written firmware as sdev.

import { findBoardSpans } from './understand';

export function stripBoardBlocks(source: string): string {
  const spans = findBoardSpans(source);
  if (spans.length === 0) return source;
  let out = '';
  let last = 0;
  for (const s of spans) {
    const removed = source.slice(s.start, s.end);
    // Replace with blank lines, preserving line numbers.
    out += source.slice(last, s.start) + '\n'.repeat(removed.split('\n').length - 1);
    last = s.end;
  }
  return out + source.slice(last);
}
