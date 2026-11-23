# Feature-Oriented & Function-Oriented Programming in SDEV

> Complete guide to **Feature-Oriented Programming (FOP)**, **Software Product Lines (SPL)**, and **Function-Oriented Programming (FP)** across SDEV v1, v2, the v2 bytecode VM, the Python runtime, and pure self-hosted `.sdev` modules.

---

## 1. Overview & Cross-Runtime Support

SDEV natively supports both **Feature-Oriented Programming (FOP)** — modularizing cross-cutting software variations into composable `feature`/`facet` layers and `refine`/`augment` collaborations — and **Function-Oriented Programming (FP)** — building programs from point-free pipelines, placeholder partial application, multi-clause guarded pattern functions, algebraic `Option`/`Result` monads, immutable lenses, and composable transducers.

| Surface / File | Coverage |
| --- | --- |
| **Syntax & Parser** (`src/lang/keywords.ts`, `tokens.ts`, `parser.ts`) | Contextual `feature` / `facet`, `refine` / `augment`, `proceed` / `original`, `>>` / `<<`, `_` partial holes, multi-clause `when` guards, `=>` shorthand |
| **JS Interpreter & v2 Bytecode VM** (`src/lang/builtins/fop.ts`, `functional.ts`, `interpreter.ts`, `compiler.ts`, `vm.ts`) | Full FOP feature registry, `proceed` layering stack, dynamic scoping (`with_features`, `feature_context`), SPL validation, FP combinators, lenses, transducers |
| **Python Interpreter** (`public/sdev-interpreter.py`) | Parity for contextual `feature`/`refine`, class/function layers with `proceed`, `>>`/`<<`, `_` holes, multi-clause functions, and FOP/FP builtins |
| **Self-Hosted v2 Modules** | [`lang/paradigms/feature.sdev`](../../lang/paradigms/feature.sdev), [`lang/paradigms/functional.sdev`](../../lang/paradigms/functional.sdev), [`lang/stdlib/v2/func.sdev`](../../lang/stdlib/v2/func.sdev) |
| **Tooling** (`src/lang/linter.ts`, `agent/`, `registry/api-registry.ts`) | Static linter AST traversal for `FeatureDeclaration`/`RefineDeclaration`/`guard`, understander word recognition, and `V2_WASM_BUILTINS` targets |

### 1.1 Backwards Compatibility via Contextual Keywords

`feature`, `facet`, `refine`, and `augment` are parsed **contextually** rather than reserved globally. Existing programs that use those words as variable names, parameter names, or dictionary keys continue to work unchanged:

```sdev
forge feature be "existing_value"
forge refine be 42
forge obj be { feature: feature, refine: refine }
speak(obj["feature"], obj["refine"])
```

---

## 2. Feature-Oriented Programming (FOP)

### 2.1 Feature Declarations (`feature` / `facet`)

A feature encapsulates fields, helper functions/methods, optional dependency constraints (`requires`, `excludes`), and refinements targeting existing functions or `essence`/`kind` classes. `facet` is the expressive synonym for `feature`.

```text
feature <Name> [requires <Dep1>, <Dep2>] [excludes <Conflict1>, ...] ::
  forge <field> be <value>
  conjure <helper>(...) :: ... ;;
  refine <TargetFn>(...) :: ... proceed(...) ... ;;
  refine <TargetClass> :: ... ;;
;;
```

Features register in a **disabled** state by default so declarations never alter base behavior until activated with `enable_feature`, `toggle_feature`, or a scoped `with` block.

### 2.2 Function & Class Refinements (`refine` / `augment`) and `proceed`

Inside a `feature` / `facet` block (or directly at top level using `refine` or `augment`), a refinement wraps the target function or class method. Calling `proceed(...)` (or its synonym `original(...)`) invokes the next lower active layer down to the base definition:

