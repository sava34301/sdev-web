// SDEV v2 compiler rules added for the OCE work.
//   node scripts/test-v2-diagnostics.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
r = runSrc('andor', 'say 2 and 3\nsay 0 or 5\nsay 0 and 1\nsay 0 or 0\nsay 2 or 0\n');
check('and / or give 0 or 1', r.out === '1\n1\n0\n0\n1\n', r);
r = runSrc('short-circuit', 'to rhs\n  say "right side"\n  return 2\nend\nsay 0 and rhs()\nsay 1 or rhs()\nsay 1 and rhs()\nsay 0 or rhs()\n');
check('and / or evaluate the right side only when needed', r.out === '0\n1\nright side\n1\nright side\n1\n', r);

console.log(`\nv2 diagnostics: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
