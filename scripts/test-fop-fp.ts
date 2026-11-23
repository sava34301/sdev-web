import { execFileSync } from 'node:child_process';
import { execute, Lexer, Parser, Compiler } from '../src/lang';
import { VM } from '../src/lang/runtime/vm';
import { lintSdevSource } from '../src/lang/tools/linter';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function runInterp(code: string): { ok: boolean; output: string[]; error?: string } {
  const res = execute(code);
  return { ok: res.success, output: res.output, error: res.error ? String(res.error) : undefined };
}

function runVM(code: string): string[] {
  const tokens = new Lexer(code).tokenize();
  const ast = new Parser(tokens).parse();
  const chunk = new Compiler().compile(ast);
  const output: string[] = [];
  new VM((msg) => output.push(msg)).run(chunk);
  return output;
}

console.log('=== Feature-Oriented & Function-Oriented Programming Test Suite ===\n');

// ── 1. Preserving existing identifiers & syntax ─────────────────────────────
console.log('--- 1. Backwards Compatibility & Contextual Keywords ---');
{
  const r = runInterp(`
    forge feature be "plain_var"
    forge refine be 42
    forge facet be [1, 2]
    forge augment be { feature: feature, refine: refine }
    forge m be identity(3)
    speak(feature)
    speak(refine)
    speak(augment["feature"])
    speak(measure(m))
  `);
  check(
    'Contextual feature/refine/facet/augment remain usable as variables/keys & identity(3) matrix works',
    r.ok && r.output[0] === 'plain_var' && r.output[1] === '42' && r.output[2] === 'plain_var' && r.output[3] === '3',
    r.error || JSON.stringify(r.output)
  );
}

// ── 2. FOP: feature / facet, refine / augment, proceed / original ───────────
console.log('\n--- 2. FOP Features, Refinements & proceed() ---');
{
  const r = runInterp(`
    conjure base_price(x) :: yield x * 10 ;;
    feature Tax ::
      forge rate be 2
      refine base_price(x) ::
        yield proceed(x) + 15
      ;;
    ;;
    facet VIP requires Tax ::
      refine conjure base_price(x) ::
        yield original(x) * 2
      ;;
    ;;
    speak(base_price(5))
    enable_feature("Tax")
    speak(base_price(5))
    enable_feature("VIP")
    speak(base_price(5))
    disable_feature("VIP")
    speak(base_price(5))
    toggle_feature("Tax")
    speak(is_feature_enabled("Tax"))
    speak(base_price(5))
  `);
  check(
    'Function refinements stack proceed()/original() cleanly with enable/disable/toggle',
    r.ok &&
      r.output[0] === '50' &&
      r.output[1] === '65' &&
      r.output[2] === '130' &&
      r.output[3] === '65' &&
      r.output[4] === 'nope' &&
      r.output[5] === '50',
    r.error || JSON.stringify(r.output)
  );
}

{
  const r = runInterp(`
    essence Account ::
      conjure init(self, bal) ::
        self.bal be bal
      ;;
      conjure describe(self) ::
        yield "Account(" + str(self.bal) + ")"
      ;;
    ;;

    feature Bonus ::
      refine Account ::
        forge tier be "Gold"
        conjure describe(self) ::
          yield proceed() + "+" + self.tier
        ;;
      ;;
    ;;

    facet Shield ::
      augment Account ::
        conjure describe(self) ::
          yield "[" + proceed() + "]"
        ;;
      ;;
    ;;

    forge acc be new Account(500)
    speak(acc.describe())
    with feature_context([Bonus]) ::
      speak(acc.describe())
      speak(acc.tier)
      with_features([Shield], () -> speak(acc.describe()))
    ;;
    speak(acc.describe())
    speak(active_features())
  `);
  check(
    'Class refinements stack via with feature_context and with_features and restore state',
    r.ok &&
      r.output[0] === 'Account(500)' &&
      r.output[1] === 'Account(500)+Gold' &&
      r.output[2] === 'Gold' &&
      r.output[3] === '[Account(500)+Gold]' &&
      r.output[4] === 'Account(500)' &&
      r.output[5] === '[]',
    r.error || JSON.stringify(r.output)
  );
}

