/**
 * Does this file need the agent at all?
 *
 * Parsing alone is not proof of intent: `terminal "hi"` parses fine in v1 and
 * silently does nothing. So the sense check looks for lines that parse but
 * clearly mean something else, as well as lines that do not parse.
 */
import { Lexer } from '@/lang/lexer';
import { Parser } from '@/lang/parser';
import { baseWordMap, CANONICAL, type Intent } from './vocabulary';

export interface Sense {
  parses: boolean;
  suspicious: boolean;
  reasons: string[];
}

export function parses(source: string): boolean {
  try {
    new Parser(new Lexer(source).tokenize()).parse();
    return true;
  } catch {
    return false;
  }
}

const NON_CANONICAL_HEAD = (() => {
  const map = baseWordMap();
  const out = new Map<string, Intent>();
  for (const [word, intent] of map) if (word !== CANONICAL[intent]) out.set(word, intent);
  return out;
})();

export function senseFile(source: string, extra?: Map<string, Intent>): Sense {
  const reasons: string[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    const head = line.split(/[\s(]+/)[0].toLowerCase();
    if (NON_CANONICAL_HEAD.has(head) || extra?.has(head)) {
      reasons.push(`line ${i + 1}: "${head}" is not canonical sdev`);
      continue;
    }
    if (/^[\p{L}\p{N}_]+\s+(?:will be|becomes|gets|is now|should be|shall be|=|:=|<-)\s+/iu.test(line)) {
      reasons.push(`line ${i + 1}: looks like an assignment written another way`);
    }
    if (/;\s*\S/.test(line)) reasons.push(`line ${i + 1}: several statements on one line`);

    // Plain English written as code: three or more bare words with no call,
    // no quotes and no operators. It may parse, but it means nothing.
    const known = baseWordMap().has(head) || extra?.has(head);
    if (!known && /^[\p{L}_][\p{L}\p{N}_]*(?:\s+[\p{L}\p{N}_]+){2,}$/u.test(line)) {
      reasons.push(`line ${i + 1}: reads like a sentence, not a statement`);
    }
    // "say to terminal x" — the destination is spelled out in words.
    if (/\b(?:to|on|in|into|out)\s+(?:the\s+)?(?:terminal|console|screen|display|stdout)\b/i.test(line)) {
      reasons.push(`line ${i + 1}: names the output destination in words`);
    }
    // "call greet with 2"
    if (/^(?:call|run|invoke|execute|use)\s+[\p{L}\p{N}_]+/iu.test(line)) {
      reasons.push(`line ${i + 1}: a call written in words`);
    }
  }

  const ok = parses(source);
  return { parses: ok, suspicious: !ok || reasons.length > 0, reasons };
}