```sdev
conjure base_price(x) ::
  yield x * 10
;;

feature Tax ::
  forge rate be 15
  refine base_price(x) ::
    yield proceed(x) + 15
  ;;
;;

facet VIP requires Tax ::
  augment conjure base_price(x) ::
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
```

In this example:
1. Base `base_price(5)` returns `50`.
2. Enabling `"Tax"` produces `50 + 15 = 65`.
3. Enabling `"VIP"` wraps `"Tax"`, returning `65 * 2 = 130`.
4. Notice `"VIP"` specifies `requires Tax`: enabling `"VIP"` first automatically activates `"Tax"` if `"Tax"` is already registered (and raises an error if a requirement is unregistered or cyclic, or if an active feature excludes it).

#### Refining Classes (`essence` / `kind`)

Refinements can also add fields and wrap methods (including `init`) on classes:

```sdev
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
```

Active class feature layers participate dynamically during method lookup (`acc.describe()`) and field lookup (`acc.tier`), even for instances constructed before the feature was activated.

### 2.3 Dynamic Toggles & Scoped Activation

| Builtin | Signature | Behavior |
| --- | --- | --- |
| `feature_define` | `(name, spec?) -> feature` | Programmatically defines and registers a feature object `{ name, requires, excludes, fields, methods, active }`. |
| `enable_feature` / `feature_enable` | `(featOrName) -> truth` | Enables a feature (transitively enabling registered `requires` and checking `excludes`). |
| `disable_feature` / `feature_disable` | `(featOrName) -> truth` | Deactivates a feature (`nope`). |
| `toggle_feature` / `feature_toggle` | `(featOrName) -> truth` | Flips active state; returns the new state (`yep`/`nope`). |
| `is_feature_enabled` / `feature_enabled` | `(featOrName) -> truth` | Checks whether a feature is currently active. |
| `active_features` | `() -> list` | Returns the ordered list of currently active feature names. |
| `with_features` | `(features, fn?) -> result \| ctx` | With a callback `fn`, enables `features` for the call and restores the prior registry snapshot in `finally`. With 1 arg, returns a context manager for `with`. |
| `feature_context` | `(features...) -> ctx` | Returns a context manager compatible with `with feature_context([...]) :: ... ;;`. |

Both `with feature_context([...])` and `with_features([...], fn)` snapshot the full active state and restore it cleanly on normal exit, early return, or thrown error.

### 2.4 Programmatic Feature Composition & Application

| Builtin | Signature | Behavior |
| --- | --- | --- |
| `compose_features` | `(listOrVarargs) -> feature` | Composes multiple features left-to-right into a new feature named `A+B`, merging fields, chaining same-named methods via `proceed`, and checking exclusions. |
| `apply_feature` | `(target, featOrName) -> target` | Attaches a feature's fields and `proceed`-chained methods onto a class (`essence`) or dictionary/object. |
| `refine_target` | `(target, wrapperOrOverrides) -> refined` | Wraps a function with `proceed` (`refine_target(fn, wrapper)`), adds a layer to a class, or returns an extended shallow copy of an object. |

```sdev
forge f1 be feature_define("F1", { a: 1, tag: (self) -> "F1" })
forge f2 be feature_define("F2", { b: 2, tag: (self) -> proceed(self) + "+F2" })
forge combined be compose_features([f1, f2])

forge target be { name: "box" }
apply_feature(target, combined)
speak(target.a, target.b, target.tag())

forge wrapped be refine_target((x) -> x + 1, (x) -> proceed(x) * 3)
speak(wrapped(4))
```

### 2.5 Software Product Line (SPL) Constraints & Resolution

SDEV includes built-in SPL feature-model validation and transitive dependency resolution:

