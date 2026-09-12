/**
 * `sdev edit <file>` — a small full-screen editor for sdev source, in the
 * terminal. Same pipeline as `sdev run`, so Ctrl+R executes exactly what the
 * IDE would: active dialect, enabled extensions, chosen runtime.
 *
 * Ctrl+S save · Ctrl+R run · Ctrl+F find · Ctrl+G go to line · Ctrl+Q quit
 */
import './env';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { KEYWORD_SPECS } from '@/lang/keywords';
import { stripSignature } from '@/lang/dialect/signature';
import { formatSdev } from '@/components/ide/formatSdev';
import { prepare, runPrepared, type PrepareOptions } from './pipeline';
import { activeDialect, runtimePreference } from './store';

/* ---------------------------------------------------------------- */
/* colours                                                           */
/* ---------------------------------------------------------------- */

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  gutter: '\x1b[38;5;240m',
  keyword: '\x1b[38;5;75m',
  string: '\x1b[38;5;150m',
  number: '\x1b[38;5;215m',
  comment: '\x1b[38;5;244m',
  status: '\x1b[48;5;236m\x1b[38;5;253m',
  accent: '\x1b[38;5;81m',
  warn: '\x1b[38;5;215m',
};

const KEYWORDS = new Set<string>(
  KEYWORD_SPECS.flatMap((k) => [k.mystic, k.plain, ...(k.aliases ?? [])]).filter(Boolean),
);

/** Colourise one line of sdev, leaving its printable width unchanged. */
function highlight(line: string): string {
  let out = '';
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '#' || (ch === '/' && line[i + 1] === '/')) {
      return out + C.comment + line.slice(i) + C.reset;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) j += line[j] === '\\' ? 2 : 1;
      out += C.string + line.slice(i, Math.min(j + 1, line.length)) + C.reset;
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(ch) && !/[A-Za-z_]/.test(line[i - 1] ?? '')) {
      let j = i;
      while (j < line.length && /[0-9._]/.test(line[j])) j++;
      out += C.number + line.slice(i, j) + C.reset;
      i = j;
      continue;
    }
    if (/[A-Za-z_\u0080-\uffff]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_\u0080-\uffff]/.test(line[j])) j++;
      const word = line.slice(i, j);
      out += KEYWORDS.has(word) ? C.keyword + word + C.reset : word;
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/* ---------------------------------------------------------------- */
/* editor                                                            */
/* ---------------------------------------------------------------- */

interface EditorOptions extends PrepareOptions {
  /** create the file on first save if it does not exist yet */
  path: string;
}

