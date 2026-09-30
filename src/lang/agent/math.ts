/**
 * Arithmetic asked for in plain words: "calculate 23-21", "what is 5 times 3",
 * "add 2 and 3", "the average of 4, 8 and 9", "15% of 80", "square root of 16".
 *
 * Returns a canonical sdev expression, or null when the sentence is not a
 * calculation over numbers (and the author's own known names).
 */
import { NUMBER_WORDS } from './vocabulary';

const LEAD = /^(?:(?:please|can you|could you|would you|i want to|i need to|i want you to|let'?s|now)\s+)*(?:calculate|calc|compute|evaluate|eval|solve|work\s+out|figure\s+out|find(?:\s+out)?|tell\s+me|give\s+me|show\s+me|print|display|output|say|what\s+is|what'?s|whats|what\s+are|how\s+much\s+is|how\s+much\s+are|how\s+many\s+is|result\s+of|answer)\b\s*/i;

const FUNCS = new Set(['sqrt', 'abs', 'round', 'floor', 'ceil', 'min', 'max']);

function numberWords(s: string): string {
  // "twenty three" -> 23, "one hundred" -> 100 (simple composition)
  return s.replace(/\b(?:(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)(?:[\s-]+(?:and\s+)?(?=zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million))?)+\b/gi, (m) => {
    let total = 0, cur = 0;
    for (const w of m.toLowerCase().split(/[\s-]+/)) {
      if (w === 'and') continue;
      const v = NUMBER_WORDS[w];
      if (v === undefined) return m;
      if (v === 100) cur = (cur || 1) * 100;
      else if (v >= 1000) { total += (cur || 1) * v; cur = 0; }
      else cur += v;
    }
    return String(total + cur);
  });
}

/** split "1, 2 and 3" / "1 2 3" into operands */
function list(s: string): string[] {
  return s.split(/\s*,\s*|\s+and\s+|\s+&\s+|\s+/).map((x) => x.trim()).filter(Boolean);
}

function operators(s: string): string {
  return s
    .replace(/\bmultiplied\s+by\b/gi, ' * ')
    .replace(/\bdivided\s+by\b/gi, ' / ')
    .replace(/\b(?:raised\s+)?to\s+the\s+power\s+of\b/gi, ' ** ')
    .replace(/\bto\s+the\s+(\d+)(?:st|nd|rd|th)\s+power\b/gi, ' ** $1')
    .replace(/\bpower\b/gi, ' ** ')
    .replace(/(\S+)\s+squared\b/gi, '($1 ** 2)')
    .replace(/(\S+)\s+cubed\b/gi, '($1 ** 3)')
    .replace(/\bsquare\s+root\s+of\s+(\S+)/gi, 'sqrt($1)')
    .replace(/\bsqrt\s+(?!\()(\S+)/gi, 'sqrt($1)')
    .replace(/\b(?:the\s+)?square\s+of\s+(\S+)/gi, '($1 ** 2)')
    .replace(/\b(?:the\s+)?cube\s+of\s+(\S+)/gi, '($1 ** 3)')
    .replace(/\babsolute\s+value\s+of\s+(\S+)/gi, 'abs($1)')
    .replace(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s+of\s+(\S+)/gi, '($1 * $2 / 100)')
    .replace(/(\d+(?:\.\d+)?)\s*(?:%|percent)/gi, '($1 / 100)')
    .replace(/\b(?:plus|add|added\s+to|and)\b/gi, ' + ')
    .replace(/\b(?:minus|less|take\s+away)\b/gi, ' - ')
    .replace(/\b(?:times|x|multiply)\b/gi, ' * ')
    .replace(/(\d)\s*[x×]\s*(\d)/g, '$1 * $2')
    .replace(/[×]/g, ' * ')
    .replace(/[÷]/g, ' / ')
    .replace(/\^/g, ' ** ')
    .replace(/\b(?:over)\b/gi, ' / ')
    .replace(/\b(?:mod|modulo|remainder\s+of)\b/gi, ' % ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** accept only numbers, operators, parentheses, known names and math builtins */
function valid(expr: string, known: Set<string>): boolean {
  if (!expr || !/\d/.test(expr) && ![...expr.matchAll(/[A-Za-z_]\w*/g)].some((m) => known.has(m[0]))) return false;
  if (!/^[\w\s.+\-*/%(),]+$/.test(expr)) return false;
  for (const m of expr.matchAll(/[A-Za-z_]\w*/g)) {
    if (!FUNCS.has(m[0]) && !known.has(m[0])) return false;
  }
  // must actually compute something, or be a lone number after a verb
  let depth = 0;
  for (const c of expr) { if (c === '(') depth++; if (c === ')') depth--; if (depth < 0) return false; }
  if (depth !== 0) return false;
  if (/[+\-*/%]\s*$/.test(expr) || /^\s*[*/%]/.test(expr) || /[+*/%]\s*[*/%]\s*[*/%]/.test(expr)) return false;
  return true;
}

function operand(s: string): string {
  return s.replace(/^the\s+/i, '').trim();
}

export function mathRequest(stmt: string, known: Set<string> = new Set()): string | null {
  const raw = stmt.trim().replace(/[?.!=]+\s*$/, '').trim();
  if (!raw) return null;
  let s = numberWords(raw);
  const hadLead = LEAD.test(s);
  s = s.replace(LEAD, '').replace(/^(?:the\s+)?(?:value|result|answer)\s+of\s+/i, '').replace(/^the\s+/i, '').trim();
  let m: RegExpMatchArray | null;
  let expr: string | null = null;

  if ((m = s.match(/^sum\s+of\s+(.+)$/i))) expr = list(m[1]).map(operand).join(' + ');
  else if ((m = s.match(/^product\s+of\s+(.+)$/i))) expr = list(m[1]).map(operand).join(' * ');
  else if ((m = s.match(/^(?:average|mean)\s+of\s+(.+)$/i))) { const l = list(m[1]).map(operand); expr = `(${l.join(' + ')}) / ${l.length}`; }
  else if ((m = s.match(/^difference\s+(?:between|of)\s+(\S+)\s+and\s+(\S+)$/i))) expr = `${m[1]} - ${m[2]}`;
  else if ((m = s.match(/^quotient\s+of\s+(\S+)\s+and\s+(\S+)$/i))) expr = `${m[1]} / ${m[2]}`;
  else if ((m = s.match(/^(?:max(?:imum)?|largest|biggest)\s+of\s+(.+)$/i))) expr = `max(${list(m[1]).join(', ')})`;
  else if ((m = s.match(/^(?:min(?:imum)?|smallest)\s+of\s+(.+)$/i))) expr = `min(${list(m[1]).join(', ')})`;
  else if ((m = s.match(/^subtract\s+(\S+)\s+from\s+(\S+)$/i))) expr = `${m[2]} - ${m[1]}`;
  else if ((m = s.match(/^take\s+(\S+)\s+(?:away\s+)?from\s+(\S+)$/i))) expr = `${m[2]} - ${m[1]}`;
  else if ((m = s.match(/^add\s+(.+?)\s+to\s+(\S+)$/i))) expr = `${m[1]} + ${m[2]}`;
  else if ((m = s.match(/^add\s+(.+)$/i))) expr = list(m[1]).join(' + ');
  else if ((m = s.match(/^multiply\s+(\S+)\s+(?:by|and|with|times)\s+(\S+)$/i))) expr = `${m[1]} * ${m[2]}`;
  else if ((m = s.match(/^divide\s+(\S+)\s+(?:by|into)\s+(\S+)$/i))) expr = `${m[1]} / ${m[2]}`;
  else if ((m = s.match(/^(\S+)\s+divided\s+into\s+(\S+)$/i))) expr = `${m[2]} / ${m[1]}`;
  else if ((m = s.match(/^(?:square|squared)\s+(\S+)$/i))) expr = `${m[1]} ** 2`;
  else if ((m = s.match(/^round\s+(.+)$/i))) expr = `round(${operators(m[1])})`;
  else expr = operators(s);

  expr = expr ? operators(expr) : null;
  if (!expr || !valid(expr, known)) return null;
  // A bare number with no verb and no operator is not a request.
  const computes = /[+\-*/%]|\b(?:sqrt|abs|round|min|max|floor|ceil)\(/.test(expr);
  if (!computes && !hadLead) return null;
  return expr;
}
