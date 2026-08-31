# sdev ↔ Python Parity Documentation

> Status: living document. Every feature listed here is implemented in the sdev v1 interpreter (`src/lang/`) and exercised by the parity smoke tests. sdev keeps two spellings for every keyword: the **mystic** v1 spelling (`forge`, `conjure`, `either`) and the **plain** v2/Python-like spelling (`let`, `def`, `if`). Both compile to the same tokens.

***

## 1. Keyword map

| Python                       | sdev plain                   | sdev mystic                         | Notes                                                               |
| ---------------------------- | ---------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `=` (binding)                | `let`                        | `forge`                             | `forge x be 1`                                                      |
| `=` (rebind)                 | `set`                        | `be`                                | `be x be 2`                                                         |
| `def`                        | `def`                        | `conjure`                           |                                                                     |
| `return`                     | `return`                     | `yield`                             | `yield` as generator uses `emit` (see §6)                           |
| `class`                      | `class` / `kind`             | `essence`                           | `essence` and `kind` are _contextual_ — still usable as identifiers |
| `if` / `elif` / `else`       | `if` / `elif` / `else`       | `either` / `elsewise` / `otherwise` |                                                                     |
| `while`                      | `while`                      | `cycle`                             |                                                                     |
| `for x in xs`                | `for x in xs`                | `iterate x through xs`              |                                                                     |
| `break` / `continue`         | `break` / `continue`         | `yeet` / `skip`                     |                                                                     |
| `pass`                       | `pass`                       | `idle`                              |                                                                     |
| `try` / `except` / `finally` | `try` / `except` / `finally` | `attempt` / `rescue` / `ensure`     |                                                                     |
| `raise`                      | `raise` / `throw`            | `hurl`                              |                                                                     |
| `assert`                     | `assert`                     | `insist`                            |                                                                     |
| `with`                       | `with`                       | `enfold`                            | `weave` stays the list-join builtin                                 |
| `match`                      | `match`                      | `discern`                           | `sift` stays the filter builtin                                     |
| `import` / `from`            | `import` / `from`            | `summon` / `from`                   |                                                                     |
| `as`                         | `as`                         | `alias`                             |                                                                     |
| `global` / `nonlocal`        | `global` / `nonlocal`        | `worldly` / `outer`                 |                                                                     |
| `del`                        | `del`                        | `banish`                            |                                                                     |
| `lambda`                     | `lambda`                     | `spell`                             |                                                                     |
| `async` / `await`            | `async` / `await`            | `async` / `await`                   |                                                                     |
| `True` / `False` / `None`    | `true` / `false` / `null`    | `yep` / `nope` / `void`             |                                                                     |
| `and` / `or` / `not`         | `and` / `or` / `not`         | `also` / `either`-form / `isnt`     |                                                                     |
| `==` / `!=` / `is`           | `==` / `!=` / `is`           | `equals` / `differs` / `same`       |                                                                     |

Contextual keywords (`essence`, `kind`) are only treated as class declarations when a name follows them, so legacy programs that use `kind` as a variable keep working.

***

## 2. Literals and data types

```sdev
forge i be 42                 // int
forge f be 3.14               // float
forge s be "text"             // str  (also '...', """...""")
forge b be b"bytes"           // bytes
forge t be (1, 2, 3)          // tuple
forge l be [1, 2, 3]          // list
forge st be {1, 2, 3}         // set
forge d be {"a": 1, "b": 2}   // dict
forge n be null               // None
```

Supported literal forms: underscores in numbers (`1_000_000`), hex/octal/binary (`0xff`, `0o17`, `0b1010`), complex-free float exponents (`1e-9`), raw strings (`r"\d+"`), f-strings with `{expr}`, `{expr!r}`, `{expr:spec}` and `{expr=}` debug output, and triple-quoted multiline strings.

***

## 3. Operators

Arithmetic `+ - * / // % **`, bitwise `& | ^ ~ << >>`, comparison `< <= > >= == != is is not in not in`, boolean `and or not`, ternary `a if cond else b`, walrus `:=`, chained comparisons (`0 < x < 10`), augmented assignment (`+= -= *= /= //= %= **= &= |= ^= <<= >>=`).

Slicing follows Python exactly, negative indices included:

```sdev
xs[1:]        xs[:3]        xs[::2]       xs[::-1]      xs[-2:]
```

***

## 4. Destructuring

```sdev
forge a, b be (1, 2)
forge head, *rest be [1, 2, 3, 4]     // rest == [2, 3, 4]
forge *init, last be [1, 2, 3]        // init == [1, 2]
iterate k, v through d.items() :: speak(k) ;;
```

***

## 5. Functions

```sdev
conjure greet(name, greeting be "hi", *args, **kwargs) ::
    yield greeting + " " + name
;;
```

Supported: positional/keyword arguments, defaults, `*args`, `**kwargs`, keyword-only parameters after `*`, unpacking at call sites (`f(*xs, **kw)`), nested functions, closures, recursion, decorators (stacked and parameterised), and first-class function values.

```sdev
conjure twice(fn) ::
    conjure inner(x) :: yield fn(fn(x)) ;;
    yield inner
;;

@twice
conjure inc(x) :: yield x + 1 ;;
speak(inc(1))   // 3
```