| Builtin | Signature | Behavior |
| --- | --- | --- |
| `feature_model` | `(name, config?) -> model` | Creates an SPL model with `features`, `mandatory`, `optional`, `requires`, `excludes`, `alternatives` (exactly 1 required per group), and `or_groups` (at least 1 required per group). |
| `feature_require` | `(featureA, featureB) -> truth` | Registers a global requirement rule `featureA -> featureB`. |
| `feature_exclude` | `(featureA, featureB) -> truth` | Registers a global symmetric exclusion constraint between two features. |
| `validate_features` | `(modelOrSelection, selection?) -> record` | Returns `{ valid, errors, resolved }`, checking unknown features, mandatory rules, alternative/OR cardinalities, requirements, and mutual exclusions. |
| `resolve_features` | `(selectionOrModel, modelOrSelection?) -> list` | Computes the topologically ordered closure including mandatory features and transitive requirements; throws on exclusion conflicts. |

```sdev
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
forge plan be resolve_features(mdl, ["SQL", "Web", "Audit"])

speak(bad["valid"])
speak(good["valid"])
speak(measure(plan))
```

### 2.6 Self-Hosted SDEV v2 FOP Module (`lang/paradigms/feature.sdev`)

For self-hosted SDEV v2 targets (Seed VM WASM, `bin/sdev-vm`, native x86-64), [`lang/paradigms/feature.sdev`](../../lang/paradigms/feature.sdev) provides pure-SDEV FOP and SPL records:

```sdev
#!sdev v2
use "lang/paradigms/feature.sdev"

set f_core to feature_create("core", [], [])
set _ to feature_add_field(f_core, "ver", 1)
set f_auth to feature_create("auth", ["core"], [])
set _ to feature_add_field(f_auth, "scheme", "token")
set composed to feature_compose([f_core, f_auth])

set mdl to feature_model_create("Product")
set _ to feature_model_add(mdl, "core", 1)
set _ to feature_model_add(mdl, "auth", 0)
set _ to feature_model_add(mdl, "legacy", 0)
set _ to feature_model_require(mdl, "auth", "core")
set _ to feature_model_exclude(mdl, "auth", "legacy")

set check_ok to feature_model_validate(mdl, ["core", "auth"])
set resolved to feature_model_resolve(mdl, ["auth"])
say composed["name"]
say check_ok["valid"]
say length(resolved)

set reg to feature_registry_create()
set _ to feature_enable_in(reg, "auth")
say feature_is_enabled_in(reg, "auth")
```

Exported functions in `lang/paradigms/feature.sdev`:
- Feature construction & composition: `feature_create(f_name, reqs, excls)`, `feature_add_field(feat, key, val)`, `feature_add_method(feat, m_name, fn_ref)`, `feature_compose(feats)`
- SPL models: `feature_model_create(m_name)`, `feature_model_add(model, f_name, is_mandatory)`, `feature_model_require(model, a, b)`, `feature_model_exclude(model, a, b)`, `feature_model_validate(model, sel)`, `feature_model_resolve(model, sel)`
- Scoped registry values: `feature_registry_create()`, `feature_enable_in(reg, f_name)`, `feature_disable_in(reg, f_name)`, `feature_is_enabled_in(reg, f_name)`

---

## 3. Function-Oriented Programming (FP)

### 3.1 Tacit Composition Operators (`>>` and `<<`)

When either operand of `>>` or `<<` is callable, the operators build a point-free composed function instead of performing bitwise shifts; numbers still execute standard bitwise shifts:

- `f >> g` (**left-to-right pipeline**): `(x) -> g(f(x))`
- `f << g` (**right-to-left mathematical composition**): `(x) -> f(g(x))`

```sdev
conjure inc(x) => x + 1
conjure dbl(x) => x * 2

forge forward be inc >> dbl
forge backward be inc << dbl

speak(forward(5))
speak(backward(5))
speak(8 << 2, 8 >> 1)
```

### 3.2 Placeholder Partial Application (`_`)

Passing bare `_` as an argument in a function call turns the call into an anonymous lambda taking one parameter per hole in left-to-right order. Inside `partial(...)` and `partial_right(...)`, `_` produces a placeholder sentinel so positions can be filled on later invocation:

