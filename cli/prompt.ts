/**
 * Terminal prompts. Password entry is genuinely masked: readline's own
 * echo is bypassed and the raw keystrokes are read from stdin.
 */
import { createInterface } from 'node:readline';

export function ask(question: string): Promise<string> {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.question(question, (answer) => { rl.close(); res(answer.trim()); });
  });
}

export function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) return ask(question);

  return new Promise((res, rej) => {
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let buffer = '';

    const finish = (value: string | null) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      process.stdout.write('\n');
      if (value === null) rej(new Error('cancelled'));
      else res(value);
    };

    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return finish(buffer);
        if (ch === '\u0003') return finish(null);          // Ctrl+C
        if (ch === '\u007f' || ch === '\b') {              // backspace
          if (buffer.length) { buffer = buffer.slice(0, -1); process.stdout.write('\b \b'); }
          continue;
        }
        if (ch < ' ') continue;
        buffer += ch;
        process.stdout.write('*');
      }
    };

    stdin.on('data', onData);
  });
}

/** Password from --password, then $SDEV_PASSWORD, then a masked prompt. */
export async function password(explicit?: string, label = 'password: '): Promise<string> {
  if (explicit) return explicit;
  if (process.env.SDEV_PASSWORD) return process.env.SDEV_PASSWORD;
  const value = await askHidden(label);
  if (!value) throw new Error('no password entered');
  return value;
}
