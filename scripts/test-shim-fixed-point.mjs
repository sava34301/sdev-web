// Milestone 5l gate — shim fixed-point verification.
//
// Runs the 50-case suite from test-self-codegen through the new
// `lang/compiler/compile-self.mjs` module surface (instead of the inline
// driver) and asserts byte-for-byte identity with the JS bootstrap. If
// every case matches, `compile-self.mjs` is a certified replacement for
// `lang/bootstrap/compile.mjs` on the subset codegen.sdev currently
// supports — and downstream consumers can migrate incrementally.
//
// The 5m follow-up will widen codegen.sdev to compile lexer.sdev/
// parser.sdev, at which point wasm-runtime.ts + the remaining
// test-self-* scripts can be rewired and compile.mjs deleted.

import { compile as refCompile } from '../lang/bootstrap/compile.mjs';
import { compile as selfCompile } from '../lang/compiler/compile-self.mjs';

const cases = [
  'say 42',
  'say 1 + 2 * 3',
  'say (1 + 2) * 3',
  'say 1\nsay 2\nsay 3',
  'say ((10 + 20) * (30 - 4)) / 5',
  'say 100 - 1 - 2 - 3',
  'set x to 7\nsay x',
  'set a to 3 + 4\nset b to a * 2\nsay a\nsay b',
  'set s to 0\nset s to s + 10\nset s to s + 20\nset s to s + 30\nsay s',
  'set x to 5\nset y to 6\nsay x * y + x',
  'say 5 is 5\nsay 5 is 4',
  'say 5 is not 5\nsay 5 is not 4',
  'say 3 < 5\nsay 3 > 5',
  'say 3 <= 3\nsay 3 >= 4',
  'set x to 10\nif x is 10\nsay 111\nend\nsay 999',
  'set x to 1\nif x is 1\nsay 100\nelse\nsay 200\nend',
  'set x to 2\nif x is 1\nsay 100\nelse\nsay 200\nend',
  'set i to 0\nwhile i < 5\nsay i\nset i to i + 1\nend\nsay 999',
  'set i to 1\nset s to 0\nwhile i <= 10\nset s to s + i\nset i to i + 1\nend\nsay s',
  'to answer\nreturn 42\nend\nsay answer()',
  'to sq with x\nreturn x * x\nend\nsay sq(5)\nsay sq(9)',
  'to add with a b\nreturn a + b\nend\nsay add(3, 4)\nsay add(10, 20)',
  'to hyp with a b\nset s to a * a + b * b\nreturn s\nend\nsay hyp(3, 4)',
  'to sq with x\nreturn x * x\nend\nto sum_sq with a b\nreturn sq(a) + sq(b)\nend\nsay sum_sq(3, 4)',
  'to fact with n\nif n < 2\nreturn 1\nend\nreturn n * fact(n - 1)\nend\nsay fact(6)',
  'to fib with n\nif n < 2\nreturn n\nend\nreturn fib(n - 1) + fib(n - 2)\nend\nsay fib(10)',
  'set base to 100\nto shift with x\nreturn x + base\nend\nsay shift(5)\nsay shift(7)',
  'set xs to mklist(5)\nsay length(xs)',
  'say "hello"',
  'say "foo" + "bar"',
  'set a to "hi"\nset b to " there"\nsay a + b',
  'say str(42) + str(58)',
  'say chr(65) + chr(90)\nsay ord("Z", 0)',
  'set xs to [10, 20, 30, 40]\nsay xs[0]\nsay xs[1]\nsay xs[3]',
  'set xs to [7, 7, 7, 7, 7]\nsay length(xs)',
  'set xs to [1, 2, 3, 4, 5]\nsay xs[2] * xs[4] + xs[0]',
  'set xs to mklist(4)\nset xs[0] to 100\nset xs[1] to 200\nset xs[2] to xs[0] + xs[1]\nsay xs[2]',
  'set s to ""\nsay length(s)',
  'set i to 0\nwhile i < 3\nsay "tick"\nset i to i + 1\nend',
  'say greet()\nto greet\nreturn 7\nend',
  'to double with x\nreturn x * 2\nend\nsay double(3) + double(4)',
  'to hi\nreturn "hello"\nend\nsay hi()',
  'to hi\nreturn "hi "\nend\nto you\nreturn "you"\nend\nsay hi() + you()',
  // Milestone 5s — for each / break / continue / else if
  'for each x in [10, 20, 30]\nsay x\nend',
  'set xs to [1, 2, 3, 4, 5]\nfor each x in xs\nif x is 2\ncontinue\nend\nif x is 4\nbreak\nend\nsay x\nend',
  'for each a in [1, 2]\nfor each b in [10, 20]\nsay a * b\nend\nend',
  'set i to 0\nwhile i < 10\nset i to i + 1\nif i is 3\ncontinue\nend\nif i > 5\nbreak\nend\nsay i\nend',
  'set a to 5\nif a is 1\nsay 100\nelse if a is 5\nsay 55\nelse\nsay 0\nend\nsay 7',
  'to total with xs\nset t to 0\nfor each v in xs\nset t to t + v\nend\nreturn t\nend\nsay total([1, 2, 3, 4])',
  // Milestone 5t — tomes
  'set t to {"a": 1, "b": 2}\nsay t["a"]\nsay t["b"]\nsay length(t)',
  'set t to {name: "sdev", kind: "lang"}\nsay t["name"]\nsay t["kind"]',
  'set t to {}\nset t["x"] to 9\nsay t["x"]\nsay length(t)',
  'set t to {"a": 1, "b": 2}\nfor each k in keys(t)\nsay k\nend',
  'set t to {"a": "x", "b": "y"}\nfor each v in values(t)\nsay v\nend',
  'set t to {"a": 1}\nsay has(t, "a")\nsay has(t, "z")',
  'set t to {"a": 1, "b": 2}\nfor each k in keys(t)\nsay k + "=" + str(t[k])\nend',
  'to lookup with t k\nreturn t[k]\nend\nset t to {"q": 42}\nsay lookup(t, "q")',
  'set t to {"n": {"deep": 7}}\nsay length(t)',
  'set t to {}\nset i to 0\nwhile i < 12\nset t[str(i)] to i * i\nset i to i + 1\nend\nsay length(t)\nsay t["11"]',
  // Milestone 5u — string + numeric standard library
  'say upper("abC")\nsay lower("AbC")\nsay trim("  hi  ") + "|"',
  'say substr("hello world", 6, 5)\nsay find("hello", "ll")\nsay contains("hello", "ell")',
  'for each p in split("a,b,c", ",")\nsay p\nend',
  'say join(split("a,b,c", ","), "-")\nsay replace("a-b-a", "a", "X")',
  'say int("42") + 1\nsay abs(0 - 5)\nsay min(3, 9)\nsay max(3, 9)',
  'say sum(range(5))\nfor each i in range(3)\nsay i\nend',
  'say fceil(1.2)\nsay ffloor(1.8)\nsay fround(1.5)',
  // Milestone 5v: error handling + num()
  'attempt\nsay "a"\nthrow "boom"\nrescue e\nsay e\nend\nsay "z"',
  'attempt\nsay 1\nrescue\nsay 2\nend',
  'attempt\nattempt\nthrow "i"\nrescue a\nsay a\nthrow "o"\nend\nrescue b\nsay b\nend',
  'to f\nthrow "deep"\nreturn 0\nend\nattempt\nsay f()\nrescue e\nsay e\nend',
  'say num("3.5") + 0.5\nsay f2i(num("42.9"))',
  // Milestone 5w: first-class function values
  'to twice with n\nreturn n * 2\nend\nset f to ref twice\nsay call f(21)',
  'to inc with n\nreturn n + 1\nend\nto ap with fn v\nreturn call fn(v)\nend\nsay ap(ref inc, 5)',
  'to a\nreturn 1\nend\nto b\nreturn 2\nend\nset xs to [ref a, ref b]\nfor each g in xs\nsay call g()\nend',
  // Milestone 5x: closures
  'set f to make with a\nreturn a + 1\nend\nsay call f(41)',
  'set n to 10\nset add to make with a capture n\nreturn a + n\nend\nsay call add(5)',
  'set k to 2\nset f to make with x capture k\nset t to x * k\nreturn t + 1\nend\nsay call f(20)',
  'to ap with g v\nreturn call g(v)\nend\nset b to 3\nsay ap(make with x capture b\nreturn x + b\nend, 4)',
  // Milestone 5y: kinds (classes)
  'kind Box\nto put with self v\nset self.v to v\nreturn 0\nend\nto get with self\nreturn self.v\nend\nend\nset b to new Box()\nb.put(9)\nsay b.get()',
  'kind P\nto init with self x y\nset self.x to x\nset self.y to y\nreturn 0\nend\nto sum with self\nreturn self.x + self.y\nend\nend\nset p to new P\np.init(3, 4)\nsay p.sum()\nsay p.x',
  'kind Greeter\nto hello with self who\nreturn "hi " + who\nend\nend\nset g to new Greeter()\nsay g.hello("sdev")',
  'kind Counter\nto step with self\nset self.n to self.n + 1\nif self.n > 2\nreturn 100\nelse if self.n > 1\nreturn 10\nelse\nreturn 1\nend\nend\nend\nset c to new Counter()\nset c.n to 0\nsay c.step()\nsay c.step()\nsay c.step()',
  'kind A\nto one with self\nreturn 1\nend\nend\nkind B\nto two with self\nreturn 2\nend\nend\nset a to new A()\nset b to new B()\nsay a.one() + b.two()',
  // Milestone 6b: inheritance (`extends` + `super`)
  'kind Animal\nto legs with self\nreturn 4\nend\nend\nkind Dog extends Animal\nto name with self\nreturn "dog"\nend\nend\nset d to new Dog()\nsay d.legs()\nsay d.name()',
  'kind Animal\nto name with self\nreturn "animal"\nend\nend\nkind Dog extends Animal\nto name with self\nreturn "dog/" + super.name()\nend\nend\nset d to new Dog()\nsay d.name()',
  'kind A\nto tag with self\nreturn "A"\nend\nend\nkind B extends A\nto tag with self\nreturn "B" + super.tag()\nend\nend\nkind C extends B\nto tag with self\nreturn "C" + super.tag()\nend\nend\nset c to new C()\nsay c.tag()',
  'kind Base\nto init with self v\nset self.v to v\nreturn 0\nend\nto show with self\nreturn self.v\nend\nend\nkind Sub extends Base\nto show with self\nreturn super.show() * 2\nend\nend\nset s to new Sub()\ns.init(21)\nsay s.show()',
];



function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

let failed = 0;
for (let i = 0; i < cases.length; i++) {
  const src = cases[i];
  const ref = refCompile(src);
  const got = await selfCompile(src);
  const bcOk = bytesEqual(ref.bytecode, got.bytecode);
  const poolOk = bytesEqual(ref.stringPool, got.stringPool);
  const ok = bcOk && poolOk;
  if (!ok) {
    failed++;
    console.log(`✗ case ${i}: ${JSON.stringify(src).slice(0, 60)}`);
    if (!bcOk) console.log(`   bc mismatch: ref=${ref.bytecode.length}B got=${got.bytecode.length}B`);
    if (!poolOk) console.log(`   pool mismatch: ref=${ref.stringPool.length}B got=${got.stringPool.length}B`);
  }
}

if (failed === 0) {
  console.log(`✓ shim fixed-point: ${cases.length}/${cases.length} cases byte-identical`);
  process.exit(0);
} else {
  console.log(`✗ shim fixed-point: ${failed}/${cases.length} cases diverged`);
  process.exit(1);
}
