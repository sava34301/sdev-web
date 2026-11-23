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
import { lazyModuleRunner } from '../runtime/sdev-module';
import SDEV_TEXT_SRC from '../../../lang/stdlib/v2/text.sdev?raw';
import SDEV_HARDWARE_SRC from '../../../lang/paradigms/hardware.sdev?raw';

const getHwStripRunner = lazyModuleRunner(SDEV_TEXT_SRC, SDEV_HARDWARE_SRC);

export function stripBoardBlocks(source: string): string {
  const spans = findBoardSpans(source);
  if (spans.length === 0) return source;
  return getHwStripRunner().callStr(
    'hw_strip_spans',
    source,
    spans.map((s) => [s.start, s.end])
  );
}