export async function runEditor(opts: EditorOptions): Promise<void> {
  const path = resolve(process.cwd(), opts.path);
  const existed = existsSync(path);
  const raw = existed ? readFileSync(path, 'utf8') : '';
  let lines = stripSignature(raw).split('\n');
  if (!lines.length) lines = [''];

  let cy = 0, cx = 0, top = 0, left = 0;
  let dirty = false;
  let message = existed ? `opened ${basename(path)}` : `new file ${basename(path)}`;
  let lastFind = '';
  let quitConfirm = false;

  const stdin = process.stdin;
  const stdout = process.stdout;
  if (!stdin.isTTY) throw new Error('sdev edit needs an interactive terminal');

  const rows = () => Math.max(6, stdout.rows || 24);
  const cols = () => Math.max(30, stdout.columns || 80);
  const textRows = () => rows() - 2;
  const gutterWidth = () => String(lines.length).length + 1;
  const textCols = () => cols() - gutterWidth() - 1;

  const clamp = () => {
    cy = Math.max(0, Math.min(cy, lines.length - 1));
    cx = Math.max(0, Math.min(cx, lines[cy].length));
    if (cy < top) top = cy;
    if (cy >= top + textRows()) top = cy - textRows() + 1;
    if (cx < left) left = cx;
    if (cx >= left + textCols()) left = cx - textCols() + 1;
    if (left < 0) left = 0;
  };

  const draw = () => {
    clamp();
    const w = cols();
    const gw = gutterWidth();
    const parts: string[] = ['\x1b[?25l\x1b[H'];
    for (let r = 0; r < textRows(); r++) {
      const idx = top + r;
      parts.push('\x1b[K');
      if (idx < lines.length) {
        const num = String(idx + 1).padStart(gw - 1, ' ');
        const slice = lines[idx].slice(left, left + textCols());
        parts.push(C.gutter + num + ' ' + C.reset + highlight(slice));
      } else {
        parts.push(C.gutter + '~' + C.reset);
      }
      parts.push('\r\n');
    }

    const rt = (opts.runtime ?? runtimePreference());
    const dia = activeDialect();
    const status = ` ${dirty ? '●' : ' '} ${basename(path)}  ${lines.length} lines  ln ${cy + 1}, col ${cx + 1}  runtime ${rt}  dialect ${dia ? dia.meta.slug : 'canonical'} `;
    parts.push('\x1b[K' + C.status + status.padEnd(w).slice(0, w) + C.reset + '\r\n');

    const help = message
      ? C.accent + ' ' + message
      : C.dim + ' ^S save  ^R run  ^F find  ^G line  ^K cut  ^L format  ^Q quit';
    parts.push('\x1b[K' + help.slice(0, w + 20) + C.reset);

    parts.push(`\x1b[${cy - top + 1};${cx - left + gw + 1}H\x1b[?25h`);
    stdout.write(parts.join(''));
  };

  const enter = () => {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdout.write('\x1b[?1049h');
  };
  const leave = () => {
    stdout.write('\x1b[?1049l\x1b[?25h');
    stdin.setRawMode(false);
    stdin.pause();
  };

  const save = () => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, lines.join('\n'));
    dirty = false;
    message = `saved ${basename(path)}`;
  };

  /** Ask a one-line question on the bottom row. */
  const askInline = (question: string): Promise<string> =>
    new Promise((res) => {
      let buf = '';
      const render = () => {
        stdout.write(`\x1b[${rows()};1H\x1b[K` + C.accent + question + C.reset + buf);
      };
      render();
      const onKey = (chunk: string) => {
        for (const ch of chunk) {
          if (ch === '\r' || ch === '\n') { stdin.removeListener('data', onKey); return res(buf); }
          if (ch === '\u001b' || ch === '\u0003') { stdin.removeListener('data', onKey); return res(''); }
          if (ch === '\u007f' || ch === '\b') { buf = buf.slice(0, -1); render(); continue; }
          if (ch < ' ') continue;
          buf += ch;
          render();
        }
      };
      stdin.on('data', onKey);
    });

  const find = (needle: string, fromLine: number, fromCol: number) => {
    for (let i = 0; i < lines.length; i++) {
      const idx = (fromLine + i) % lines.length;
      const start = i === 0 ? fromCol : 0;
      const at = lines[idx].indexOf(needle, start);
      if (at >= 0) { cy = idx; cx = at; return true; }
    }
    return false;
  };

  const run = async () => {
    leave();
    stdout.write('\x1b[2J\x1b[H' + C.accent + `running ${basename(path)}` + C.reset + '\n\n');
    const started = Date.now();
    try {
      const prepared = prepare(lines.join('\n'), opts);
      const outcome = await runPrepared(prepared, path, opts);
      if (!outcome.success) stdout.write('\n' + C.warn + 'error: ' + (outcome.error ?? 'program failed') + C.reset + '\n');
    } catch (e) {
      stdout.write('\n' + C.warn + 'error: ' + (e instanceof Error ? e.message : String(e)) + C.reset + '\n');
    }
    stdout.write('\n' + C.dim + `finished in ${Date.now() - started} ms — press any key to return` + C.reset + '\n');
    await new Promise<void>((res) => {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.once('data', () => res());
    });
    enter();
  };

  enter();
  draw();

  await new Promise<void>((done) => {
    const onData = async (chunk: string) => {
      let redraw = true;
      let keepMessage = false;

      // Arrow keys and friends arrive as escape sequences.
      if (chunk.startsWith('\u001b[') || chunk.startsWith('\u001bO')) {
        const seq = chunk.slice(2);
        if (seq === 'A') cy--;
        else if (seq === 'B') cy++;
        else if (seq === 'C') { if (cx < lines[cy].length) cx++; else if (cy < lines.length - 1) { cy++; cx = 0; } }
        else if (seq === 'D') { if (cx > 0) cx--; else if (cy > 0) { cy--; cx = lines[cy].length; } }
        else if (seq === 'H' || seq === '1~' || seq === '7~') cx = 0;
        else if (seq === 'F' || seq === '4~' || seq === '8~') cx = lines[cy].length;
        else if (seq === '5~') { cy -= textRows(); top -= textRows(); }
        else if (seq === '6~') { cy += textRows(); top += textRows(); }
        else if (seq === '3~') {
          if (cx < lines[cy].length) { lines[cy] = lines[cy].slice(0, cx) + lines[cy].slice(cx + 1); dirty = true; }
          else if (cy < lines.length - 1) { lines[cy] += lines[cy + 1]; lines.splice(cy + 1, 1); dirty = true; }
        }
        if (top < 0) top = 0;
        if (redraw) { if (!keepMessage) message = ''; draw(); }
        return;
      }

      for (const ch of chunk) {
        switch (ch) {
          case '\u0011': { // Ctrl+Q
            if (dirty && !quitConfirm) { quitConfirm = true; message = 'unsaved changes — press Ctrl+Q again to discard, Ctrl+S to save'; keepMessage = true; break; }
            stdin.removeListener('data', onData);
            leave();
            return done();
          }
          case '\u0013': // Ctrl+S
            save();
            keepMessage = true;
            break;
          case '\u0012': // Ctrl+R
            if (dirty) save();
            stdin.removeListener('data', onData);
            await run();
            stdin.on('data', onData);
            message = '';
            break;
          case '\u000c': // Ctrl+L — format
            lines = formatSdev(lines.join('\n')).split('\n');
            dirty = true;
            message = 'formatted';
            keepMessage = true;
            break;
          case '\u000b': // Ctrl+K — cut line
            if (lines.length === 1) lines[0] = '';
            else lines.splice(cy, 1);
            cx = 0;
            dirty = true;
            break;
          case '\u0007': { // Ctrl+G — go to line
            stdin.removeListener('data', onData);
            const answer = await askInline('go to line: ');
            stdin.on('data', onData);
            const n = parseInt(answer, 10);
            if (n > 0) { cy = n - 1; cx = 0; }
            break;
          }
          case '\u0006': { // Ctrl+F — find
            stdin.removeListener('data', onData);
            const answer = await askInline(`find${lastFind ? ` [${lastFind}]` : ''}: `);
            stdin.on('data', onData);
            const needle = answer || lastFind;
            if (needle) {
              lastFind = needle;
              message = find(needle, cy, cx + 1) ? `found "${needle}"` : `"${needle}" not found`;
              keepMessage = true;
            }
            break;
          }
          case '\u0003': // Ctrl+C — same as quit guard
            if (dirty && !quitConfirm) { quitConfirm = true; message = 'unsaved changes — press Ctrl+C again to discard'; keepMessage = true; break; }
            stdin.removeListener('data', onData);
            leave();
            return done();
          case '\r':
          case '\n': {
            const rest = lines[cy].slice(cx);
            const indent = (lines[cy].match(/^\s*/) ?? [''])[0];
            lines[cy] = lines[cy].slice(0, cx);
            lines.splice(cy + 1, 0, indent + rest);
            cy++;
            cx = indent.length;
            dirty = true;
            break;
          }
          case '\u007f':
          case '\b':
            if (cx > 0) { lines[cy] = lines[cy].slice(0, cx - 1) + lines[cy].slice(cx); cx--; }
            else if (cy > 0) { cx = lines[cy - 1].length; lines[cy - 1] += lines[cy]; lines.splice(cy, 1); cy--; }
            dirty = true;
            break;
          case '\t':
            lines[cy] = lines[cy].slice(0, cx) + '  ' + lines[cy].slice(cx);
            cx += 2;
            dirty = true;
            break;
          default:
            if (ch >= ' ') {
              lines[cy] = lines[cy].slice(0, cx) + ch + lines[cy].slice(cx);
              cx++;
              dirty = true;
            } else {
              redraw = false;
            }
        }
        if (ch !== '\u0011' && ch !== '\u0003') quitConfirm = false;
      }

      if (redraw) {
        if (!keepMessage) message = '';
        draw();
      }
    };

    stdin.on('data', onData);
    stdout.on('resize', draw);
  });

  if (dirty) console.log(`discarded unsaved changes to ${basename(path)}`);
}
