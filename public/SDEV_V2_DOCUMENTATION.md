# sdev v2 "Prism"

## Complete Documentation, Tutorial & Reference Guide

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Syntax Overview](#syntax-overview)
4. [Variables](#variables)
5. [Data Types](#data-types)
6. [Operators](#operators)
7. [String Operations](#string-operations)
8. [Control Flow](#control-flow)
9. [Functions](#functions)
10. [Lists](#lists)
11. [Tomes (Dictionaries)](#tomes-dictionaries)
12. [Built-in Output Functions](#built-in-output-functions)
13. [Built-in Number & Float Functions](#built-in-number--float-functions)
14. [Built-in String Functions](#built-in-string-functions)
15. [Built-in List Functions](#built-in-list-functions)
16. [Built-in Tome Functions](#built-in-tome-functions)
17. [File I/O](#file-io)
18. [Networking](#networking)
19. [Runtimes & Toolchain](#runtimes--toolchain)
20. [Under the Hood (Self-Hosting)](#under-the-hood-self-hosting)
21. [Opt-in Power (Advanced)](#opt-in-power-advanced)
22. [Examples & Recipes](#examples--recipes)
23. [Error Handling](#error-handling)
24. [Not Yet in v2](#not-yet-in-v2)
25. [v1 → v2 Cheat Sheet](#v1--v2-cheat-sheet)
26. [Complete Reference Card](#complete-reference-card)


---

## Introduction

**sdev v2 "Prism"** is the plain-English dialect of sdev. Where v1 uses a
deliberately unique vocabulary (`forge`, `conjure`, `ponder`, `::` / `;;`),
v2 has one guiding rule: **easy to read**. No sigils to memorize, no type
annotations required, English words wherever possible. If a ten-year-old can
guess what a line does, we picked the right word.

v2 supports:

- **English keywords** — `set`, `to`, `if`, `else`, `while`, `for each`,
  `return`, `break`, `continue`, `end`
- **Indentation-friendly blocks** — every block closes with `end`, no braces
- **Integers, floats, text, truth values, lists and tomes** as first-class values
- **A real standard library** — 19 string/number builtins plus a full float
  math family
- **File I/O and HTTP** — `read_file`, `write_file`, `http_get`
- **Pipe operator** — `|>` for clean left-to-right composition
- **Two backends** — a WebAssembly seed VM in the browser, and native
  x86-64 assembly on the desktop
- **Self-hosted** — the v2 lexer, parser and code generator are written in
  sdev itself and verified byte-identical against a reference oracle

v2 runs in the browser IDE (`/ide`), in the Playground (`/`), in the Electron
desktop app, in the VS Code extension, and from the Node CLI.
v1 remains the default — v2 is opt-in per file.

---

## Getting Started

### Opting in to v2

Add a shebang-style version line as the **first line** of your file:

```sdev
#!sdev v2
say "hello, world"
```

Output:
```
hello, world
```

Alternatively, set the runtime to **V2** in IDE **Settings** and every file in
the session compiles as v2. Files that begin with `#!sdev v1` (or no marker at
all) keep using v1 forever.

### Running in the IDE

Open the sdev IDE at `/ide`. Press **Ctrl+Enter** (or the **Run** button) to
execute your program. Output appears in the **OUTPUT** panel at the bottom.

### Running in the Playground

Go to the main Playground at `/`. Type or paste v2 code in the editor, then
click **Run**.

### Running from the command line

```bash
# run on the seed VM
node scripts/sdev-runtime-launcher.ts hello.sdev

# compile to a standalone native binary (Linux / macOS, x86-64)
node scripts/sdev-native.mjs hello.sdev -o hello
./hello
```

### Running in the desktop app

The Electron IDE ships **Build Native** and **Build & Run** buttons that call
the same native pipeline. See `electron/README.md`.

### Running in VS Code

The sdev extension (v1.2.0+) provides:

| Command | Purpose |
|---------|---------|
| `sdev.runV2` | Run the current file on the v2 seed VM |
| `sdev.buildNative` | Compile the current file to a native binary |

### Your First Program

```sdev
#!sdev v2
set name to "Alice"
set age to 30

say "Name: " + name
say "Age: " + str(age)
say "In 10 years: " + str(age + 10)

to greet with person greeting
  return greeting + ", " + person + "!"
end

say greet(name, "Welcome")
```

Output:
```
Name: Alice
Age: 30
In 10 years: 40
Welcome, Alice!
```

---

## Syntax Overview

### Comments

```sdev
# This is a single-line comment
say "hi"    # comments may trail a statement
```

### Blocks

Every block opens with its keyword and closes with `end`. There are no braces
and no `::` / `;;` delimiters:

```sdev
if x > 0
  say "positive"
end

while x > 0
  set x to x - 1
end

to add with a b
  return a + b
end
```

### No Semicolons Required

One statement per line. Semicolons are not part of the language.

### Indentation

Indentation is **style, not syntax** — `end` decides where blocks close. Two
spaces per level is the convention used throughout this guide and in every
sample file.

### The version line

```sdev
#!sdev v2
```

Must be the first line. It is a comment to every other tool, so a v2 file is
still a valid text file everywhere else.

---

## Variables

### Declaring and assigning

One form does both:

```sdev
set name to "Ada"
set age to 30
set age to age + 1     # reassignment uses the same syntax
```

Output of `say age`:
```
31
```

### Scope

A name first assigned at the top level lives for the whole program. A name
first assigned inside `to … end` is a **local** of that function and disappears
when the function returns. Parameters are locals too.

```sdev
set counter to 0

to bump
  set counter to counter + 1   # top-level variable, visible here
end
```

### Constants

v2 has no separate constant keyword — a value you never reassign *is* the
constant. Well-known math values are written literally:

```sdev
set PI to 3.141592653589793
set TAU to 6.283185307179586
set E  to 2.718281828459045
```

---

## Data Types

| Type    | Example                     | Notes                                   |
| ------- | --------------------------- | --------------------------------------- |
| number  | `42`, `-7`                  | 32-bit signed integers                  |
| float   | `3.14`, `-0.5`, `2.0`       | IEEE-754 doubles                        |
| text    | `"hello"`, `'hello'`        | byte strings                            |
| truth   | `true`, `false`             | compiled values — storable and passable |
| nothing | `nothing`                   | the empty value                         |
| list    | `[1, 2, 3]`, `["a", "b"]`   | growable, indexed from `0`              |
| tome    | `{ "host": "x", port: 80 }` | string-keyed dictionary                 |

### Numbers

Integer literals are 32-bit signed. All of `+ - * / %` work on them, and `/`
is integer division:

```sdev
say 7 / 2        # 3
say 7 % 2        # 1
say -7 + 3       # -4
```

### Floats

A literal with a decimal point is a double. Float math has its own explicit
builtin family (`fsqrt`, `fpow`, …) so the compiler always knows which kind of
number it is holding:

```sdev
set r to 2.5
say fsqrt(r)
say fround(fpow(r, 2.0))
```

Convert between the two with `i2f` and `f2i`:

```sdev
say f2i(fround(i2f(7) / 2.0))
```

### Text (Strings)

```sdev
set greeting to "hello"
set other to 'single quotes work too'
say greeting + ", world"      # hello, world
say length(greeting)          # 5
```

### Truth (Booleans)

```sdev
set ok to true
set bad to false
if ok and not bad
  say "both fine"
end
```

### Nothing

```sdev
set missing to nothing
```

Reading a tome key that does not exist also yields nothing.

### Lists

```sdev
set xs to [10, 20, 30]
say xs[0]            # 10
set xs[1] to 99
say length(xs)       # 3
```

### Tomes

```sdev
set config to { "host": "localhost", port: 8080 }
say config["host"]   # localhost
```

---

## Operators

### Arithmetic Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `+` | Add (also concatenates text) | `2 + 3` → `5` |
| `-` | Subtract / negate | `5 - 2` → `3`, `-x` |
| `*` | Multiply | `4 * 3` → `12` |
| `/` | Divide | `7 / 2` → `3` (int), `7.0 / 2.0` → `3.5` |
| `%` | Remainder | `7 % 2` → `1` |

### Comparison Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `is` | Equal | `x is 10` |
| `is not` | Not equal | `x is not 10` |
| `<` | Less than | `x < 10` |
| `>` | Greater than | `x > 10` |
| `<=` | Less than or equal | `x <= 10` |
| `>=` | Greater than or equal | `x >= 10` |
| `is N or more` | Natural `>=` | `age is 18 or more` |
| `is N or less` | Natural `<=` | `age is 12 or less` |

### Logical Operators

| Operator | Meaning | Notes |
|----------|---------|-------|
| `and` | Logical AND | short-circuits |
| `or` | Logical OR | short-circuits |
| `not` | Logical NOT | may be stacked: `not not x` |

```sdev
if age is 18 or more and country is "US"
  say "can vote"
end
```

Short-circuiting means the right-hand side only runs when the result still
depends on it.

### String & List Concatenation

```sdev
say "a" + "b"                # ab
say concat("hello, ", "you") # hello, you
```

### Pipe Operator `|>`

Feed a value into a function, left to right:

```sdev
set nums to [1, 2, 3, 4, 5]
say nums |> sum              # 15
```

### Operator Precedence (high to low)

1. Grouping `( )`, indexing `x[i]`, calls `f(a, b)`
2. Unary `-`, `not`
3. `*`, `/`, `%`
4. `+`, `-`
5. `<`, `>`, `<=`, `>=`
6. `is`, `is not`
7. `and`
8. `or`
9. `|>`

---

## String Operations

Text is a first-class value with a real library behind it:

```sdev
set s to "  Hello, sdev world  "
say trim(s)                       # Hello, sdev world
say upper(trim(s))                # HELLO, SDEV WORLD
say find(s, "sdev")               # 9
say contains(s, "sdev")           # 1
say replace(trim(s), "world", "v2")
say join(split("a,b,c", ","), "-")  # a-b-c
say substr("hello", 1, 3)         # ell
say int("-42") + 1                # -41
```

Byte-level primitives are there when you need to build text character by
character:

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

Splitting with an empty separator yields the individual bytes:

```sdev
for each c in split("abc", "")
  say c
end
```

Output:
```
a
b
c
```

---

## Control Flow

### If / Else — `if` / `else`

```sdev
if age is 18 or more
  say "adult"
else
  say "kid"
end
```

### Else If

Conditions chain as deeply as you like:

```sdev
if score is 10
  say "perfect"
else if score >= 5
  say "good"
else
  say "keep going"
end
```

### While Loop — `while`

```sdev
set i to 0
while i < 5
  say i
  set i to i + 1
end
```

Output:
```
0
1
2
3
4
```

### For-Each Loop — `for each … in`

Walks any list left to right, binding the loop variable on every turn:

```sdev
for each item in ["a", "b", "c"]
  say item
end

for each n in range(5)
  say n          # 0 1 2 3 4
end
```

Iterate a tome through its keys:

```sdev
set t to { "a": 1, "b": 2 }
for each k in keys(t)
  say k + "=" + str(t[k])
end
```

Output:
```
a=1
b=2
```

### Loop Control — `break` / `continue`

Both loop forms accept `break` (leave the loop now) and `continue` (jump to the
next iteration), at any nesting depth:

```sdev
for each x in [1, 2, 3, 4, 5]
  if x is 2
    continue
  end
  if x is 4
    break
  end
  say x          # 1 3
end
```

### Nested Loops

`break` and `continue` always apply to the innermost enclosing loop:

```sdev
for each i in range(3)
  for each j in range(3)
    if j is 2
      break
    end
    say str(i) + "," + str(j)
  end
end
```

---

## Functions

### Basic Functions — `to`

Define with `to <name>`, receive arguments with `with`:

```sdev
to greet with who
  say "hello, " + who
end

greet with "world"
greet("Ada")            # parens form works too
```

Output:
```
hello, world
hello, Ada
```

### Return Values — `return`

```sdev
to double with n
  return n * 2
end

say double with 21      # 42
say double(21)          # 42
```

A function without `return` yields nothing.

### Multiple Parameters

Parameters are listed after `with`, separated by spaces:

```sdev
to add with a b
  return a + b
end
say add(2, 3)           # 5
```

### Forward References

Functions may be called before they are defined — calls are patched at the end
of compilation:

```sdev
say later(3)

to later with n
  return n * n
end
```

### Recursive Functions

```sdev
to fib with n
  if n < 2
    return n
  end
  return fib(n - 1) + fib(n - 2)
end
say fib(20)             # 6765
```

### Functions over Lists and Tomes

Values are polymorphic at run time, so an untyped parameter still indexes
correctly:

```sdev
to lookup with t k
  return t[k]
end
say lookup({ "q": 42 }, "q")    # 42
say lookup([9, 8, 7], 1)        # 8
```

### Pipelines

```sdev
set nums to [1, 2, 3, 4, 5]
say nums |> sum         # 15
```

---

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

Because `range(n)` builds `[0 … n-1]` and `sum(list)` totals an integer list,
most of that is one line:

```sdev
say sum(range(5))   # 10
```

Lists of text work the same way and pair with `join`:

```sdev
set names to ["ada", "alan", "grace"]
say join(names, ", ")
```

Output:
```
ada, alan, grace
```

---

## Tomes (Dictionaries)

A tome is a string-keyed dictionary. Keys may be string literals or bare
identifiers (the identifier is used as the key text):

```sdev
set config to { "host": "localhost", port: 8080 }
say config["host"]        # localhost
say length(config)        # 2
```

Writing a key that does not exist adds it; a tome grows on demand:

```sdev
set scores to {}
set scores["ada"] to 10
set scores["alan"] to 7
set scores["ada"] to 12       # overwrites
say scores["ada"]             # 12
say scores["nobody"]          # 0 — a missing key reads as nothing
```

`length(t)` reports the entry count, and `keys` / `values` return lists in
insertion order, so tomes iterate exactly like lists:

```sdev
set t to { "a": 1, "b": 2 }
for each v in values(t)
  say v
end
```

Output:
```
1
2
```

Indexing dispatches on the value at run time, so lists and tomes can flow
through the same helper functions.

---

## Built-in Output Functions

| Function | Description |
|----------|-------------|
| `say <expr>` | Print a value followed by a newline (statement form, no parens needed) |
| `say(<expr>)` | Same, parenthesised |
| `print(<expr>)` | Alias of `say` |

```sdev
say "hello"
say 42
say [1, 2, 3]
say { "k": 1 }
```

---

## Built-in Number & Float Functions

### Integer helpers

| Function | Description | Example |
|----------|-------------|---------|
| `abs(n)` | Absolute value | `abs(-5)` → `5` |
| `min(a, b)` | Smaller of two | `min(3, 9)` → `3` |
| `max(a, b)` | Larger of two | `max(3, 9)` → `9` |
| `range(n)` | List `[0 … n-1]` | `range(3)` → `[0,1,2]` |
| `sum(list)` | Total of an int list | `sum([1,2,3])` → `6` |
| `random(n)` | Pseudo-random int in `[0, n)` | `random(6)` |
| `int(s)` | Decimal text → int | `int("-42")` → `-42` |
| `str(n)` | Int → decimal text | `str(-42)` → `"-42"` |

`random(n)` uses an in-VM xorshift generator rather than a host call, so the
same program prints the same sequence in the browser, in Node and in the
VS Code extension.

### Conversion

| Function | Description |
|----------|-------------|
| `i2f(n)` | Integer → float |
| `f2i(x)` | Float → integer (truncates) |

### Float math

| Function | Description |
|----------|-------------|
| `fneg(x)` | Negate |
| `fabs(x)` | Absolute value |
| `fsqrt(x)` | Square root |
| `fsin(x)`, `fcos(x)`, `ftan(x)` | Trigonometry |
| `fexp(x)` | e^x |
| `flog(x)` | Natural logarithm |
| `fpow(a, b)` | a^b |
| `fceil(x)` | Round up |
| `ffloor(x)` | Round down |
| `fround(x)` | Round to nearest |
| `fbyte(x, i)` | i-th little-endian IEEE-754 byte of a double |

```sdev
set r to 2.5
say fround(fpow(r, 2.0) * 3.14159)
say fsqrt(2.0)
```

`fbyte` is what the self-hosted compiler itself uses to emit float constants —
the language can describe its own literals.

---

## Built-in String Functions

| Function | Description | Example |
|----------|-------------|---------|
| `length(s)` | String length in bytes | `length("hello")` → `5` |
| `concat(a, b)` | Concatenate two strings | `concat("a","b")` → `"ab"` |
| `upper(s)` | ASCII uppercase | `upper("hi")` → `"HI"` |
| `lower(s)` | ASCII lowercase | `lower("HI")` → `"hi"` |
| `trim(s)` | Strip surrounding whitespace | `trim("  hi  ")` → `"hi"` |
| `substr(s, start, len)` | Clamped substring | `substr("hello",1,3)` → `"ell"` |
| `find(hay, needle)` | Byte index, `-1` when absent | `find("hello","l")` → `2` |
| `contains(hay, needle)` | `1` / `0` | `contains("hello","ell")` → `1` |
| `split(s, sep)` | Split into a list (empty `sep` → bytes) | `split("a,b",",")` → `["a","b"]` |
| `join(list, sep)` | Join a list of strings | `join(["a","b"],"-")` → `"a-b"` |
| `replace(s, old, new)` | Replace every occurrence | `replace("aaa","a","b")` → `"bbb"` |
| `ord(s, i)` | Byte value at index | `ord("A",0)` → `65` |
| `chr(n)` | 1-character string from byte | `chr(65)` → `"A"` |
| `int(s)` | Parse decimal text | `int("42")` → `42` |
| `str(n)` | Format an integer | `str(42)` → `"42"` |

---

## Built-in List Functions

| Function | Description | Example |
|----------|-------------|---------|
| `length(list)` | Number of elements | `length([1,2,3])` → `3` |
| `list[i]` | Read element | `[1,2,3][0]` → `1` |
| `set list[i] to v` | Write element | — |
| `range(n)` | Build `[0 … n-1]` | `range(3)` → `[0,1,2]` |
| `sum(list)` | Total of an int list | `sum([1,2,3])` → `6` |
| `join(list, sep)` | Join a list of strings | `join(["a","b"],"+")` → `"a+b"` |
| `split(s, sep)` | Produce a list from text | `split("a b"," ")` → `["a","b"]` |
| `mklist(n)` | Allocate a list of `n` slots | `mklist(4)` |

---

## Built-in Tome Functions

| Function | Description |
|----------|-------------|
| `keys(t)` | List of keys, in insertion order |
| `values(t)` | List of values, in insertion order |
| `has(t, k)` | `1` when the key exists, `0` otherwise |
| `length(t)` | Number of entries |
| `t[k]` | Read a value (missing key → nothing) |
| `set t[k] to v` | Write or insert a value |

```sdev
set a to { "x": 1, "y": 2 }
say has(a, "x")        # 1
say has(a, "z")        # 0
say join(keys(a), ",") # x,y
```

---

## File I/O

| Function | Description |
|----------|-------------|
| `read_file(path)` | File contents as text |
| `write_file(path, s)` | Write text, returns bytes written |

```sdev
write_file("notes.txt", "hello from sdev v2")
say read_file("notes.txt")
say length(read_file("notes.txt"))
```

In Node, the CLI and the desktop IDE these hit the real filesystem. In the
browser they map to the IDE's in-memory virtual filesystem, so the same
program runs everywhere.

---

## Networking

| Function | Description |
|----------|-------------|
| `http_get(url)` | Fetch a URL, return the body as text |

```sdev
set page to http_get("https://example.com")
write_file("page.html", page)
say length(page)
```

In the browser `http_get` uses `fetch`, so it is subject to CORS. On the
desktop and CLI it performs a plain HTTP request.

---

## Runtimes & Toolchain

v2 ships with **two independent backends** — pick the one that fits where your
program runs.

| Runtime | Where it runs | How it executes |
|---------|---------------|-----------------|
| **WASM (web)** | Browser IDE, Playground | A hand-written WebAssembly stack VM (`lang/bootstrap/seed.wat` → `public/wasm/sdev-seed.wasm`) executes bytecode emitted by the self-hosted compiler. Zero TypeScript in the language core. |
| **Native ASM (desktop)** | Linux / macOS CLI, Electron, VS Code | The same AST is emitted as x86-64 GAS assembly (`lang/native/codegen-x64.mjs`), assembled with `as` and linked with `ld` into a standalone static ELF. No libc dependency. |

Both backends share the same front end, so a program compiles on either side as
long as you stay inside the shared subset (integers, strings, lists, `if` /
`while`, functions, recursion, and the core builtins). Tomes, floats and the
newer string library are seed-VM only for now;
`lang/parity/report.json` is the authoritative gap list.

Useful scripts:

```bash
node scripts/sdev-native.mjs hello.sdev -o hello   # native build
node scripts/test-wasm-runtime.mjs                 # runtime regression suite
node scripts/test-shim-fixed-point.mjs             # byte-identity vs the oracle
node scripts/test-parity.ts                        # v1/v2/native feature audit
```

---

## Under the Hood (Self-Hosting)

v2 compiles itself. The pipeline is:

```text
source.sdev
   → lang/compiler/lexer.sdev     (tokens)
   → lang/compiler/parser.sdev    (AST)
   → lang/compiler/codegen.sdev   (seed-VM bytecode)
   → seed VM (WASM)  or  lang/native/codegen-x64.mjs (x86-64 assembly)
```

The compiler is itself compiled by a pre-built artifact
(`lang/compiler/driver-artifact.mjs`), so the JavaScript bootstrap
(`lang/bootstrap/compile.mjs`) is no longer on the runtime path — it survives
only as the **oracle** used in testing.

Two invariants are enforced on every change:

- **Semantic fixed point** — programs compiled by the self-hosted compiler
  behave exactly as when compiled by the oracle.
- **Byte-identity fixed point** — the two compilers emit the *same bytes*,
  currently across 66 cases, alongside 45 runtime regression cases.

Feature coverage across v1, v2 and the native track is declared in
`lang/parity/features.json` and audited by the sdev-written agent in
`lang/parity/agent.sdev`. Opcode tables, memory layout and the full milestone
log live in `SDEV_INTERNALS.md`; the parity matrix lives in
`SDEV_PARITY_DOCUMENTATION.md`.

---

## Opt-in Power (Advanced)

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

## Examples & Recipes

### FizzBuzz

```sdev
#!sdev v2
for each n in range(20)
  set i to n + 1
  if i % 15 is 0
    say "FizzBuzz"
  else if i % 3 is 0
    say "Fizz"
  else if i % 5 is 0
    say "Buzz"
  else
    say i
  end
end
```

### Fibonacci

```sdev
to fib with n
  if n < 2
    return n
  end
  return fib(n - 1) + fib(n - 2)
end

for each n in range(10)
  say fib(n)
end
```

### Word frequency counter

```sdev
set text to "the quick brown fox jumps over the lazy dog the fox"
set counts to {}
for each w in split(text, " ")
  if has(counts, w)
    set counts[w] to counts[w] + 1
  else
    set counts[w] to 1
  end
end
for each k in keys(counts)
  say k + ": " + str(counts[k])
end
```

### Caesar cipher

```sdev
to shift with s n
  set out to ""
  set i to 0
  while i < length(s)
    set c to ord(s, i)
    if c >= 97 and c <= 122
      set c to 97 + (c - 97 + n) % 26
    end
    set out to out + chr(c)
    set i to i + 1
  end
  return out
end

say shift("hello world", 3)
```

### Prime sieve

```sdev
to primes with limit
  set out to []
  set n to 2
  while n <= limit
    set ok to true
    set d to 2
    while d * d <= n
      if n % d is 0
        set ok to false
        break
      end
      set d to d + 1
    end
    if ok
      set out to out + [n]
    end
    set n to n + 1
  end
  return out
end

say join(["primes:", str(length(primes(50)))], " ")
```

### CSV-ish parsing into a tome

```sdev
set parts to split("a=1,b=2,c=3", ",")
set t to {}
for each p in parts
  set kv to split(p, "=")
  set t[kv[0]] to int(kv[1])
end
say join(keys(t), "-")     # a-b-c
say sum(values(t))         # 6
```

### Download a page and save it

```sdev
set page to http_get("https://example.com")
write_file("page.html", page)
say "saved " + str(length(page)) + " bytes"
```

### Circle area (floats)

```sdev
to area with r
  return 3.141592653589793 * fpow(r, 2.0)
end
say fround(area(2.5))
```

---

## Error Handling

Wrap risky work in `attempt … end`. A `throw` inside the block — at any call
depth — jumps to the matching `rescue`, which may bind the message.

```sdev
attempt
  say "working"
  throw "disk is on fire"
  say "never runs"
rescue e
  say "caught: " + e
end
say "carrying on"
```

```
working
caught: disk is on fire
carrying on
```

- `rescue` may omit the binding: `rescue` alone discards the message.
- `attempt` blocks nest; a `throw` inside a `rescue` propagates outward.
- A `throw` with no enclosing `attempt` prints the message and stops the
  program.
- Messages are ordinary strings, so build them with `+` and `str()`:
  `throw "bad index " + str(i)`.

```sdev
to parse_port with s
  set p to int(s)
  if p < 1
    throw "not a port: " + s
  end
  return p
end

attempt
  say parse_port("8080")
  say parse_port("nope")
rescue why
  say why
end
```

```
8080
not a port: nope
```

### Converting text to numbers

`int(s)` yields an integer, `num(s)` a float. Neither raises — unparseable
text becomes `0` / `0.0`, so validate and `throw` yourself when it matters.

```sdev
say int("42") + 1
say num("3.5") + 0.5
say f2i(num("42.9"))
```

```
43
4
42
```

---

## Not Yet in v2

v2 is the newer track; some v1 features have not landed yet. Use v1 (or the
mixed workflow: `#!sdev v1` for those files) until they do. The authoritative,
machine-checked list is `lang/parity/report.json`.

| Feature | v1 | v2 | Notes |
|---------|----|----|-------|
| Classes (`essence`, `extend`, `self`, `super`, `new`) | yes | planned | OOP milestone |
| Lambdas / closures (`(x) -> x * 2`) | yes | planned | |
| Imports (`summon` from Gist) | yes | planned | |
| Async / await / spawn | yes | planned | |
| Ternary `~` | yes | use `if` / `else` | |
| Sets, Maps, Queues, Stacks, LinkedList | yes | build from lists / tomes | |
| Matrix & graphics APIs | yes | v1 track | canvas and turtle stay in v1 |


---

## v1 → v2 Cheat Sheet

| v1 | v2 |
|----|----|
| `forge x be 10` | `set x to 10` |
| `speak("hi")` | `say "hi"` |
| `conjure add(a, b) :: … ;;` | `to add with a b … end` |
| `yield x` | `return x` |
| `ponder x > 0 :: … ;;` | `if x > 0 … end` |
| `otherwise :: … ;;` | `else … end` |
| `cycle x < 10 :: … ;;` | `while x < 10 … end` |
| `iterate n through xs :: … ;;` | `for each n in xs … end` |
| `yeet` / `skip` | `break` / `continue` |
| `yep` / `nope` / `void` | `true` / `false` / `nothing` |
| `also` / `either` / `isnt` | `and` / `or` / `not` |
| `equals` / `differs` | `is` / `is not` |
| `measure(x)` | `length(x)` |
| `etch(a, b)` | `concat(a, b)` |
| `shatter(s, sep)` / `weave(l, sep)` | `split(s, sep)` / `join(l, sep)` |
| `locate(s, sub)` | `find(s, sub)` |
| `snatch(s, a, b)` | `substr(s, start, len)` |
| `inscriptions(t)` / `contents(t)` | `keys(t)` / `values(t)` |
| `:: "k": 1 ;;` | `{ "k": 1 }` |
| `attempt :: … ;; rescue e :: … ;;` | `attempt … rescue e … end` |
| `throw "msg"` | `throw "msg"` |
| `num("3.5")` | `num("3.5")` |

To port a v1 file, either rewrite it or just add `#!sdev v1` on line 1 and keep
the old syntax working forever.

---

## Complete Reference Card

### Keywords

| Keyword | Purpose |
|---------|---------|
| `set` | Assign (declare or reassign) a variable |
| `to` | Introduce the target of `set`, and declare a function |
| `with` | Introduce function parameters / call arguments |
| `return` | Return a value from a function |
| `if` | Conditional |
| `else` | Else clause (`else if` chains) |
| `while` | While loop |
| `for each` | For-each loop over a list |
| `in` | Used with `for each` |
| `break` | Exit the innermost loop |
| `continue` | Skip to the next iteration |
| `end` | Close any block |
| `and` | Logical AND (short-circuit) |
| `or` | Logical OR (short-circuit) |
| `not` | Logical NOT |
| `is` / `is not` | Equality / inequality |
| `true` / `false` | Boolean values |
| `nothing` | Empty value |
| `say` | Print statement |

### Special Symbols

| Symbol | Purpose |
|--------|---------|
| `#` | Line comment |
| `#!sdev v2` | Version marker (first line) |
| `[ ]` | List literal / indexing |
| `{ }` | Tome literal |
| `( )` | Grouping and call arguments |
| `\|>` | Pipe operator |
| `+ - * / %` | Arithmetic |
| `< > <= >=` | Comparison |
| `"` / `'` | String delimiters |

### All builtins at a glance

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

### Quick Reference Examples

```sdev
#!sdev v2

# ── Variables ──
set x to 42
set name to "Alice"

# ── Conditionals ──
if x > 40
  say "big"
else if x > 20
  say "medium"
else
  say "small"
end

# ── Loops ──
for each n in range(5)
  if n is 3
    break
  end
  say n
end

set i to 0
while i < 3
  say i
  set i to i + 1
end

# ── Functions ──
to add with a b
  return a + b
end
say add(2, 3)

# ── Lists ──
set xs to [1, 2, 3]
set xs[0] to 9
say sum(xs)

# ── Tomes ──
set t to { "a": 1, b: 2 }
set t["c"] to 3
for each k in keys(t)
  say k + "=" + str(t[k])
end

# ── Text ──
say upper(trim("  sdev  "))
say join(split("a,b,c", ","), "-")

# ── Floats ──
say fround(fsqrt(2.0) * 100.0)

# ── Files & network ──
write_file("out.txt", "hi")
say read_file("out.txt")
```