// ── 3. FOP SPL Feature Models, Constraints, Compose & Apply ─────────────────
console.log('\n--- 3. FOP SPL Feature Models, Excludes/Requires & Composition ---');
{
  const r = runInterp(`
    feature Core :: forge v be 1 ;;
    feature Auth requires Core :: forge auth_mode be "jwt" ;;
    feature LegacyAuth excludes Auth :: forge auth_mode be "basic" ;;

    enable_feature("Auth")
    speak(is_feature_enabled("Core"))

    attempt ::
      enable_feature("LegacyAuth")
      speak("SHOULD_NOT_ENABLE")
    ;; rescue err ::
      speak("EXCLUDED_OK")
    ;;

    forge mdl be feature_model("App", {
      mandatory: ["Core"],
      optional: ["Audit"],
      alternatives: [["SQL", "NoSQL"]],
      or_groups: [["Web", "CLI"]],
      requires: { Audit: ["Core"] },
      excludes: { Auth: ["LegacyAuth"] }
    })

    forge bad be validate_features(mdl, ["SQL"])
    forge good be validate_features(mdl, ["Core", "SQL", "Web", "Audit"])
    forge resolved be resolve_features(mdl, ["SQL", "Web", "Audit"])
    speak(bad["valid"])
    speak(good["valid"])
    speak(measure(resolved))

    forge f1 be feature_define("F1", { a: 1, tag: (self) -> "F1" })
    forge f2 be feature_define("F2", { b: 2, tag: (self) -> proceed(self) + "+F2" })
    forge combined be compose_features([f1, f2])
    forge target be { name: "box" }
    apply_feature(target, combined)
    speak(target.a)
    speak(target.b)
    speak(target.tag())

    forge wrapped_fn be refine_target((x) -> x + 1, (x) -> proceed(x) * 3)
    speak(wrapped_fn(4))
  `);
  check(
    'SPL feature models validate mandatory/alternatives/or_groups/requires/excludes & compose/apply/refine work',
    r.ok &&
      r.output[0] === 'yep' &&
      r.output[1] === 'EXCLUDED_OK' &&
      r.output[2] === 'nope' &&
      r.output[3] === 'yep' &&
      Number(r.output[4]) >= 4 &&
      r.output[5] === '1' &&
      r.output[6] === '2' &&
      r.output[7] === 'F1+F2' &&
      r.output[8] === '15',
    r.error || JSON.stringify(r.output)
  );
}

// ── 4. FP Tacit Operators, Placeholder Partial, Pattern-Matched Functions ───
console.log('\n--- 4. FP Operators (>> / <<), _ Placeholder, Pattern & Guard Clauses ---');
{
  const r = runInterp(`
    conjure inc(x) => x + 1
    conjure dbl(x) => x * 2
    forge ltr be inc >> dbl
    forge rtl be inc << dbl
    speak(ltr(5))
    speak(rtl(5))
    speak(8 << 2)
    speak(8 >> 1)

    conjure sub3(a, b, c) => a - b - c
    forge hole1 be sub3(100, _, 5)
    forge hole2 be sub3(_, 10, _)
    forge part1 be partial((x, y) -> x - y, _, 10)
    forge partR be partial_right((x, y, z) -> x * 100 + y * 10 + z, 2, 3)
    speak(hole1(20))
    speak(hole2(50, 3))
    speak(part1(35))
    speak(partR(1))

    conjure fact(0) => 1
    conjure fact(n) when n > 0 => n * fact(n - 1)
    conjure fact(_) => 1

    conjure list_sum([]) => 0
    conjure list_sum([h, *t]) => h + list_sum(t)

    conjure handle_opt(Some(v)) => v * 10
    conjure handle_opt(None()) => -1

    conjure handle_res(Ok(v)) => "ok:" + str(v)
    conjure handle_res(Err(e)) => "err:" + str(e)

    conjure shape({ kind: "rect", w: w, h: h }) => w * h
    conjure shape({ kind: "sq", s: s }) => s * s

    speak(fact(5))
    speak(list_sum([1, 2, 3, 4]))
    speak(handle_opt(Some(7)))
    speak(handle_opt(None()))
    speak(handle_res(Ok(99)))
    speak(handle_res(Err("bad")))
    speak(shape({ kind: "rect", w: 3, h: 4 }))
    speak(shape({ kind: "sq", s: 5 }))
  `);
  check(
    'Tacit composition >>/<<, bitwise << / >> preservation, _ placeholders, and multi-clause pattern/guard functions',
    r.ok &&
      r.output[0] === '12' &&
      r.output[1] === '11' &&
      r.output[2] === '32' &&
      r.output[3] === '4' &&
      r.output[4] === '75' &&
      r.output[5] === '37' &&
      r.output[6] === '25' &&
      r.output[7] === '123' &&
      r.output[8] === '120' &&
      r.output[9] === '10' &&
      r.output[10] === '70' &&
      r.output[11] === '-1' &&
      r.output[12] === 'ok:99' &&
      r.output[13] === 'err:bad' &&
      r.output[14] === '12' &&
      r.output[15] === '25',
    r.error || JSON.stringify(r.output)
  );
}

