/**
 * Everyday requests written as plain sentences, understood offline:
 *   "count from 1 to 10", "say hi 3 times", "reverse hello",
 *   "make banana uppercase", "is 7 even", "random number between 1 and 6",
 *   "sort 5, 2, 9", "multiplication table of 3", "how many letters in apple".
 *
 * Returns canonical sdev lines, or null. The AI brain handles anything else.
 */
import { NUMBER_WORDS } from './vocabulary';

const PLEASE = /^(?:(?:please|can you|could you|would you|i want to|i want you to|i need to|i'd like to|let'?s|now|then|and)\s+)*/i;
const OUT = /^(?:say|print|show|display|output|tell me|give me|show me|write|list)\s+/i;

function num(w: string): string | null {
  const t = w.trim().toLowerCase();
  if (/^-?\d+(?:\.\d+)?$/.test(t)) return t;
  if (t in NUMBER_WORDS) return String(NUMBER_WORDS[t]);
  return null;
}

/** "hello" / 'hello' / hello -> a quoted sdev string */
function text(w: string): string {
  const t = w.trim().replace(/^(?:the\s+)?(?:word|text|string|name|sentence|phrase)\s+/i, '').trim();
  const q = t.match(/^["'“](.*)["'”]$/);
  return JSON.stringify(q ? q[1] : t);
}

function nums(list: string): string[] | null {
  const parts = list.split(/\s*,\s*|\s+and\s+|\s+/).filter(Boolean);
  const out = parts.map(num);
  return out.every((x) => x !== null) && out.length ? (out as string[]) : null;
}

export function taskRequest(stmt: string, known: Set<string> = new Set()): string[] | null {
  const s = stmt.trim().replace(PLEASE, '').replace(/[.!?]+\s*$/, '').trim();
  const head = s.split(/\s+/)[0]?.toLowerCase() ?? '';
  if (known.has(head)) return null;
  let m: RegExpMatchArray | null;

  // counting / ranges
  if ((m = s.match(/^(?:count|print|show|say|list|display|output|write)?\s*(?:all\s+)?(?:the\s+)?(?:numbers?\s+)?(?:from\s+)?(\S+)\s+(?:to|through|until|till|-)\s+(\S+)(?:\s+by\s+(\S+))?$/i))
      && /^(?:count|print|show|say|list|display|output|write|numbers?|from)/i.test(s)) {
    const a = num(m[1]), b = num(m[2]), step = m[3] ? num(m[3]) : '1';
    if (a !== null && b !== null && step !== null) {
      const down = Number(a) > Number(b);
      return down
        ? [`set i to ${a}`, `while i is or more ${b}`, '  say i', `  set i to i - ${step}`, 'end']
        : [`set i to ${a}`, `while i is or less ${b}`, '  say i', `  set i to i + ${step}`, 'end'];
    }
  }
  if ((m = s.match(/^count\s+(?:up\s+)?to\s+(\S+)$/i)) && num(m[1]) !== null) {
    return ['set i to 1', `while i is or less ${num(m[1])}`, '  say i', '  set i to i + 1', 'end'];
  }
  if ((m = s.match(/^count\s+down\s+from\s+(\S+)$/i)) && num(m[1]) !== null) {
    return [`set i to ${num(m[1])}`, 'while i > 0', '  say i', '  set i to i - 1', 'end'];
  }

  // repetition: "say hi 3 times", "repeat hello 5 times", "print x five times"
  if ((m = s.match(/^(?:say|print|show|write|display|output|repeat)\s+(.+?)\s+(\S+)\s+times$/i)) && num(m[2]) !== null) {
    const what = known.has(m[1].trim()) ? m[1].trim() : text(m[1]);
    return ['set i to 0', `while i < ${num(m[2])}`, `  say ${what}`, '  set i to i + 1', 'end'];
  }

  // text operations
  const subject = (w: string) => (known.has(w.trim()) ? w.trim() : text(w));
  if ((m = s.replace(OUT, '').match(/^(?:reverse|flip|backwards?)\s+(?:of\s+)?(.+)$/i)) || (m = s.replace(OUT, '').match(/^(.+?)\s+(?:reversed|backwards)$/i))) {
    return [`say reverse(${subject(m[1])})`];
  }
  if ((m = s.replace(OUT, '').match(/^(?:make\s+)?(.+?)\s+(?:in\s+)?(?:uppercase|upper\s*case|capitals|caps)$/i))
      || (m = s.replace(OUT, '').match(/^(?:uppercase|capitalize all|shout)\s+(.+)$/i))) {
    return [`say upper(${subject(m[1])})`];
  }
  if ((m = s.replace(OUT, '').match(/^(?:make\s+)?(.+?)\s+(?:in\s+)?(?:lowercase|lower\s*case|small letters)$/i))
      || (m = s.replace(OUT, '').match(/^lowercase\s+(.+)$/i))) {
    return [`say lower(${subject(m[1])})`];
  }
  if ((m = s.match(/^(?:what\s+is\s+|what's\s+|show\s+|tell\s+me\s+|give\s+me\s+)?(?:the\s+)?(?:length|size)\s+of\s+(.+)$/i))
      || (m = s.match(/^how\s+(?:many|much)\s+(?:letters|characters|chars)\s+(?:are\s+)?(?:in|does)\s+(.+?)(?:\s+have)?$/i))
      || (m = s.match(/^how\s+long\s+is\s+(.+)$/i))) {
    const n = nums(m[1]);
    return [`say len(${n && n.length > 1 ? `[${n.join(', ')}]` : subject(m[1])})`];
  }

  // even / odd / prime-ish checks
  if ((m = s.match(/^(?:is|check if|check whether|tell me if)\s+(\S+)\s+(?:is\s+)?(?:an?\s+)?(even|odd)(?:\s+or\s+(?:even|odd))?$/i))) {
    const n = num(m[1]) ?? (known.has(m[1]) ? m[1] : null);
    if (n !== null) return [`if ${n} % 2 is 0`, '  say "even"', 'else', '  say "odd"', 'end'];
  }

  // random numbers
  if ((m = s.match(/^(?:(?:give|show|pick|generate|roll|make|get)\s+(?:me\s+)?)?(?:a\s+)?random\s+(?:whole\s+)?number\s+(?:between|from)\s+(\S+)\s+(?:and|to)\s+(\S+)$/i))) {
    const a = num(m[1]), b = num(m[2]);
    if (a !== null && b !== null) return [`say randint(${a}, ${b})`];
  }
  if (/^(?:roll\s+(?:a\s+)?(?:die|dice)|throw\s+(?:a\s+)?dice?)$/i.test(s)) return ['say randint(1, 6)'];
  if (/^(?:flip|toss)\s+(?:a\s+)?coin$/i.test(s)) return ['say pick(["heads", "tails"])'];

  // sorting / list stats
  if ((m = s.replace(OUT, '').match(/^sort\s+(?:the\s+)?(?:numbers\s+)?(.+?)(?:\s+(?:from\s+)?(?:biggest|largest|highest)\s+(?:to|first).*)?$/i))) {
    const n = nums(m[1]);
    const desc = /biggest|largest|highest|descending/i.test(s);
    if (n) return [desc ? `say sortDesc([${n.join(', ')}])` : `say sort([${n.join(', ')}])`];
  }

  // times tables
  if ((m = s.match(/^(?:print\s+|show\s+|make\s+|write\s+)?(?:the\s+)?(?:multiplication|times)\s+table\s+(?:of|for)\s+(\S+)$/i)) ||
      (m = s.match(/^(?:print\s+|show\s+)?(?:the\s+)?(\S+)\s+times\s+table$/i))) {
    const n = num(m[1]);
    if (n !== null) return ['set i to 1', 'while i is or less 10', `  say str(${n}) + " x " + str(i) + " = " + str(${n} * i)`, '  set i to i + 1', 'end'];
  }

  // greetings
  if ((m = s.match(/^(?:say\s+)?(?:hello|hi|hey)\s+to\s+(.+)$/i)) || (m = s.match(/^greet\s+(.+)$/i))) {
    const who = m[1].trim();
    return [known.has(who) ? `say "Hello, " + ${who}` : `say ${JSON.stringify(`Hello, ${who}`)}`];
  }

  return null;
}
