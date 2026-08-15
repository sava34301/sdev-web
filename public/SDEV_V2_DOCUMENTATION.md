# SDEV v2 "Prism" — Language Guide

> **Status:** Self-hosted. v2 runs alongside v1. Add `#!sdev v2` as the first
> line of a file, or set the runtime to **V2** in IDE Settings, to use it.
> Every existing `.sdev` file keeps working — v1 remains the default.

SDEV v2 has one guiding rule: **easy to read**.
No sigils to memorize. No type annotations required. English words wherever
possible. If a ten-year-old can guess what a line does, we picked the right
word.

The power (systems programming, functional pipelines, SQL-style queries, board
programming) is still there — it just doesn't get in your way when you don't
need it.

Everything in this guide is compiled by the **self-hosted sdev compiler**
(`lang/compiler/lexer.sdev`, `parser.sdev`, `codegen.sdev`) running on the seed
VM, and is verified byte-identical against the reference bootstrap oracle.

**Contents**

1. [Hello, world](#hello-world) · [Variables](#variables) · [Values](#values)
2. [If / else](#if--else) · [Loops](#loops)
3. [Functions](#functions) · [Pipelines](#pipelines)
4. [Lists](#lists) · [Tomes](#tomes) · [Strings](#strings)
5. [Numbers & floats](#numbers--floats)
6. [Files & the network](#files--the-network)
7. [Builtin reference](#builtin-reference)
8. [Runtimes & toolchain](#runtimes--toolchain)
9. [Under the hood](#under-the-hood)
10. [Opt-in power](#opt-in-power-advanced) · [v1 → v2 cheat sheet](#v1--v2-cheat-sheet)

---

## Hello, world

```sdev
#!sdev v2
say "hello, world"
```

Run it. That's the whole program.

## Variables

```sdev
set name to "Ada"
set age to 30
say "hi " + name
```

Reassign the same way:

```sdev
set age to age + 1
```

Variables are function-local. A name first used at the top level lives for the
whole program; a name first used inside `to … end` is a local of that function.

## Values

| Kind    | Example                     | Notes                              |
| ------- | --------------------------- | ---------------------------------- |
| number  | `42`, `-7`                  | 32-bit signed integers             |
| float   | `3.14`, `-0.5`, `2.0`       | IEEE-754 doubles                   |
| text    | `"hello"` or `'hello'`      | byte strings                       |
| truth   | `true`, `false`             | compiled values, storable/passable |
| nothing | `nothing`                   | the empty value                    |
| list    | `[1, 2, 3]`, `["a", "b"]`   | growable, index from `0`           |
| tome    | `{ "host": "x", port: 80 }` | string-keyed dictionary            |

## If / else

```sdev
if age is 18 or more
  say "adult"
else
  say "kid"
end
```

Available comparisons: `is`, `is not`, `<`, `>`, `<=`, `>=`, and the natural
forms `is N or more` / `is N or less`.

Combine with `and`, `or`, `not`:

```sdev
if age is 18 or more and country is "US"
  say "can vote"
end
```

`and` and `or` short-circuit: the right-hand side only runs when the result
still depends on it. `not` may be stacked (`not not x`), and unary minus works
on any expression (`-x`, `-(a * b)`, `0 - -7`).

Conditions chain with `else if`, as deeply as you like:

```sdev
if score is 10
  say "perfect"
else if score >= 5
  say "good"
else
  say "keep going"
end
```

## Loops

```sdev
for each item in [1, 2, 3]
  say item
end

for each n in range(5)
  say n            # 0 1 2 3 4
end

set i to 0
while i < 5
  say i
  set i to i + 1
end
```

`for each` walks any list left to right, binding the loop variable on every
turn. Both loop forms accept `break` (leave the loop now) and `continue`
(jump to the next iteration), at any nesting depth:

```sdev
for each x in [1, 2, 3, 4, 5]
  if x is 2
    continue
  end
  if x is 4
    break
  end
  say x            # 1 3
end
```

## Functions

Define with `to <name>`, receive arguments with `with`:

```sdev
to greet with who
  say "hello, " + who
end

greet with "world"
greet("Ada")            # parens form works too
```

Return a value with `return`:

```sdev
to double with n
  return n * 2
end

say double with 21      # 42
```

Functions may be called before they are defined (forward references are
patched at the end of compilation), and they may recurse:

```sdev
to fib with n
  if n < 2
    return n
  end
  return fib(n - 1) + fib(n - 2)
end
say fib(20)             # 6765
```

## Pipelines

Chain operations left-to-right with `|>`:

```sdev
set nums to [1, 2, 3, 4, 5]
set doubled to nums |> double
say doubled              # [2, 4, 6, 8, 10]
```

## Lists

```sdev
set xs to [10, 20, 30]
say length(xs)      # 3
say xs[0]           # 10
set xs[1] to 99
say xs[1]           # 99
```

Iterate the classic way or with `for each`:

```sdev
set total to 0
set i to 0
while i < length(xs)
  set total to total + xs[i]
  set i to i + 1
end
say total
```

`range(n)` builds `[0 … n-1]` and `sum(list)` totals an integer list, so the
above is usually one line: `say sum(xs)`.

## Tomes

A tome is a string-keyed dictionary. Write one with braces; keys may be string
literals or bare identifiers (the identifier is used as the key text):

```sdev
set config to { "host": "localhost", port: 8080 }
say config["host"]        # localhost
say length(config)        # 2
```

Read and write entries by key. Writing a key that does not exist yet adds it,
and a tome grows on demand:

```sdev
set scores to {}
set scores["ada"] to 10
set scores["alan"] to 7
set scores["ada"] to 12       # overwrites
say scores["ada"]             # 12
say scores["nobody"]          # 0 — a missing key reads as nothing
```

Three builtins go with tomes:

| Call        | Result                                      |
| ----------- | ------------------------------------------- |
| `keys(t)`   | list of the tome's keys, in insertion order |
| `values(t)` | list of the values, in insertion order      |
| `has(t, k)` | `1` when the key exists, `0` otherwise      |

`length(t)` reports the entry count, so tomes iterate the same way lists do:

```sdev
set t to { "a": 1, "b": 2 }
for each k in keys(t)
  say k + "=" + str(t[k])
end
# a=1
# b=2
```

Indexing dispatches on the value itself at run time, so a tome received as an
untyped parameter still reads by key:

```sdev
to lookup with t k
  return t[k]
end
say lookup({ "q": 42 }, "q")   # 42
```

## Strings

Text is a first-class value. Concatenate with `+` or `concat`:

```sdev
set name to "sdev"
say "hi " + name + "!"          # hi sdev!
say concat("hello, ", "world")  # hello, world
say length("hello")             # 5
```

High-level string library:

| Call                    | Result                                       |
| ----------------------- | -------------------------------------------- |
| `upper(s)` / `lower(s)` | ASCII case fold                              |
| `trim(s)`               | strip leading/trailing whitespace            |
| `substr(s, start, len)` | clamped substring                            |
| `find(hay, needle)`     | byte index, or `-1`                          |
| `contains(hay, needle)` | `1` / `0`                                    |
| `split(s, sep)`         | list of pieces (empty `sep` splits to bytes) |
| `join(list, sep)`       | glue a list of strings                       |
| `replace(s, old, new)`  | replace every occurrence                     |
| `int(s)`                | decimal string to int (`-` allowed)          |

```sdev
set parts to split("a=1,b=2", ",")
set t to {}
for each p in parts
  set t[substr(p, 0, 1)] to int(substr(p, 2, 1))
end
say join(keys(t), "-")        # a-b
say upper(trim("  sdev  "))   # SDEV
```

Byte-level primitives are there when you need to build text character by
character:

| Builtin       | Meaning                                                  |
| ------------- | -------------------------------------------------------- |
| `length(x)`   | length of a list, tome **or** string                     |
| `concat(a,b)` | concatenate two strings                                  |
| `ord(s, i)`   | byte value of `s` at index `i` (`ord("A",0)` → 65)       |
| `chr(n)`      | 1-character string from a byte value (`chr(65)` → `"A"`) |
| `str(n)`      | integer → decimal string (`str(-42)` → `"-42"`)          |

```sdev
# uppercase a string one byte at a time
set s to "abc"
set i to 0
set out to ""
while i < length(s)
  set out to out + chr(ord(s, i) - 32)
  set i to i + 1
end
say out             # ABC
```

## Numbers & floats

Integers use the usual `+ - * / %` operators. Float literals (`3.14`) compile
to IEEE-754 doubles, and float math has its own explicit family so the
compiler always knows which kind of number it is holding:

| Call                              | Result                              |
| --------------------------------- | ----------------------------------- |
| `i2f(n)` / `f2i(x)`               | convert between int and float       |
| `fneg(x)`, `fabs(x)`, `fsqrt(x)`  | sign, magnitude, square root        |
| `fsin`, `fcos`, `ftan`            | trigonometry                        |
| `fexp(x)`, `flog(x)`, `fpow(a,b)` | exponentials and powers             |
| `fceil(x)`, `ffloor(x)`, `fround(x)` | rounding                         |
| `fbyte(x, i)`                     | i-th little-endian byte of a double |

Integer helpers: `abs(n)`, `min(a, b)`, `max(a, b)`, `range(n)`, `sum(list)`,
`random(n)`.

```sdev
set r to 2.5
say fround(fpow(r, 2.0) * 3.14159)   # area, rounded
say sum(range(5))                    # 10
```

`random(n)` uses an in-VM xorshift generator rather than a host call, so the
same program prints the same sequence in the browser, in Node and in the
VS Code extension. `fbyte` is what the self-hosted compiler itself uses to
emit float constants — the language can describe its own literals.

## Files & the network

Three host-mediated builtins reach outside the VM:

| Call                  | Result                                   |
| --------------------- | ---------------------------------------- |
| `read_file(path)`     | file contents as text                    |
| `write_file(path, s)` | writes `s`, returns bytes written        |
| `http_get(url)`       | response body as text                    |

```sdev
set page to http_get("https://example.com")
write_file("page.html", page)
say length(read_file("page.html"))
```

In Node and the desktop IDE these hit the real filesystem and network. In the
browser they are stubbed (file I/O maps to an in-memory virtual FS, `http_get`
uses `fetch` where CORS allows), so a program that only computes behaves
identically everywhere.

## Builtin reference

Complete v2 builtin set, grouped:

- **Output:** `say`, `print`
- **Core:** `length`
- **Text:** `concat`, `ord`, `chr`, `str`, `upper`, `lower`, `trim`, `substr`,
  `find`, `contains`, `split`, `join`, `replace`
- **Numbers:** `int`, `abs`, `min`, `max`, `range`, `sum`, `random`
- **Floats:** `i2f`, `f2i`, `fneg`, `fabs`, `fsqrt`, `fsin`, `fcos`, `ftan`,
  `fexp`, `flog`, `fpow`, `fceil`, `ffloor`, `fround`, `fbyte`
- **Lists:** `mklist`, plus `[…]` literals and `x[i]` indexing
- **Tomes:** `keys`, `values`, `has`, plus `{…}` literals and `t[k]`
- **Host I/O:** `read_file`, `write_file`, `http_get`

## Runtimes & toolchain

SDEV v2 ships with **two independent backends** — pick the one that fits where
your program runs.

| Runtime                  | Where it runs                | How it executes                                                                                                                                                                |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **WASM (web)**           | The browser IDE              | A hand-written WebAssembly stack VM (`lang/bootstrap/seed.wat` → `public/wasm/sdev-seed.wasm`) executes bytecode emitted by the self-hosted compiler. Zero TypeScript in the core. |
| **Native ASM** (desktop) | Linux / macOS CLI + Electron | The same AST is emitted as x86-64 GAS assembly (`lang/native/codegen-x64.mjs`), assembled with `as` and linked with `ld` into a standalone static ELF. No libc dependency.       |

Both backends share the same front end, so a program that compiles on one side
compiles on the other as long as you stay inside the shared subset (integers,
strings, lists, `if`/`while`, functions, recursion, and the builtins above).
The native track does not yet cover tomes, floats or the full string library —
`lang/parity/report.json` is the authoritative gap list.

Compile to a native binary from a shell:

```sh
node scripts/sdev-native.mjs hello.sdev -o hello
./hello
```

Run on the seed VM from a shell:

```sh
node scripts/test-wasm-runtime.mjs      # runtime regression suite
node scripts/test-shim-fixed-point.mjs  # byte-identity vs. the oracle
```

Or use the Electron desktop IDE — the "Build Native" / "Build & Run" buttons
call the same pipeline (`electron/README.md`). The VS Code extension (v1.2.0+)
bundles a v2 runner and the native compiler as `sdev.runV2` and
`sdev.buildNative`.

## Under the hood

v2 is self-hosted. The pipeline is:

```text
source.sdev
   → lang/compiler/lexer.sdev     (tokens)
   → lang/compiler/parser.sdev    (AST)
   → lang/compiler/codegen.sdev   (seed-VM bytecode)
   → seed VM (WASM)  or  lang/native/codegen-x64.mjs (x86-64 asm)
```

The compiler is itself compiled by a pre-built artifact
(`lang/compiler/driver-artifact.mjs`), so the JavaScript bootstrap
(`lang/bootstrap/compile.mjs`) is no longer on the runtime path — it survives
only as the **oracle** used in testing.

Two invariants are enforced by CI-style scripts on every change:

- **Semantic fixed point** — programs compiled by the self-hosted compiler
  behave exactly as when compiled by the oracle.
- **Byte-identity fixed point** — the two compilers emit the *same bytes*,
  currently across 66 cases, alongside 45 runtime regression cases.

Feature coverage across v1, v2 and the native track is tracked declaratively in
`lang/parity/features.json` and audited by the sdev-written agent in
`lang/parity/agent.sdev`; see `SDEV_PARITY_DOCUMENTATION.md`. Opcode tables,
memory layout and the milestone log live in `SDEV_INTERNALS.md`.

## Opt-in power (advanced)

Beginners can ignore this section entirely.

### Pattern matching (functional)

```sdev
match result
  ok x    -> say x
  error e -> say "oops: " + e
end
```

### Systems block (manual memory, pointers, FFI)

```sdev
systems
  set buf to bytes 1024
  buf[0] to 42
end
```

### Data query (SQL-ish over any list or table)

```sdev
set adults to from u in users where u.age >= 18 take u.name
```

### Hardware (`board` block)

```sdev
board "uno"
  pin 13 is output
  forever
    turn 13 on ; wait 500ms
    turn 13 off; wait 500ms
  end
end
```

See `SDEV_HARDWARE_DOCUMENTATION.md` for the full board reference, and
`SDEV_ML_DOCUMENTATION.md` for the tensor / transformer / self-evolution stack.

---

## v1 → v2 cheat sheet

| v1                             | v2                           |
| ------------------------------ | ---------------------------- |
| `forge x be 10`                | `set x to 10`                |
| `speak("hi")`                  | `say "hi"`                   |
| `conjure add(a, b) :: … ;;`    | `to add with a b … end`      |
| `ponder x > 0 :: … ;;`         | `if x > 0 … end`             |
| `iterate n through xs :: … ;;` | `for each n in xs … end`     |
| `cycle x < 10 :: … ;;`         | `while x < 10 … end`         |
| `yield x`                      | `return x`                   |
| `yeet` / `skip`                | `break` / `continue`         |
| `yep` / `nope` / `void`        | `true` / `false` / `nothing` |
| `measure(x)` / `etch(a, b)`    | `length(x)` / `concat(a, b)` |

To port a v1 file, either rewrite it or just add `#!sdev v1` on line 1 and
keep the old syntax working forever.
