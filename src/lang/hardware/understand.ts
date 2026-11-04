// ============================================================
// Understanding hardware code — the code understander's reader for
// `board "<id>" { ... }` / `board "<id>" :: ... ;;` blocks.
// ============================================================
// People write firmware the way they talk ("turn on the led", "wait one
// second", "set pin 9 as output", Python-style `loop:` blocks with no `;;`).
// The transpiler (`transpile.ts`) only knows the hardware DSL, and passes
// anything else straight to C++ where it fails to compile. This reader turns
// those lines into the DSL before transpiling.
//
// It follows the understander's golden rule: a line the transpiler already
// understands is left exactly as written. Only lines it would pass through
// unchanged — or a small set of lines it accepts but would turn into broken
// C++ (`wait one second`, `say hello world`, `print("x")`, `if x > 3:`) —
// are rewritten. Lines the rules cannot place are reported as `unresolved`
// so the AI brain can be asked about just those.

import { extractBoardBlock, boardLineRecognised } from './transpile';
import { BOARDS, findBoardById } from './board-db';

export interface BoardNote {
  line: number;          // 1-based line in the whole file
  from: string;
  to: string;
  why: string;
}

export interface BoardReading {
  source: string;
  notes: BoardNote[];
  /** 1-based lines in the whole file the rules could not place */
  unresolved: number[];
  /** did the file contain any board block at all? */
  hasBoard: boolean;
}

export interface BoardSpan {
  start: number;     // char offset of the header
  end: number;       // char offset just past the block
  strict: boolean;   // a complete block the transpiler can already find
}

// ---------------------------------------------------------------
// Finding blocks — complete ones and ones that were never closed
// ---------------------------------------------------------------
const HEADER_RE = /^([ \t]*)board\s+(?:"([^"\n]+)"|'([^'\n]+)'|([A-Za-z][\w-]*(?:[ \t]+[A-Za-z0-9][\w-]*)*?))[ \t]*(::|:|\{)?[ \t]*$/;

function lineStarts(source: string): number[] {
  const out = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') out.push(i + 1);
  return out;
}

function indentOf(line: string): number {
  const m = /^[ \t]*/.exec(line);
  return m ? m[0].replace(/\t/g, '  ').length : 0;
}

/** Every board block in the file, including ones missing their closing `;;` / `}`. */
export function findBoardSpans(source: string): BoardSpan[] {
  const spans: BoardSpan[] = [];
  const starts = lineStarts(source);
  const lines = source.split('\n');
  let i = 0;
  while (i < lines.length) {
    const m = HEADER_RE.exec(lines[i]);
    if (!m) { i++; continue; }
    const start = starts[i] + m[1].length;
    const strict = extractBoardBlock(source.slice(start));
    if (strict && strict.startIndex === 0) {
      const end = start + strict.endIndex;
      spans.push({ start, end, strict: true });
      while (i < lines.length && starts[i] < end) i++;
      continue;
    }
    // Never closed: a `::` / `{` header runs to the end of the file; a `:` or
    // bare header runs while the lines stay indented under it.
    const headerIndent = indentOf(lines[i]);
    let j = i + 1;
    if (m[5] === '::' || m[5] === '{') {
      j = lines.length;
    } else {
      while (j < lines.length && (lines[j].trim() === '' || indentOf(lines[j]) > headerIndent)) j++;
      while (j > i + 1 && lines[j - 1].trim() === '') j--;
      // an `end` / `;;` / `}` at the header's indent closes the block
      let k = j;
      while (k < lines.length && lines[k].trim() === '') k++;
      if (k < lines.length && indentOf(lines[k]) === headerIndent && /^(?:end|;;|\})$/.test(lines[k].trim())) j = k + 1;
    }
    const endLine = j - 1;
    const end = starts[endLine] + lines[endLine].length;
    spans.push({ start, end, strict: false });
    i = j;
  }
  return spans;
}

// ---------------------------------------------------------------
// Words → numbers, pins, values
// ---------------------------------------------------------------
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100,
  a: 1, an: 1, half: 0.5, quarter: 0.25,
};

/** "1", "1.5", "one", "half a", "a quarter of a", "x" → number or expression; null when unclear */
function amount(raw: string): { value: string; isNumber: boolean; num?: number } | null {
  let s = raw.trim().replace(/^(?:about|around|roughly|exactly)\s+/i, '');
  if (/^\d+(?:\.\d+)?$/.test(s)) return { value: s, isNumber: true, num: Number(s) };
  s = s.toLowerCase().replace(/\s+(?:of\s+)?an?$/, '').replace(/^an?\s+/, (w) => (/^(half|quarter)/.test(s.slice(w.length)) ? '' : w));
  const and = /^(\w+)\s+and\s+a\s+half$/.exec(s);
  if (and && NUMBER_WORDS[and[1]] !== undefined) {
    const n = NUMBER_WORDS[and[1]] + 0.5;
    return { value: String(n), isNumber: true, num: n };
  }
  if (NUMBER_WORDS[s] !== undefined) return { value: String(NUMBER_WORDS[s]), isNumber: true, num: NUMBER_WORDS[s] };
  const hundreds = /^(\w+)\s+hundred$/.exec(s);
  if (hundreds && NUMBER_WORDS[hundreds[1]] !== undefined) {
    const n = NUMBER_WORDS[hundreds[1]] * 100;
    return { value: String(n), isNumber: true, num: n };
  }
  // a variable or a small expression: `delay_ms`, `t * 2`
  if (/^[A-Za-z_][\w.]*(?:\s*[-+*/]\s*[\w.]+)*$/.test(raw.trim()) && !/\s/.test(raw.trim().replace(/\s*[-+*/]\s*/g, ''))) {
    return { value: raw.trim(), isNumber: false };
  }
  return null;
}