```sdev
conjure sub3(a, b, c) => a - b - c

forge fix_ends be sub3(100, _, 5)
forge fix_mid be sub3(_, 10, _)
forge using_partial be partial((x, y) -> x - y, _, 10)
forge using_right be partial_right((x, y, z) -> x * 100 + y * 10 + z, 2, 3)

speak(fix_ends(20))
speak(fix_mid(50, 3))
speak(using_partial(35))
speak(using_right(1))
```

### 3.3 Multi-Clause Pattern-Matched & Guarded Functions

Multiple clauses can be declared for the same function name (`conjure`, `forge`, or `to`), with optional `when <guard>` predicates and `=> <expr>` single-expression bodies. Clauses are evaluated top to bottom until all parameter patterns match and any `when` guard holds true.

Supported parameter patterns:
- **Literals & Wildcards**: `0`, `-1`, `"quit"`, `yep`, `void`, `_`
- **Sequences (lists)**: `[]`, `[h, *t]`
- **Mappings / Tomes**: `{ kind: "rect", w: w, h: h }`
- **ADTs**: `Some(x)`, `None()`, `Ok(v)`, `Err(e)`

```sdev
conjure fact(0) => 1
conjure fact(n) when n > 0 => n * fact(n - 1)
conjure fact(_) => 1

conjure sum_list([]) => 0
conjure sum_list([h, *t]) => h + sum_list(t)

conjure area({ kind: "rect", w: w, h: h }) => w * h
conjure area({ kind: "sq", s: s }) => s * s

conjure show_opt(Some(v)) => v * 10
conjure show_opt(None()) => -1

conjure show_res(Ok(v)) => "ok:" + str(v)
conjure show_res(Err(e)) => "err:" + str(e)

speak(fact(5))
speak(sum_list([1, 2, 3, 4]))
speak(area({ kind: "rect", w: 3, h: 4 }))
speak(show_opt(Some(7)))
speak(show_res(Err("bad")))
```

### 3.4 Higher-Order & Point-Free Combinators

| Builtin | Signature | Description |
| --- | --- | --- |
| `compose` | `(f, g, ...fns) -> fn` | Right-to-left function composition (`compose(f, g)(x) == f(g(x))`). |
| `pipe` | `(value, ...fns) -> value` | Threads an initial `value` left-to-right through functions. |
| `curry` | `(fn, arity) -> fn` | Auto-curries `fn` until at least `arity` arguments have been supplied. |
| `memoize` | `(fn) -> fn` | Caches calls by serialized argument key. |
| `partial` | `(fn, ...boundArgs) -> fn` | Pre-fills leading arguments (filling `_` holes first on call). |
| `partial_right` | `(fn, ...boundArgs) -> fn` | Appends trailing arguments (or fills `_` slots when present). |
| `flip` | `(fn) -> fn` | Swaps the first two arguments passed to `fn`. |
| `identity_fn` / `id_fn` | `(x) -> x` | Returns its argument unchanged. (`identity(size)` remains the identity matrix constructor; in the bytecode VM `identity(x)` also acts as identity value.) |
| `constant` / `always` | `(x) -> (() -> x)` | Returns a constant function always yielding `x`. |
| `juxt` | `(...fns \| [fns]) -> ((...args) -> list)` | Applies every function in `fns` to the same arguments and collects results into a list. |
| `converge` | `(afterFn, branchFns) -> ((...args) -> result)` | Runs each branch function on the inputs, then passes the branch results as arguments to `afterFn`. |
| `ap` | `(fnsOrADT, valuesOrADT) -> result` | Applicative apply across `[fns]` + `[vals]` (Cartesian application), `Some(fn)` + `Some(val)`, or `Ok(fn)` + `Ok(val)`. |
| `tap` | `(val, fn) -> val` or `(fn) -> (x -> x)` | Runs side-effect `fn` on the value and passes the original value through unchanged. |
| `thru` | `(val, fn) -> fn(val)` | Applies unary transform `fn(val)` in pipeline style. |
| `once` | `(fn) -> fn` | Invokes `fn` at most once and caches its first return value forever. |
| `trampoline` | `(fn, ...args) -> result` | Executes thunk-returning tail-recursive steps in a loop without overflowing the call stack. |
| `complement` / `negate_fn` | `(pred) -> fn` | Boolean negation wrapper for a predicate function. |
| `both` | `(p1, p2) -> fn` | Predicate combinator true when both `p1` and `p2` are truthy. |
| `either_fn` | `(p1, p2) -> fn` | Predicate combinator true when either `p1` or `p2` is truthy. |
| `all_pass` | `(predsList) -> fn` | True when every predicate in `predsList` holds. |
| `any_pass` | `(predsList) -> fn` | True when at least one predicate in `predsList` holds. |
| `cond` | `([[pred, handler], ...]) -> fn` | Builds a multi-branch dispatch function returning `handler(...args)` for the first truthy `pred`. |