// ── 5. FP Combinators, Lenses & Transducers ─────────────────────────────────
console.log('\n--- 5. FP Combinators, Lenses & Transducers ---');
{
  const r = runInterp(`
    forge f_div be flip((a, b) -> a / b)
    speak(f_div(2, 10))
    speak(identity_fn(77))
    speak(id_fn("id"))
    forge always_pi be always(314)
    speak(always_pi(999))

    forge stats be juxt([x -> x + 1, x -> x * 2, x -> x * x])
    speak(stats(4))

    forge avg be converge((s, n) -> s / n, [xs -> sum(xs), xs -> measure(xs)])
    speak(avg([10, 20, 30]))

    speak(ap([x -> x + 1, x -> x * 10], [1, 2]))
    speak(ap(Some(x -> x * 3), Some(5))["val"])

    forge log be []
    forge tapped be tap(42, (v) -> gather(log, v))
    speak(tapped)
    speak(measure(log))
    speak(thru(9, x -> x * x))

    forge cnt be 0
    forge init_once be once(() -> :: cnt be cnt + 1; yield cnt ;;)
    speak(init_once())
    speak(init_once())

    conjure even_sum(n, acc) ::
      ponder n <= 0 :: yield acc ;;
      yield () -> even_sum(n - 1, acc + n)
    ;;
    speak(trampoline(even_sum, 5, 0))

    forge is_even be x -> x % 2 equals 0
    forge is_pos be x -> x > 0
    forge is_small be x -> x < 10
    forge is_odd be complement(is_even)
    forge pos_even be both(is_pos, is_even)
    forge neg_or_even be either_fn(x -> x < 0, is_even)
    forge strict_ok be all_pass([is_pos, is_even, is_small])
    forge loose_ok be any_pass([x -> x > 100, is_even])
    forge classify be cond([
      [x -> x < 0, constant("neg")],
      [x -> x equals 0, constant("zero")],
      [constant(yep), x -> "pos:" + str(x)]
    ])
    speak(is_odd(3))
    speak(pos_even(4))
    speak(neg_or_even(-5))
    speak(strict_ok(6))
    speak(loose_ok(200))
    speak(classify(9))

    forge lp be lens_path(["user", "score"])
    forge state be { user: { name: "Ada", score: 10 } }
    forge state2 be over(lp, x -> x + 5, state)
    forge state3 be set_over(lens_prop("flag"), yep, state2)
    speak(view(lp, state))
    speak(view(lp, state2))
    speak(state3["flag"])

    forge xf be [xf_filter(x -> x % 2 equals 0), xf_map(x -> x * 10), xf_take(2)]
    speak(transduce(xf, (acc, x) -> acc + [x], [], [1, 2, 3, 4, 5, 6]))

    forge ok_r be attempt_result(() -> 40 + 2)
    forge err_r be attempt_result(() -> 1 / 0)
    forge safe_fn be try_catch_fn((x) -> 10 / x, (err, x) -> "caught")
    speak(match_option(Some(5), x -> x * 2, () -> 0))
    speak(match_option(None(), x -> x * 2, 99))
    speak(match_result(ok_r, v -> v, e -> -1))
    speak(match_result(err_r, v -> v, e -> "ERR"))
    speak(safe_fn(0))
  `);
  check(
    'All FP combinators, trampoline, predicates, lenses, transducers, and Option/Result helpers work',
    r.ok &&
      r.output[0] === '5' &&
      r.output[1] === '77' &&
      r.output[2] === 'id' &&
      r.output[3] === '314' &&
      r.output[4] === '[5, 8, 16]' &&
      r.output[5] === '20' &&
      r.output[6] === '[2, 3, 10, 20]' &&
      r.output[7] === '15' &&
      r.output[8] === '42' &&
      r.output[9] === '1' &&
      r.output[10] === '81' &&
      r.output[11] === '1' &&
      r.output[12] === '1' &&
      r.output[13] === '15' &&
      r.output[14] === 'yep' &&
      r.output[15] === 'yep' &&
      r.output[16] === 'yep' &&
      r.output[17] === 'yep' &&
      r.output[18] === 'yep' &&
      r.output[19] === 'pos:9' &&
      r.output[20] === '10' &&
      r.output[21] === '15' &&
      r.output[22] === 'yep' &&
      r.output[23] === '[20, 40]' &&
      r.output[24] === '10' &&
      r.output[25] === '99' &&
      r.output[26] === '42' &&
      r.output[27] === 'ERR' &&
      r.output[28] === 'caught',
    r.error || JSON.stringify(r.output)
  );
}