const PIN = String.raw`(?:the\s+)?(?:(?:built-?in|onboard|on-board|internal)\s+)?(?:led|light)(?:\s+(?:on|at)\s+pin\s+(?<p1>\w+))?|(?:the\s+)?(?:(?:led|light|buzzer|relay|motor|speaker|button|sensor|output|input)\s+(?:on|at)\s+)?(?:digital\s+|analog\s+)?pin\s+(?:number\s+)?(?<p2>\w+)|(?<p3>\d+|A\d+)`;

function pinOf(m: RegExpExecArray): string {
  const g = m.groups ?? {};
  return g.p1 ?? g.p2 ?? g.p3 ?? 'led';
}

/** Rewrite loose expressions inside a condition/value: `is`, `is not`, `is greater than`, `pressed`. */
function fixExpr(expr: string): string {
  let out = '';
  // only outside string literals
  const parts = expr.split(/("(?:[^"\\]|\\.)*")/);
  for (const part of parts) {
    if (part.startsWith('"')) { out += part; continue; }
    out += part
      .replace(new RegExp(String.raw`\bpin\s+(\w+)\s+is\s+(high|low|on|off)\b`, 'gi'), (_, p, v) =>
        `read pin ${p} equals ${/high|on/i.test(v) ? 'HIGH' : 'LOW'}`)
      .replace(/\bis\s+(?:greater|bigger|more)\s+than\s+or\s+equal\s+to\b/gi, '>=')
      .replace(/\bis\s+(?:less|smaller|fewer)\s+than\s+or\s+equal\s+to\b/gi, '<=')
      .replace(/\bis\s+(?:greater|bigger|more|higher)\s+than\b/gi, '>')
      .replace(/\bis\s+(?:less|smaller|fewer|lower)\s+than\b/gi, '<')
      .replace(/\bis\s+at\s+least\b/gi, '>=')
      .replace(/\bis\s+at\s+most\b/gi, '<=')
      .replace(/\bis\s+not\b|\bisn't\b/gi, '!=')
      .replace(/\bis\s+(?:equal\s+to\s+)?(?=[\w"(-])/gi, '== ')
      .replace(/\bhigh\b/g, 'HIGH').replace(/\blow\b/g, 'LOW')
      .replace(/\btrue\b|\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
  }
  return out.trim();
}

/** Quote bare words so `say hello world` prints text instead of failing. */
function printable(arg: string): string {
  const a = arg.trim();
  if (/^".*"$/.test(a) || /^'.*'$/.test(a)) return a.startsWith("'") ? `"${a.slice(1, -1).replace(/"/g, '\\"')}"` : a;
  if (/["(+]/.test(a) || /^[\w.[\]]+$/.test(a) || /^-?\d/.test(a)) return a;
  return `"${a.replace(/"/g, '\\"')}"`;
}

function waitLine(amt: { value: string; isNumber: boolean; num?: number }, unitRaw: string | undefined): string | null {
  const unit = (unitRaw ?? '').toLowerCase();
  if (/^(?:s|secs?|seconds?)$/.test(unit)) {
    if (amt.isNumber && amt.num !== undefined && !Number.isInteger(amt.num)) return `wait ${Math.round(amt.num * 1000)}`;
    return `wait ${amt.value} ${amt.value === '1' ? 'second' : 'seconds'}`;
  }
  if (/^(?:mins?|minutes?)$/.test(unit)) {
    return amt.isNumber && amt.num !== undefined ? `wait ${Math.round(amt.num * 60)} seconds` : `wait (${amt.value}) * 60 seconds`;
  }
  if (/^(?:us|µs|micros?|microseconds?)$/.test(unit)) return `wait ${amt.value} us`;
  return `wait ${amt.value}`;
}

// ---------------------------------------------------------------
// The rules. Each takes the line's code (no indent, no comment) and the
// context; returns replacement lines or null.
// ---------------------------------------------------------------
interface Ctx { topLevel: boolean }
type Rule = { name: string; alsoWhenRecognised?: boolean; run: (body: string, ctx: Ctx) => string[] | string | null };

const DELIM = String.raw`\s*(?:::|:|\{|then|do)?\s*`;
const strip = (s: string) => s.replace(/\s*[.!]$/, '').trim();

const RULES: Rule[] = [
  // ---- block headers --------------------------------------------------
  {
    name: 'setup block',
    alsoWhenRecognised: true,
    run: (b) => /^(?:(?:void|def|function|fn|func|to|conjure)\s+)?(?:setup|on\s+start|at\s+start|start\s*up|startup|when\s+(?:the\s+)?(?:board|arduino)\s+starts|begin)\s*(?:\(\s*\))?\s*(?:::|:|\{)?$/i.test(b)
      && !/^conjure\s+setup\s*\(\s*\)\s*(?:::|\{)$/.test(b) && !/^to\s+setup$/.test(b)
      ? `conjure setup() ${b.endsWith('{') ? '{' : '::'}` : null,
  },
  {
    name: 'loop block',
    alsoWhenRecognised: true,
    run: (b, ctx) => {
      if (/^conjure\s+loop\s*\(\s*\)\s*(?:::|\{)$/.test(b) || /^to\s+loop$/.test(b)) return null;
      const named = /^(?:(?:void|def|function|fn|func|to|conjure)\s+)?(?:loop|main\s+loop|over\s+and\s+over|again\s+and\s+again)\s*(?:\(\s*\))?\s*(?:::|:|\{)?$/i.test(b);
      const forever = /^(?:forever|repeat\s+forever|loop\s+forever|always|keep\s+doing)\s*(?:::|:|\{)?$/i.test(b);
      if (named || (forever && ctx.topLevel)) return `conjure loop() ${b.endsWith('{') ? '{' : '::'}`;
      return null;
    },
  },
  {
    name: 'function',
    alsoWhenRecognised: true,
    run: (b) => {
      const m = /^(?:def|function|fn|func|void|to|conjure)\s+([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?\s*(?:::|:|\{)?$/.exec(b);
      if (!m || /^(setup|loop)$/.test(m[1])) return null;
      if (/^conjure\s+\w+\s*\([^)]*\)\s*(?:::|\{)$/.test(b) || /^to\s+\w+$/.test(b) || /^void\s+\w+\s*\([^)]*\)\s*\{$/.test(b)) return null;
      return `conjure ${m[1]}(${(m[2] ?? '').trim()}) ${b.endsWith('{') ? '{' : '::'}`;
    },
  },
  {
    name: 'repeat N times',
    run: (b) => {
      const m = /^(?:repeat|do(?:\s+this)?|loop)\s+(.+?)\s+times?\s*(?:::|:|\{)?$/i.exec(b) ?? /^(\S+)\s+times\s*(?:::|:|\{)?$/i.exec(b);
      const n = m && amount(m[1]);
      return n ? `within i be sequence(0, ${n.value}) ${b.endsWith('{') ? '{' : '::'}` : null;
    },
  },
  {
    name: 'counting loop',
    alsoWhenRecognised: true,
    run: (b) => {
      let m = /^for\s+(?:each\s+)?(\w+)\s+(?:from|=)\s+(.+?)\s+(?:to|through|until)\s+(.+?)\s*(?:::|:|\{|do)?$/i.exec(b);
      if (m) {
        const end = /^\d+$/.test(m[3]) ? String(Number(m[3]) + 1) : `${m[3]} + 1`;
        return `within ${m[1]} be sequence(${m[2]}, ${end}) ${b.endsWith('{') ? '{' : '::'}`;
      }
      m = /^for\s+(\w+)\s+in\s+range\s*\((.*)\)\s*:$/.exec(b);
      if (m) return `within ${m[1]} be sequence(${m[2]}) ::`;
      return null;
    },
  },
  {
    name: 'condition',
    alsoWhenRecognised: true,
    run: (b) => {
      if (/^(?:ponder|if)\s+.+\s*(?:::|\{)$/.test(b) || /^if\s*\(.*\)\s*\{?$/.test(b)) return null;
      let m = /^(?:else\s*if|elif|otherwise\s+if|or\s+if)\s+(.+?)\s*(?::|then)?$/i.exec(b);
      if (m && !/(?:::|\{)$/.test(b)) return `otherwise ponder ${fixExpr(m[1])} ::`;
      m = /^(?:if|when|whenever|ponder)\s+(.+?)\s*(?::|then|,)?$/i.exec(b);
      if (m && !/(?:::|\{)$/.test(b)) return `ponder ${fixExpr(m[1])} ::`;
      if (/^(?:else|otherwise)\s*:$/i.test(b)) return 'otherwise ::';
      return null;
    },
  },
  {
    name: 'while loop',
    alsoWhenRecognised: true,
    run: (b) => {
      if (/^(?:cycle|while)\s+.+\s*(?:::|\{)$/.test(b) || /^while\s*\(.*\)\s*\{?$/.test(b)) return null;
      const m = /^(?:while|as\s+long\s+as|cycle)\s+(.+?)\s*(?::|do)?$/i.exec(b);
      if (m) return `cycle ${fixExpr(m[1])} ::`;
      const u = /^(?:until)\s+(.+?)\s*(?::|do)?$/i.exec(b);
      if (u) return `cycle !(${fixExpr(u[1])}) ::`;
      return null;
    },
  },
  {
    name: 'block end',
    run: (b) => (/^(?:end(?:\s+(?:if|loop|while|for|function|setup))?|done|endif|fi)$/i.test(b) ? ';;' : null),
  },

  // ---- pins ----------------------------------------------------------
  {
    name: 'pin mode',
    run: (b) => {
      const mode = (w: string) => /pull/i.test(w) ? 'input_pullup' : /in/i.test(w) ? 'input' : 'output';
      let m = new RegExp(String.raw`^(?:set|make|configure|use|setup|set\s+up|declare)\s+(?:${PIN})\s+(?:as|to|to\s+be|for|=)?\s*(?:an?\s+)?(output|input(?:[\s_]pull-?up)?|pull-?up)\b`, 'i').exec(b);
      if (m) return `pin ${pinOf(m)} be ${mode(m[m.length - 2] ?? m[m.length - 1])}`;
      m = new RegExp(String.raw`^(?:${PIN})\s+(?:is|as|be|=)?\s*(?:an?\s+)?(output|input(?:[\s_]pull-?up)?|pull-?up)$`, 'i').exec(b);
      if (m) return `pin ${pinOf(m)} be ${mode(m[m.length - 2] ?? m[m.length - 1])}`;
      m = /^pinmode\s*\(?\s*(\w+)\s*,?\s*(output|input_pullup|input)\s*\)?$/i.exec(b);
      if (m) return `pin ${m[1]} be ${m[2].toLowerCase()}`;
      return null;
    },
  },
  {
    name: 'blink',
    run: (b) => {
      const m = new RegExp(String.raw`^(?:blink|flash)\s+(?:${PIN})(?:\s+(?:every|for|with)\s+(.+?)\s*(ms|milliseconds?|s|secs?|seconds?)?)?(?:\s+once)?$`, 'i').exec(b)
        ?? (/^(?:blink|flash)(?:\s+(?:every|for)\s+(.+?)\s*(ms|milliseconds?|s|secs?|seconds?)?)?$/i.exec(b) as RegExpExecArray | null);
      if (!m) return null;
      const p = pinOf(m);
      const groups = m.slice(1).filter((x, idx) => idx >= m.length - 3);
      const amtRaw = groups[0];
      const unitRaw = groups[1];
      const amt = amtRaw ? amount(amtRaw) : { value: '500', isNumber: true, num: 500 };
      const wait = amt ? waitLine(amt, unitRaw) : 'wait 500';
      return [`pin ${p} on`, wait ?? 'wait 500', `pin ${p} off`, wait ?? 'wait 500'];
    },
  },
  {
    name: 'turn on / off',
    run: (b) => {
      const on = /^(?:on|high|up)$/i;
      let m = new RegExp(String.raw`^(?:turn|switch|set|put|make)\s+(on|off)\s+(?:${PIN})$`, 'i').exec(b);
      if (m) return `pin ${pinOf(m)} ${/on/i.test(m[1]) ? 'on' : 'off'}`;
      m = new RegExp(String.raw`^(?:turn|switch|set|put|make)?\s*(?:${PIN})\s+(?:to\s+)?(on|off|high|low|up|down)$`, 'i').exec(b);
      if (m) {
        const v = m[m.length - 1 - Object.keys(m.groups ?? {}).length] ?? '';
        const last = b.trim().split(/\s+/).pop() ?? v;
        return `pin ${pinOf(m)} ${on.test(last) ? 'on' : 'off'}`;
      }
      m = new RegExp(String.raw`^(?:light\s+up|light|enable|activate|start)\s+(?:${PIN})$`, 'i').exec(b);
      if (m) return `pin ${pinOf(m)} on`;
      m = new RegExp(String.raw`^(?:darken|disable|deactivate|stop|kill)\s+(?:${PIN})$`, 'i').exec(b);
      if (m) return `pin ${pinOf(m)} off`;
      m = new RegExp(String.raw`^(?:toggle|flip|invert|switch)\s+(?:${PIN})$`, 'i').exec(b);
      if (m) return `pin ${pinOf(m)} toggle`;
      m = new RegExp(String.raw`^(?:write|send|output)\s+(high|low)\s+(?:to|on)\s+(?:${PIN})$`, 'i').exec(b);
      if (m) return `pin ${pinOf(m)} write ${b.match(/\b(high|low)\b/i)![1].toLowerCase()}`;
      m = /^digitalwrite\s*\(?\s*(\w+)\s*,?\s*(high|low|1|0)\s*\)?$/i.exec(b);
      if (m && !/^digitalWrite\s*\(/.test(b)) return `pin ${m[1]} write ${/high|1/i.test(m[2]) ? 'high' : 'low'}`;
      return null;
    },
  },
  {
    name: 'brightness / pwm',
    run: (b) => {
      const m = new RegExp(String.raw`^(?:set|fade|dim|change)\s+(?:the\s+)?(?:brightness|pwm|speed|level)?\s*(?:of\s+)?(?:${PIN})\s+(?:to|at)\s+(.+?)(%)?$`, 'i').exec(b);
      if (!m) return null;
      const raw = m[m.length - 2] ?? '';
      const pct = m[m.length - 1];
      const a = amount(raw);
      if (!a) return null;
      const v = pct && a.isNumber && a.num !== undefined ? String(Math.round((a.num / 100) * 255)) : a.value;
      return `pin ${pinOf(m)} pwm ${v}`;
    },
  },
  {
    name: 'tone',
    run: (b) => {
      let m = new RegExp(String.raw`^(?:beep|buzz|play(?:\s+an?)?(?:\s+tone|\s+note|\s+sound)?|tone|sound)\s+(?:on\s+)?(?:${PIN})\s+(?:at\s+)?(\d+)\s*(?:hz)?(?:\s+for\s+(.+?)\s*(ms|milliseconds?|s|secs?|seconds?)?)?$`, 'i').exec(b);
      let pin: string | undefined, freq: string | undefined, dur: string | undefined, unit: string | undefined;
      if (m) { pin = pinOf(m); const rest = m.slice(-3); [freq, dur, unit] = rest; }
      if (!m) {
        m = new RegExp(String.raw`^(?:beep|buzz|play(?:\s+an?)?(?:\s+tone|\s+note|\s+sound)?)\s+(?:at\s+)?(\d+)\s*(?:hz)?\s+on\s+(?:${PIN})(?:\s+for\s+(.+?)\s*(ms|milliseconds?|s|secs?|seconds?)?)?$`, 'i').exec(b);
        if (m) { pin = pinOf(m); freq = m[1]; const rest = m.slice(-2); [dur, unit] = rest; }
      }
      if (!m || !pin || !freq) return null;
      if (!dur) return `tone ${pin} ${freq}`;
      const a = amount(dur);
      if (!a || !a.isNumber || a.num === undefined) return null;
      const ms = /^s|sec/i.test(unit ?? '') ? Math.round(a.num * 1000) : a.num;
      return `tone ${pin} ${freq} ${ms}`;
    },
  },
  {
    name: 'stop tone',
    run: (b) => {
      const m = new RegExp(String.raw`^(?:stop(?:\s+the)?\s+(?:tone|sound|beep|buzzer|noise)|silence|mute|notone|no\s+tone)\s*(?:on\s+)?(?:${PIN})$`, 'i').exec(b);
      return m ? `notone ${pinOf(m)}` : null;
    },
  },

  // ---- time ----------------------------------------------------------
  {
    name: 'wait',
    alsoWhenRecognised: true,
    run: (b) => {
      const plain = /^wait\s+(?:\d+(?:\.\d+)?|[A-Za-z_]\w*)(?:\s+(?:ms|us|seconds?))?$/.test(b) && !/^wait\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|a|an|half)\b/i.test(b);
      if (plain && !/^wait\s+\d+\.\d+\s+seconds?$/.test(b)) return null;
      const m = /^(?:wait|sleep|delay|pause|hold(?:\s+on)?|rest|stay)\s*(?:for\s+)?(.+?)\s*(milliseconds?|millis|ms|seconds?|secs?|s|microseconds?|micros|us|µs|minutes?|mins?)?$/i.exec(b)
        ?? /^(?:time\.)?sleep\s*\(\s*(.+?)\s*\)()$/.exec(b);
      if (!m) return null;
      let unit = m[2];
      if (/sleep\s*\(/.test(b)) unit = 's';
      const a = amount(m[1]);
      if (!a) return null;
      return waitLine(a, unit);
    },
  },

  // ---- serial / text -------------------------------------------------
  {
    name: 'start serial',
    run: (b) => {
      const m = /^(?:start|begin|open|init(?:iali[sz]e)?|setup|set\s+up|use)\s+(?:the\s+)?serial(?:\s+(?:monitor|port|connection))?(?:\s+(?:at|with|on|to|speed))?\s*(\d+)?(?:\s*baud)?$/i.exec(b)
        ?? /^serial\s+(\d+)(?:\s*baud)?$/i.exec(b);
      return m ? `serial begin ${m[1] ?? '9600'}` : null;
    },
  },
  {
    name: 'print',
    alsoWhenRecognised: true,
    run: (b) => {
      if (/^(?:say|speak)\s*\(/.test(b) || /^Serial\./.test(b)) return null;
      let m = /^(?:print|println|printf|console\.log|echo|puts|show|display|log|output|write\s+line)\s*\((.*)\)$/i.exec(b);
      if (m) return `speak(${m[1].trim()})`;
      m = /^(?:say|speak)\s+(.+)$/.exec(b);
      if (m) {
        const p = printable(m[1]);
        return p === m[1].trim() ? null : `say ${p}`;
      }
      m = /^(?:print|println|echo|puts|show|display|log|output|send|tell|type)\s+(?:out\s+)?(.+?)(?:\s+(?:to|on)\s+(?:the\s+)?(?:serial|monitor|screen|computer|console)(?:\s+monitor)?)?$/i.exec(b);
      if (m) return `speak(${printable(m[1])})`;
      return null;
    },
  },

  // ---- variables -----------------------------------------------------
  {
    name: 'variable',
    alsoWhenRecognised: true,
    run: (b) => {
      const m = /^(let|var|const|make|create|auto)\s+([A-Za-z_]\w*)\s*(?:=|be|to|as|equal\s+to)\s*(.+?);?$/i.exec(b);
      if (!m) return null;
      return `${m[1].toLowerCase() === 'const' ? 'fixed ' : ''}forge ${m[2]} be ${fixExpr(m[3])}`;
    },
  },
  {
    name: 'increase / decrease',
    run: (b) => {
      let m = /^(?:increase|add\s+(\S+)\s+to|raise)\s+([A-Za-z_]\w*)(?:\s+by\s+(\S+))?$/i.exec(b);
      if (m) return `${m[2]} be ${m[2]} + ${m[1] ?? m[3] ?? '1'}`;
      m = /^(?:decrease|subtract\s+(\S+)\s+from|lower)\s+([A-Za-z_]\w*)(?:\s+by\s+(\S+))?$/i.exec(b);
      if (m) return `${m[2]} be ${m[2]} - ${m[1] ?? m[3] ?? '1'}`;
      return null;
    },
  },
];

const RECOGNISED_ONLY = RULES.filter((r) => r.alsoWhenRecognised);

function splitComment(body: string): { code: string; comment: string } {
  let inStr = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"' && body[i - 1] !== '\\') inStr = !inStr;
    if (!inStr && ch === '/' && body[i + 1] === '/') return { code: body.slice(0, i).trimEnd(), comment: ' ' + body.slice(i) };
  }
  return { code: body, comment: '' };
}

function splitStatements(code: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inStr = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"' && code[i - 1] !== '\\') inStr = !inStr;
    if (!inStr && ch === ';' && code[i + 1] !== ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function isComment(t: string): boolean {
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || (t.startsWith('#') && !/^#\s*(include|define|if|ifdef|ifndef|endif|pragma|undef|else|elif)\b/.test(t));
}

const C_TYPES = /^(?:unsigned|signed|const|static|volatile|extern|int|long|short|char|float|double|bool|boolean|byte|word|void|auto|String|uint\d+_t|int\d+_t|size_t|struct|class|enum|typedef|return|case|default|goto|delete|new)\b/;

/**
 * The transpiler is generous: anything with an operator, or starting with
 * `if`/`do`/`for`, is passed to C++ silently. Those still count as unknown
 * when they are clearly words, not code ("do the dance", "spin at 50%").
 */
export function reallyRecognised(line: string): boolean {
  if (!boardLineRecognised(line)) return false;
  const body = splitComment(line.trim()).code.trim();
  if (/(?:::|\{|;)$/.test(body) || body === 'otherwise' || body === 'else') return true;
  if (/^(?:if|while|for|switch|do)\b/.test(body) && !/^(?:(?:if|while|for|switch)\s*\(.*\)\s*\{?|do)$/.test(body)) return false;
  const code = body.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  if (/^[A-Za-z_][\w.:<>]*\s*\(/.test(code) || C_TYPES.test(code)) return true;
  return !/\b[A-Za-z_]\w*\s+[A-Za-z_]\w*\s+[A-Za-z_]\w*\b/.test(code);
}

const FINE_AS_IS = /^(?:use\s+"|device\s+\w+\s+be\s+|cpp\s*\{|[{}]$|;;$|::$)/;

/** One line → its reading. `resolved` is false when no rule could place an unknown line. */
function readLine(line: string, ctx: Ctx): { lines: string[]; rule: string | null; resolved: boolean } {
  const indent = /^[ \t]*/.exec(line)![0];
  const rest = line.slice(indent.length);
  const t = rest.trim();
  if (!t || isComment(t) || FINE_AS_IS.test(t)) return { lines: [line], rule: null, resolved: true };
  const { code, comment } = splitComment(rest);
  const body = strip(code.replace(/;\s*$/, (s) => (/^\w+\s*\(.*\)\s*;$/.test(code) ? s : '')));
  const recognised = reallyRecognised(line);
  // `turn 13 on ; wait 500ms` — several plain-word statements on one line
  if (!recognised && /;\s*\S/.test(body) && !/^for\s*\(/.test(body)) {
    const parts = splitStatements(body);
    if (parts.length > 1) {
      const read = parts.map((p) => readLine(indent + p, ctx));
      return { lines: read.flatMap((r) => r.lines), rule: 'several statements on a line', resolved: read.every((r) => r.resolved) };
    }
  }
  for (const rule of recognised ? RECOGNISED_ONLY : RULES) {
    const r = rule.run(body, ctx);
    if (r === null) continue;
    const out = Array.isArray(r) ? r : [r];
    if (out.length === 1 && out[0] === body) break;
    return { lines: out.map((l, k) => indent + l + (k === 0 ? comment : '')), rule: rule.name, resolved: true };
  }
  return { lines: [line], rule: null, resolved: recognised };
}

// ---------------------------------------------------------------
// Closing blocks people left open (Python-style indentation)
// ---------------------------------------------------------------
function opens(t: string): '::' | '{' | null {
  const { code } = splitComment(t);
  const c = code.trim();
  if (/(?<![\w])::$/.test(c) || c === '::') return '::';
  if (c.endsWith('{') && !/^cpp\s*\{$/.test(c)) return '{';
  return null;
}
function closes(t: string): boolean {
  const c = splitComment(t).code.trim();
  return c === ';;' || c === '}' || c === 'end';
}

function balanced(lines: string[]): boolean {
  let depth = 0;
  let prevClosed = false;
  for (const l of lines) {
    const t = l.trim();
    if (!t || isComment(t)) continue;
    // `otherwise ::` right after its `ponder` body (no `;;`) closes and reopens in one go
    const cont = /^(?:otherwise|else|elif)\b/.test(t);
    if (closes(t)) depth--;
    else if (opens(t) && (!cont || prevClosed)) depth++;
    prevClosed = closes(t);
    if (depth < 0) return false;
  }
  return depth === 0;
}

function closeByIndent(lines: string[]): string[] {
  const out: string[] = [];
  const stack: { indent: number; pad: string; closer: string }[] = [];
  for (const l of lines) {
    const t = l.trim();
    if (!t || isComment(t)) { out.push(l); continue; }
    const ind = indentOf(l);
    if (closes(t)) { stack.pop(); out.push(l); continue; }
    const cont = /^(?:otherwise|else|elif)\b/.test(t);
    while (stack.length && ind <= stack[stack.length - 1].indent) {
      const top = stack[stack.length - 1];
      if (cont && ind === top.indent) { stack.pop(); break; }
      // keep blank lines after the closer
      let k = out.length;
      while (k > 0 && out[k - 1].trim() === '') k--;
      out.splice(k, 0, top.pad + top.closer);
      stack.pop();
    }
    out.push(l);
    const o = opens(t);
    if (o) stack.push({ indent: ind, pad: /^[ \t]*/.exec(l)![0], closer: o === '{' ? '}' : ';;' });
  }
  while (stack.length) {
    const top = stack.pop()!;
    let k = out.length;
    while (k > 0 && out[k - 1].trim() === '') k--;
    out.splice(k, 0, top.pad + top.closer);
  }
  return out;
}

// ---------------------------------------------------------------
// Every Arduino sketch needs setup() and loop(). Statements written straight
// inside the board block (script style) are what should happen at start-up.
// ---------------------------------------------------------------
const GLOBAL_LINE = /^(?:use\s+"|device\s|(?:fixed\s+|keep\s+|volatile\s+)*forge\s|define\s|cpp\s*\{|#)/;
const FUNCTION_LINE = /^(?:conjure\s+\w+\s*\(|to\s+\w+|(?:void|int|long|float|bool|byte|auto|String)\s+\w+\s*\([^)]*\)\s*\{)/;

function ensureSetupLoop(lines: string[], useBrace: boolean): { lines: string[]; changed: boolean } {
  const code = lines.map((l) => l.trim());
  const hasSetup = code.some((t) => /^(?:conjure\s+setup\s*\(|to\s+setup\b|void\s+setup\s*\()/.test(t));
  const hasLoop = code.some((t) => /^(?:conjure\s+loop\s*\(|to\s+loop\b|void\s+loop\s*\()/.test(t));
  if (hasSetup && hasLoop) return { lines, changed: false };
  // split into top-level pieces
  const loose: string[] = [];
  const kept: string[] = [];
  let firstLoose = -1;
  let depth = 0;
  let inFunction = false;
  let prevClosed = false;
  let pieceIsLoose = false;
  for (const l of lines) {
    const t = l.trim();
    if (!t || isComment(t)) { (depth > 0 && pieceIsLoose ? loose : kept).push(l); continue; }
    if (depth === 0) {
      inFunction = FUNCTION_LINE.test(t);
      pieceIsLoose = !inFunction && !GLOBAL_LINE.test(t);
      if (pieceIsLoose && firstLoose < 0) firstLoose = kept.length;
    }
    (pieceIsLoose ? loose : kept).push(l);
    const cont = /^(?:otherwise|else|elif)\b/.test(t);
    if (closes(t)) depth = Math.max(0, depth - 1);
    else if (opens(t) && (!cont || prevClosed)) depth++;
    prevClosed = closes(t);
  }
  if (loose.length === 0 && hasSetup === hasLoop && hasSetup) return { lines, changed: false };
  if (hasSetup && loose.length) return { lines, changed: false }; // can't tell where they belong — leave them
  const pad = /^[ \t]*/.exec(lines.find((l) => l.trim()) ?? '')![0];
  const open = useBrace ? '{' : '::';
  const close = useBrace ? '}' : ';;';
  const out = [...kept];
  if (!hasSetup) {
    while (loose.length && loose[loose.length - 1].trim() === '') loose.pop();
    const setup = [`${pad}conjure setup() ${open}`, ...loose.map((l) => (l.trim() ? '  ' + l : l)), `${pad}${close}`];
    out.splice(firstLoose < 0 ? 0 : firstLoose, 0, ...setup);
  }
  if (!hasLoop) out.push(`${pad}conjure loop() ${open}`, `${pad}${close}`);
  return { lines: out, changed: true };
}

// ---------------------------------------------------------------
// Board ids people actually type
// ---------------------------------------------------------------
function boardIdFor(raw: string): string {
  const id = raw.trim();
  if (findBoardById(id)) return id;
  const norm = id.toLowerCase().replace(/^arduino\s+/, '').replace(/\s*\(.*\)\s*$/, '').trim();
  if (findBoardById(norm)) return norm;
  const dashed = norm.replace(/\s+/g, '-');
  if (findBoardById(dashed)) return dashed;
  const byLabel = BOARDS.find((b) => b.label.toLowerCase().replace(/^arduino\s+/, '').replace(/\s*\(.*\)\s*$/, '') === norm);
  if (byLabel) return byLabel.id;
  if (/^uno(?:\s*r3)?$/.test(norm)) return 'uno';
  return id;
}

// ---------------------------------------------------------------
// Reading one block / the whole file
// ---------------------------------------------------------------
/** Read a single board block (header line included). `firstLine` is its 1-based line in the file. */
export function readBoardBlock(text: string, firstLine = 1, strict = true): { text: string; notes: BoardNote[]; unresolved: number[] } {
  const notes: BoardNote[] = [];
  const unresolved: number[] = [];
  const lines = text.split('\n');
  const header = HEADER_RE.exec(lines[0]);
  let headerOut = lines[0];
  let useBrace = false;
  if (header) {
    const rawId = header[2] ?? header[3] ?? header[4] ?? '';
    const id = boardIdFor(rawId);
    useBrace = header[5] === '{';
    const canonical = `${header[1]}board "${id}" ${useBrace ? '{' : '::'}`;
    if (!strict || id !== rawId || header[4] !== undefined || header[3] !== undefined) {
      if (canonical !== lines[0]) {
        headerOut = canonical;
        notes.push({ line: firstLine, from: lines[0].trim(), to: canonical.trim(), why: 'board header' });
      }
    }
  }

  // body = everything between the header and (for complete blocks) the final closer
  let bodyEnd = lines.length;
  let tail: string[] = [];
  if (strict) {
    let k = lines.length - 1;
    while (k > 0 && lines[k].trim() === '') k--;
    if (k > 0 && /^(?:;;|\})$/.test(lines[k].trim())) { bodyEnd = k; tail = lines.slice(k); }
  }
  const body = lines.slice(1, bodyEnd);
  const baseIndent = Math.min(...body.filter((l) => l.trim()).map(indentOf), Infinity);
  const outBody: string[] = [];
  let depth = 0;
  body.forEach((line, idx) => {
    const t = line.trim();
    const lineNo = firstLine + 1 + idx;
    const ctx: Ctx = { topLevel: depth === 0 || indentOf(line) <= baseIndent };
    const r = readLine(line, ctx);
    if (r.rule) notes.push({ line: lineNo, from: t, to: r.lines.map((l) => l.trim()).join(' / '), why: r.rule });
    if (!r.resolved) unresolved.push(lineNo);
    for (const l of r.lines) {
      const lt = l.trim();
      if (closes(lt)) depth = Math.max(0, depth - 1);
      else if (opens(lt)) depth++;
    }
    outBody.push(...r.lines);
  });

  let fixedBody = outBody;
  if (!strict || !balanced(outBody)) {
    const closed = closeByIndent(outBody);
    if (balanced(closed)) {
      if (closed.join('\n') !== outBody.join('\n')) {
        notes.push({ line: firstLine, from: '', to: '', why: 'closed the blocks that were left open' });
      }
      fixedBody = closed;
    }
  }
  if (!strict) {
    // the author's own closing `end` for the board block becomes its `;;`
    let k = fixedBody.length - 1;
    while (k >= 0 && fixedBody[k].trim() === '') k--;
    if (k >= 0 && /^(?:end|;;|\})$/.test(fixedBody[k].trim()) && indentOf(fixedBody[k]) <= (header ? indentOf(header[1]) : 0)) {
      fixedBody = [...fixedBody.slice(0, k), ...fixedBody.slice(k + 1)];
    }
  }
  // `end` (v2 style) closes blocks too, but only `;;` / `}` delimit the board block itself
  fixedBody = fixedBody.map((l) => {
    if (l.trim() !== 'end') return l;
    return /^[ \t]*/.exec(l)![0] + (useBrace ? '}' : ';;');
  });
  const wrapped = ensureSetupLoop(fixedBody, useBrace);
  if (wrapped.changed) {
    notes.push({ line: firstLine, from: '', to: '', why: 'put the start-up lines in setup() — every Arduino program needs setup() and loop()' });
    fixedBody = wrapped.lines;
  }
  if (!strict) {
    const pad = header ? header[1] : '';
    let trailing = 0;
    while (fixedBody.length && fixedBody[fixedBody.length - 1].trim() === '') { fixedBody = fixedBody.slice(0, -1); trailing++; }
    tail = [pad + (useBrace ? '}' : ';;'), ...Array(trailing).fill('')];
  }
  return { text: [headerOut, ...fixedBody, ...tail].join('\n'), notes, unresolved };
}

/** Read every board block in a file. Lines outside board blocks are untouched. */
export function readBoards(source: string): BoardReading {
  const spans = findBoardSpans(source);
  if (spans.length === 0) return { source, notes: [], unresolved: [], hasBoard: false };
  let out = '';
  let last = 0;
  const notes: BoardNote[] = [];
  const unresolved: number[] = [];
  let lineShift = 0;
  for (const s of spans) {
    out += source.slice(last, s.start);
    const firstLine = source.slice(0, s.start).split('\n').length;
    const text = source.slice(s.start, s.end);
    const r = readBoardBlock(text, firstLine + lineShift, s.strict);
    out += r.text;
    notes.push(...r.notes);
    unresolved.push(...r.unresolved);
    lineShift += r.text.split('\n').length - text.split('\n').length;
    last = s.end;
  }
  out += source.slice(last);
  return { source: out, notes, unresolved, hasBoard: true };
}

/** Lines in a board block the transpiler would pass through without understanding. */
export function unknownBoardLines(blockText: string): number[] {
  const out: number[] = [];
  blockText.split('\n').forEach((l, i) => {
    if (i === 0) return;
    const t = l.trim();
    if (!t || isComment(t) || FINE_AS_IS.test(t)) return;
    if (!reallyRecognised(l)) out.push(i + 1);
  });
  return out;
}

/** What the AI brain is told about the hardware language (each item ≤ 300 chars). */
export const BOARD_GUIDE: string[] = [
  'This is a board "<id>" :: ... ;; block: Arduino firmware written in the sdev hardware language, NOT normal sdev. Keep the board block and answer with the whole file. Keep every line that is already valid exactly as it is.',
  'Functions: conjure setup() :: ... ;;  and  conjure loop() :: ... ;;  (any function: conjure name(a, b) :: ... ;;). Every :: block ends with ;; on its own line.',
  'Pins: pin 13 be output | pin 2 be input_pullup | pin led on | pin 13 off | pin led toggle | pin 9 write high | pin 9 pwm 128 | read pin 2 | read analog A0. `led` means the built-in LED.',
  'Time: wait 500 (milliseconds) | wait 2 seconds | wait 10 us. Serial: serial begin 9600 | speak("text", value). Sound: tone 8 440 200 | notone 8.',
  'Logic: forge x be 0 | x be x + 1 | ponder x > 3 :: ... ;; otherwise :: ... ;; | cycle x < 10 :: ... ;; | within i be sequence(0, 10) :: ... ;;. Arduino C++ calls like digitalWrite(13, HIGH) and Serial.println(x) are also valid.',
];