```sdev
forge f_div be flip((a, b) -> a / b)
speak(f_div(2, 10))
speak(identity_fn(77))
speak(always(314)(999))

forge stats be juxt([x -> x + 1, x -> x * 2, x -> x * x])
speak(stats(4))

forge avg be converge((s, n) -> s / n, [xs -> sum(xs), xs -> measure(xs)])
speak(avg([10, 20, 30]))

conjure even_sum(n, acc) ::
  ponder n <= 0 :: yield acc ;;
  yield () -> even_sum(n - 1, acc + n)
;;
speak(trampoline(even_sum, 5, 0))

forge classify be cond([
  [x -> x < 0, constant("neg")],
  [x -> x equals 0, constant("zero")],
  [constant(yep), x -> "pos:" + str(x)]
])
speak(classify(9))
```

### 3.5 Functional Lenses (Immutable Updates)

Lenses focus on nested dictionary keys or list indices cleanly without mutating the source structure:

| Builtin | Signature | Description |
| --- | --- | --- |
| `lens` | `(getter, setter) -> lens` | Builds a custom lens from `getter(target)` and `setter(value, target)`. |
| `lens_prop` | `(keyOrIndex) -> lens` | Builds a single-property or list-index lens. |
| `lens_path` | `(segmentsList) -> lens` | Builds a deep path lens through nested tomes and lists (`["user", "scores", 0]`). |
| `view` | `(lens, target) -> value` | Reads the focused value through `lens`. |
| `set_over` | `(lens, value, target) -> newTarget` | Returns an updated shallow-cloned structure with `value` set at the lens focus. |
| `over` | `(lensOrKey, fn, target) -> newTarget` | Transforms the focused value via `fn(current)` and returns an updated structure. |

```sdev
forge lp be lens_path(["user", "score"])
forge st1 be { user: { name: "Ada", score: 10 } }
forge st2 be over(lp, x -> x + 5, st1)
forge st3 be set_over(lens_prop("flag"), yep, st2)

speak(view(lp, st1))
speak(view(lp, st2))
speak(st3["flag"])
```

### 3.6 Composable Transducers

Transducers decouple transformation steps (`xf_map`, `xf_filter`, `xf_take`) from input collections and final reducers, supporting single-pass fusion and early short-circuiting:

| Builtin | Signature | Description |
| --- | --- | --- |
| `xf_map` | `(fn) -> xform` | Mapping transducer step. |
| `xf_filter` | `(pred) -> xform` | Filtering transducer step. |
| `xf_take` | `(n) -> xform` | Early-terminating transducer limiting emitted items to `n`. |
| `transduce` | `(xformOrList, reducer, init, collection) -> result` | Executes composed transducers over `collection` in a single pass, stopping early on `__reduced__`. |