***

## 6. Generators, iterators, async

```sdev
conjure counter(n) ::
    forge i be 0
    cycle i < n ::
        emit i          // Python `yield`
        be i be i + 1
    ;;
;;

iterate v through counter(3) :: speak(v) ;;
```

`emit from` delegates (Python `yield from`). `async conjure` + `await` drive the same generator machinery; `await` suspends and resumes on promise settlement.

***

## 7. Classes and protocols

```sdev
essence Point ::
    conjure __init__(self, x, y) ::
        be self.x be x
        be self.y be y
    ;;
    conjure __repr__(self) :: yield "Point(" + str(self.x) + ", " + str(self.y) + ")" ;;
    conjure __add__(self, other) :: yield Point(self.x + other.x, self.y + other.y) ;;
;;
```

Dunder methods are automatically aliased onto sdev's native protocol slots (`__init__` ↔ `on_create`, `__add__` ↔ `on_add`, `__str__` ↔ `on_text`, `__repr__` ↔ `on_repr`, `__len__` ↔ `size`, `__iter__`, `__getitem__`, `__setitem__`, `__call__`, `__eq__`, `__lt__`, `__contains__`, `__enter__`, `__exit__`, …). Writing either spelling works.

Multiple inheritance resolves via **C3 linearization**, matching Python's MRO. `super()` walks the linearised chain. `@staticmethod`, `@classmethod`, `@property` and metaclasses are supported.

***

## 8. Exceptions

```sdev
attempt ::
    hurl ValueError("bad")
rescue ValueError alias e ::
    speak(str(e))        // "bad" — str(exc) is the message, as in Python
ensure ::
    speak("cleanup")
;;
```

Built-in exception hierarchy: `Exception`, `ValueError`, `TypeError`, `KeyError`, `IndexError`, `AttributeError`, `ZeroDivisionError`, `StopIteration`, `RuntimeError`, `NotImplementedError`, `AssertionError`, `OSError` and friends. Multiple `rescue` clauses, tuple-of-types clauses, bare `rescue`, and `else` blocks all behave as in Python.

***

## 9. Comprehensions

```sdev
[x * x for x in range(10) if x % 2 == 0]
{x for x in xs}
{v: k for k, v in pairs.items()}      // keys are expressions, not bare words
(x for x in xs)                        // generator expression
```

Nested clauses and multiple `if` filters are supported. Inside a dict comprehension the key is always evaluated as an expression — the bare-identifier shorthand only applies to dict _literals_.

***

## 10. Context managers

```sdev
enfold open("f.txt") alias fh ::
    speak(fh.read())
;;
```

`__enter__` / `__exit__` (or the mystic `on_enter` / `on_exit`) are called, and `__exit__` still runs when the body raises.

***

## 11. Pattern matching

```sdev
discern value ::
    when 0 :: speak("zero") ;;
    when [x, y] :: speak(x + y) ;;
    when {"kind": k} :: speak(k) ;;
    when Point(x be px) :: speak(px) ;;
    when _ :: speak("other") ;;
;;
```

Literal, capture, wildcard, sequence, mapping, class and or-patterns (`when 1 | 2 | 3`) with guards (`when x if x > 10`).

***

## 12. Builtins

All Python builtins are available. Where a name would shadow an existing sdev v1 builtin, the Python version is exposed with a `py_` prefix (for example `py_sum`, `py_map`, `py_filter`); non-colliding names are global.

`abs any all ascii bin bool bytes callable chr dict dir divmod enumerate eval filter float format frozenset getattr hasattr hash hex id input int isinstance issubclass iter len list map max min next object oct ord pow print range repr reversed round set setattr slice sorted str sum tuple type vars zip`

Method-call sugar works on plain values, so both spellings are valid:

```sdev
xs.append(4)        // same as append(xs, 4)
d.items()           // same as items(d)
"a,b".split(",")    // same as split("a,b", ",")
```

String methods: `upper lower strip lstrip rstrip split rsplit splitlines join replace find rfind index startswith endswith count center ljust rjust zfill title capitalize swapcase encode format isdigit isalpha isalnum isspace islower isupper partition removeprefix removesuffix`.

List methods: `append extend insert remove pop clear index count sort reverse copy`. Dict methods: `keys values items get pop popitem setdefault update clear copy`. Set methods: `add discard remove union intersection difference symmetric_difference issubset issuperset`.

***

## 13. Modules

```sdev
summon math
from collections summon Counter alias Bag
```

Bundled parity modules: `math`, `random`, `json`, `re`, `time`, `datetime`, `itertools`, `functools`, `collections`, `string`, `os.path`, `sys`, `statistics`, `decimal`-lite, `textwrap`, `heapq`, `bisect`.

***

## 14. Track coverage

The Python-parity surface described here is implemented on the **v1 interpreter track** (browser IDE and Node CLI). The self-hosted v2 compiler and the native x86-64 backend track the core language subset listed in the [Track Parity Matrix](../docs); the parity agent (`lang/parity/agent.sdev`) fails CI whenever a required feature regresses on any track.