// ── 6. Bytecode Compiler + VM Execution ─────────────────────────────────────
console.log('\n--- 6. v2 Bytecode Compiler + VM Execution ---');
{
  let vmOut: string[] = [];
  let vmErr = '';
  try {
    vmOut = runVM(`
      conjure add1(x) => x + 1
      conjure mul3(x) => x * 3
      forge fn_pipe be add1 >> mul3
      speak(fn_pipe(4))

      conjure fact(0) => 1
      conjure fact(n) when n > 0 => n * fact(n - 1)
      speak(fact(5))

      forge sub5 be ((a, b) -> a - b)(_, 5)
      speak(sub5(20))

      feature Bonus ::
        forge mult be 10
        refine add1(x) ::
          yield proceed(x) + 100
        ;;
      ;;
      enable_feature("Bonus")
      speak(add1(4))
      disable_feature("Bonus")
      speak(add1(4))
    `);
  } catch (e: unknown) {
    vmErr = e instanceof Error ? e.message : String(e);
  }
  check(
    'v2 Compiler + VM execute >> compose, multi-clause guards, _ placeholder, and FOP feature refinements',
    vmErr === '' &&
      vmOut[0] === '15' &&
      vmOut[1] === '120' &&
      vmOut[2] === '15' &&
      vmOut[3] === '105' &&
      vmOut[4] === '5',
    vmErr || JSON.stringify(vmOut)
  );
}

// ── 7. Linter Diagnostics Check ─────────────────────────────────────────────
console.log('\n--- 7. Static Linter Acceptance of FOP/FP Syntax ---');
{
  const diags = lintSdevSource(`
    essence Service ::
      conjure run(self, x) :: yield x ;;
    ;;
    feature Logging ::
      forge tag be "LOG"
      refine Service ::
        conjure run(self, x) :: yield proceed(x) ;;
      ;;
    ;;
    enable_feature("Logging")
    forge s be new Service()
    speak(s.run(10))
  `);
  const errors = diags.filter((d) => d.severity === 'error');
  check('Linter emits zero errors on feature/refine/proceed code', errors.length === 0, JSON.stringify(errors));
}

// ── 8. Python Interpreter Parity Check ──────────────────────────────────────
console.log('\n--- 8. Python Interpreter Parity (public/sdev-interpreter.py) ---');
{
  const pyProg = `
conjure inc(x) => x + 1
conjure dbl(x) => x * 2
speak((inc >> dbl)(5))
forge s5 be ((a, b) -> a - b)(_, 5)
speak(s5(20))
conjure fact(0) => 1
conjure fact(n) when n > 0 => n * fact(n - 1)
speak(fact(5))
feature Audit ::
  forge code be "A1"
  refine inc(x) ::
    yield proceed(x) + 10
  ;;
;;
with feature_context([Audit]) ::
  speak(inc(5))
;;
speak(inc(5))
forge lp be lens_path(["k", 1])
forge d be { k: [10, 20] }
speak(view(lp, over(lp, x -> x + 3, d)))
speak(transduce([xf_filter(x -> x > 1), xf_map(x -> x * 2)], (a, b) -> a + [b], [], [1, 2, 3]))
`;
  let pyOut = '';
  let pyErr = '';
  try {
    pyOut = execFileSync('python', [
      '-c',
      `import sys; ns = {}; exec(open('public/sdev-interpreter.py', encoding='utf-8').read(), ns); out = []; ns['execute'](sys.stdin.read(), out.append); print('|'.join(out))`,
    ], { input: pyProg, encoding: 'utf8' }).trim();
  } catch (e: unknown) {
    pyErr = e instanceof Error ? e.message : String(e);
  }
  check(
    'Python interpreter matches JS output for FOP + FP parity program',
    pyErr === '' && pyOut === '12|15|120|16|6|23|[4, 6]',
    pyErr || pyOut
  );
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
