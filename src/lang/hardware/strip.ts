// Strip every `board "<id>" { ... }` or `board "<id>" :: ... ;;` block from
// sdev source so the rest of the language pipeline (lexer / parser /
// interpreter / compiler) never has to know about the hardware DSL. The blocks
// are extracted separately for transpilation to Arduino .ino by
// `src/lang/hardware/transpile.ts`.

import { extractBoardBlock } from './transpile';

export function stripBoardBlocks(source: string): string {
  let out = source;
  // Loop in case multiple blocks are present.
  for (let i = 0; i < 32; i++) {
    const block = extractBoardBlock(out);
    if (!block) break;
    // Replace with blank lines preserving line numbers as best we can.
    const removed = out.slice(block.startIndex, block.endIndex);
    const newlines = removed.split('\n').length - 1;
    out = out.slice(0, block.startIndex) + '\n'.repeat(newlines) + out.slice(block.endIndex);
  }
  return out;
}
