import { Lexer } from '@/lang/core/lexer';
import { Parser } from '@/lang/core/parser';
import { Interpreter } from '@/lang/runtime/interpreter';
import { SdevError } from '@/lang/core/errors';

export interface RunResult { lines: string[]; error?: string; ms: number }

/** Runs sdev source with the real in-repo lexer → parser → interpreter (keywords in any supported language). */
export function runSdev(code: string): RunResult {
  const lines: string[] = [];
  const t0 = performance.now();
  try {
    const ast = new Parser(new Lexer(code, { sourceLanguage: 'auto' }).tokenize()).parse();
    new Interpreter((msg) => lines.push(msg)).interpret(ast);
    return { lines, ms: performance.now() - t0 };
  } catch (e) {
    return { lines, error: e instanceof SdevError ? e.message : String(e), ms: performance.now() - t0 };
  }
}

export function openInIde(src: string, name: string, navigate: (to: string) => void) {
  sessionStorage.setItem('sdev:imported_code', src);
  sessionStorage.setItem('sdev:imported_name', name);
  navigate('/ide');
}

export const HOME_EXAMPLES = [
  { id: 'hello', name: 'hello.sdev', code: `forge name be "Ada"\nspeak("Hello, " + name + "!")\n\nforge total be 12 * 4\nspeak(total)` },
  { id: 'functions', name: 'functions.sdev', code: `conjure add(a, b) ::\n  yield a + b\n;;\n\nconjure max(a, b) ::\n  ponder a > b :: yield a ;;\n  yield b\n;;\n\nspeak(add(10, 20))\nspeak(max(5, 9))` },
  { id: 'loops', name: 'loops.sdev', code: `forge fruits be ["apple", "banana", "cherry"]\n\niterate fruit through fruits ::\n  speak(fruit)\n;;\n\nforge n be 1\ncycle n <= 3 ::\n  speak("lap " + n)\n  n be n + 1\n;;` },
  { id: 'pipe', name: 'pipe.sdev', code: `forge result be [1, 2, 3, 4, 5]\n  |> each(x -> x * 2)\n  |> sift(x -> x > 4)\n  |> weave(", ")\n\nspeak(result)` },
  { id: 'essence', name: 'person.sdev', code: `essence Person ::\n  conjure init(self, name, age) ::\n    self.name be name\n    self.age be age\n  ;;\n\n  conjure greet(self) ::\n    speak("Hi, I'm " + self.name)\n  ;;\n;;\n\nforge alice be new Person("Alice", 30)\nalice.greet()` },
];
