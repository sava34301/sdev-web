// SDEV v2 compiler rules added for the OCE work.
//   node scripts/test-v2-diagnostics.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compile as selfCompile } from '../src/lang-bridge/compile-self.mjs';

const dir = mkdtempSync(join(tmpdir(), 'sdev-v2-'));
let pass = 0, fail = 0;
function runSrc(name, src) {
  const f = join(dir, name + '.sdev');
  writeFileSync(f, src);
  try {
    return { code: 0, out: execFileSync('node', ['bin/sdevhost.mjs', f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? ''), err: String(e.stderr ?? '') };
  }
}
function check(name, ok, info) {
  if (ok) { pass++; console.log(`ok   ${name}`); } else { fail++; console.log(`FAIL ${name}`, info ?? ''); }
}

let r = runSrc('concat', 'use "lang/stdlib/v2/list.sdev"\nset xs to [1, 2]\nset xs to xs + [3]\nset ys to [0] + xs\nsay length(ys)\nsay ys[3]\n');
check('list + [items] joins lists', r.out === '4\n3\n', r);
r = runSrc('concat-nolib', 'set xs to [1] + [2]\nsay 1\n');
check('list + without list library is a clear error', r.code !== 0 && /joining lists with \+ needs use/.test(r.err), r);
r = runSrc('kindparam', 'to f with kind\n  return kind * 2\nend\nsay f(4)\nset kind to 3\nsay kind\n');
check('`kind` works as a parameter and variable name', r.out === '8\n3\n', r);
r = runSrc('kindclass', 'kind Dot\n  to show with self\n    return 7\n  end\nend\nset d to new Dot\nsay d.show()\n');
check('`kind Name` still declares a class', r.out === '7\n', r);
r = runSrc('arity', 'to g with a b\n  return a\nend\nsay g(1)\n');
check('wrong argument count is reported', r.code !== 0 && /g: expected 2 args, got 1/.test(r.err), r);
r = runSrc('unknown', 'say zzz(1)\n');
check('unknown function is reported', r.code !== 0 && /unknown function zzz/.test(r.err), r);
r = runSrc('dialect-text', 'say text(42)\nsay text("ahoy")\nsay str("ahoy")\nattempt\n  throw "boom"\nrescue e\n  say "caught " + text(e)\nend\n');
check('dialect text alias converts integers and preserves strings and rescued errors', r.out === '42\nahoy\nahoy\ncaught boom\n', r);
r = runSrc('dialect-len', 'say len("ahoy")\nsay len([4, 5, 6])\n');
check('dialect len alias counts strings and lists', r.out === '4\n3\n', r);
r = runSrc('text-arity', 'say text(1, 2)\n');
check('text alias checks argument count', r.code !== 0 && /text: expected 1 args, got 2/.test(r.err), r);
r = runSrc('andor', 'say 2 and 3\nsay 0 or 5\nsay 0 and 1\nsay 0 or 0\nsay 2 or 0\n');
check('and / or give 0 or 1', r.out === '1\n1\n0\n0\n1\n', r);
r = runSrc('short-circuit', 'to rhs\n  say "right side"\n  return 2\nend\nsay 0 and rhs()\nsay 1 or rhs()\nsay 1 and rhs()\nsay 0 or rhs()\n');
check('and / or evaluate the right side only when needed', r.out === '0\n1\nright side\n1\nright side\n1\n', r);

// Nested `make` closures inside a function must not clobber enclosing local slots
r = runSrc('nested-make', [
  'to outer_fn with x y',
  '  set f to make with a capture x',
  '    set g to make with b capture a',
  '      return a + b + 1',
  '    end',
  '    return x + call g(10)',
  '  end',
  '  return y + call f(5)',
  'end',
  'say outer_fn(100, 2000)',
].join('\n'));
check('nested make closures preserve enclosing local slots', r.out === '2116\n', r);

// Direct self-hosted compiler error channel (without oracle/compile.mjs)
async function selfCompileErr(src) {
  try {
    await selfCompile(src);
    return null;
  } catch (e) {
    return String(e?.message ?? e);
  }
}

check('self-hosted compiler error channel: unknown function', /unknown function zzz/.test((await selfCompileErr('say zzz(1)\n')) ?? ''));
check('self-hosted compiler error channel: wrong arity', /g: expected 2 args, got 1/.test((await selfCompileErr('to g with a b\n  return a\nend\nsay g(1)\n')) ?? ''));
check('self-hosted compiler error channel: builtin arity', /length: expected 1 args, got 2/.test((await selfCompileErr('say length("a", "b")\n')) ?? ''));
check('self-hosted compiler error channel: list + without list.sdev', /joining lists with \+ needs use/.test((await selfCompileErr('set xs to [1] + [2]\n')) ?? ''));
check('self-hosted compiler error channel: unknown kind', /unknown kind Ghost/.test((await selfCompileErr('set g to new Ghost()\n')) ?? ''));
check('self-hosted compiler error channel: break outside loop', /break outside of a loop/.test((await selfCompileErr('break\n')) ?? ''));

rmSync(dir, { recursive: true, force: true });
console.log(`\nv2 diagnostics: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