```sdev
forge xf be [
  xf_filter(x -> x % 2 equals 0),
  xf_map(x -> x * 10),
  xf_take(2)
]
speak(transduce(xf, (acc, x) -> acc + [x], [], [1, 2, 3, 4, 5, 6]))
```

### 3.7 Option/Result Catamorphisms & Safe Execution Helpers

| Builtin | Signature | Description |
| --- | --- | --- |
| `attempt_result` | `(fn, ...args) -> Result` | Invokes `fn(...args)` and wraps the outcome in `Ok(value)` or `Err(message)`. |
| `try_catch_fn` | `(fn, onErr) -> fn` | Returns a guarded wrapper calling `onErr(message, ...args)` if `fn` throws. |
| `match_option` | `(opt, onSome, onNone) -> value` | Applies `onSome(val)` when `opt` is `Some`, otherwise invokes `onNone()` (or returns non-callable fallback `onNone`). |
| `match_result` | `(res, onOk, onErr) -> value` | Applies `onOk(val)` when `res` is `Ok`, otherwise invokes `onErr(err)` (or returns non-callable fallback `onErr`). |

```sdev
forge safe_div be try_catch_fn((x) -> 10 / x, (err, x) -> "caught")
forge ok_r be attempt_result(() -> 40 + 2)

speak(match_option(Some(5), x -> x * 2, () -> 0))
speak(match_option(None(), x -> x * 2, 99))
speak(match_result(ok_r, v -> v, e -> -1))
speak(safe_div(0))
```

### 3.8 Self-Hosted SDEV v2 Functional Modules

Two pure-SDEV modules compile directly onto the self-hosted v2 Seed VM and native backends:

- [`lang/paradigms/functional.sdev`](../../lang/paradigms/functional.sdev):
  - `Some`, `None`, `is_some`, `is_none`, `unwrap_or`, `map_some`, `flat_map_some`
  - `Ok`, `Err`, `is_ok`, `is_err`, `result_unwrap_or`, `map_ok`, `flat_map_ok`, `match_adt`
  - Newly added: `match_result(res, on_ok, on_err)`, `match_option_fn(opt, on_some, on_none)`, `func_pipe2(x, f, g)`, `func_pipe3(x, f, g, h)`, `func_compose2(f, g, x)`
- [`lang/stdlib/v2/func.sdev`](../../lang/stdlib/v2/func.sdev):
  - `func_take`, `func_drop`
  - Newly added: `func_map(xs, fn)`, `func_filter(xs, pred)`, `func_fold(xs, init, fn)`, `func_scan(xs, init, fn)`, `func_juxt(fns, x)`, `func_converge(after_fn, branch_fns, x)`, `func_zip_with(xs, ys, fn)`, `func_partition(xs, pred)`, `func_flat_map(xs, fn)`, `func_find(xs, pred)`, `func_every(xs, pred)`, `func_some(xs, pred)`

```sdev
#!sdev v2
use "lang/paradigms/functional.sdev"
use "lang/stdlib/v2/func.sdev"

to inc with x
  return x + 1
end
to dbl with x
  return x * 2
end
to is_even with x
  return x % 2 is 0
end
to add2 with acc x
  return acc + x
end

set ys to func_map([1, 2, 3], ref dbl)
set evens to func_filter([1, 2, 3, 4], ref is_even)
set total to func_fold([1, 2, 3, 4], 0, ref add2)
set piped to func_pipe2(5, ref inc, ref dbl)

say ys[2]
say length(evens)
say total
say piped
```

---

## 4. Verification Suites

Run the dedicated FOP & FP verification suite (covering interpreter, v2 bytecode VM, static linter, and `public/sdev-interpreter.py` parity) along with the multi-language parity gates:

```sh
node scripts/run-ts.mjs scripts/test-fop-fp.ts
npm run test:features-ts
npm run test:features
```
