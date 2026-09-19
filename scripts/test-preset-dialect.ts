/**
 * The shipped dialects are real: they validate, their sample program
 * canonicalizes, and the canonical form runs and prints what it should.
 */
import { presetList } from '../src/lang/dialect/presets';
import { validateDialect } from '../src/lang/dialect/spec';
import { canonicalize } from '../src/lang/dialect/canonicalize';
import { Lexer } from '../src/lang/lexer';
import { Parser } from '../src/lang/parser';
import { Interpreter } from '../src/lang/interpreter';

let pass = 0;
const failures: string[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else failures.push(`${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
}

function run(source: string): string[] {
  const out: string[] = [];
  const tokens = new Lexer(source, { sourceLanguage: 'English', translate: false }).tokenize();
  const ast = new Parser(tokens).parse();
  const interp = new Interpreter((text: string) => out.push(text));
  interp.interpret(ast);
  return out;
}

for (const preset of presetList()) {
  const slug = preset.spec.meta.slug;
  check(`${slug}: validates`, validateDialect(preset.spec).filter((i) => i.level === 'error'), []);

  const { source, prelude } = canonicalize(preset.sample, preset.spec, { withPrelude: true });
  check(`${slug}: has a prelude`, prelude.trim().length > 0, true);
  check(`${slug}: no dialect words left`, /кажи|нека|край/.test(source.replace(/^#.*$/gm, '')), false);

  const output = run(source).join('\n');
  if (slug === 'sdev-bg') {
    check('sdev-bg: program output', output.split('\n'), ['здравей, свят', '0', 'едно', '2', '10']);
  }
}

console.log(failures.length ? `${pass} passed, ${failures.length} failed\n\n${failures.join('\n\n')}` : `${pass} passed`);
process.exit(failures.length ? 1 : 0);
