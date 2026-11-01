# The Ultimate sdev Documentation

> **Everything about sdev in one file.** Language, runtimes, compiler, virtual
> machine, native backend, standard library, machine-learning stack, hardware,
> GIS, tooling, and the full generated reference tables.
>
> Created by **Sava Milanov**. Generated on 2026-11-01 by
> `scripts/build-ultimate-docs.mjs`. Do not edit by hand — edit the source
> guides or the implementation and re-run the generator.

---

## How to read this document

This book has three layers.

1. **Part I — Orientation.** What sdev is, why it exists, how the pieces fit
   together. Read this once, top to bottom.
2. **Parts II–VIII — The guides.** Every hand-written sdev guide, inlined
   verbatim and re-levelled so the table of contents stays flat. Nothing was
   summarised or dropped.
3. **Part IX — Generated reference.** Tables extracted directly from the
   implementation: every builtin, every opcode, every keyword, every stdlib
   function, the parity matrix, the repository map, and the toolchain.

Anything in Part IX is machine-derived, so it is correct by construction for
the commit that produced this file.

---

## Part I — Orientation

### What sdev is

sdev is a programming language with two surface dialects and three execution
tracks.

| | Dialect | Idea |
| --- | --- | --- |
| **v1** | `forge x be 10` / `speak(x)` | The original expressive dialect: unique keywords, classes, closures, canvas, web DSL, GIS. |
| **v2 "Prism"** | `set x to 10` / `say x` | The beginner-first dialect: English words, no sigils, same power behind opt-in blocks. |

| Track | Where it runs | How it executes |
| --- | --- | --- |
| **v1 TypeScript interpreter** | Browser IDE, Node CLI | Lexer → parser → tree-walking interpreter, with a bytecode compiler + stack VM alongside. |
| **v2 self-hosted compiler** | Browser IDE (WASM) | sdev source compiled by a compiler *written in sdev*, executing on a hand-written WebAssembly seed VM. |
| **native x86-64 backend** | Linux / macOS CLI, Electron desktop IDE | The same AST emitted as GAS assembly, assembled with `as`, linked with `ld` into a static ELF with no libc. |

All three tracks are measured against one canonical feature registry. See
*Part IX — Parity matrix*.

### Why it exists

Three reasons, in order of weight.

1. **Readability first.** Most languages ask a beginner to memorise
   punctuation before they can print a line. v2 asks for English:
   `say "hello"`. If a ten-year-old can guess what a line does, the keyword
   was chosen correctly.
2. **No ceiling.** Readability usually costs power. sdev keeps the power
   behind opt-in blocks — `systems` for pointers and FFI, `match` for
   algebraic pattern matching, query syntax for data, `board` for hardware —
   so a beginner never sees them and an expert never hits a wall.
3. **Own the whole stack.** The compiler is written in sdev. The VM is
   hand-written WebAssembly. The native backend emits raw assembly. There is
   no hidden layer someone else controls.

### The self-hosting fixed point

The property the whole project is organised around:

```text
  compiler.sdev  --compiled by-->  JS bootstrap  -->  bytecode A
  compiler.sdev  --compiled by-->  bytecode A    -->  bytecode B
  assert A == B          (byte-identical, not merely equivalent)
```

When A equals B byte for byte, the JavaScript bootstrap is no longer part of
the language — it is only a build-time oracle. sdev compiles sdev. The gate
that enforces this lives in `scripts/test-self-toolchain.mjs` and runs in CI
on every change.

### The layer cake

```text
   your program (.sdev)
        │
        ├── v1 path ──► lexer.ts → parser.ts → interpreter.ts        (tree walk)
        │                                    └► compiler.ts → vm.ts  (bytecode)
        │
        └── v2 path ──► lexer.sdev → parser.sdev → codegen.sdev      (all sdev)
                                     │
                                     ├──► seed VM (WebAssembly)      browser
                                     └──► codegen-x64.mjs → as → ld  native
```

### Choosing a runtime

Per file, with a shebang:

```sdev
#!sdev v1
forge x be 10
speak(x)
```

```sdev
#!sdev v2
set x to 10
say x
```

Globally, in the IDE: **Settings → Runtime**. Without a shebang the default is
**v1**.

### Sixty-second tour

```sdev
#!sdev v2
set nums to [3, 1, 4, 1, 5]

to double with n
  return n * 2
end

for each n in nums
  say double with n
end

set i to 0
while i < length(nums)
  set i to i + 1
end
say "counted " + str(i)
```

The same program in v1:

```sdev
#!sdev v1
forge nums be [3, 1, 4, 1, 5]

conjure double(n) ::
  yield n * 2
;;

iterate n through nums ::
  speak(double(n))
;;
```

---


## Part II — The language


### sdev v2 "Prism" — language guide

_Source: `public/SDEV_V2_DOCUMENTATION.md`_


#### Complete Documentation, Tutorial & Reference Guide

---

#### Table of Contents

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
24. [Function Values](#function-values)
25. [Modules — `use`](#modules--use)
26. [Not Yet in v2](#not-yet-in-v2)
27. [v1 → v2 Cheat Sheet](#v1--v2-cheat-sheet)
28. [Complete Reference Card](#complete-reference-card)


---

#### Introduction

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

#### Getting Started

##### Opting in to v2

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

##### Running in the IDE

Open the sdev IDE at `/ide`. Press **Ctrl+Enter** (or the **Run** button) to
execute your program. Output appears in the **OUTPUT** panel at the bottom.

##### Running in the Playground

Go to the main Playground at `/`. Type or paste v2 code in the editor, then
click **Run**.

##### Running from the command line

```bash
# run on the seed VM
node scripts/sdev-runtime-launcher.ts hello.sdev

# compile to a standalone native binary (Linux / macOS, x86-64)
node scripts/sdev-native.mjs hello.sdev -o hello
./hello
```

##### Running in the desktop app

The Electron IDE ships **Build Native** and **Build & Run** buttons that call
the same native pipeline. See `electron/README.md`.

##### Running in VS Code

The sdev extension (v1.2.0+) provides:

| Command | Purpose |
|---------|---------|
| `sdev.runV2` | Run the current file on the v2 seed VM |
| `sdev.buildNative` | Compile the current file to a native binary |

##### Your First Program

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

#### Syntax Overview

##### Comments

```sdev
# This is a single-line comment
say "hi"    # comments may trail a statement
```

##### Blocks

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

##### No Semicolons Required

One statement per line. Semicolons are not part of the language.

##### Indentation

Indentation is **style, not syntax** — `end` decides where blocks close. Two
spaces per level is the convention used throughout this guide and in every
sample file.

##### The version line

```sdev
#!sdev v2
```

Must be the first line. It is a comment to every other tool, so a v2 file is
still a valid text file everywhere else.

---

#### Variables

##### Declaring and assigning

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

##### Scope

A name first assigned at the top level lives for the whole program. A name
first assigned inside `to … end` is a **local** of that function and disappears
when the function returns. Parameters are locals too.

```sdev
set counter to 0

to bump
  set counter to counter + 1   # top-level variable, visible here
end
```

##### Constants

v2 has no separate constant keyword — a value you never reassign *is* the
constant. Well-known math values are written literally:

```sdev
set PI to 3.141592653589793
set TAU to 6.283185307179586
set E  to 2.718281828459045
```

---

#### Data Types

| Type    | Example                     | Notes                                   |
| ------- | --------------------------- | --------------------------------------- |
| number  | `42`, `-7`                  | 32-bit signed integers                  |
| float   | `3.14`, `-0.5`, `2.0`       | IEEE-754 doubles                        |
| text    | `"hello"`, `'hello'`        | byte strings                            |
| truth   | `true`, `false`             | compiled values — storable and passable |
| nothing | `nothing`                   | the empty value                         |
| list    | `[1, 2, 3]`, `["a", "b"]`   | growable, indexed from `0`              |
| tome    | `{ "host": "x", port: 80 }` | string-keyed dictionary                 |

##### Numbers

Integer literals are 32-bit signed. All of `+ - * / %` work on them, and `/`
is integer division:

```sdev
say 7 / 2        # 3
say 7 % 2        # 1
say -7 + 3       # -4
```

##### Floats

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

##### Text (Strings)

```sdev
set greeting to "hello"
set other to 'single quotes work too'
say greeting + ", world"      # hello, world
say length(greeting)          # 5
```

##### Truth (Booleans)

```sdev
set ok to true
set bad to false
if ok and not bad
  say "both fine"
end
```

##### Nothing

```sdev
set missing to nothing
```

Reading a tome key that does not exist also yields nothing.

##### Lists

```sdev
set xs to [10, 20, 30]
say xs[0]            # 10
set xs[1] to 99
say length(xs)       # 3
```

##### Tomes

```sdev
set config to { "host": "localhost", port: 8080 }
say config["host"]   # localhost
```

---

#### Operators

##### Arithmetic Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `+` | Add (also concatenates text) | `2 + 3` → `5` |
| `-` | Subtract / negate | `5 - 2` → `3`, `-x` |
| `*` | Multiply | `4 * 3` → `12` |
| `/` | Divide | `7 / 2` → `3` (int), `7.0 / 2.0` → `3.5` |
| `%` | Remainder | `7 % 2` → `1` |

##### Comparison Operators

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

##### Logical Operators

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

##### String & List Concatenation

```sdev
say "a" + "b"                # ab
say concat("hello, ", "you") # hello, you
```

##### Pipe Operator `|>`

Feed a value into a function, left to right:

```sdev
set nums to [1, 2, 3, 4, 5]
say nums |> sum              # 15
```

##### Operator Precedence (high to low)

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

#### String Operations

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

#### Control Flow

##### If / Else — `if` / `else`

```sdev
if age is 18 or more
  say "adult"
else
  say "kid"
end
```

##### Else If

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

##### While Loop — `while`

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

##### For-Each Loop — `for each … in`

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

##### Loop Control — `break` / `continue`

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

##### Nested Loops

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

#### Functions

##### Basic Functions — `to`

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

##### Return Values — `return`

```sdev
to double with n
  return n * 2
end

say double with 21      # 42
say double(21)          # 42
```

A function without `return` yields nothing.

##### Multiple Parameters

Parameters are listed after `with`, separated by spaces:

```sdev
to add with a b
  return a + b
end
say add(2, 3)           # 5
```

##### Forward References

Functions may be called before they are defined — calls are patched at the end
of compilation:

```sdev
say later(3)

to later with n
  return n * n
end
```

##### Recursive Functions

```sdev
to fib with n
  if n < 2
    return n
  end
  return fib(n - 1) + fib(n - 2)
end
say fib(20)             # 6765
```

##### Functions over Lists and Tomes

Values are polymorphic at run time, so an untyped parameter still indexes
correctly:

```sdev
to lookup with t k
  return t[k]
end
say lookup({ "q": 42 }, "q")    # 42
say lookup([9, 8, 7], 1)        # 8
```

##### Pipelines

```sdev
set nums to [1, 2, 3, 4, 5]
say nums |> sum         # 15
```

---

#### Lists

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

#### Tomes (Dictionaries)

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

#### Built-in Output Functions

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

#### Built-in Number & Float Functions

##### Integer helpers

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

##### Conversion

| Function | Description |
|----------|-------------|
| `i2f(n)` | Integer → float |
| `f2i(x)` | Float → integer (truncates) |

##### Float math

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

#### Built-in String Functions

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

#### Built-in List Functions

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

#### Built-in Tome Functions

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

#### File I/O

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

#### Networking

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

#### Runtimes & Toolchain

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

#### Under the Hood (Self-Hosting)

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

#### Opt-in Power (Advanced)

Beginners can ignore this section entirely.

##### Pattern matching (functional)

```sdev
match result
  ok x    -> say x
  error e -> say "oops: " + e
end
```

##### Systems block (manual memory, pointers, FFI)

```sdev
systems
  set buf to bytes 1024
  buf[0] to 42
end
```

##### Data query (SQL-ish over any list or table)

```sdev
set adults to from u in users where u.age >= 18 take u.name
```

##### Hardware (`board` block)

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

#### Examples & Recipes

##### FizzBuzz

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

##### Fibonacci

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

##### Word frequency counter

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

##### Caesar cipher

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

##### Prime sieve

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

##### CSV-ish parsing into a tome

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

##### Download a page and save it

```sdev
set page to http_get("https://example.com")
write_file("page.html", page)
say "saved " + str(length(page)) + " bytes"
```

##### Circle area (floats)

```sdev
to area with r
  return 3.141592653589793 * fpow(r, 2.0)
end
say fround(area(2.5))
```

---

#### Error Handling

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

##### Converting text to numbers

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

#### Function Values

`ref NAME` turns a declared function into a value; `call TARGET(args)` runs
one. Function values are ordinary values — store them in variables, lists and
tomes, or pass them to other functions.

```sdev
to twice with n
  return n * 2
end

set f to ref twice
say call f(21)
```

```
42
```

Passing behaviour into a function:

```sdev
to inc with n
  return n + 1
end
to apply_twice with fn v
  return call fn(call fn(v))
end
say apply_twice(ref inc, 5)
```

```
7
```

A dispatch table built from a tome:

```sdev
to add with a b
  return a + b
end
to mul with a b
  return a * b
end

set ops to {"add": ref add, "mul": ref mul}
for each k in keys(ops)
  set op to ops[k]
  say k + " -> " + str(call op(3, 4))
end
```

```
add -> 7
mul -> 12
```

Notes:
- `ref` only names top-level functions. For anonymous functions that remember
  surrounding state, use `make` (below).
- The call target must be a variable holding a function value:
  `set op to ops[k]` first, then `call op(...)`.
- Arity is not checked on indirect calls; pass the number of arguments the
  target declares.

---

#### Closures — `make`

`make` builds an anonymous function value inline. It takes an optional
parameter list (`with a b`) and an optional capture list (`capture n k`), a
newline, a body, and `end`. Call it exactly like any other function value,
with `call`.

```sdev
set f to make with a
  return a + 1
end
say call f(41)
```

```
42
```

Captures are listed explicitly and copied **by value** when the closure is
created — later changes to the outer variable do not affect it:

```sdev
set n to 10
set add_n to make with a capture n
  return a + n
end
say call add_n(5)
set n to 99
say call add_n(5)
```

```
15
15
```

Closures are ordinary values, so they can be returned from functions — the
classic factory:

```sdev
to adder with n
  return make with x capture n
    return x + n
  end
end

set a5 to adder(5)
set a9 to adder(9)
say call a5(1)
say call a9(1)
```

```
6
10
```

…and passed straight into higher-order functions:

```sdev
to apply with g v
  return call g(v)
end
set b to 7
say apply(make with x capture b
  return x + b
end, 5)
```

```
12
```

Notes:
- Captures must be named. A bare outer variable used inside a `make` body
  without appearing in `capture` is not in scope.
- Capture is by value at creation time; there is no shared mutable cell.
- A closure body has its own locals; `set` inside the body never touches the
  enclosing scope.
- Closures do not nest inside another `make` body yet.
- Under the hood a closure is a heap object holding the code offset, the
  capture count and the captured values (opcode `CLOSURE` 0xC5); `call`
  (`CALLV` 0xC4) appends the captures after the arguments as extra locals.

---

#### Kinds — objects and methods

A **kind** is v2's class. It groups methods; an instance is a tome whose
entries are those methods, so fields are just tome keys you set at runtime.

```sdev
kind Counter
  to start with self n
    set self.n to n
    return 0
  end
  to bump with self
    set self.n to self.n + 1
    return self.n
  end
  to show with self label
    say label + str(self.n)
    return 0
  end
end

set c to new Counter()
c.start(5)
say c.bump()      # 6
say c.bump()      # 7
c.show("count=")  # count=7
say c.n           # 7
```

Rules:
- `kind Name` … `end` declares the kind. Inside it, every method is an
  ordinary `to NAME with …` block whose **first parameter is the receiver**.
  Call it `self` by convention — it is a plain parameter, not a keyword.
- `new Name` (parentheses optional, no constructor arguments) creates an
  instance. Initialise it by calling a method: `c.start(5)`.
- `obj.field` reads a field, `set obj.field to v` writes one. Fields spring
  into existence on first write, exactly like tome keys.
- `obj.method(a, b)` calls a method; the receiver is passed automatically as
  the first argument. The receiver must be a variable, not an expression.
- Methods may call other methods on the same object: `self.area()`.
- Objects are ordinary values: store them in lists and tomes, pass them to
  functions, return them.

Typing note: a method call is treated as returning text when **any** kind
declares a method of that name that returns text; otherwise it is a number.
Field reads are numbers, so print a text field with `say str(obj.f)` only
when it really is a number — a text field prints correctly with
`say obj.f` only if you keep it in a variable typed by a text-returning
method. When in doubt, expose text through a method.

##### Inheritance — `extends` and `super`

A kind can extend another kind declared earlier in the file:

```sdev
kind Animal
  to legs with self
    return 4
  end
  to name with self
    return "animal"
  end
  to intro with self
    return "I am a " + self.name()
  end
end

kind Dog extends Animal
  to name with self
    return "dog/" + super.name()
  end
end

set d to new Dog()
say d.legs()     # 4      — inherited unchanged
say d.name()     # dog/animal
say d.intro()    # I am a dog/animal — inherited method, child override
```

Rules:
- `kind Child extends Parent` — the parent must already be declared.
- The child inherits every parent method it does not declare itself.
- Declaring a method with the same name overrides the parent's.
- `super.m(args)` inside a child method calls the **parent's** version, with
  the current receiver passed automatically. `super` is bound to the class
  the method is written in, not to the receiver's class, so a three-level
  chain (`C` → `B` → `A`) walks up one level at a time instead of looping.
- Chains are unlimited in depth; multiple inheritance is not supported.

Under the hood: `kind` is desugared before parsing — the header and closing
`end` disappear and each method becomes a top-level function named
`Kind_method`. `new` emits a `TNEW` sized to the method count plus one
`PUSH_STR` / function value / `TSET` triple per method; `obj.m(a)` reads the
target with `TGET` and calls it with `CALLV`. Inheritance copies the parent's
entries into the child's table, and `super.m()` is rewritten to a call on a
class-qualified hidden key (`super_Child_m`) bound to the parent's function,
which is what makes super resolution static.

---

#### Modules — `use`

Split a program across files. A line whose only content is `use "path"`
is replaced by the contents of that file before anything else happens.

`math.sdev`:

```
to triple with n
  return n * 3
end
```

`main.sdev`:

```
use "math.sdev"
say triple(14)      # 42
```

Rules:

- The directive must be the whole line: `use "path"` (double quotes).
- Paths are resolved by the host — the CLI and desktop IDE read them from
  disk relative to the working directory; the browser IDE resolves them
  against your workspace files.
- Modules may `use` other modules; nesting is unlimited.
- **Include-once**: a path already pulled in is skipped the second time, so
  diamond dependencies (`a` uses `c`, `b` uses `c`, main uses both) are
  safe and `c` is emitted exactly once.
- There is no namespacing yet: everything a module defines lands in the
  same global scope, so prefix names you intend to export.
- Line numbers stay honest — each directive contributes the module text
  followed by a newline, so errors inside a module point at the module.

Under the hood this is a source→source prelink pass that exists twice, in
lockstep: `prelink()` in the JS bootstrap and `prelink_source` in
`lang/compiler/codegen.sdev`, both producing byte-identical text so the
self-hosted compiler stays a fixed point.

---

#### Writing sdev in Your Own Language

sdev is not English-only, and the translator is part of the language, not an
editor add-on. Every entry point that reaches the toolchain — the IDE, the
`sdev` CLI, and `runWasm` — translates the source onto the canonical v2
surface before compiling.

```sdev
#!sdev v2
нека възраст бъде 21
ако възраст е 18 или повече
  кажи("голям")
край
```

```text
голям
```

How it works:

- **Detection** — `translateSource(src, 'auto', { target: 'v2' })` scores the
  source against every keyword table and picks the language, or you pass one
  (`--lang Bulgarian`, or the IDE's language picker).
- **v2 surface** — each table entry is mapped through `V1_TO_V2`
  (`forge → set`, `be → to`, `ponder → if`, `speak → say`, …) and extended with
  v2-only words per language (`end`, `each`, `with`, `has`, `more`, `less`,
  `match`, `call`). Classic v1 output is still available with `target: 'v1'`.
- **Conditions** — languages that use one word for binding and comparison
  (`е`, `es`, `ist`) resolve to `is` inside `if` / `while`, and to `to`
  in `set`.
- **Strings and comments** are never touched.
- **Dialects** — words owned by the active dialect are protected from the
  natural-language pass, then `canonicalize()` maps them to plain v2. So a
  Bulgarian dialect and Bulgarian keywords can be used in the same file.
- **Identifiers** may be written in any script. The self-hosted lexer treats
  every UTF-8 byte as a letter, so `възраст`, `αριθμός`, and `名前` are names.

```ts
import { translateForDialect } from '@/lang';
const { translated } = translateForDialect(src, 'auto', activeDialect, 'v2');
```

---

#### Not Yet in v2

v2 is the newer track; some v1 features have not landed yet. Use v1 (or the
mixed workflow: `#!sdev v1` for those files) until they do. The authoritative,
machine-checked list is `lang/parity/report.json`.

| Feature | v1 | v2 | Notes |
|---------|----|----|-------|
| Classes (`essence` / `new`) | yes | `kind` / `new` | see "Kinds" above |
| Inheritance (`extend`, `super`) | yes | planned | next OOP milestone |
| Lambdas / closures (`(x) -> x * 2`) | yes | `make … capture … end` | plus `ref` / `call` function values |
| Imports | `summon` (Gist) | `use "path"` | see "Modules" above; no Gist fetch in v2 yet |
| Async / await / spawn | yes | planned | |
| Ternary `~` | yes | use `if` / `else` | |
| Sets, Maps, Queues, Stacks, LinkedList | yes | build from lists / tomes | |
| Matrix & graphics APIs | yes | v1 track | canvas and turtle stay in v1 |


---

#### v1 → v2 Cheat Sheet

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
| `essence Point :: … ;;` | `kind Point … end` |
| `new Point()` / `obj.field` | `new Point` / `obj.field` |
| `throw "msg"` | `throw "msg"` |
| `num("3.5")` | `num("3.5")` |

To port a v1 file, either rewrite it or just add `#!sdev v1` on line 1 and keep
the old syntax working forever.

---

#### Complete Reference Card

##### Keywords

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

##### Special Symbols

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

##### All builtins at a glance

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

##### Quick Reference Examples

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

#### The understanding agent

sdev reads intent, not just syntax. Before the lexer, the parser or any code
generation runs, the understanding agent reads the whole file and turns however
you wrote it into canonical sdev:

```
output Hello
out Nothing
name1 will be Twenty
terminal name1
```

becomes

```
say "Hello"
say nothing
set name1 to 20
say name1
```

The agent works in three layers, in this order:

1. **Rules** — a large built-in vocabulary of ways people write output,
   assignment, conditions, loops, functions and comparisons. Offline, instant.
2. **Memory** — every program you run teaches it your own words. The next file
   that uses them needs no thinking at all.
3. **AI brain** — only when lines still make no sense. Online it uses the
   hosted brain; offline, or when you ask for it, a local brain at
   `SDEV_AGENT_LOCAL_URL` (default `http://127.0.0.1:11434/sdev-agent`).

Directives, written anywhere in the file:

| Directive | Meaning |
| --- | --- |
| `!#agent:off` | Run the file exactly as written |
| `!#agent:on` | Always understand, even if the file already parses |
| `!#agent:auto` | Default: understand only when needed |
| `!#agent:strict` | Rules and memory only — never guess |
| `!#agent:local` | Keep the AI brain on this machine |
| `!#agent:online` | Use the hosted brain |
| `!#agent:learn:off` | Do not learn from this file |

A file the agent's reading cannot run falls back to the file as written, so the
agent can never make a working program stop working.

From the command line:

```
sdev run app.sdev --explain      # show what it understood, line by line
sdev agent status                # what it has learned from you
sdev agent understand app.sdev   # print the canonical sdev
sdev agent promote "My way"      # turn what it learned into a dialect
sdev agent forget                # clear its memory
sdev run app.sdev --no-agent     # off for this run
```

`sdev agent promote` writes a real dialect from your own words, so your way of
writing becomes a first-class dialect you can share — but you never need one:
the agent understands you without it.

---


### Multi-Language Parity & Modern Paradigms (SQL, Kotlin, Rust, C++)

_Source: `public/SDEV_MULTI_PARADIGM_DOCUMENTATION.md`_


> **Comprehensive documentation for all new features and multi-language capabilities added to SDEV**  
> _Engineered, verified, and documented in **Antigravity** — October 2026._

---

#### Table of Contents

1. [Executive Summary & Multi-Language Vision](#1-executive-summary--multi-language-vision)
2. [String Interpolation & F-Strings (Python / JS / Ruby Parity)](#2-string-interpolation--f-strings)
3. [Immutable Variable Bindings: `fixed` / `const` / `val` (Kotlin / Rust Parity)](#3-immutable-variable-bindings-fixed--const--val)
4. [Pattern Matching & Scalar `match` Statement (Rust / Kotlin / Python Parity)](#4-pattern-matching--scalar-match-statement)
5. [Relational SQL & LINQ Query Engine (SQL / C# Parity)](#5-relational-sql--linq-query-engine)
6. [Modern Language Conveniences: Null-Safety & Data Records (Kotlin / C# Parity)](#6-modern-language-conveniences-null-safety--data-records)
7. [Systems Programming & Low-Level Memory Arenas (C / C++ Parity)](#7-systems-programming--low-level-memory-arenas)
8. [Monadic Algebraic Data Types: `Option` & `Result` (Rust / Haskell Parity)](#8-monadic-algebraic-data-types-option--result)
9. [Formal Code Formatter & Developer Tooling](#9-formal-code-formatter--developer-tooling)
10. [Dual-Runtime Parity & Verification Matrix](#10-dual-runtime-parity--verification-matrix)

---

#### 1. Executive Summary & Multi-Language Vision

SDEV was created to eliminate the artificial boundaries between scripting simplicity, systems safety, functional purity, and relational queries. Rather than requiring developers to switch languages between rapid scripting, backend data wrangling, hardware microcontrollers, and low-level performance code, SDEV provides a single cohesive syntax with **dual-runtime execution**:

1. **v1 Runtime (TypeScript / Browser / Node.js)**: Instant, zero-compile execution in the browser IDE, Node.js CLI, and VS Code extension with rich debugging, Live Lens, and Chrono time-travel.
2. **v2 Runtime (100% Pure Self-Hosted Seed VM)**: Bytecode compiler and virtual machine written entirely in SDEV (`lang/compiler/*.sdev`, `lang/runtime/*.sdev`), compiling itself to byte-identical WebAssembly and native x86-64 code.

Every feature documented here is guaranteed **dual-runtime parity**: programs written with these features execute identically whether interpreted in the browser or compiled on the self-hosted seed VM.

---

#### 2. String Interpolation & F-Strings

##### 2.1 Overview
SDEV supports native expression interpolation within string literals. Any string literal containing `{expression}` evaluates the expression and automatically converts the result to a string.

##### 2.2 Basic Syntax
```sdev
forge name be "Alice"
forge items be 42

# Direct variable interpolation
forge greeting be "Hello, {name}! You have {items} items in your cart."
speak(greeting)
# Output: Hello, Alice! You have 42 items in your cart.
```

##### 2.3 Expressions Inside Interpolation
Any valid SDEV expression can be embedded inside braces:
```sdev
forge width be 10
forge height be 20

speak("Area = {width * height} square units")
# Output: Area = 200 square units

forge user be { name: "Bob", role: "admin" }
speak("User {user['name']} has role {upper(user['role'])}")
# Output: User Bob has role ADMIN
```

##### 2.4 Escaping Literal Braces
To output a literal `{` or `}` inside an interpolated string, escape it with double braces `{{` or `}}`:
```sdev
forge jsonTemplate be "JSON: {{ \"user\": \"{name}\" }}"
speak(jsonTemplate)
# Output: JSON: { "user": "Alice" }

forge mathDoc be "Set notation: {{x | x > 0}}"
speak(mathDoc)
# Output: Set notation: {x | x > 0}
```

##### 2.5 Format Specs & Debug Formatting
SDEV supports format specifications, conversions, and debug expressions:
```sdev
forge pi be 3.1415926535

# Format specification (2 decimal places)
speak("Pi is approximately {pi:.2f}")

# Debug formatting: appends 'expr=' before the value
forge score be 98.5
speak("{score=}")
# Output: score=98.5
```

##### 2.6 Implementation Details
- **Parser**: Handled via `hasInterpolation()` and `buildFString()` in [`src/lang/parser.ts`](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/src/lang/parser.ts).
- **v1 Interpreter**: Evaluated via `evFString()` in [`src/lang/interpreter.ts`](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/src/lang/interpreter.ts).
- **v2 Compiler**: Compiled into chained `OpCode.LOAD 'str'` and `OpCode.ADD` instructions in [`src/lang/compiler.ts`](file:///c:/Users/User/Documents/sdev-web-anti/sdev-web/src/lang/compiler.ts).

---

#### 3. Immutable Variable Bindings: `fixed` / `const` / `val`

##### 3.1 Overview
Variables in SDEV are mutable by default when declared with `forge` or `set`. To ensure referential transparency, avoid accidental reassignments, and enable compiler optimizations, SDEV introduces the `fixed` keyword (with aliases `const` in plain dialect and `val` in Kotlin dialect).

##### 3.2 Syntax
```sdev
# Canonical SDEV (mystic)
fixed MAX_CONNECTIONS be 1000
fixed TIMEOUT_MS be 5000

# Plain dialect alias
const BUFFER_SIZE be 4096

# Kotlin dialect alias
val API_ENDPOINT be "https://api.sdev.codes"
```

##### 3.3 Reassignment Protection
Attempting to reassign a `fixed` variable triggers errors at all phases:

###### Runtime Reassignment
```sdev
fixed PORT be 8080
PORT be 9000
# Throws SdevError: Cannot reassign fixed variable 'PORT'
```

###### Compile-Time Reassignment (v2 Compiler)
The compiler inspects variable bindings before emitting bytecode. Reassigning a `fixed` variable halts compilation with a fatal diagnostic.

###### Static Linter Diagnostic (`SDEV014`)
The SDEV static linter automatically flags any reassignment of an immutable binding:
```
[SDEV014] Error: Reassignment of immutable variable 'PORT' at line 2.
```

---

#### 4. Pattern Matching & Scalar `match` Statement

##### 4.1 Overview
SDEV features a first-class `match` statement capable of branching on scalars, data values, wildcards, and conditional guards. On the v2 bytecode engine, `match` compiles down to an efficient short-circuiting jump tree.

##### 4.2 Syntax & Pattern Types
```sdev
match expression ::
  case <pattern-1> [when <guard-1>] ::
    # code for case 1
  ;;
  case <pattern-2> ::
    # code for case 2
  ;;
  case _ ::
    # fallback default arm
  ;;
;;
```

##### 4.3 Examples

###### Scalar & Status Matching
```sdev
forge http_status be 404
forge status_msg be ""

match http_status ::
  case 200 ::
    status_msg be "OK: Request succeeded"
  ;;
  case 201 ::
    status_msg be "Created: Resource created"
  ;;
  case 400 ::
    status_msg be "Bad Request: Client error"
  ;;
  case 404 ::
    status_msg be "Not Found: Endpoint does not exist"
  ;;
  case 500 ::
    status_msg be "Internal Server Error"
  ;;
  case _ ::
    status_msg be "Unknown Status Code"
  ;;
;;

speak(status_msg)
# Output: Not Found: Endpoint does not exist
```

###### Guard Conditions (`when` / `also`)
```sdev
forge age be 25
forge category be ""

match age ::
  case a when a < 13 ::
    category be "Child"
  ;;
  case a when a >= 13 also a < 20 ::
    category be "Teenager"
  ;;
  case a when a >= 20 also a < 65 ::
    category be "Adult"
  ;;
  case _ ::
    category be "Senior"
  ;;
;;

speak("Category: {category}")
# Output: Category: Adult
```

###### Multiple Alternatives (Or-Patterns)
```sdev
forge command be "q"

match command ::
  case "q" | "quit" | "exit" ::
    speak("Shutting down cleanly...")
  ;;
  case "h" | "help" | "?" ::
    speak("Available commands: run, build, test, quit")
  ;;
  case _ ::
    speak("Unrecognized command")
  ;;
;;
```

---

#### 5. Relational SQL & LINQ Query Engine

##### 5.1 Overview
SDEV provides an integrated relational engine that allows lists of records/tomes to be queried with standard SQL semantics (projection, filtering, sorting, limits, uniqueness, joins, grouping, and aggregations) without requiring an external database.

##### 5.2 API Reference

| Function | Signature | Description |
| :--- | :--- | :--- |
| `sql_select` | `(records, columns)` | Projects specified columns into new records. |
| `sql_where` | `(records, predicate_fn)` | Filters records matching the predicate function. |
| `sql_order_by` | `(records, column, ascending)` | Sorts records by column (numeric or string). |
| `sql_limit` | `(records, count)` | Limits the returned records to at most `count`. |
| `sql_distinct` | `(records, column)` | Returns unique records based on a specified key. |
| `sql_join` | `(left, right, on_keys, join_type)` | Relational join (`"inner"`, `"left"`, `"right"`). `on_keys` is `["left_id", "right_id"]`. |
| `sql_group_by` | `(records, key_col, agg_col, agg_fn)` | Groups by `key_col` and computes `agg_fn` on `agg_col`. |
| `sql_count` | `(records)` | Returns total number of rows. |
| `sql_sum` | `(records, column)` | Sums numeric values of a column across all rows. |
| `sql_avg` | `(records, column)` | Calculates average value of a column. |
| `sql_min` | `(records, column)` | Returns minimum value in a column. |
| `sql_max` | `(records, column)` | Returns maximum value in a column. |

##### 5.3 Complete Example Pipeline
```sdev
forge employees be [
  { id: 101, name: "Alice", dept: "Engineering", salary: 120000 },
  { id: 102, name: "Bob", dept: "Marketing", salary: 75000 },
  { id: 103, name: "Charlie", dept: "Engineering", salary: 95000 },
  { id: 104, name: "Diana", dept: "Design", salary: 85000 },
  { id: 105, name: "Evan", dept: "Engineering", salary: 140000 }
]

# 1. Filter: Engineering employees earning >= 100,000
forge high_earners be sql_where(employees, (e) -> e["dept"] == "Engineering" also e["salary"] >= 100000)

# 2. Project: Select only name and salary
forge projected be sql_select(high_earners, ["name", "salary"])

# 3. Sort: Order by salary descending
forge sorted be sql_order_by(projected, "salary", false)

# 4. Limit: Top 2 earners
forge top2 be sql_limit(sorted, 2)

speak("Top Earner: {top2[0]['name']} (${top2[0]['salary']})")
speak("Total Count: {sql_count(high_earners)}")
speak("Average Salary: ${sql_avg(employees, 'salary')}")
speak("Max Salary: ${sql_max(employees, 'salary')}")
```

##### 5.4 Relational Joins
```sdev
forge users be [
  { id: 1, username: "alice" },
  { id: 2, username: "bob" }
]

forge orders be [
  { order_id: 501, user_id: 1, total: 249.99 },
  { order_id: 502, user_id: 1, total: 39.50 },
  { order_id: 503, user_id: 2, total: 112.00 }
]

# Inner Join users and orders on users.id == orders.user_id
forge user_orders be sql_join(users, orders, ["id", "user_id"], "inner")

speak("Total joined orders: {sql_count(user_orders)}")
speak("First order username: {user_orders[0]['username']}")
speak("First order amount: ${user_orders[0]['total']}")
```

---

#### 6. Modern Language Conveniences: Null-Safety & Data Records

##### 6.1 `coalesce` (Elvis / Null-Coalescing Operator)
Returns the first non-null, non-void value:
```sdev
forge input_timeout be null
forge effective_timeout be coalesce(input_timeout, 3000)
speak(effective_timeout)
# Output: 3000

forge user_theme be "dark"
forge active_theme be coalesce(user_theme, "light")
speak(active_theme)
# Output: dark
```

##### 6.2 `safe_get` (Safe Navigation Helper)
Retrieves a property from a record or map without throwing an error if the key is missing or the object is null:
```sdev
forge profile be { name: "Alice", settings: { notifications: true } }

# Key exists
forge notif be safe_get(profile["settings"], "notifications", false)
speak("Notifications enabled: {notif}")

# Key does not exist: returns fallback
forge email be safe_get(profile, "email", "no-email@sdev.codes")
speak("Email: {email}")
# Output: Email: no-email@sdev.codes
```

##### 6.3 `copy_record` (Data-Class Record Update)
Creates an immutable copy of a record with updated or newly added fields:
```sdev
forge config be {
  host: "localhost",
  port: 8080,
  debug: false
}

# Clone with production overrides
forge prod_config be copy_record(config, {
  host: "0.0.0.0",
  port: 443,
  debug: false
})

speak("Dev Port: {config['port']}")      # 8080 (unchanged)
speak("Prod Port: {prod_config['port']}") # 443
```

---

#### 7. Systems Programming & Low-Level Memory Arenas

##### 7.1 Overview
For embedded devices (Arduino, ESP32), WebAssembly memory interop, and high-performance byte manipulation, SDEV provides linear **Memory Arenas** with byte-level read/write primitives.

##### 7.2 Arena Lifecycle & Primitives

```sdev
# 1. Create a 1024-byte arena
forge arena be arena_create(1024)

# 2. Allocate 16 bytes for a network packet header
forge header_ptr be arena_alloc(arena, 16)

# 3. Write 8-bit, 16-bit, and 32-bit values (Little-Endian)
mem_poke_u8(arena, header_ptr + 0, 0x45)         # IPv4 Version & IHL
mem_poke_u8(arena, header_ptr + 1, 0x00)         # DSCP / ECN
mem_poke_i16(arena, header_ptr + 2, 1500)        # Total Length = 1500
mem_poke_i32(arena, header_ptr + 4, 0x7F000001)  # 127.0.0.1 (Source IP)

# 4. Read back structured values
forge version_byte be mem_peek_u8(arena, header_ptr + 0)
forge total_len be mem_peek_i16(arena, header_ptr + 2)
forge ip_addr be mem_peek_i32(arena, header_ptr + 4)

speak("Length: {total_len} bytes")
speak("IP: {ip_addr}")
```

##### 7.3 Bulk Memory Operations (`mem_fill` & `mem_copy`)
```sdev
forge scratch be arena_create(256)

# Fill 64 bytes with 0xFF (memset)
mem_fill(scratch, 0, 64, 255)

# Copy 32 bytes from offset 0 to offset 64 (memcpy)
mem_copy(scratch, 64, 0, 32)

speak("Byte at 64: {mem_peek_u8(scratch, 64)}")
# Output: Byte at 64: 255

# Reset arena bump pointer back to 0
arena_reset(scratch)
```

---

#### 8. Monadic Algebraic Data Types: `Option` & `Result`

##### 8.1 `Option` (`Some` and `None`)
Represents an optional value without null pointer exceptions:
```sdev
# Creating options
forge present be Some("config.json")
forge missing be None()

# Checking options
speak("Is present: {is_some(present)}")
speak("Is missing: {is_none(missing)}")

# Safe unwrapping with fallback
forge filename be unwrap_or(missing, "default.json")
speak("Filename: {filename}")
# Output: Filename: default.json

# Monadic map: transforms value if Some, leaves None intact
forge upper_file be map_some(present, (f) -> upper(f))
speak("Transformed: {upper_file['val']}")
# Output: Transformed: CONFIG.JSON
```

##### 8.2 `Result` (`Ok` and `Err`)
Represents either success (`Ok`) or failure (`Err`):
```sdev
conjure divide(numerator, denominator) ::
  ponder denominator == 0 ::
    yield Err("Division by zero")
  ;;
  yield Ok(numerator / denominator)
;;

forge res1 be divide(100, 4)
forge res2 be divide(100, 0)

speak("res1 success: {is_ok(res1)}")   # true
speak("res2 error: {is_err(res2)}")     # true

# Unwrap with default fallback
speak("res1 val: {result_unwrap_or(res1, 0)}") # 25
speak("res2 val: {result_unwrap_or(res2, 0)}") # 0

# Monadic transformation on success
forge doubled be map_ok(res1, (v) -> v * 2)
speak("Doubled result: {doubled['val']}") # 50
```

---

#### 9. Formal Code Formatter & Developer Tooling

##### 9.1 SDEV Code Formatter
SDEV includes a formal, deterministic formatter tested against edge cases:
- Indents body statements within `:: ... ;;` blocks by a consistent 2 or 4 spaces.
- Correctly handles nested blocks, multiline lambdas, classes, and match expressions.
- Preserves strings and comments containing colons (`:`) or semicolons (`;`) without corrupting syntax.
- Completely idempotent: running the formatter multiple times produces identical output.
- Normalizes excess blank lines and strips trailing whitespace.

##### 9.2 Running the Formatter Suite
```sh
npm run test:formatter
```
Outputs:
```
=== SDEV Formal Formatter Test Suite ===
  ✓ Indents body of :: ;; block by 2 spaces
  ✓ Configurable indent size (4 spaces)
  ✓ Multi-level nested block indentation
  ✓ Idempotence: formatting twice produces identical output
  ✓ Leaves strings containing :: and ;; intact
  ✓ Ignores :: inside single-line comments
  ✓ Strips trailing whitespace from lines
  ✓ Normalizes excessive blank lines

Formatter suite: 8 passed, 0 failed
```

---

#### 10. Dual-Runtime Parity & Verification Matrix

All features adhere to dual-runtime parity requirements:

| Feature | v1 (Browser/TypeScript) | v2 (Self-Hosted SDEV VM) | Test Coverage |
| :--- | :--- | :--- | :--- |
| **String Interpolation** | Full (`hasInterpolation`) | Full (`OpCode.ADD`) | `scripts/test-multi-language-features.ts` |
| **Escaped Braces `{{`** | Full (`buildFString`) | Full (`buildFString`) | `scripts/test-multi-language-features.ts` |
| **`fixed` Bindings** | Runtime + Linter guard | Compile-time rejection | `scripts/test-multi-language-features.ts` |
| **Scalar `match`** | Interpreter evaluator | Bytecode jump tree | `scripts/test-multi-language-features.ts` |
| **Relational SQL** | `src/lang/builtins/sql.ts` | `lang/stdlib/v2/sql.sdev` | `scripts/test-selfhosted-subsystems.sdev` |
| **SQL Aggregations** | All 5 aggregates | All 5 aggregates | `scripts/test-multi-language-features.ts` |
| **Null-Safety Helpers** | `coalesce`, `safe_get` | `coalesce`, `safe_get` | `scripts/test-multi-language-features.ts` |
| **Arena Memory** | `src/lang/builtins/buffer.ts` | `lang/paradigms/systems.sdev` | `scripts/test-selfhosted-subsystems.sdev` |
| **Option & Result** | `src/lang/builtins/functional.ts` | `lang/paradigms/functional.sdev` | `scripts/test-selfhosted-subsystems.sdev` |
| **Code Formatter** | Standard AST printer | Standard AST printer | `scripts/test-formatter.ts` |

##### Automated Test Execution
Run the complete multi-language verification suite:
```sh
npm test
```
All 15 test suites, 209 track features, and 616 API registry entries pass with 100% success.

---

#### 11. Code Understander & Local Model Server Integration

The SDEV Code Understander combines deterministic self-hosted rules written in pure SDEV with local large language models (LM Studio, Ollama, llama.cpp, LocalAI) and in-browser WebGPU models, providing seamless offline code understanding and repair with zero AI cloud credits.

##### 11.1 Understander Architecture
1. **Self-Hosted Engine (`lang/agent/*.sdev`)**:
   - `lang/agent/understander.sdev`: Canonicalizes natural sentences, loose syntax, and regional dialect vocabulary into verified SDEV AST.
   - `lang/agent/blocks.sdev`: Indentation-based block and brace balancer.
   - `lang/agent/ai-dialect.sdev`: Transparent bidirectional translation between `sdev:ai` (`!#ai`) and canonical SDEV.
   - `lang/agent/parser_eval.sdev`: Pure SDEV-hosted parser, syntax validator, and AST evaluator.
   - `lang/agent/project.sdev`: Project-wide symbol indexing and cross-file resolution.
2. **Three-Tier Multi-Brain Pipeline**:
   - **Tier 1 (Local Model Server)**: If configured by the user (LM Studio on port 1234, Ollama on port 11434, llama.cpp on port 8080), queries run locally on the user's GPU/CPU.
   - **Tier 2 (Browser WebGPU Brain)**: In-browser WebLLM model running private offline inference with zero installations.
   - **Tier 3 (Website Edge Function)**: Invoked only when `!#agent:online` is explicitly specified in the source file or enabled in IDE Settings.

##### 11.2 Universal Local Model URL Normalization
The engine automatically normalizes all common local server address variants:

| User Input | Resolved Chat Endpoint | Resolved Models Endpoint | Server Type |
| :--- | :--- | :--- | :--- |
| `http://localhost:1234` | `http://localhost:1234/v1/chat/completions` | `http://localhost:1234/v1/models` | LM Studio |
| `http://localhost:1234/v1` | `http://localhost:1234/v1/chat/completions` | `http://localhost:1234/v1/models` | LM Studio |
| `http://127.0.0.1:11434` | `http://127.0.0.1:11434/v1/chat/completions` | `http://127.0.0.1:11434/v1/models` & `/api/tags` | Ollama |
| `http://localhost:8080` | `http://localhost:8080/v1/chat/completions` | `http://localhost:8080/v1/models` | llama.cpp / LocalAI |

##### 11.3 CORS Detection & Actionable Guidance
Because web browsers enforce Cross-Origin Resource Sharing (CORS) when client-side applications connect to `localhost`:
- **LM Studio**: Open the **Local Server** (or Developer) tab and toggle ON **"Enable CORS"**.
- **Ollama**: Set the environment variable `OLLAMA_ORIGINS="*"` and restart Ollama:
  ```powershell
  $env:OLLAMA_ORIGINS = "*"
  ollama serve
  ```

##### 11.4 SDev Doctor IDE Assistant
The IDE Assistant Panel (**SDev Doctor**) directly leverages local models:
- When "Fix & Explain" is clicked, SDev Doctor uses `callLocalFix` to query the local model with the active source code, compiler error, and user notes.
- The model returns a structured diagnosis: `fixed_code`, `explanation`, `changes`, `how_it_works`, and `confidence`.
- If no local model is running, it automatically falls back to the self-hosted structural repair engine (`sdevCloseBlocks`, `sdevUnderstand`), guaranteeing that users are never blocked.

---

_Document engineered, written, and verified in **Antigravity** on 1 November 2026._

---


### Full v1 language reference

_Source: `public/SDEV_DOCUMENTATION.md`_


#### Complete Documentation, Tutorial & Reference Guide

---

#### Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Syntax Overview](#syntax-overview)
4. [Variables & Constants](#variables--constants)
5. [Data Types](#data-types)
6. [Operators](#operators)
7. [String Operations](#string-operations)
8. [Control Flow](#control-flow)
9. [Functions](#functions)
10. [Object-Oriented Programming](#object-oriented-programming)
11. [Error Handling](#error-handling)
12. [Async & Concurrency](#async--concurrency)
13. [Built-in Output Functions](#built-in-output-functions)
14. [Built-in Math Functions](#built-in-math-functions)
15. [Built-in String Functions](#built-in-string-functions)
16. [Built-in List Functions](#built-in-list-functions)
17. [Built-in Tome (Dict) Functions](#built-in-tome-dict-functions)
18. [Higher-Order Functions](#higher-order-functions)
19. [Type System & Conversion](#type-system--conversion)
20. [Collections: Set, Map, Queue, Stack, LinkedList](#collections)
21. [Matrix Operations](#matrix-operations)
22. [Graphics & Game Development](#graphics--game-development)
23. [File I/O](#file-io)
24. [Networking](#networking)
25. [Examples & Recipes](#examples--recipes)
26. [JavaScript Interop](#javascript-interop-js-interpreter-only)
27. [Complete Reference Card](#complete-reference-card)

---

#### Introduction

**sdev** is an expressive, full-featured programming language with a deliberately unique syntax designed to feel fresh and readable. It supports:

- **Unique English-inspired keywords** — `forge`, `conjure`, `ponder`, `cycle`, `iterate`, `yield`, `yeet`, `skip`
- **Block delimiters** — `::` to open a block and `;;` to close it — no curly braces
- **First-class functions and lambdas** — `(x) -> x * 2`
- **Pipe operator** — `|>` for clean functional composition
- **Full OOP** — `essence` (classes), `extend` (inheritance), `self`, `super`, `new`
- **Error handling** — `attempt :: ... ;; rescue err :: ... ;;`
- **Built-in data structures** — Set, Map, Queue, Stack, LinkedList
- **Matrix math** — `matmul`, `transpose`, `dot`, `reshape`, etc.
- **2D Graphics & Turtle API** — canvas drawing, shapes, gradients, turtle graphics, sprites
- **Async / concurrency** — `async conjure`, `await`, `spawn`
- **JavaScript interop** — `js` keyword for seamless JS integration

sdev runs in the browser-based IDE (at `/ide`), in the Playground (`/`), and as a downloadable Electron desktop application.

---

#### Getting Started

##### Running in the IDE

Open the sdev IDE at `/ide`. Press **Ctrl+Enter** (or the **Run** button) to execute your program. Output appears in the **OUTPUT** panel at the bottom.

##### Running in the Playground

Go to the main Playground at `/`. Type or paste sdev code in the editor, then click **Run**.

##### Downloading the Desktop App

In the IDE, go to the **Download** button → **Electron Desktop App**. This gives you three files:

```
package.json
main.js
README.md
```

Install and run:

```bash
npm install
npm start
```

This opens sdev IDE as a native desktop window that wraps the full web IDE.

##### Your First Program

```sdev
// hello.sdev
speak("Hello, World!")
```

Output:
```
Hello, World!
```

A slightly more involved first program:

```sdev
forge name be "Alice"
forge age be 30

speak("Name:", name)
speak("Age:", age)
speak("In 10 years:", age + 10)

conjure greet(person, greeting) ::
  yield greeting + ", " + person + "!"
;;

speak(greet(name, "Welcome"))
```

Output:
```
Name: Alice
Age: 30
In 10 years: 40
Welcome, Alice!
```

---

#### Syntax Overview

##### Comments

```sdev
// This is a single-line comment
# This is also a single-line comment (Python style)
```

##### Blocks

sdev uses `::` to start a block and `;;` to end it — never curly braces `{}`:

```sdev
ponder x > 5 ::
  speak("x is big")
;;

conjure add(a, b) ::
  yield a + b
;;
```

Blocks can also be written inline for short single-statement bodies:

```sdev
ponder x > 5 :: speak("big") ;;
```

##### No Semicolons Required

Statements are separated by newlines. You do NOT need `;` at the end of lines.

```sdev
forge a be 1
forge b be 2
forge c be a + b
speak(c)
```

##### Indentation

Indentation is cosmetic but strongly recommended. The language uses `::` and `;;` for block structure, not whitespace.

---

#### Variables & Constants

##### Declaring Variables

Use `forge` to declare a new variable and `be` to assign its value:

```sdev
forge name be "Alice"
forge age be 25
forge isActive be yep
forge score be 0.0
```

##### Reassigning Variables

Just use `be` without `forge`:

```sdev
forge count be 0
count be count + 1
count be 10
```

##### Compound Assignment (shorthand patterns)

```sdev
forge x be 10
x be x + 5    // x = 15
x be x * 2    // x = 30
x be x - 10   // x = 20
x be x / 4    // x = 5
```

##### Immutable Constants (`fixed` / `const` / `val`)

To define an immutable constant binding that cannot be reassigned:

```sdev
fixed MAX_USERS be 100
fixed API_URL be "https://api.sdev.codes"

# Dialect aliases:
const BUFFER_SIZE be 4096   // Plain dialect
val TIMEOUT_MS be 5000      // Kotlin dialect

# Attempting to reassign throws an error:
# MAX_USERS be 200  // Error: Cannot reassign fixed variable 'MAX_USERS'
```

##### Built-in Constants

sdev provides these constants directly:

```sdev
speak(PI)        // 3.141592653589793
speak(TAU)       // 6.283185307179586 (2 * PI)
speak(E)         // 2.718281828459045
speak(INFINITY)  // Infinity
```

##### Multiple Variables

```sdev
forge x be 10
forge y be 20
forge z be x + y

// Swap pattern
forge temp be x
x be y
y be temp
```

---

#### Data Types

sdev has six core types:

| sdev Type | Description | Literal Example |
|-----------|-------------|-----------------|
| `number` | Integer or float | `42`, `3.14`, `-7`, `1.5e10` |
| `text` | Strings | `"hello"`, `'world'` |
| `truth` | Booleans | `yep`, `nope` |
| `void` | Null / absent | `void` |
| `list` | Arrays | `[1, 2, 3]` |
| `tome` | Dictionaries | `:: "key": "value" ;;` |

Functions and class instances are also first-class values.

##### Numbers

```sdev
forge integer be 42
forge float be 3.14159
forge negative be -100
forge scientific be 1.5e10      // 15,000,000,000
forge hex be 0xFF               // 255
```

Arithmetic is standard, with `^` for power:

```sdev
speak(2 ^ 10)   // 1024
speak(10 % 3)   // 1
speak(7 / 2)    // 3.5
```

##### Text (Strings)

```sdev
forge single be 'Hello'
forge double be "World"

// Escape sequences
forge tab be "col1\tcol2"
forge newline be "line1\nline2"
forge quoted be "She said \"hi\""

// String concatenation
forge full be "Hello" + ", " + "World!"

// String repetition
forge stars be "*" * 10   // "**********"

// Access characters
speak("hello"[0])   // h
speak("hello"[-1])  // o (last character)
```

##### Truth (Booleans)

```sdev
forge t be yep    // true
forge f be nope   // false

// Boolean expressions
speak(5 > 3)          // yep
speak(5 equals 3)     // nope
speak(yep also nope)  // nope
speak(yep either nope) // yep
speak(isnt nope)       // yep
```

##### Void (Null)

```sdev
forge nothing be void
ponder nothing equals void ::
  speak("It's void!")
;;
```

##### Lists

```sdev
forge nums be [1, 2, 3, 4, 5]
forge mixed be [1, "two", yep, void]
forge empty be []
forge nested be [[1, 2], [3, 4], [5, 6]]

// Access by index (0-based)
speak(nums[0])    // 1
speak(nums[2])    // 3
speak(nums[-1])   // 5  (last element)

// Modify element
nums[0] be 100
speak(nums)       // [100, 2, 3, 4, 5]

// List length
speak(measure(nums))   // 5

// Slicing
speak(portion(nums, 1, 3))  // [2, 3]
speak(portion(nums, 2))     // [3, 4, 5]
```

##### Tomes (Dictionaries)

Tomes are key-value stores. Keys are strings.

```sdev
forge person be ::
  "name": "Alice",
  "age": 30,
  "active": yep
;;

// Access values - both bracket and dot notation work
speak(person["name"])  // Alice
speak(person.age)      // 30

// Set new or existing keys
person["city"] be "New York"
person.age be 31

// Check if key exists
speak(contains(person, "name"))   // yep
speak(contains(person, "phone"))  // nope

// Get all keys, values, entries
speak(inscriptions(person))  // ["name", "age", "active", "city"]
speak(contents(person))      // ["Alice", 31, yep, "New York"]
speak(entries(person))       // [["name","Alice"], ...]
```

---

#### Operators

##### Arithmetic Operators

| Operator | Description | Example | Result |
|----------|-------------|---------|--------|
| `+` | Addition | `5 + 3` | `8` |
| `-` | Subtraction | `10 - 4` | `6` |
| `*` | Multiplication | `4 * 3` | `12` |
| `/` | Division | `7 / 2` | `3.5` |
| `%` | Modulo | `10 % 3` | `1` |
| `^` | Power | `2 ^ 8` | `256` |
| `-x` | Negation | `-5` | `-5` |

##### Comparison Operators

| Operator | Description | Example | Result |
|----------|-------------|---------|--------|
| `equals` | Equal to | `5 equals 5` | `yep` |
| `differs` | Not equal | `5 differs 3` | `yep` |
| `<>` | Not equal (alt) | `5 <> 3` | `yep` |
| `<` | Less than | `3 < 5` | `yep` |
| `>` | Greater than | `5 > 3` | `yep` |
| `<=` | Less or equal | `3 <= 3` | `yep` |
| `>=` | Greater or equal | `5 >= 5` | `yep` |

##### Logical Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `also` | AND | `yep also yep` → `yep` |
| `either` | OR | `nope either yep` → `yep` |
| `isnt` | NOT | `isnt nope` → `yep` |

Short-circuit evaluation applies: `also` stops at first `nope`, `either` stops at first `yep`.

##### String & List Concatenation

```sdev
"Hello" + " World"    // "Hello World"
[1, 2] + [3, 4]       // [1, 2, 3, 4]
"ha" * 3              // "hahaha"
[0] * 5               // [0, 0, 0, 0, 0]
```

##### Pipe Operator `|>`

The pipe operator passes the left-hand value as the first argument to the right-hand function:

```sdev
// Without pipe
forge result be weave(sort(sift(each([1,2,3,4,5], x -> x * 2), x -> x > 4)), ", ")

// With pipe — much cleaner!
forge result be [1, 2, 3, 4, 5]
  |> each(x -> x * 2)
  |> sift(x -> x > 4)
  |> weave(", ")
speak(result)  // "6, 8, 10"
```

##### Ternary Operator `~`

Inline if/else expression:

```sdev
forge x be 10
forge label be x > 5 ~ "big" : "small"
speak(label)  // "big"

// In function calls
speak(magnitude(-5) > 3 ~ "large magnitude" : "small magnitude")

// Nested ternary
forge grade be 85
forge letter be grade >= 90 ~ "A" : grade >= 80 ~ "B" : grade >= 70 ~ "C" : "F"
speak(letter)  // "B"
```

##### Operator Precedence (high to low)

1. `^` (power)
2. Unary `-`, `isnt`
3. `*`, `/`, `%`
4. `+`, `-`
5. `<`, `>`, `<=`, `>=`
6. `equals`, `differs`, `<>`
7. `also`
8. `either`
9. `~` (ternary)
10. `|>` (pipe)

---

#### String Operations

sdev has a rich string library. All string functions return new strings — strings are immutable.

```sdev
forge s be "  Hello, World!  "

// Case conversion
speak(upper(s))          // "  HELLO, WORLD!  "
speak(lower(s))          // "  hello, world!  "

// Trimming
speak(trim(s))           // "Hello, World!"

// Length
speak(measure(s))        // 18

// Contains / starts / ends
speak(contains(s, "World"))      // yep
speak(startswith(trim(s), "Hello"))  // yep
speak(endswith(trim(s), "!"))        // yep

// Replace (replaces ALL occurrences)
speak(replace("banana", "a", "o"))   // "bonono"

// Find index
speak(locate("hello world", "world"))  // 6
speak(locate("hello", "xyz"))          // -1

// Split and join
forge parts be shatter("a,b,c,d", ",")
speak(parts)                 // ["a", "b", "c", "d"]
speak(weave(parts, " | "))   // "a | b | c | d"

// Character list
speak(chars("abc"))   // ["a", "b", "c"]

// Reverse
speak(reverse("hello"))  // "olleh"

// Padding
speak(padLeft("5", 4, "0"))    // "0005"
speak(padRight("hi", 6, "!"))  // "hi!!!!"

// Format strings (use {} as placeholders)
speak(format("Hello, {}! You are {} years old.", "Bob", 25))
// "Hello, Bob! You are 25 years old."

// Repeat
speak(repeat("ab", 3))   // "ababab"

// Substring
speak(snatch("hello world", 6, 11))  // "world"
```

---

#### Control Flow

##### If / Else — `ponder` / `otherwise`

```sdev
forge score be 87

ponder score >= 90 ::
  speak("Grade: A")
;; otherwise ponder score >= 80 ::
  speak("Grade: B")
;; otherwise ponder score >= 70 ::
  speak("Grade: C")
;; otherwise ponder score >= 60 ::
  speak("Grade: D")
;; otherwise ::
  speak("Grade: F")
;;
```

Inline (for short bodies):

```sdev
ponder x > 0 :: speak("positive") ;; otherwise :: speak("non-positive") ;;
```

##### Pattern Matching — `match`

The `match` statement branches on values, wildcards, or guards:

```sdev
forge status be 200
forge msg be ""

match status ::
  case 200 ::
    msg be "OK"
  ;;
  case 404 ::
    msg be "Not Found"
  ;;
  case code when code >= 500 ::
    msg be "Server Error"
  ;;
  case _ ::
    msg be "Unknown"
  ;;
;;

speak(msg)
```

##### While Loop — `cycle`

```sdev
forge n be 1
cycle n <= 10 ::
  speak(n)
  n be n + 1
;;

// Infinite loop with break
cycle yep ::
  forge x be randint(1, 10)
  speak("Got:", x)
  ponder x equals 7 ::
    speak("Found 7! Stopping.")
    yeet    // break
  ;;
;;
```

##### For-Each Loop — `iterate through`

```sdev
forge fruits be ["apple", "banana", "cherry"]

iterate fruit through fruits ::
  speak(fruit)
;;
// apple
// banana
// cherry
```

##### For-In Loop — `within`

```sdev
// Iterate over a list
within fruit be ["apple", "banana", "cherry"] ::
  speak(fruit)
;;

// Iterate over a range
within i be sequence(5) ::
  speak(i)   // 0 1 2 3 4
;;

within i be sequence(1, 11) ::
  speak(i)   // 1 2 3 ... 10
;;

within i be sequence(0, 20, 5) ::
  speak(i)   // 0 5 10 15
;;
```

##### Loop Control

###### `yeet` — Break

Exit the nearest enclosing loop immediately:

```sdev
within i be sequence(100) ::
  ponder i > 5 ::
    yeet
  ;;
  speak(i)
;;
// 0 1 2 3 4 5
```

###### `skip` — Continue

Skip the rest of the current iteration and go to the next:

```sdev
within i be sequence(10) ::
  ponder i % 2 equals 0 ::
    skip   // skip even numbers
  ;;
  speak(i)   // prints only odd: 1 3 5 7 9
;;
```

##### Nested Loops

```sdev
within i be sequence(1, 4) ::
  within j be sequence(1, 4) ::
    speak(i + " x " + j + " = " + morph(i * j, "text"))
  ;;
;;
```

---

#### Functions

##### Basic Functions — `conjure`

```sdev
conjure greet(name) ::
  speak("Hello, " + name + "!")
;;

greet("Alice")
greet("World")
```

##### Return Values — `yield`

```sdev
conjure add(a, b) ::
  yield a + b
;;

conjure max(a, b) ::
  ponder a > b :: yield a ;;
  yield b
;;

forge sum be add(10, 20)
speak(sum)         // 30
speak(max(5, 9))   // 9
```

##### Default Parameters

```sdev
conjure greet(name, greeting) ::
  ponder greeting equals void :: greeting be "Hello" ;;
  yield greeting + ", " + name + "!"
;;

speak(greet("Alice"))           // Hello, Alice!
speak(greet("Bob", "Welcome"))  // Welcome, Bob!
```

##### Lambda Functions (Arrow Syntax)

Single expression, one parameter:

```sdev
forge double be x -> x * 2
forge square be x -> x ^ 2
forge negate be x -> -x

speak(double(5))   // 10
speak(square(4))   // 16
speak(negate(7))   // -7
```

Multiple parameters (parentheses required):

```sdev
forge add be (a, b) -> a + b
forge clamp be (v, lo, hi) -> v < lo ~ lo : v > hi ~ hi : v

speak(add(3, 4))           // 7
speak(clamp(150, 0, 100))  // 100
```

Multi-statement lambda body with `::` and `;;`:

```sdev
forge process be x -> ::
  forge doubled be x * 2
  forge result be doubled + 10
  yield result
;;

speak(process(5))   // 20
```

##### Closures

Functions capture variables from their enclosing scope:

```sdev
conjure makeCounter(start) ::
  forge count be start

  conjure increment() ::
    count be count + 1
    yield count
  ;;

  conjure reset() ::
    count be start
  ;;

  yield :: "next": increment, "reset": reset ;;
;;

forge c be makeCounter(0)
speak(c.next())   // 1
speak(c.next())   // 2
speak(c.next())   // 3
c.reset()
speak(c.next())   // 1
```

##### Recursive Functions

```sdev
conjure factorial(n) ::
  ponder n <= 1 :: yield 1 ;;
  yield n * factorial(n - 1)
;;

speak(factorial(10))   // 3628800

// Mutual recursion
conjure isEven(n) ::
  ponder n equals 0 :: yield yep ;;
  yield isOdd(n - 1)
;;

conjure isOdd(n) ::
  ponder n equals 0 :: yield nope ;;
  yield isEven(n - 1)
;;

speak(isEven(4))   // yep
speak(isOdd(7))    // yep
```

##### Higher-Order Functions as Parameters

```sdev
conjure applyTwice(f, x) ::
  yield f(f(x))
;;

forge double be x -> x * 2
speak(applyTwice(double, 3))   // 12

conjure compose(f, g) ::
  yield x -> f(g(x))
;;

forge addOne be x -> x + 1
forge triple be x -> x * 3
forge addOneThenTriple be compose(triple, addOne)
speak(addOneThenTriple(4))   // 15
```

##### Variadic-style Functions

Use lists to simulate variadic arguments:

```sdev
conjure sumAll(nums) ::
  yield fold(nums, 0, (acc, x) -> acc + x)
;;

speak(sumAll([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))   // 55
```

---

#### Object-Oriented Programming

sdev has full class-based OOP using `essence` for class definitions, `new` for instantiation, `self` for the instance reference, `super` for parent class access, and `extend` for inheritance.

##### Defining a Class — `essence`

```sdev
essence Person ::
  conjure init(self, name, age) ::
    self.name be name
    self.age be age
  ;;

  conjure greet(self) ::
    speak("Hi, I'm " + self.name + " and I'm " + morph(self.age, "text") + " years old.")
  ;;

  conjure birthday(self) ::
    self.age be self.age + 1
    speak(self.name + " is now " + morph(self.age, "text") + "!")
  ;;

  conjure toString(self) ::
    yield "Person(" + self.name + ", " + morph(self.age, "text") + ")"
  ;;
;;
```

##### Creating Instances — `new`

```sdev
forge alice be new Person("Alice", 30)
forge bob be new Person("Bob", 25)

alice.greet()   // Hi, I'm Alice and I'm 30 years old.
bob.greet()     // Hi, I'm Bob and I'm 25 years old.

alice.birthday()   // Alice is now 31!
speak(alice.age)   // 31

speak(alice.toString())  // Person(Alice, 31)
```

##### Inheritance — `extend`

```sdev
essence Animal ::
  conjure init(self, name, sound) ::
    self.name be name
    self.sound be sound
    self.energy be 100
  ;;

  conjure makeSound(self) ::
    speak(self.name + " says: " + self.sound)
  ;;

  conjure eat(self, food) ::
    self.energy be self.energy + 20
    speak(self.name + " eats " + food)
  ;;

  conjure status(self) ::
    speak(self.name + " | Energy: " + morph(self.energy, "text"))
  ;;
;;

essence Dog extend Animal ::
  conjure init(self, name, breed) ::
    super.init(name, "Woof!")
    self.breed be breed
    self.tricks be []
  ;;

  conjure makeSound(self) ::
    speak(self.name + " barks: WOOF WOOF!")   // Override parent
  ;;

  conjure learnTrick(self, trick) ::
    gather(self.tricks, trick)
    speak(self.name + " learned: " + trick)
  ;;

  conjure showTricks(self) ::
    ponder measure(self.tricks) equals 0 ::
      speak(self.name + " knows no tricks.")
      yield void
    ;;
    speak(self.name + " can do: " + weave(self.tricks, ", "))
  ;;
;;

forge rex be new Dog("Rex", "German Shepherd")
rex.makeSound()                // Rex barks: WOOF WOOF!
rex.eat("kibble")              // Rex eats kibble
rex.learnTrick("sit")
rex.learnTrick("shake")
rex.learnTrick("roll over")
rex.showTricks()               // Rex can do: sit, shake, roll over
rex.status()                   // Rex | Energy: 120
```

##### Multi-level Inheritance

```sdev
essence Vehicle ::
  conjure init(self, brand, speed) ::
    self.brand be brand
    self.speed be speed
    self.fuel be 100
  ;;

  conjure describe(self) ::
    yield self.brand + " going " + morph(self.speed, "text") + " km/h"
  ;;
;;

essence Car extend Vehicle ::
  conjure init(self, brand, speed, doors) ::
    super.init(brand, speed)
    self.doors be doors
  ;;

  conjure honk(self) ::
    speak(self.brand + ": Beep beep!")
  ;;
;;

essence ElectricCar extend Car ::
  conjure init(self, brand, speed, doors, range) ::
    super.init(brand, speed, doors)
    self.range be range
    self.battery be 100
  ;;

  conjure charge(self) ::
    self.battery be 100
    speak(self.brand + " fully charged!")
  ;;

  conjure describe(self) ::
    yield super.describe() + " (Electric, " + morph(self.range, "text") + "km range)"
  ;;
;;

forge tesla be new ElectricCar("Tesla Model 3", 250, 4, 500)
speak(tesla.describe())   // Tesla Model 3 going 250 km/h (Electric, 500km range)
tesla.honk()              // Tesla Model 3: Beep beep!
tesla.charge()            // Tesla Model 3 fully charged!
```

##### Properties and Computed Properties

```sdev
essence Circle ::
  conjure init(self, radius) ::
    self.radius be radius
  ;;

  conjure area(self) ::
    yield PI * self.radius ^ 2
  ;;

  conjure circumference(self) ::
    yield 2 * PI * self.radius
  ;;

  conjure scale(self, factor) ::
    self.radius be self.radius * factor
    yield self
  ;;

  conjure toString(self) ::
    yield "Circle(r=" + morph(nearby(self.radius * 100) / 100, "text") + ")"
  ;;
;;

forge c be new Circle(5)
speak(nearby(c.area()))           // 79
speak(nearby(c.circumference()))  // 31

c.scale(2)
speak(c.toString())   // Circle(r=10)
```

---

#### Error Handling

##### Try / Rescue — `attempt` / `rescue`

Use `attempt` to try code that might fail, and `rescue` to catch errors:

```sdev
attempt ::
  forge result be 10 / 0
  speak(result)
;; rescue err ::
  speak("Caught an error: " + err)
;;
```

```sdev
attempt ::
  forge nums be [1, 2, 3]
  speak(nums[10])   // index out of bounds
;; rescue err ::
  speak("Error accessing list:", err)
;;
```

##### Nested Error Handling

```sdev
conjure safeDivide(a, b) ::
  attempt ::
    ponder b equals 0 ::
      speak("Error: division by zero")
      yield void
    ;;
    yield a / b
  ;; rescue err ::
    speak("Unexpected error:", err)
    yield void
  ;;
;;

speak(safeDivide(10, 2))   // 5
speak(safeDivide(10, 0))   // Error: division by zero
```

##### Assertion

```sdev
conjure validateAge(age) ::
  attempt ::
    ponder age < 0 ::
      speak("Error: Age cannot be negative")
      yield nope
    ;;
    ponder age > 150 ::
      speak("Error: Age is unreasonably large")
      yield nope
    ;;
    yield yep
  ;; rescue err ::
    speak("Validation error:", err)
    yield nope
  ;;
;;
```

---

#### Async & Concurrency

##### Async Functions

Use `async conjure` to define an asynchronous function:

```sdev
async conjure fetchData(url) ::
  forge response be await fetch(url)
  yield response
;;
```

##### Await

Use `await` inside `async` functions to wait for asynchronous operations:

```sdev
async conjure loadUserProfile(id) ::
  forge user be await fetchData("https://api.example.com/users/" + id)
  forge posts be await fetchData("https://api.example.com/posts?userId=" + id)

  yield ::
    "user": user,
    "posts": posts
  ;;
;;
```

##### Spawn (Concurrent Execution)

Use `spawn` to run functions concurrently without waiting for them:

```sdev
conjure worker(name, ms) ::
  delay(ms)
  speak(name + " finished after " + morph(ms, "text") + "ms")
;;

spawn worker("Task A", 2000)
spawn worker("Task B", 500)
spawn worker("Task C", 1000)
// Task B completes first, then C, then A
```

##### Delay

Pause execution for a number of milliseconds:

```sdev
speak("Starting...")
delay(1000)
speak("One second later...")
delay(2000)
speak("Three seconds total")
```

---

#### Built-in Output Functions

| Function | Description | Example |
|----------|-------------|---------|
| `speak(...)` | Print values with spaces between them | `speak("x =", 42)` → `x = 42` |
| `whisper(...)` | Print values concatenated (no spaces) | `whisper("a", "b")` → `ab` |
| `shout(...)` | Print values uppercased | `shout("hello")` → `HELLO` |

```sdev
forge x be 42
forge name be "Alice"

speak("The answer is", x)       // The answer is 42
speak(name, "scored", x, "%")   // Alice scored 42 %
whisper("[", x, "]")             // [42]
shout("warning: low battery")    // WARNING: LOW BATTERY
```

---

#### Built-in Math Functions

##### Core Math

| Function | Description | Example |
|----------|-------------|---------|
| `magnitude(x)` | Absolute value | `magnitude(-5)` → `5` |
| `root(x)` | Square root | `root(16)` → `4` |
| `ground(x)` | Floor (round down) | `ground(3.7)` → `3` |
| `elevate(x)` | Ceiling (round up) | `elevate(3.2)` → `4` |
| `nearby(x)` | Round to nearest int | `nearby(3.5)` → `4` |
| `least(...)` | Minimum value | `least(3, 1, 4, 1)` → `1` |
| `greatest(...)` | Maximum value | `greatest(3, 1, 4, 1)` → `4` |

##### Trigonometry

| Function | Description |
|----------|-------------|
| `sin(x)` | Sine (radians) |
| `cos(x)` | Cosine (radians) |
| `tan(x)` | Tangent (radians) |
| `asin(x)` | Arcsine |
| `acos(x)` | Arccosine |
| `atan(x)` | Arctangent |
| `atan2(y, x)` | Two-argument arctangent |
| `radians(deg)` | Convert degrees to radians |
| `degrees(rad)` | Convert radians to degrees |

##### Logarithms & Exponentials

| Function | Description |
|----------|-------------|
| `log(x)` | Natural logarithm |
| `log10(x)` | Base-10 logarithm |
| `log2(x)` | Base-2 logarithm |
| `exp(x)` | e^x |

##### Advanced Math

| Function | Description | Example |
|----------|-------------|---------|
| `clamp(v, min, max)` | Constrain value to range | `clamp(150, 0, 100)` → `100` |
| `lerp(a, b, t)` | Linear interpolation | `lerp(0, 100, 0.3)` → `30` |
| `mapRange(v, fromLo, fromHi, toLo, toHi)` | Map value between ranges | `mapRange(50, 0, 100, 0, 1)` → `0.5` |
| `sum(list)` | Sum all elements of a list | `sum([1,2,3,4])` → `10` |
| `average(list)` | Mean value of a list | `average([1,2,3,4])` → `2.5` |
| `sign(x)` | Sign: -1, 0, or 1 | `sign(-5)` → `-1` |
| `dist(x1, y1, x2, y2)` | Distance between two points | `dist(0,0,3,4)` → `5` |

##### Random

| Function | Description | Example |
|----------|-------------|---------|
| `chaos()` | Random float 0-1 | `chaos()` → `0.7234` |
| `randint(min, max)` | Random integer (inclusive) | `randint(1, 6)` → `4` |
| `pick(list)` | Random element from list | `pick(["a","b","c"])` → `"b"` |
| `shuffle(list)` | Shuffle a copy of list | `shuffle([1,2,3])` → `[3,1,2]` |

```sdev
// Dice rolling
conjure rollDice(sides) ::
  yield randint(1, sides)
;;

speak("d6:", rollDice(6))
speak("d20:", rollDice(20))

// Coin flip
speak(chaos() > 0.5 ~ "Heads" : "Tails")
```

---

#### Built-in String Functions

| Function | Description | Signature |
|----------|-------------|-----------|
| `upper(s)` | Uppercase | `upper("hi")` → `"HI"` |
| `lower(s)` | Lowercase | `lower("HI")` → `"hi"` |
| `trim(s)` | Remove surrounding whitespace | `trim("  hi  ")` → `"hi"` |
| `reverse(s)` | Reverse string | `reverse("abc")` → `"cba"` |
| `measure(s)` | String length | `measure("hello")` → `5` |
| `contains(s, sub)` | Check substring | `contains("hello", "ell")` → `yep` |
| `startswith(s, prefix)` | Starts with | `startswith("hello", "he")` → `yep` |
| `endswith(s, suffix)` | Ends with | `endswith("hello", "lo")` → `yep` |
| `replace(s, old, new)` | Replace all occurrences | `replace("aaa", "a", "b")` → `"bbb"` |
| `locate(s, sub)` | Index of substring (-1 if not found) | `locate("hello", "l")` → `2` |
| `shatter(s, sep)` | Split string into list | `shatter("a,b", ",")` → `["a","b"]` |
| `chars(s)` | Split into list of characters | `chars("abc")` → `["a","b","c"]` |
| `weave(list, sep)` | Join list with separator | `weave(["a","b"], "-")` → `"a-b"` |
| `padLeft(s, w, c)` | Pad left to width | `padLeft("5", 3, "0")` → `"005"` |
| `padRight(s, w, c)` | Pad right to width | `padRight("hi", 5, ".")` → `"hi..."` |
| `format(s, ...)` | Substitute `{}` placeholders | `format("Hi {}!", "Bob")` → `"Hi Bob!"` |
| `repeat(s, n)` | Repeat string n times | `repeat("ab", 3)` → `"ababab"` |
| `snatch(s, start, end?)` | Substring by index | `snatch("hello", 1, 3)` → `"el"` |

---

#### Built-in List Functions

| Function | Description | Example |
|----------|-------------|---------|
| `measure(list)` | Length of list | `measure([1,2,3])` → `3` |
| `gather(list, item)` | Append item (mutates) | `gather([1,2], 3)` → `[1,2,3]` |
| `pluck(list)` | Remove and return last item | `pluck([1,2,3])` → `3` |
| `snatch(list, idx)` | Remove item at index | `snatch([1,2,3], 1)` → removes `2` |
| `insert(list, idx, item)` | Insert at index | `insert([1,3], 1, 2)` → `[1,2,3]` |
| `portion(list, start, end?)` | Slice | `portion([1,2,3,4], 1, 3)` → `[2,3]` |
| `reverse(list)` | Return reversed copy | `reverse([1,2,3])` → `[3,2,1]` |
| `sort(list)` | Sort ascending copy | `sort([3,1,2])` → `[1,2,3]` |
| `sortDesc(list)` | Sort descending copy | `sortDesc([1,3,2])` → `[3,2,1]` |
| `unique(list)` | Remove duplicates | `unique([1,1,2,2,3])` → `[1,2,3]` |
| `flatten(list)` | Flatten nested lists | `flatten([[1,2],[3,4]])` → `[1,2,3,4]` |
| `concat(a, b)` | Concatenate two lists | `concat([1,2],[3,4])` → `[1,2,3,4]` |
| `contains(list, item)` | Check membership | `contains([1,2,3], 2)` → `yep` |
| `first(list)` | First element | `first([1,2,3])` → `1` |
| `last(list)` | Last element | `last([1,2,3])` → `3` |
| `clone(list)` | Deep copy | `clone([1,[2,3]])` |

---

#### Built-in Tome (Dict) Functions

| Function | Description |
|----------|-------------|
| `inscriptions(tome)` | Get all keys as a list |
| `contents(tome)` | Get all values as a list |
| `entries(tome)` | Get `[[key, value], ...]` pairs |
| `contains(tome, key)` | Check if key exists |
| `merge(t1, t2, ...)` | Merge dicts (later overrides earlier) |
| `erase(tome, key)` | Remove key |

```sdev
forge a be :: "x": 1, "y": 2 ;;
forge b be :: "y": 99, "z": 3 ;;
forge c be merge(a, b)
speak(c)  // {"x": 1, "y": 99, "z": 3}
```

---

#### Input / Output

##### `input(prompt?)` — Read User Input

Prompts the user for input and returns the entered text:

```sdev
forge name be input("What is your name? ")
speak("Hello, " + name + "!")

forge age be morph(input("Enter your age: "), "number")
speak("You are " + age + " years old")
```

##### `print(...)` / `println(...)` — Print (Aliases)

Standard aliases for `speak()`:

```sdev
print("Hello")
println("World")
```

---

#### Character & Code Point Functions

| Function | Description | Example |
|----------|-------------|---------|
| `chr(n)` | Number to character | `chr(65)` → `"A"` |
| `ord(c)` | Character to number | `ord("A")` → `65` |

```sdev
speak(chr(72) + chr(105))  // "Hi"
speak(ord("A"))             // 65

// Build a Caesar cipher
conjure encrypt(text, shift) ::
  forge result be ""
  iterate through text ::
    forge code be ord(item) + shift
    result be result + chr(code)
  ;;
  yield result
;;
speak(encrypt("ABC", 3))  // "DEF"
```

---

#### Number Base Conversion

| Function | Description | Example |
|----------|-------------|---------|
| `hex(n)` | Number to hex string | `hex(255)` → `"0xFF"` |
| `oct(n)` | Number to octal | `oct(8)` → `"0o10"` |
| `bin(n)` | Number to binary | `bin(10)` → `"0b1010"` |
| `parseNum(str, base?)` | Parse string with base | `parseNum("FF", 16)` → `255` |

```sdev
speak(hex(255))        // "0xFF"
speak(bin(42))         // "0b101010"
speak(oct(64))         // "0o100"
speak(parseNum("1010", 2))  // 10
speak(parseNum("FF", 16))   // 255
```

---

#### Number Formatting & Checking

| Function | Description | Example |
|----------|-------------|---------|
| `toFixed(n, digits)` | Format decimal places | `toFixed(3.14159, 2)` → `"3.14"` |
| `toPrecision(n, p)` | Format to precision | `toPrecision(123.456, 4)` → `"123.5"` |
| `isNaN(v)` | Check if NaN | `isNaN(0/0)` → `yep` |
| `isFinite(v)` | Check if finite | `isFinite(INFINITY)` → `nope` |
| `isInteger(v)` | Check if integer | `isInteger(3.0)` → `yep` |

```sdev
forge pi be 3.14159265
speak(toFixed(pi, 2))      // "3.14"
speak(toPrecision(pi, 4))  // "3.142"
speak(isInteger(42))       // yep
speak(isFinite(1/0))       // nope
```

---

#### String Checking Functions

| Function | Description | Example |
|----------|-------------|---------|
| `capitalize(s)` | First char uppercase | `capitalize("hello")` → `"Hello"` |
| `title(s)` | Title Case | `title("hello world")` → `"Hello World"` |
| `center(s, width, char?)` | Center-pad | `center("hi", 10, "-")` → `"----hi----"` |
| `trimLeft(s)` | Trim left whitespace | `trimLeft("  hi")` → `"hi"` |
| `trimRight(s)` | Trim right whitespace | `trimRight("hi  ")` → `"hi"` |
| `isUpper(s)` | All uppercase? | `isUpper("ABC")` → `yep` |
| `isLower(s)` | All lowercase? | `isLower("abc")` → `yep` |
| `isDigit(s)` | All digits? | `isDigit("123")` → `yep` |
| `isAlpha(s)` | All alphabetic? | `isAlpha("abc")` → `yep` |
| `isAlphaNum(s)` | All alphanumeric? | `isAlphaNum("abc123")` → `yep` |
| `isSpace(s)` | All whitespace? | `isSpace("  ")` → `yep` |

```sdev
speak(capitalize("hello world"))  // "Hello world"
speak(title("the quick brown fox"))  // "The Quick Brown Fox"
speak(center("TITLE", 20, "="))  // "=======TITLE========"
speak(isDigit("42"))   // yep
speak(isAlpha("hello"))  // yep
```

---

#### Regex / Pattern Matching

| Function | Description |
|----------|-------------|
| `match(text, pattern)` | First regex match (returns list or void) |
| `matchAll(text, pattern)` | All regex matches |
| `replaceRegex(text, pattern, replacement)` | Regex replace (global) |
| `test(text, pattern)` | Test if pattern matches |

```sdev
forge text be "Hello 123 World 456"
speak(match(text, "\\d+"))           // ["123"]
speak(matchAll(text, "\\d+"))        // [["123"], ["456"]]
speak(replaceRegex(text, "\\d+", "#"))  // "Hello # World #"
speak(test(text, "\\d+"))           // yep

// Validate email
conjure isEmail(s) ::
  yield test(s, "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")
;;
speak(isEmail("user@example.com"))  // yep
```

---

#### Bitwise Operations

| Function | Description | Example |
|----------|-------------|---------|
| `bitAnd(a, b)` | Bitwise AND | `bitAnd(5, 3)` → `1` |
| `bitOr(a, b)` | Bitwise OR | `bitOr(5, 3)` → `7` |
| `bitXor(a, b)` | Bitwise XOR | `bitXor(5, 3)` → `6` |
| `bitNot(a)` | Bitwise NOT | `bitNot(0)` → `-1` |
| `bitShiftLeft(a, n)` | Left shift | `bitShiftLeft(1, 3)` → `8` |
| `bitShiftRight(a, n)` | Right shift | `bitShiftRight(8, 2)` → `2` |

```sdev
// Flags / bitmask example
forge READ be 1
forge WRITE be 2
forge EXEC be 4

forge perms be bitOr(READ, WRITE)  // 3
speak(bitAnd(perms, READ) > 0)     // yep (has read)
speak(bitAnd(perms, EXEC) > 0)     // nope (no exec)
```

---

#### Base64 Encoding

| Function | Description |
|----------|-------------|
| `base64encode(text)` | Encode text to base64 |
| `base64decode(text)` | Decode base64 to text |

```sdev
forge encoded be base64encode("Hello, World!")
speak(encoded)  // "SGVsbG8sIFdvcmxkIQ=="
speak(base64decode(encoded))  // "Hello, World!"
```

---

#### Hash Function

```sdev
speak(hash("hello"))     // deterministic 32-bit integer hash
speak(hash([1, 2, 3]))   // works on any value
```

---

#### Time & Date

| Function | Description |
|----------|-------------|
| `now()` | Current timestamp in milliseconds |
| `timestamp()` | ISO 8601 string |
| `time()` | Detailed time tome with year, month, day, etc. |
| `formatTime(ms)` | Format milliseconds to ISO string |

```sdev
forge t be time()
speak("Year: " + t.year)
speak("Month: " + t.month)
speak("Day: " + t.day)
speak("Hour: " + t.hour)
speak("ISO: " + t.iso)

forge start be now()
// ... do work ...
forge elapsed be now() - start
speak("Took " + elapsed + "ms")
```

---

#### Functional Programming

| Function | Description |
|----------|-------------|
| `compose(f, g, ...)` | Right-to-left function composition |
| `pipe(value, f, g, ...)` | Left-to-right value piping |
| `curry(fn, arity)` | Currying |
| `memoize(fn)` | Cache function results |
| `tap(value, fn)` | Execute fn with value, return value |
| `times(n, fn)` | Call fn n times with index |
| `groupBy(list, fn)` | Group elements by key function |
| `chunk(list, size)` | Split list into chunks |

```sdev
// Compose
conjure double(x) :: yield x * 2 ;;
conjure addOne(x) :: yield x + 1 ;;
forge doubleAndAdd be compose(addOne, double)
speak(doubleAndAdd(5))  // 11

// Pipe
forge result be pipe(5, double, addOne, double)
speak(result)  // 22

// Memoize (cache expensive computations)
conjure fib(n) ::
  ponder n <= 1 :: yield n ;;
  yield fib(n - 1) + fib(n - 2)
;;
forge fastFib be memoize(fib)
speak(fastFib(10))  // 55

// Group and chunk
forge words be ["apple", "avocado", "banana", "blueberry", "cherry"]
speak(groupBy(words, w -> charAt(w, 0)))
// :: a: ["apple", "avocado"], b: ["banana", "blueberry"], c: ["cherry"] ;;

speak(chunk([1,2,3,4,5,6,7], 3))  // [[1,2,3], [4,5,6], [7]]

// Times
speak(times(5, i -> i * i))  // [0, 1, 4, 9, 16]
```

---

#### Buffer / Memory Operations

sdev provides low-level byte buffer operations for systems programming:

##### `buffer(size)` — Create Byte Buffer

```sdev
forge mem be buffer(1024)
mem.set(0, 255)
mem.set(1, 128)
speak(mem.get(0))    // 255
speak(mem.get(1))    // 128
speak(mem.size())    // 1024
```

##### Buffer Methods

| Method | Description |
|--------|-------------|
| `buf.get(index)` | Read byte at index |
| `buf.set(index, value)` | Write byte at index (0-255) |
| `buf.fill(value)` | Fill entire buffer |
| `buf.slice(start, end)` | Get portion as list |
| `buf.toList()` | Convert to list of numbers |
| `buf.toText()` | Decode as UTF-8 text |
| `buf.fromString(text)` | Write UTF-8 text into buffer |
| `buf.copyTo(target)` | Copy data to another buffer |
| `buf.size()` | Get buffer size |

##### `pointer(buffer, offset)` — Memory Pointer

```sdev
forge mem be buffer(256)
forge ptr be pointer(mem, 0)
ptr.write(42)
speak(ptr.read())        // 42

forge ptr2 be ptr.advance(4)
ptr2.writeU16(1024)
speak(ptr2.readU16())    // 1024

ptr2.writeU32(0xDEADBEEF)
speak(hex(ptr2.readU32()))  // "0xDEADBEEF"
```

##### Pointer Methods

| Method | Description |
|--------|-------------|
| `ptr.read()` | Read byte |
| `ptr.write(v)` | Write byte |
| `ptr.advance(n?)` | Return new pointer at offset+n |
| `ptr.readU16()` | Read 16-bit unsigned (little-endian) |
| `ptr.readU32()` | Read 32-bit unsigned (little-endian) |
| `ptr.writeU16(v)` | Write 16-bit unsigned |
| `ptr.writeU32(v)` | Write 32-bit unsigned |

---

#### Error Handling & Control Flow

| Function | Description |
|----------|-------------|
| `exit(code?)` | Terminate program with exit code |
| `panic(message)` | Fatal error (kernel panic) |
| `throw(message)` | Throw custom error |

```sdev
// Throw and catch
attempt ::
  forge x be input("Enter a number: ")
  forge n be morph(x, "number")
  ponder n < 0 ::
    throw("Negative numbers not allowed!")
  ;;
  speak("Square root: " + root(n))
rescue err ::
  speak("Error: " + err)
;;

// Exit
ponder badCondition ::
  exit(1)
;;
```

---

#### Additional Aliases

| Alias | Original | Description |
|-------|----------|-------------|
| `print()` | `speak()` | Standard print |
| `range()` | `sequence()` | Standard range |
| `typeof()` | `gettype()` | Type checking |
| `sleep()` | `delay()` | Pause (no-op in browser) |
| `keys()` | `inscriptions()` | Dict keys |
| `values()` | `contents()` | Dict values |
| `freeze(obj)` | — | Make object immutable |
| `isFrozen(obj)` | — | Check if frozen |
| `hash(value)` | — | 32-bit hash code |

---

#### Higher-Order Functions

##### `each` — Transform (Map)

Apply a function to every element and return a new list:

```sdev
forge nums be [1, 2, 3, 4, 5]
speak(each(nums, x -> x ^ 2))          // [1, 4, 9, 16, 25]
speak(each(nums, (x, i) -> x + i))     // [1, 3, 5, 7, 9]  (value + index)
speak(each(["a","b","c"], upper))       // ["A", "B", "C"]
```

##### `sift` — Filter

Keep only elements where the predicate returns `yep`:

```sdev
forge nums be [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
speak(sift(nums, x -> x % 2 equals 0))       // [2, 4, 6, 8, 10]
speak(sift(nums, x -> x > 5))                // [6, 7, 8, 9, 10]
speak(sift(["", "hi", "", "world"], x -> measure(x) > 0))  // ["hi", "world"]
```

##### `fold` — Reduce

Reduce a list to a single value using an accumulator:

```sdev
forge nums be [1, 2, 3, 4, 5]
speak(fold(nums, 0, (acc, x) -> acc + x))   // 15 (sum)
speak(fold(nums, 1, (acc, x) -> acc * x))   // 120 (product)

// Build a string
speak(fold(["a","b","c"], "", (acc, x) -> acc + x + "-"))  // "a-b-c-"

// Find max
speak(fold(nums, nums[0], (a, b) -> a > b ~ a : b))   // 5
```

##### `seek` — Find First

Return the first element matching a predicate, or `void`:

```sdev
forge people be [
  :: "name": "Alice", "age": 22 ;;,
  :: "name": "Bob", "age": 35 ;;,
  :: "name": "Carol", "age": 28 ;;
]

forge adult be seek(people, p -> p.age >= 30)
speak(adult.name)   // Bob

forge nobody be seek(people, p -> p.age > 100)
speak(nobody)   // void
```

##### `every` — All Match

Returns `yep` if ALL elements satisfy the predicate:

```sdev
speak(every([2,4,6,8], x -> x % 2 equals 0))  // yep
speak(every([1,2,3], x -> x > 0))             // yep
speak(every([1,-2,3], x -> x > 0))            // nope
```

##### `some` — Any Match

Returns `yep` if ANY element satisfies the predicate:

```sdev
speak(some([1,3,5,6], x -> x % 2 equals 0))  // yep (6 is even)
speak(some([1,3,5,7], x -> x % 2 equals 0))  // nope
```

##### `enumerate` — Index + Value

Pairs each element with its index:

```sdev
speak(enumerate(["a","b","c"]))
// [[0,"a"], [1,"b"], [2,"c"]]

within pair be enumerate(["red","green","blue"]) ::
  speak(pair[0] + ": " + pair[1])
;;
// 0: red
// 1: green
// 2: blue
```

##### `zip` — Pair Two Lists

Combine two lists element-by-element:

```sdev
forge keys be ["name", "age", "city"]
forge vals be ["Alice", 30, "NYC"]
speak(zip(keys, vals))
// [["name","Alice"], ["age",30], ["city","NYC"]]
```

---

#### Type System & Conversion

##### Getting Type — `essence()`

Returns the type name as a string:

```sdev
speak(essence(42))         // "number"
speak(essence("hi"))       // "text"
speak(essence(yep))        // "truth"
speak(essence(void))       // "void"
speak(essence([1,2,3]))    // "list"
speak(essence(::;;))       // "tome"
```

##### Converting Types — `morph()`

```sdev
speak(morph("42", "number"))     // 42
speak(morph(42, "text"))         // "42"
speak(morph(1, "truth"))         // yep
speak(morph(0, "truth"))         // nope
speak(morph("3.14", "number"))   // 3.14
```

##### Type Checking Helpers

```sdev
speak(essence(x) equals "number")      // Check if number
speak(essence(x) equals "text")        // Check if string
speak(essence(x) equals "list")        // Check if list
speak(essence(x) equals "tome")        // Check if dict
speak(x equals void)                   // Check if null
```

---

#### Collections

##### Set

A collection of unique elements. Duplicate additions are silently ignored.

```sdev
forge s be Set()
s.add(1)
s.add(2)
s.add(2)    // Duplicate ignored
s.add(3)

speak(s.size())     // 3
speak(s.has(2))     // yep
speak(s.has(99))    // nope
speak(s.values())   // [1, 2, 3]

s.remove(2)
speak(s.values())   // [1, 3]

s.clear()
speak(s.size())     // 0
speak(s.isEmpty())  // yep
```

**Set methods:** `add(v)`, `remove(v)`, `has(v)`, `values()`, `size()`, `isEmpty()`, `clear()`, `toList()`

##### Map

A key-value store where keys can be any type (including objects):

```sdev
forge m be Map()
m.set("name", "Alice")
m.set("age", 30)
m.set("active", yep)

speak(m.get("name"))     // Alice
speak(m.has("age"))      // yep
speak(m.keys())          // ["name", "age", "active"]
speak(m.values())        // ["Alice", 30, yep]
speak(m.entries())       // [["name","Alice"], ["age",30], ["active",yep]]
speak(m.size())          // 3

m.delete("active")
speak(m.size())          // 2
m.clear()
```

**Map methods:** `set(k, v)`, `get(k)`, `has(k)`, `delete(k)`, `keys()`, `values()`, `entries()`, `size()`, `isEmpty()`, `clear()`

##### Queue (FIFO)

First-in, first-out data structure:

```sdev
forge q be Queue()
q.enqueue("first")
q.enqueue("second")
q.enqueue("third")

speak(q.peek())      // first  (look without removing)
speak(q.dequeue())   // first  (remove and return)
speak(q.peek())      // second
speak(q.size())      // 2
speak(q.isEmpty())   // nope
```

**Queue methods:** `enqueue(v)`, `dequeue()`, `peek()`, `size()`, `isEmpty()`, `clear()`, `toList()`

##### Stack (LIFO)

Last-in, first-out data structure:

```sdev
forge s be Stack()
s.push(10)
s.push(20)
s.push(30)

speak(s.peek())   // 30  (look without removing)
speak(s.pop())    // 30  (remove and return)
speak(s.pop())    // 20
speak(s.size())   // 1

// Stack-based undo system
forge history be Stack()
history.push("action1")
history.push("action2")
history.push("action3")

speak("Undoing:", history.pop())  // action3
speak("Undoing:", history.pop())  // action2
```

**Stack methods:** `push(v)`, `pop()`, `peek()`, `size()`, `isEmpty()`, `clear()`, `toList()`

##### LinkedList

A doubly-linked list with O(1) front/back operations:

```sdev
forge list be LinkedList()
list.append(1)
list.append(2)
list.append(3)
list.prepend(0)

speak(list.toList())   // [0, 1, 2, 3]
speak(list.size())     // 4
speak(list.get(2))     // 2

list.remove(1)         // Remove element with value 1
speak(list.toList())   // [0, 2, 3]

speak(list.head())     // 0
speak(list.tail())     // 3
```

**LinkedList methods:** `append(v)`, `prepend(v)`, `remove(v)`, `get(idx)`, `size()`, `head()`, `tail()`, `toList()`, `clear()`

---

#### Matrix Operations

sdev has a comprehensive built-in matrix math library useful for data science and machine learning.

##### Creating Matrices

```sdev
// Matrix filled with a value
forge zeros be matrix(3, 3, 0)
// [[0,0,0], [0,0,0], [0,0,0]]

forge ones be matrix(2, 4, 1)
// [[1,1,1,1], [1,1,1,1]]

// Identity matrix
forge eye be identity(4)
// [[1,0,0,0], [0,1,0,0], [0,0,1,0], [0,0,0,1]]

// Reshape a flat list into a matrix
forge m be reshape([1,2,3,4,5,6], 2, 3)
// [[1,2,3], [4,5,6]]
```

##### Matrix Arithmetic

```sdev
forge a be [[1, 2], [3, 4]]
forge b be [[5, 6], [7, 8]]

// Element-wise operations
speak(matadd(a, b))     // [[6,8], [10,12]]
speak(matsub(a, b))     // [[-4,-4], [-4,-4]]
speak(matscale(a, 2))   // [[2,4], [6,8]]

// Matrix multiplication
speak(matmul(a, b))
// [[1*5+2*7, 1*6+2*8], [3*5+4*7, 3*6+4*8]]
// = [[19,22], [43,50]]

// Transpose
speak(transpose(a))
// [[1,3], [2,4]]
```

##### Vector Operations

```sdev
forge v1 be [1, 2, 3]
forge v2 be [4, 5, 6]

// Dot product
speak(dot(v1, v2))   // 1*4 + 2*5 + 3*6 = 32

// Element-wise multiply via each
forge elem be each(v1, (x, i) -> x * v2[i])
speak(elem)   // [4, 10, 18]
```

##### Matrix Utilities

| Function | Description |
|----------|-------------|
| `matrix(rows, cols, fill)` | Create filled matrix |
| `identity(n)` | Create n×n identity matrix |
| `transpose(m)` | Transpose rows and columns |
| `matmul(a, b)` | Matrix multiplication |
| `matadd(a, b)` | Element-wise addition |
| `matsub(a, b)` | Element-wise subtraction |
| `matscale(m, s)` | Scalar multiplication |
| `dot(a, b)` | Dot product of two vectors |
| `reshape(list, rows, cols)` | Reshape list to 2D matrix |
| `flatten(m)` | Flatten 2D matrix to 1D list |
| `shape(m)` | Get `[rows, cols]` of matrix |
| `sum(m)` | Sum all elements |
| `mean(list)` | Mean of a 1D list |

##### Neural Network Example

```sdev
// Sigmoid activation function
conjure sigmoid(x) ::
  yield 1 / (1 + exp(-x))
;;

// Feedforward neural network layer
conjure layer(inputs, weights, biases) ::
  // inputs: [1 x n], weights: [n x m], biases: [1 x m]
  forge z be matmul(inputs, weights)
  forge zb be matadd(z, biases)
  // Apply sigmoid element-wise
  yield each(zb, row -> each(row, x -> sigmoid(x)))
;;

forge input be [[0.5, 0.3, 0.2]]
forge w1 be [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]]
forge b1 be [[0.1, 0.1]]

forge output be layer(input, w1, b1)
speak("Layer output:", output)
```

---

#### Graphics & Game Development

sdev has a built-in 2D graphics and turtle graphics API. Graphics commands render to the Canvas panel in the IDE.

##### Canvas Setup

```sdev
canvas(800, 600)    // Set canvas dimensions (width, height)
clear("#1a1a2e")    // Clear with a background color
```

##### Fill and Stroke

```sdev
fill("blue")          // Set fill color
noFill()              // Disable fill
stroke("red", 2)      // Set stroke: color, width
noStroke()            // Disable stroke
lineWidth(3)          // Set line width separately
alpha(0.5)            // Set global transparency (0–1)
lineCap("round")      // Line cap: "round", "square", "butt"
lineJoin("round")     // Line join: "round", "bevel", "miter"
```

##### Basic Shapes

```sdev
// Rectangle: rect(x, y, width, height, cornerRadius?)
fill("steelblue")
rect(50, 50, 200, 100)
rect(300, 50, 200, 100, 20)    // Rounded corners

// Circle: circle(x, y, radius)
fill("tomato")
circle(150, 300, 60)

// Ellipse: ellipse(x, y, radiusX, radiusY, rotation?)
fill("gold")
ellipse(350, 300, 100, 50)
ellipse(550, 300, 100, 50, 45)   // Rotated 45°

// Line: line(x1, y1, x2, y2)
stroke("white", 2)
line(50, 400, 750, 400)

// Arc: arc(x, y, radius, startAngle, endAngle, counterclockwise?)
stroke("lime", 3)
arc(200, 500, 50, 0, 270)

// Triangle: triangle(x1, y1, x2, y2, x3, y3)
fill("orchid")
triangle(400, 450, 450, 550, 350, 550)

// Polygon: polygon([[x,y], ...])
fill("coral")
polygon([[600, 400], [650, 430], [640, 490], [560, 490], [550, 430]])

// Star: star(x, y, outerR, innerR, points?)
fill("gold")
star(150, 150, 50, 25)          // 5-pointed star
star(300, 150, 60, 25, 8)       // 8-pointed star

// Heart: heart(x, y, size)
fill("red")
heart(500, 150, 50)

// Point: point(x, y, size?)
fill("white")
point(100, 100)
point(150, 100, 8)
```

##### Text Drawing

```sdev
fill("white")
text("Hello, World!", 100, 100)           // Basic text
text("Large Text", 100, 150, 36)          // With size
text("Bold Text", 100, 200, 24, "bold")   // With style

font("Arial", "bold")                     // Set font family and style
textAlign("center", "middle")             // Horizontal: left/center/right; Vertical: top/middle/bottom
```

##### Gradients

```sdev
// Linear gradient: fill with gradient from (x1,y1) to (x2,y2)
// Color stops: [position, color] where position is 0.0 to 1.0
linearGradient(0, 0, 400, 0, [0, "red"], [0.5, "yellow"], [1, "green"])
rect(0, 0, 400, 100)

// Radial gradient: from inner circle to outer circle
radialGradient(200, 200, 0, 200, 200, 150, [0, "white"], [0.5, "cyan"], [1, "navy"])
circle(200, 200, 150)
```

##### Shadows

```sdev
shadow("rgba(0,0,0,0.5)", 15, 5, 5)   // color, blur, offsetX, offsetY
fill("gold")
circle(200, 200, 80)
noShadow()
```

##### Transformations

```sdev
save()                // Push current state
translate(200, 200)   // Move origin to (200, 200)
rotate(0.785)         // Rotate 45° (in radians)
scale(1.5)            // Scale uniformly
rect(-50, -50, 100, 100)   // Draw centered rectangle
restore()             // Pop saved state

resetTransform()      // Reset all transforms to identity
```

##### Path Drawing

```sdev
// Custom polygon path
fill("purple")
beginPath()
moveTo(100, 100)
lineTo(200, 80)
lineTo(250, 150)
lineTo(200, 220)
lineTo(100, 200)
closePath()
fillPath()
strokePath()

// Bezier curve
stroke("cyan", 2)
beginPath()
moveTo(100, 300)
bezierTo(150, 200, 250, 400, 300, 300)   // cp1x, cp1y, cp2x, cp2y, x, y
strokePath()

// Quadratic curve
beginPath()
moveTo(100, 400)
quadraticTo(200, 350, 300, 400)           // cpx, cpy, x, y
strokePath()
```

##### Turtle Graphics

The turtle graphics API lets you draw by commanding a turtle that moves and draws lines as it goes.

```sdev
canvas(500, 500)
clear("#0d0d20")
turtle()           // Create turtle at center, facing up

// Basic movement
forward(100)       // Move forward 100 units (drawing as it goes)
right(90)          // Turn right 90 degrees
forward(100)
right(90)
forward(100)
right(90)
forward(100)       // This draws a square!

// Pen control
penup()            // Lift pen — move without drawing
goto(250, 250)     // Jump to coordinates
pendown()          // Lower pen — start drawing again

// Pen style
pencolor("lime")   // Set pen color (any CSS color)
penwidth(3)        // Set pen width

// Advanced
setheading(45)     // Set absolute direction (degrees)
speak(heading())   // Get current heading
speak(pos())       // Get current [x, y] position
home()             // Return to start position

// Turtle circle
turtleCircle(50)        // Draw full circle
turtleCircle(50, 72)    // Polygon approximation (72 steps)

// Dot and stamp
dot(10, "red")     // Draw a filled dot
stamp()            // Leave a mark of the turtle shape

// EXAMPLE: Psychedelic spiral
canvas(600, 600)
clear("#000000")
turtle()
within i be sequence(0, 300) ::
  pencolor(hue(i * 1.2))
  penwidth(1 + i * 0.02)
  forward(i)
  right(91)
;;
```

##### Sprites & Game Objects

```sdev
// Create sprite: createSprite(x, y, width, height, color?)
forge player be createSprite(100, 100, 40, 40, "blue")
forge enemy be createSprite(400, 300, 40, 40, "red")

// Access/set properties
player.x be 150
player.velocityX be 5
player.velocityY be -2

// Update position (applies velocity)
updateSprite(player)

// Draw sprite
drawSprite(player)
drawSprite(enemy)

// Collision detection
ponder spriteCollides(player, enemy) ::
  speak("HIT!")
;;

// Move by delta
moveSprite(player, 10, 5)
```

##### Color Functions

```sdev
// CSS color names work directly
fill("red")
fill("steelblue")
fill("rgba(255, 0, 0, 0.5)")

// Helper functions
forge red be rgb(255, 0, 0)
forge transparent be rgba(0, 255, 0, 0.3)

// HSL color — hue(hue, saturation?, lightness?)
forge cyan be hue(180)              // Cyan (s=100, l=50 defaults)
forge purple be hue(270, 80, 60)    // Custom HSL
forge faded be hsla(240, 100, 50, 0.4)

// Rainbow cycle (great for spirals!)
within i be sequence(360) ::
  fill(hue(i))
  rect(i, 0, 1, 50)
;;

// Random color
fill(randomColor())
```

##### Graphics Math

```sdev
// Convert degrees/radians
speak(radians(180))   // 3.14159...
speak(degrees(PI))    // 180

// Lerp (smooth transitions)
forge pos be lerp(0, 100, 0.25)   // 25

// Map value between ranges
forge brightness be mapRange(50, 0, 100, 0, 255)   // 127.5

// Clamp
forge safe be clamp(150, 0, 100)   // 100

// Distance between two points
speak(dist(0, 0, 3, 4))   // 5
```

##### Complete 2D Graphics Example — Starfield

```sdev
canvas(800, 600)

// Create 200 stars
forge stars be each(sequence(200), i -> ::
  "x": randint(0, 800),
  "y": randint(0, 600),
  "r": chaos() * 2 + 0.5,
  "speed": chaos() * 2 + 0.5,
  "bright": chaos() * 0.7 + 0.3
;;)

clear("#000011")

within star be stars ::
  fill(rgba(255, 255, 255, star.bright))
  circle(star.x, star.y, star.r)
;;

// Draw nebula in center
radialGradient(400, 300, 0, 400, 300, 200,
  [0, "rgba(100,50,200,0.4)"],
  [0.5, "rgba(50,100,255,0.2)"],
  [1, "rgba(0,0,0,0)"]
)
circle(400, 300, 200)
```

---

#### File I/O

> **Note:** File I/O is available in the Python standalone interpreter and native desktop builds. In the browser-based IDE, these functions are simulated.

##### Reading Files

```sdev
// Read entire file as text
forge content be decipher("data.txt")
speak(content)

// Read and parse JSON
forge config be unetch(decipher("config.json"))
speak(config.version)
speak(config.name)
```

##### Writing Files

```sdev
// Write text file
inscribe("output.txt", "Hello, World!\n")

// Write JSON with indentation
forge data be :: "score": 100, "name": "Alice", "level": 5 ;;
inscribe("save.json", etch(data))
```

##### Append to File

```sdev
appendFile("log.txt", "User logged in\n")
appendFile("log.txt", "User viewed dashboard\n")
```

##### File Utilities

| Function | Description |
|----------|-------------|
| `decipher(path)` | Read file as text |
| `inscribe(path, content)` | Write text to file |
| `appendFile(path, content)` | Append to file |
| `fileExists(path)` | Returns `yep`/`nope` |
| `deleteFile(path)` | Delete a file |
| `listDir(path)` | Get list of files in directory |

---

#### Networking

> **Note:** Network functions are available in async contexts. In the browser they use `fetch`. In native builds they use Node.js http.

##### HTTP GET

```sdev
async conjure getUsers() ::
  forge data be await fetch("https://jsonplaceholder.typicode.com/users")
  yield data
;;
```

##### HTTP POST

```sdev
async conjure createUser(name, email) ::
  forge response be await fetch("https://api.example.com/users", ::
    "method": "POST",
    "headers": :: "Content-Type": "application/json" ;;,
    "body": :: "name": name, "email": email ;;
  ;;)
  yield response
;;
```

---

#### Examples & Recipes

##### FizzBuzz

```sdev
within i be sequence(1, 101) ::
  ponder i % 15 equals 0 ::
    speak("FizzBuzz")
  ;; otherwise ponder i % 3 equals 0 ::
    speak("Fizz")
  ;; otherwise ponder i % 5 equals 0 ::
    speak("Buzz")
  ;; otherwise ::
    speak(i)
  ;;
;;
```

##### Fibonacci (Memoized)

```sdev
forge memo be :: ;;

conjure fib(n) ::
  ponder n <= 1 :: yield n ;;
  ponder contains(memo, morph(n, "text")) ::
    yield memo[morph(n, "text")]
  ;;
  forge result be fib(n - 1) + fib(n - 2)
  memo[morph(n, "text")] be result
  yield result
;;

within i be sequence(0, 30) ::
  speak("fib(" + morph(i, "text") + ") =", fib(i))
;;
```

##### Binary Search

```sdev
conjure binarySearch(arr, target) ::
  forge lo be 0
  forge hi be measure(arr) - 1

  cycle lo <= hi ::
    forge mid be ground((lo + hi) / 2)
    ponder arr[mid] equals target ::
      yield mid
    ;; otherwise ponder arr[mid] < target ::
      lo be mid + 1
    ;; otherwise ::
      hi be mid - 1
    ;;
  ;;

  yield -1
;;

forge sorted be [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
speak(binarySearch(sorted, 23))   // 5
speak(binarySearch(sorted, 50))   // -1
```

##### Quicksort

```sdev
conjure quicksort(arr) ::
  ponder measure(arr) <= 1 :: yield arr ;;

  forge pivot be arr[ground(measure(arr) / 2)]
  forge less be sift(arr, x -> x < pivot)
  forge equal be sift(arr, x -> x equals pivot)
  forge greater be sift(arr, x -> x > pivot)

  yield quicksort(less) + equal + quicksort(greater)
;;

speak(quicksort([3, 6, 8, 10, 1, 2, 1]))
// [1, 1, 2, 3, 6, 8, 10]
```

##### Stack-Based Calculator

```sdev
conjure calculate(expression) ::
  forge tokens be shatter(expression, " ")
  forge stack be Stack()

  within token be tokens ::
    ponder token equals "+" ::
      forge b be stack.pop()
      forge a be stack.pop()
      stack.push(a + b)
    ;; otherwise ponder token equals "-" ::
      forge b be stack.pop()
      forge a be stack.pop()
      stack.push(a - b)
    ;; otherwise ponder token equals "*" ::
      forge b be stack.pop()
      forge a be stack.pop()
      stack.push(a * b)
    ;; otherwise ponder token equals "/" ::
      forge b be stack.pop()
      forge a be stack.pop()
      stack.push(a / b)
    ;; otherwise ::
      stack.push(morph(token, "number"))
    ;;
  ;;

  yield stack.pop()
;;

speak(calculate("3 4 + 2 *"))    // (3+4)*2 = 14
speak(calculate("5 1 2 + 4 * + 3 -"))  // 5+(1+2)*4-3 = 14
```

##### Caesar Cipher

```sdev
conjure caesarEncode(text, shift) ::
  forge result be ""
  within ch be chars(text) ::
    forge code be locate("ABCDEFGHIJKLMNOPQRSTUVWXYZ", upper(ch))
    ponder code >= 0 ::
      forge shifted be (code + shift) % 26
      result be result + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[shifted]
    ;; otherwise ::
      result be result + ch
    ;;
  ;;
  yield result
;;

speak(caesarEncode("HELLO WORLD", 3))   // KHOOR ZRUOG
speak(caesarEncode("KHOOR ZRUOG", 23))  // HELLO WORLD (decode with 26-3=23)
```

##### Word Frequency Counter

```sdev
conjure wordFrequency(text) ::
  forge words be shatter(lower(trim(text)), " ")
  forge freq be ::;;

  within word be words ::
    forge w be replace(replace(word, ".", ""), ",", "")
    ponder measure(w) > 0 ::
      ponder contains(freq, w) ::
        freq[w] be freq[w] + 1
      ;; otherwise ::
        freq[w] be 1
      ;;
    ;;
  ;;

  yield freq
;;

forge text be "the quick brown fox jumps over the lazy dog the fox"
forge freq be wordFrequency(text)
speak(freq)
// Sort by frequency
forge sorted be sort(inscriptions(freq), k -> -freq[k])
```

##### Prime Sieve

```sdev
conjure sieve(limit) ::
  forge primes be each(sequence(2, limit + 1), x -> x)
  forge result be []

  cycle measure(primes) > 0 ::
    forge p be primes[0]
    gather(result, p)
    primes be sift(primes, x -> x % p differs 0)
  ;;

  yield result
;;

speak(sieve(50))
// [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
```

##### Linked-List Graph Traversal (BFS)

```sdev
// BFS using a Queue
conjure bfs(graph, start) ::
  forge visited be Set()
  forge queue be Queue()
  forge order be []

  queue.enqueue(start)
  visited.add(start)

  cycle isnt queue.isEmpty() ::
    forge node be queue.dequeue()
    gather(order, node)

    within neighbor be graph[node] ::
      ponder isnt visited.has(neighbor) ::
        visited.add(neighbor)
        queue.enqueue(neighbor)
      ;;
    ;;
  ;;

  yield order
;;

forge graph be ::
  "A": ["B", "C"],
  "B": ["A", "D", "E"],
  "C": ["A", "F"],
  "D": ["B"],
  "E": ["B", "F"],
  "F": ["C", "E"]
;;

speak(bfs(graph, "A"))  // ["A", "B", "C", "D", "E", "F"]
```

##### Turtle Mandala

```sdev
canvas(600, 600)
clear("#000000")
turtle()
penwidth(1.5)

forge petals be 12
forge petalAngle be 360 / petals

within i be sequence(petals) ::
  pencolor(hue(i * petalAngle))
  within j be sequence(60) ::
    forward(j * 0.5)
    right(6)
  ;;
  penup()
  home()
  pendown()
  setheading(i * petalAngle)
;;
```

---

#### JavaScript Interop (JS Interpreter Only)

The browser-based interpreter includes a special `js` keyword for calling JavaScript functions directly from sdev code. This allows integration with browser APIs, DOM manipulation, and third-party JS libraries.

##### Three Syntax Forms

```sdev
// 1. Single-line expression
js <expression>

// 2. Parenthesized form (for objects, multi-line expressions)
js (
  <expression>
)

// 3. Statement block
js {
  <statements>
}
```

##### Basic Examples

```sdev
// Browser dialog
js alert("Hello from sdev!")

// Read browser properties
forge width be js window.innerWidth
speak("Width:", width)

// DOM manipulation
js document.body.style.backgroundColor = "#1a1a2e"
js document.title = "My sdev App"

// Math
forge angle be js Math.PI / 6
forge result be js Math.sin(0.5)
```

##### Object Literals

```sdev
// Use parenthesized form for object literals
forge opts be js ({
  dragging: true,
  zoom: 12,
  center: [51.505, -0.09]
})

// Nested objects
forge config be js ({
  api: {
    url: "https://api.example.com",
    timeout: 5000
  },
  debug: false
})
```

##### Arrow Functions

```sdev
// Map/filter in JS
forge doubled be js [1, 2, 3, 4].map(x => x * 2)
forge filtered be js [1, 2, 3, 4].filter(x => x > 2)

// Event handlers
js document.getElementById("btn").addEventListener("click", (e) => {
  console.log("Clicked!", e.target)
})

// Use sdev variables in JS arrows
forge multiplier be 5
forge result be js [1, 2, 3].map(x => x * multiplier)
```

##### Multi-line JS Blocks

```sdev
js {
  const canvas = document.createElement("canvas")
  canvas.width = 400
  canvas.height = 300
  document.body.appendChild(canvas)

  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "navy"
  ctx.fillRect(0, 0, 400, 300)
  ctx.fillStyle = "white"
  ctx.font = "24px monospace"
  ctx.fillText("Made in sdev!", 100, 150)
}
```

##### Leaflet Map Integration

```sdev
// Initialize a Leaflet map
forge map be js L.map("map-container").setView([51.505, -0.09], 13)

js L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", ({
  attribution: "© OpenStreetMap contributors"
})).addTo(map)

// Add markers
conjure addMarker(lat, lng, label) ::
  js L.marker([lat, lng]).addTo(map).bindPopup(label)
;;

addMarker(51.505, -0.09, "London, UK")
addMarker(48.8566, 2.3522, "Paris, France")
addMarker(52.52, 13.405, "Berlin, Germany")
```

---

#### Complete Reference Card

##### Keywords

| Keyword | Purpose |
|---------|---------|
| `forge` | Declare a variable |
| `be` | Assign a value |
| `conjure` | Declare a function |
| `yield` | Return a value from a function |
| `ponder` | `if` statement |
| `otherwise` | `else` clause |
| `cycle` | `while` loop |
| `iterate` | `for-each` loop (iterate x through list) |
| `through` | Used with iterate |
| `within` | `for-in` loop (within x be list) |
| `yeet` | `break` — exit loop |
| `skip` | `continue` — skip iteration |
| `attempt` | `try` block |
| `rescue` | `catch` block |
| `yep` | Boolean `true` |
| `nope` | Boolean `false` |
| `void` | Null / absent value |
| `also` | Logical AND |
| `either` | Logical OR |
| `isnt` | Logical NOT |
| `equals` | Equality comparison |
| `differs` | Inequality comparison |
| `essence` | Define a class |
| `extend` | Class inheritance |
| `self` | Instance reference inside class methods |
| `super` | Parent class reference |
| `new` | Create class instance |
| `summon` | Import from Gist |
| `async` | Mark function as async |
| `await` | Wait for async operation |
| `spawn` | Run function concurrently |

##### Special Symbols

| Symbol | Purpose |
|--------|---------|
| `::` | Start a block |
| `;;` | End a block |
| `->` | Lambda arrow |
| `\|>` | Pipe operator |
| `~` | Ternary condition operator |
| `:` | Ternary else / dict key-value separator |
| `//` | Line comment |
| `#` | Line comment (Python style) |
| `^` | Power operator |
| `<>` | Inequality (alternative to `differs`) |

##### Built-in Constants

| Constant | Value |
|----------|-------|
| `PI` | 3.141592653589793 |
| `TAU` | 6.283185307179586 |
| `E` | 2.718281828459045 |
| `INFINITY` | Infinity |

##### Quick Reference Examples

```sdev
// ── Variables ──
forge x be 42
forge name be "Alice"
forge active be yep

// ── Arithmetic ──
speak(2 ^ 10)     // 1024
speak(10 % 3)     // 1
speak(-5 + 8)     // 3

// ── String ──
speak("Hello" + " " + "World")
speak(upper("hello"))        // HELLO
speak(measure("hello"))      // 5

// ── List ──
forge nums be [1, 2, 3, 4, 5]
gather(nums, 6)              // [1,2,3,4,5,6]
speak(nums[-1])              // 6
speak(sort(nums))            // [1,2,3,4,5,6]

// ── Conditionals ──
ponder x > 0 ::
  speak("positive")
;; otherwise ::
  speak("non-positive")
;;

// ── Ternary ──
forge label be x > 0 ~ "pos" : "neg"

// ── Loop ──
within i be sequence(5) :: speak(i) ;;  // 0 1 2 3 4
cycle x > 0 :: x be x - 1 ;;

// ── Function ──
conjure add(a, b) :: yield a + b ;;
forge double be x -> x * 2

// ── Pipe ──
[1,2,3,4,5] |> each(x -> x * 2) |> sift(x -> x > 4) |> speak
// [6, 8, 10]

// ── OOP ──
essence Dog ::
  conjure init(self, name) :: self.name be name ;;
  conjure bark(self) :: speak(self.name + ": WOOF!") ;;
;;
forge rex be new Dog("Rex")
rex.bark()

// ── Error Handling ──
attempt ::
  forge n be morph("not a number", "number")
;; rescue err ::
  speak("Error:", err)
;;

// ── Higher-order ──
forge evens be sift(sequence(10), x -> x % 2 equals 0)
forge sum be fold(evens, 0, (a, b) -> a + b)
speak(sum)   // 20

// ── Collections ──
forge s be Set()
s.add(1) s.add(2) s.add(2)
speak(s.values())   // [1, 2]

forge q be Queue()
q.enqueue("a") q.enqueue("b")
speak(q.dequeue())   // a

// ── Matrix ──
forge a be [[1,2],[3,4]]
forge b be [[5,6],[7,8]]
speak(matmul(a, b))   // [[19,22],[43,50]]

// ── Graphics ──
canvas(400, 400)
clear("#111")
fill(hue(120))
circle(200, 200, 100)

// ── Turtle ──
turtle()
within i be sequence(4) ::
  forward(100)
  right(90)
;;
```

---

#### Web Building (HTML / CSS / JavaScript)

sdev ships a full Web DSL: any program that calls `page(...)` produces a real
HTML document that opens in the IDE's **WEB** preview panel (with Reload,
Download as `.html`, and Open in new tab). You can mix the high-level DSL with
raw HTML/CSS/JS passthrough — everything HTML, CSS, and JavaScript can do is
available.

> Web builtins are part of the **JavaScript runtime** (web IDE and bundled
> JS interpreter). The Python/desktop CLI focuses on terminal output.

##### Page lifecycle

| Builtin            | Purpose                                                           |
|--------------------|-------------------------------------------------------------------|
| `page(title)`      | Start a new HTML document. Auto-switches the IDE to the WEB tab.  |
| `endpage()`        | Finalize the page; auto-closes any still-open containers.         |
| `title(text)`      | Set/update the `<title>`.                                         |
| `meta({...})`      | Append a `<meta>` to `<head>`.                                    |
| `link(rel, href)`  | Append a `<link>` (stylesheet, icon, …) to `<head>`.              |

##### Elements

Every HTML5 tag is available in three forms:

- **Self-closing helper:** `h1("Hello")`, `p("text", {class:"lead"})`,
  `a("Click", {href:"/x"})`, `img({src:"a.png", alt:"a"})`
- **Unambiguous form:** `html_div(...)`, `html_button(...)`, `html_input(...)` —
  use these when a tag name (e.g. `button`, `input`, `label`, `table`, `form`)
  collides with sdev's UI toolkit.
- **Containers:** `open_<tag>({attrs})` … nested children … `end_<tag>()`
  (e.g. `open_div`, `open_section`, `open_ul`, `open_form`).

Generic builders cover everything else:

```sdev
tag("custom-element", "text", { id: "x" })
open("nav", { class: "top" })
  a("Home", { href: "/" })
close()
```

##### CSS

```sdev
style("body", { background: "#0b1220", color: "white", font_family: "system-ui" })
style(".btn", { padding: "12px 18px", border_radius: "8px", background: "#3b82f6" })
style(".btn:hover", { background: "#2563eb" })

keyframes("spin", {
  "0%":   { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(360deg)" },
})

// Or drop in raw CSS
raw_css(".grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }")
```

Property names use `snake_case` and are auto-converted to `kebab-case`
(`font_size` → `font-size`).

##### JavaScript

```sdev
onclick("#go",       "alert('hello from sdev')")
on("input", "#q",    "console.log(event.target.value)")
script("window.addEventListener('load', () => console.log('ready'))")
raw_js("fetch('/api').then(r => r.json()).then(console.log)")
```

##### Raw passthrough

When the DSL doesn't cover something, drop straight to source:

```sdev
raw_html("<svg viewBox='0 0 10 10'><circle cx='5' cy='5' r='4'/></svg>")
raw_css("@media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }")
raw_js("document.title = 'updated from sdev'")
```

##### Full example

```sdev
page("Counter")
  style("body", { display: "grid", place_items: "center", height: "100vh",
                  font_family: "system-ui", background: "#0b1220", color: "#fff" })
  style(".btn", { padding: "12px 20px", border_radius: "10px",
                  background: "#3b82f6", color: "#fff", border: "none",
                  cursor: "pointer", font_size: "16px" })

  h1("Count: 0", { id: "label" })
  html_button("Tap me", { id: "btn", class: "btn" })

  onclick("#btn", "
    const el = document.querySelector('#label');
    const n = (+el.textContent.match(/\\\\d+/)[0]) + 1;
    el.textContent = 'Count: ' + n;
  ")
endpage()
```

Click **Run** → the WEB tab opens with a live, interactive page.
Use **Open in new tab** to pop it out, or **Download** to save the `.html` file.

---

#### Hardware / Microcontrollers

sdev can program Arduino, ESP32, ESP8266, Raspberry Pi Pico, Teensy, and more via the `board { }` DSL. Full reference lives in **`SDEV_HARDWARE_DOCUMENTATION.md`**.

Quick blink:

```sdev
board "uno" {
  conjure setup() ::
    pin 13 be output
  ;;
  conjure loop() ::
    pin 13 write high
    wait 500
    pin 13 write low
    wait 500
  ;;
}
```

Open the IDE's Hardware panel (USB icon in the left sidebar) → **Detect Board** → **Upload**. Supports the full Arduino library ecosystem via the built-in Library Manager (backed by Arduino's official index).

Highlights added in this release:
- `board "<target>" { setup(), loop() }` blocks — targets: `uno`, `nano`, `nano-old`, `mega`, `leonardo`, `micro`, `esp32`, `esp32-s3`, `esp8266`, `pico`, `teensy41`.
- Hardware statements: `pin N be output|input|input_pullup`, `pin N write high|low`, `pin N read`, `analog N read/write`, `wait`, `wait_us`, `now()`, `serial begin/print/println/read/avail`, `tone`, `notone`, `pulsein`, `shiftout`, `attach`/`detach`.
- `use "LibraryName"` for any Arduino C++ library.
- `cpp { ... }` raw C++ escape hatch.
- Web Serial-based board detection (USB VID/PID lookup), STK500v1 flasher for AVR, `esptool-js` for ESP, UF2 drop for RP2040.
- Serial Monitor with baud selector (300 – 2 000 000).
- Library Manager mirroring `downloads.arduino.cc/libraries/library_index.json`.

##### Bytecode compiler upgrades

Shipped alongside the hardware layer:
- Proper `break` / `continue` in `cycle` (while) and `iterate` (forEach / forIn) loops via a shared `LoopContext` stack — these previously compiled to `NOP`.
- Bitwise opcodes (`BIT_AND`/`OR`/`XOR`/`NOT`/`SHL`/`SHR`) for register-level firmware work.
- Systems opcodes: `SYSCALL`, `ALLOC`, `FREE`, `HEAP_LOAD`, `HEAP_STORE`, `INTERRUPT`.
- Task opcodes: `TASK_CREATE`, `TASK_YIELD`, `TASK_KILL`.
- Binary chunk format v2: `magic "SDEV" | version | len | JSON payload` (`serializeChunk` / `deserializeChunk`).

---

*This documentation covers sdev version 1.x. For the latest updates and additional examples, visit the sdev IDE.*



---

#### Text-Tooling Functions

Added so programs that read and rewrite code (like sdev's own understander, `lang/agent/understander.sdev`) can be written in sdev. Identical in the JavaScript and Python interpreters.

| Function | Result |
|---|---|
| `lines(t)` / `unlines(list)` | split text into lines / join lines with newlines |
| `words(t)` | split on whitespace, no empty items |
| `char_at(t, i)` / `code_at(t, i)` | character / code point at `i` (`""` / `-1` when out of range) |
| `find_from(t, sub, from)` / `find_last(t, sub)` | index search from a position / from the end |
| `leading_space(t)` | the indentation at the start of `t` |
| `is_letter(t)` `is_digit(t)` `is_space(t)` `is_name(t)` | character-class tests (Unicode letters) |
| `regex_test(t, p, flags?)` | does the pattern match (flags: `i`, `m`, `s`) |
| `regex_capture(t, p, flags?)` | `[whole, group1, …]` or `void` |
| `regex_find_all(t, p, flags?)` | every match as a list |
| `regex_replace(t, p, r, flags?)` | replace every match; `$1` refers to groups |
| `quote_text(t)` | `t` as a quoted, escaped sdev text literal |

#### The Self-Hosted Understander

The code understander now runs first as an sdev program (`lang/agent/understander.sdev`). It reads the file line by line and turns plain sentences (`print hello`, `calculate 23-21`, `set x to 5`, `add 2 to x`, `score becomes score * 2`) into canonical sdev. When it is not sure of every line, the original TypeScript understander handles the file instead, so nothing that worked before changes. Names defined in other project files can be passed in so cross-file references resolve.

##### What the self-hosted understander handles

Questions (`ask "Name?" as name`, `ask for name`, `name = ask "…"`), yes/no answers (`when hungry is yes`, `hungry is yes:`), typed numbers (answers used in maths become numbers), placeholders (`say "Hello, [name]!"`), counted loops (`say hi 3 times`, `repeat 3 times`, `count from 0 to 10 by 5`, `print numbers from 3 to 1`, `count to 5`), conditions with automatic block closing, side-by-side text (`say "Hi " name`), and dialect words.

#### sdev:ai — the dialect for AI models

Start a file with `!#ai`. Every statement says what it is in its first token, blocks always use `{ }`, and the operators are the ones models already know — fewer tokens, no guessed indentation, no forgotten closings. It is translated to canonical sdev by `lang/agent/ai-dialect.sdev` (written in sdev) before it runs, and canonical sdev can be turned back into it.

| sdev:ai | canonical sdev |
|---|---|
| `v x = 5` | `forge x be 5` |
| `x = x + 1` | `x be x + 1` |
| `p(x)` | `speak(x)` |
| `f add(a, b) {` … `r a + b` … `}` | `conjure add(a, b) ::` … `yield a + b` … `;;` |
| `? x > 3 {` / `} :? x > 1 {` / `} : {` | `ponder x > 3 ::` / `;; otherwise ponder x > 1 ::` / `;; otherwise ::` |
| `w i < 3 {` | `cycle i < 3 ::` |
| `each n in xs {` | `iterate n through xs ::` |
| `try {` / `} catch e {` | `attempt ::` / `;; rescue e ::` |
| `brk` / `next` | `yeet` / `skip` |
| `==` `!=` `&&` `\|\|` `!` `true` `false` `null` | `equals` `differs` `also` `either` `isnt` `yep` `nope` `void` |

```sdev
!#ai
f add(a, b) {
  r a + b
}
v x = add(2, 3)
? x == 5 {
  p("five")
} : {
  p("not five")
}
```

##### Requests in plain words

A file that is a request — "make a window that is a calculator", "build a quiz game" — is not repaired line by line; the AI writes the whole working program (windows, buttons and inputs use the window toolkit). `evaluate("7 + 8 * 2")` safely computes arithmetic held in text, which is what calculators need. It works the same in the JavaScript and Python versions.


---

#### 28. Multi-Language Parity & Modern Extensions

SDEV includes standard library extensions bringing complete parity with SQL, Kotlin, Rust, and C/C++:

##### 28.1 Relational SQL Engine
Query lists of records with declarative SQL semantics:

```sdev
forge users be [
  { id: 1, name: "Alice", role: "admin", age: 30 },
  { id: 2, name: "Bob", role: "user", age: 22 },
  { id: 3, name: "Charlie", role: "user", age: 35 }
]

forge filtered be sql_where(users, (u) -> u["age"] >= 25)
forge projected be sql_select(filtered, ["id", "name"])
forge sorted be sql_order_by(projected, "name", true)

speak("Count: {sql_count(filtered)}")
speak("Average Age: {sql_avg(users, 'age')}")
```

##### 28.2 Kotlin & C# Null-Safety
```sdev
# Elvis / Null-coalescing
forge port be coalesce(null, 8080) # 8080

# Safe navigation
forge email be safe_get(user, "email", "default@test.com")

# Immutable record copying
forge updated be copy_record(user, { role: "superadmin" })
```

##### 28.3 Rust Monadic Types (Option & Result)
```sdev
# Option
forge opt be Some(10)
forge doubled be map_some(opt, (x) -> x * 2) # Some(20)
forge val be unwrap_or(None(), 99)           # 99

# Result
forge res be Ok(50)
forge mapped be map_ok(res, (x) -> x + 50)   # Ok(100)
```

##### 28.4 Systems Low-Level Arena Memory (C / C++)
```sdev
forge a be arena_create(128)
forge ptr be arena_alloc(a, 4)
mem_poke_u8(a, ptr, 255)
mem_poke_i16(a, ptr + 1, 1024)
mem_poke_i32(a, ptr + 3, 123456)

speak(mem_peek_u8(a, ptr))
speak(mem_peek_i16(a, ptr + 1))
speak(mem_peek_i32(a, ptr + 3))
```

---


## Part III — The complete narrative guide


### Complete documentation (architecture to evolution loop)

_Source: `public/SDEV_FULL_DOCUMENTATION.md`_


Everything sdev is, in one document: the language, both runtimes, the
self-hosted compiler, the native assembly backend, the desktop IDE, the
machine-learning stack, the acceleration layers, and the autonomous
evolution loop.

Created by **Sava Milanov**. This document is the single source of truth
that ties together all of the focused guides:

| Focused guide | Covers |
| --- | --- |
| `SDEV_DOCUMENTATION.md` | v1 language reference |
| `SDEV_V2_DOCUMENTATION.md` | v2 "Prism" beginner surface |
| `SDEV_INTERNALS.md` | Compiler, VM, bootstrap, native backend |
| `SDEV_ML_DOCUMENTATION.md` | Tensors, autograd, nn, transformers, data |
| `SDEV_FFI_DOCUMENTATION.md` | Native library binding |
| `SDEV_WEBGPU_DOCUMENTATION.md` | Browser GPU compute |
| `SDEV_CUDA_DOCUMENTATION.md` | cuBLAS fast path |
| `SDEV_AUTOEVOLVE_DOCUMENTATION.md` | Self-modification loop |
| `SDEV_LEAFLET_DOCUMENTATION.md` | Mapping / GIS DSL |
| `SDEV_HARDWARE_DOCUMENTATION.md` | Boards and firmware |

---

#### 1. What sdev is

sdev is a programming language with a deliberately unfamiliar surface
syntax. It does not borrow keywords from Python, JavaScript, Go, or C.
Declaration is `forge`, assignment is `be`, functions are `conjure`,
returning is `yield`, blocks open with `::` and close with `;;`.

```sdev
conjure fib(n) ::
    either n < 2 :: yield n ;;
    yield fib(n - 1) + fib(n - 2)
;;

forge i be 0
cycle i < 10 ::
    speak(fib(i))
    be i be i + 1
;;
```

There are two surface dialects:

- **v1** — the full professional language (`forge`, `conjure`, `::`/`;;`,
  classes, dict "tomes", the whole standard library). Everything in the
  ML stack is written in v1.
- **v2 "Prism"** — a beginner-first surface (`set … to`, `say`,
  `if/else/end`, `for each … in … end`) implemented in
  `lang/runtime/v2.js` as dependency-free plain JavaScript.

Pick per file with a shebang, or globally with
`localStorage.sdev_runtime = "v2"`:

```
#!sdev v1
forge x be 10
speak(x)
```

```
#!sdev v2
set x to 10
say x
```

`src/lang-bridge/bridge.ts` is the only TypeScript left in the v2
execution path; it chooses the runtime and delegates.

---

#### 2. Language reference (v1)

##### 2.1 Values

| Kind | Literal | Notes |
| --- | --- | --- |
| Number | `42`, `3.14`, `1e-9` | IEEE-754 doubles |
| String | `"hello"` | Immutable, `+` concatenates and coerces |
| Boolean | `yep` / `nope` | |
| Nothing | `void` | Missing tome keys also read as `void` |
| List | `[1, 2, 3]` | Reference type |
| Tome (dict) | `{ a: 1, "b": 2 }` | `{ }` is *only* dict literals |
| Function | `conjure` / `(x) -> expr` | Closures capture lexically |
| Class instance | `new Name(args)` | |

##### 2.2 Statements

```sdev
forge x be 10            // declare
be x be x + 1            // assign (stdlib dialect)
set x to 11              // assign (alternate form)
set tome["k"] to 5       // index assign
set obj.field to 5       // member assign
```

##### 2.3 Control flow

```sdev
either cond ::
    speak("yes")
;; otherwise ::
    speak("no")
;;

ponder cond :: ... ;;            // classic if
cycle i < 10 :: ... ;;           // while
iterate i through 0, 10 :: ... ;;// counted for
each item in list :: ... ;;      // for-each
```

`either` doubles as the short-circuit OR operator inside an expression;
as a statement head it is a guard. `also` is AND, `isnt` is NOT,
`equals` / `differs` are deep equality.

##### 2.4 Functions and classes

```sdev
conjure area(w, h) :: yield w * h ;;
forge double be (x) -> x * 2

class Point ::
    forge x be 0
    forge y be 0
    conjure move(self, dx, dy) ::
        set self.x to self.x + dx
        set self.y to self.y + dy
    ;;
;;

forge p be new Point(1, 2)
p.move(3, 4)
```

##### 2.5 Operator precedence (low → high)

ternary `? :` → `either` → `also` → equality (`equals`, `differs`, `<>`)
→ comparison → additive → multiplicative → power `^` (right-assoc) →
unary (`-`, `isnt`) → call / index / member → primary.

##### 2.6 Modules

```sdev
link "math.sdev"                 // inline
link "math.sdev" as math         // inline + prefix names with math_
link add, sub from "math.sdev"   // sugar for the inline form
summon "GIST_ID"                 // fetch a GitHub Gist package
```

The linker resolves names case-insensitively, supports nesting, and
reports cycles with a clear error.

##### 2.7 Standard library highlights

- **I/O** — `speak`, `whisper`, `shout`, `input`
- **Types** — `essence`, `morph`, `str`
- **Math** — `root`, `ground`, `elevate`, `magnitude`, `ln`, `exp`,
  `cos`, `rand`, `PI`, `TAU`, `E`, `INFINITY`
- **Collections** — `measure`, `gather`, `pluck`, `sort`, `sift`, `each`,
  `fold`, `find`, `sum`, `reverse`, `unique`, `join`, `split`,
  `tome_keys`
- **Strings/bytes** — `ord(s, i)`, `chr(n)`, regex, base conversion
- **Host** — `read_file`, `write_file`, `http_get`
- **Graphics** — canvas + turtle (`canvas`, `rect`, `circle`, `hue`, …)
- **UI** — `app`, `button`, `slider`, `label`, …
- **Web** — one builtin per HTML5 tag, `style`, `on`, `page()`
- **Matrix** — transpose, multiply, determinant, inverse
- **FFI/GPU** — see sections 6–8

---

#### 3. Architecture: two tracks

sdev deliberately runs on two independent execution tracks.

```text
          ┌──────────────── Track A: browser ────────────────┐
source ─► lexer ─► parser ─► interpreter ──────► IDE panels
                         └─► compiler ─► bytecode ─► seed VM (WASM)

          ┌──────────────── Track B: native ─────────────────┐
source ─► lexer ─► parser ─► codegen-x64 ─► .s ─► as/ld ─► binary
```

**Track A (browser IDE)** runs entirely on WebAssembly. The hand-written
seed VM lives in `lang/bootstrap/seed.wat`, and `lang/bootstrap/compile.mjs`
is the bootstrap compiler that feeds it.

**Track B (native)** emits real x86-64 GAS/AT&T assembly — not WASM —
for Linux and macOS:

- `lang/native/codegen-x64.mjs` — instruction selection and emission
- `lang/native/runtime.s` — the assembly runtime (entry, syscalls, heap)
- `lang/native/link.mjs` — assembles and links with the system toolchain
- `scripts/sdev-native.mjs` — the CLI driver
- `scripts/test-native.mjs` — the regression suite

```bash
node scripts/sdev-native.mjs build program.sdev -o program
./program
```

---

#### 4. The seed VM and bootstrap compiler

The seed VM is a small stack machine written by hand in WebAssembly text
format. It grew milestone by milestone:

| Milestone | Capability added |
| --- | --- |
| M1–M2 | Arithmetic, globals, jumps |
| M3 | Call frames and recursion — `CALL`, `RET`, `ENTER`, `LOAD_LOC`, `STORE_LOC` |
| M4 | Heap, lists, strings — `ALLOC`, `NEWLIST`, `LGET`, `LSET`, `LEN`, `STRCAT` |
| M5a | Byte primitives — `ord`, `chr`, `str` |
| M5b | `LNEW` + `mklist` builtin |
| M6 | Boxed `f64` floats — 15 float opcodes plus host math imports |
| M7 | Host-mediated I/O — `READFILE`, `WRITEFILE`, `HTTPGET` |
| M5n | Widened VM and constant-pool regions for large sources |

The bootstrap compiler `lang/bootstrap/compile.mjs` is a two-pass emitter
(pass 1 resolves labels and symbol tables, pass 2 emits bytes) producing a
`{ bytecode, stringPool }` pair.

Host I/O is provided by the embedder: Node uses `fs` and `curl`; the
browser falls back to `localStorage` and `XMLHttpRequest`.

---

#### 5. The self-hosted compiler

sdev compiles sdev. `lang/compiler/` contains the pipeline written
entirely in sdev:

- `lexer.sdev` — tokenizer
- `parser.sdev` — precedence-climbing parser producing the AST
- `codegen.sdev` — two-pass bytecode emitter with a shared string pool
- `compile-self.mjs` — Node shim that drives the sdev codegen through the
  seed VM

##### 5.1 Fixed point

The milestone sequence 5c → 5n drove the compiler to a **byte-identical
fixed point**: compiling the compiler with itself produces the exact same
bytes as the JavaScript bootstrap.

```bash
node bin/sdevhost.mjs scripts/test-self-toolchain.sdev
# ✓ lang/compiler/lexer.sdev:   byte-identical  (bc=746,  pool=41)
# ✓ lang/compiler/parser.sdev:  byte-identical  (bc=380,  pool=38)
# ✓ lang/compiler/codegen.sdev: byte-identical  (bc=5730, pool=136)

node scripts/test-shim-fixed-point.mjs
# ✓ shim fixed-point: 43/43 cases byte-identical
```

Reaching that point required forward references, return-type tracking,
modulo, expression-statements, and a shared string pool between passes.

---

#### 6. Machine learning stack

Every module below is written in sdev and runs on sdev. Nothing is
implemented in TypeScript or Python.

##### 6.1 `tensor.sdev` — the core

A tensor is a tome:
`{ data: [f64…], shape: [int…], grad: [f64…] | void, requires_grad: bool }`.

| Function | Purpose |
| --- | --- |
| `tensor(data, shape)` / `tensor_grad(data, shape)` | Construct |
| `zeros(shape)` / `ones(shape)` / `randn(shape)` | Fill (Box–Muller normals) |
| `t_add` `t_sub` `t_mul` `t_scale` | Element-wise |
| `matmul(a, b)` | 2-D matrix multiply |
| `relu` `sigmoid` `softmax` | Activations |
| `mse` `cross_entropy` | Losses |

```sdev
link "stdlib/ml/tensor.sdev"
forge a be tensor([1.0, 2.0, 3.0, 4.0, 5.0, 6.0], [2, 3])
forge b be tensor([1.0, 0.0, 0.0, 1.0, 1.0, 1.0], [3, 2])
speak(matmul(a, b).data)      // 4, 5, 10, 11
```

##### 6.2 `autograd.sdev` — reverse-mode differentiation

A global tape records differentiable ops. `backward(y)` walks it in
reverse and accumulates into each tensor's `grad`.

```sdev
tape_reset()
forge x be tensor_grad([3.0], [1, 1])
forge y be d_mul(x, x)
backward(y)
speak(x.grad[0])              // 6
```

##### 6.3 `nn.sdev` — layers and training

`linear(in, out)`, `relu_layer()`, `sequential(layers)`,
`seq_forward(layers, x)`, `train_step(model, x, y, lr)`,
`fit(model, xs, ys, epochs, lr)`.

```sdev
forge model be sequential([linear(4, 16), relu_layer(), linear(16, 1)])
fit(model, xs, ys, 100, 0.01)
```

##### 6.4 `transformer.sdev` — decoder-only LMs

`embedding`, `layer_norm`, `attention_head`, `attn_forward`,
`transformer_block`, `gpt(vocab, dim, hidden, layers)`, `gpt_forward`,
`sample_next(logits)`, `generate(model, prompt_ids, max_new)`.

```sdev
forge m be gpt(256, 64, 128, 2)
forge out be generate(m, encode(vocab, "hello"), 64)
speak(decode(vocab, out))
```

##### 6.5 `data.sdev` — datasets, the web, distillation

`load_text` / `save_text`, `char_vocab(text)`, `encode` / `decode`,
`crawl(url)` / `crawl_many(urls)`, `teacher_query(endpoint, key, prompt)`,
`distill_batch(endpoint, key, prompts)`, `save_model(path, model)`.

`teacher_query` lets a stronger model (for example through the Lovable AI
gateway) generate the supervision signal for a local sdev model.

---

#### 7. FFI and native acceleration

`lang/stdlib/ffi.sdev` binds C-ABI shared libraries.

```sdev
link "stdlib/ffi.sdev"
forge lib be library("/usr/lib/libopenblas.so")
forge gemm be bind(lib, "cblas_dgemm", "void", ["i32", "ptr", "ptr", "ptr"])
invoke(gemm, [ ... ])
```

Host primitives: `ffi_open`, `ffi_sym`, `ffi_call`, `ffi_close`,
`ffi_buf`, `ffi_read_f64` / `ffi_write_f64`, `ffi_read_i32` /
`ffi_write_i32`. Typed buffers (`buf_f64`) shuttle large arrays without
per-element heap boxing.

Buffers work everywhere, including the browser. Library loading requires
a native host; without one `ffi_open` returns `void`, so guarded sdev code
falls back to the pure-sdev path instead of crashing.

Convenience wrappers: `blas_matmul(...)` and `open_cuda(...)`.

---

#### 8. GPU acceleration

##### 8.1 WebGPU (browser)

`lang/stdlib/webgpu.sdev` wraps the host `__wgpu_*` calls: adapter
probing, device init, buffer upload/download, a WGSL shader cache, and
tuned `matmul`, `add`, and `relu` kernels. A heartbeat detects device
loss and falls back to CPU.

##### 8.2 CUDA (native)

`lang/stdlib/ml/cuda.sdev` rides the FFI layer onto cudart + cuBLAS:
`cuda_device(...)`, `cuda_device_default()`, `cuda_alloc`, `cuda_upload`,
`cuda_download`, `cuda_matmul` (via `cublasDgemm`), `cuda_report`.

`best_matmul(dev, blas, a, b)` picks the fastest available path:

```text
CUDA  →  BLAS  →  pure-sdev CPU
```

When no driver is present, `cuda_device_default().ok` is `nope` and the
chain degrades silently.

---

#### 9. Self-modification and autonomous evolution

##### 9.1 `self_modify.sdev`

Gated APIs for a model to read and rewrite sdev's own source:
`self_read(path)`, `self_propose(path, body)`, `set_review_hook(fn)`,
plus feature-demand mining and weight surgery.

**Writes are refused until a review hook is installed.** That is the one
gate protecting the entire pipeline.

##### 9.2 `auto_evolve.sdev`

The loop: mine demand → draft a patch → review → apply → fine-tune.

| Function | Purpose |
| --- | --- |
| `is_allowed(path)` | Whitelist check against `SDEV_SOURCE_FILES` |
| `make_proposal(path, old, new_body, reason)` | Patch record |
| `apply_proposal(p)` | Route through the review hook and write |
| `draft_from_demand(model, demand, path)` | Model rewrites a file toward the top topic |
| `evolve_weights(model, url, key, prompts, epochs, lr)` | Distill and SGD-step |
| `evolve_tick(...)` / `evolve_forever(...)` | One tick / long-running driver |

Routing: `parse*` → `parser.sdev`, `lex*` → `lexer.sdev`, `doc*` →
`SDEV_DOCUMENTATION.md`, everything else → `nn.sdev`.

```sdev
link "stdlib/ml/auto_evolve.sdev"
set_review_hook(conjure(path, body) :: yield confirm("Apply " + path + "?") ;;)
evolve_forever(model, sources, "https://ai.gateway.lovable.dev/v1/chat", "$KEY", 24)
```

Two independent barriers: the path whitelist runs *before* the hook, and
the hook must explicitly return `yep`.

---

#### 10. Tooling and distribution

| Surface | Where |
| --- | --- |
| Browser IDE | `src/pages/IDE.tsx` — editor, terminal, canvas, app and web preview, problems panel, command palette |
| Playground | `src/pages/Index.tsx` — shareable `?code=` links |
| Desktop IDE | `electron/main.cjs` + `preload.cjs`, with Build Native / Run Native IPC |
| VS Code extension | `extension/` — grammar, snippets, bundled interpreter |
| npm CLI | published via `.github/workflows/npm-publish.yml` |
| Windows installer | standalone batch installer with bundled editor |
| Single-file HTML | `public/sdev-interpreter.js` |
| Gist packages | `summon "GIST_ID"` |
| 26-language keyword translator | `src/lang/translator.ts`, 500+ mappings |

---

#### 11. Test suites

```bash
node scripts/test-wasm-runtime.mjs      # seed VM opcodes
node scripts/test-native.mjs            # x86-64 backend
node scripts/test-self-lexer.mjs        # self-hosted lexer vs JS reference
node scripts/test-self-parser.mjs       # self-hosted parser
node scripts/test-self-codegen.mjs      # self-hosted codegen
node bin/sdevhost.mjs scripts/test-self-toolchain.sdev    # byte-identity across the toolchain
node scripts/test-shim-fixed-point.mjs  # 43-case fixed-point suite
bunx tsx scripts/test-ml-stdlib.ts      # ML stack executed end to end
bunx tsx scripts/test-translator.ts     # 26-language translation
```

`test-ml-stdlib.ts` runs real programs — matmul, the gradient of x²,
a linear layer whose loss must decrease, tokenizer round-trip, softmax
summing to 1, a GPT forward pass with the right logits shape, generation
length, the self-modification gate, the evolution whitelist, and graceful
accelerator fallback.

---

#### 12. Milestone history

| # | Milestone |
| --- | --- |
| 1 | v2 "Prism" runtime in pure JS; lang-bridge |
| 2 | Bootstrap scaffolding: seed WASM, compiler skeleton |
| 3 | Call frames and recursion in the seed VM |
| 4 | Heap, lists, string concatenation |
| 5a–5b | Byte primitives; `mklist`; self-hosted lexer |
| 5c–5g | Self-hosted parser, codegen, globals, control flow, functions |
| 5h–5n | Semantic then byte-identical fixed point; compile-self shim; widened regions |
| 6 | Boxed f64 floating point |
| 7 | Host file I/O and networking |
| 8 | ML stdlib: tensor, autograd, nn, transformer, data, self_modify |
| 9 | FFI with BLAS/cuBLAS wrappers |
| 10 | WebGPU acceleration |
| 11 | CUDA fast path |
| 12 | Autonomous evolution loop |
| 13 | ML host bindings; the stack actually executes on the interpreter |
| 14 | LM training: softmax cross-entropy autograd, Adam + clipping, top-k sampling, checkpoints (`train.sdev`) |

Alongside those: the native x86-64 track, the Electron desktop IDE, the
launch site and carousel, and the two-minute Remotion pitch video.

---

#### 13. Design principles

1. **Radically unique syntax.** `forge`, `be`, `conjure`, `::`/`;;`.
   Never converge on Python or JavaScript spelling.
2. **Two runtimes, strict parity.** Browser WASM and native assembly must
   behave identically.
3. **Self-hosting is the proof.** Byte-identical fixed point or it does
   not count.
4. **Written in sdev.** The ML stack, the compiler, and the evolution loop
   are sdev programs — not host-language libraries with an sdev veneer.
5. **Degrade, never crash.** Absent GPU, driver, network, or file system,
   every layer falls back to a pure-sdev path.
6. **Self-modification is gated by default.** Whitelist first, human
   review hook second.

---


## Part IV — Implementation internals


### Compiler, VM, kernel and roadmap internals

_Source: `public/SDEV_INTERNALS.md`_


This is a contributor document. If you just want to write SDEV, read
`SDEV_V2_DOCUMENTATION.md` instead.

#### Two backends, one language

SDEV ships **two** code-generators from the same parser:

| Target        | Backend                     | Runs where                | Emits              |
| ------------- | --------------------------- | ------------------------- | ------------------ |
| **Web IDE**   | `lang/bootstrap/` (WAT seed VM) | Any browser              | WebAssembly bytecode |
| **Desktop**   | `lang/native/codegen-x64.mjs` | Linux/macOS CLI          | x86-64 GAS assembly → ELF |

The browser can only execute JS and WASM, so the web IDE stays on
WebAssembly — the browser's *native* assembly. For an actual on-disk
executable you can `objdump -d` and `strace`, use the native backend
(`node scripts/sdev-native.mjs prog.sdev -o prog`). Both backends share
the same lexer, parser, and language semantics.


#### Where we are today

**Milestone 1 (launch) — shipped:**
- `lang/runtime/v2.js` — full v2 language in pure JavaScript (zero TypeScript
  in the language execution path).

**Milestone 2 (WASM stage-0) — shipped:**
- `lang/bootstrap/seed.wat` — hand-written WebAssembly Text stack VM,
  compiled to `public/wasm/sdev-seed.wasm`.
- `lang/bootstrap/compile.mjs` — bootstrap compiler: SDEV v2 source → VM
  bytecode.
- `src/lang-bridge/wasm-runtime.ts` — browser loader with automatic JS
  fallback for out-of-subset features.

**Milestone 3 (call frames + recursion) — shipped:**
- Seed VM expanded with five new opcodes: `CALL`, `RET`, `ENTER`,
  `LOAD_LOC`, `STORE_LOC`. Proper call-stack with per-frame return IP,
  saved FP, and per-frame locals — full recursion and mutual recursion.
- Bootstrap compiler upgraded to a two-pass emitter with a symbol table
  (globals vs locals), function decls (`to name with p1 p2 … end`),
  `return`, and both `fn(a, b)` and `fn with a b` call forms.

**Milestone 4 (heap, lists, string manipulation) — shipped:**
- Seed VM memory grown to 4 pages (256 KiB) with a bump-pointer heap at
  `0x10000..0x40000`. New opcodes: `POP`, `ALLOC`, `NEWLIST`, `LGET`,
  `LSET`, `LEN`, `STRCAT`. Lists are heap blocks laid out as
  `[u32 length | u32 items…]`; dynamic strings use the same
  `[u32 length | utf-8 bytes]` shape as the interned pool, so `SAY_STR`
  handles both transparently.
- Bootstrap compiler grew list literals `[a, b, c]`, index reads
  `xs[i]`, index assignment `set xs[i] to v`, per-scope type tracking,
  and two polymorphic builtins: `length(x)` (lists or strings) and
  `concat(a, b)`. The `+` operator promotes to `STRCAT` when either
  operand is string-typed.
- `scripts/test-wasm-runtime.mjs` now covers 10 programs including
  list-sum loops, in-place mutation, and multi-way string concat. All
  pass entirely inside WAT-authored WebAssembly.

**Milestone 5a (byte-level string primitives) — shipped:**
- Seed VM gained three opcodes: `SGET` (byte read), `CHR` (byte → 1-char
  string on the heap), `I2S` (int → decimal-string on the heap). Together
  with `LEN` and `STRCAT` this is the minimum surface a self-hosted lexer
  needs to slice source text.
- Bootstrap compiler exposes them as builtins `ord(s, i)`, `chr(n)`, and
  `str(n)`. Builtins now carry a `ret` type so scope typing propagates
  string-ness through nested calls (e.g. `"n=" + str(7)` promotes `+` to
  `STRCAT`).
- Regression suite grew to 13 programs, including a byte-level uppercase
  loop that only uses `ord` + `chr` + `+` to build the result.

**Milestone 5b (self-hosted lexer) — shipped:**
- `lang/compiler/lexer.sdev` is written entirely in SDEV. It tokenizes
  integers, identifiers, string literals, single-char punctuation, and
  newlines by walking a source string byte-by-byte with `ord`/`chr`/`str`.
- New seed opcode `LNEW` (allocate zeroed n-cell list) landed in
  `seed.wat` — the parser milestone will use it for a growable token
  buffer; the lexer itself streams tokens with `say` for now.
- `scripts/test-self-lexer.mjs` runs the SDEV lexer through the WAT VM
  on 6 sample programs and diffs the token stream against a JS reference
  implementation of the same rules. All 6 match byte-for-byte. No lexer
  logic remains in JavaScript.

**Milestone 5c (self-hosted expression parser) — shipped:**
- `lang/compiler/parser.sdev` is a mutually-recursive precedence-climbing
  parser written in SDEV. It reads tokens from global buffers (`tk_kind`,
  `tk_num`, `tk_count`) that a top-level lex loop fills, and streams the
  parse in reverse-Polish form via `say`. Handles `+ - * /`, parenthesized
  sub-expressions, and correct left-associativity.
- `scripts/test-self-parser.mjs` diffs the SDEV parser's RPN against a JS
  reference on 7 expression shapes (single atom, precedence, nested
  parens, mixed operators). All match byte-for-byte.
- Together with the M5b lexer, the front-end for arithmetic expressions
  now lives entirely in SDEV — the JS bootstrap only bytes-compiles it.

**Milestone 5d (self-hosted codegen — first end-to-end) — shipped:**
- `lang/compiler/codegen.sdev` is a compiler pass written in SDEV. It
  emits real seed-VM bytecode (PUSH_I32, ADD/SUB/MUL/DIV, SAY_I32, HALT)
  into a global `bc` buffer, using `bc[0]` as the byte count so the whole
  compiler can update the count via list mutation from inside functions
  without needing global writes.
- `scripts/test-self-codegen.mjs` runs the SDEV compiler through the seed
  WASM VM on 6 source programs, harvests the emitted bytes, executes them
  in a *fresh* seed WASM instance, and diffs the output against what the
  JS bootstrap compiler produces for the same source. All 6 match.
- Bootstrap compiler tweak: `set x[i] to v` is now correctly treated as a
  mutation of an existing binding (never introduces a shadowing local),
  which unblocks self-hosted compiler passes that write into global heap
  buffers from inside functions.

**Milestone 5e (variables in the self-hosted compiler) — shipped:**
- `codegen.sdev` grew a symbol table: `sym_names` is a list whose cell 0
  holds the interned-name count and whose cells 1..count hold the names.
  A new `intern_name(name)` function returns the u8 slot index the seed VM
  uses for `LOAD` / `STORE`, adding the name on first sight. All mutation
  goes through index-assignment on `sym_names` so it survives the
  bootstrap's "plain `set` inside a function creates a fresh local" rule.
- Parser: identifier atoms emit `LOAD <slot>`; the driver recognises
  `set NAME to EXPR` and emits the expression followed by `STORE <slot>`.
- `scripts/test-self-codegen.mjs` now runs 10 cases including
  `set + read`, reused reads, an in-place accumulator, and multi-var
  expressions. Self-compiled output matches the JS bootstrap byte-for-byte
  on every one.

**Milestone 5f (control flow + comparisons) — shipped:**
- `codegen.sdev` gained a real `parse_stmt` / `parse_block` mutual-recursion
  pair. Statements now cover `say`, `set NAME to EXPR`, `if EXPR … end`,
  `if EXPR … else … end`, and `while EXPR … end`. Blocks nest arbitrarily.
- The expression grammar grew a `parse_cmp` layer: `is`, `is not`, `<`,
  `>`, `<=`, `>=` emit `EQ`/`NE`/`LT`/`GT`/`LE`/`GE`. The driver's inline
  lexer now peeks one byte ahead to fold `<=` / `>=` into single tokens
  (sentinel punctuation codes 300 / 301).
- Two new SDEV helpers, `placeholder16` and `patch_i16`, handle forward
  and backward `JZ`/`JMP` offsets — including proper two's-complement
  encoding for negative offsets that back-edges of `while` loops need.
- `scripts/test-self-codegen.mjs` grew to 21 cases: comparisons in every
  direction, `if`/`else` with both branches, `while` counting and
  summation, and nested `if` inside `while` (a fizzbuzz-flavoured shape).
  Every case matches the JS bootstrap byte-for-byte.

**Milestone 5g (functions in the self-hosted compiler) — shipped:**
- `codegen.sdev` gained function declarations (`to NAME with p1 p2 …
  end`), `return EXPR?`, and call-syntax atoms (`NAME(a, b)`).
- Function bodies are emitted inline, bracketed by a `JMP` that skips
  over them so top-level flow doesn't fall in. Each body's byte offset,
  arity, and name go into three parallel global tables
  (`fn_names` / `fn_offsets` / `fn_arities`) so subsequent `CALL` sites
  resolve directly — no patch pass yet, so callers must appear after
  their callee. Recursive `fact` / `fib` work because a function can
  call itself once its own offset has been recorded.
- Locals get their own scope: a per-function `loc_names` list is reset
  on every `to`, params occupy slots 0..n-1, and any `set NAME` inside
  the body allocates a fresh local slot. `emit_load_ident` /
  `emit_store_ident` dispatch to `LOAD_LOC` / `STORE_LOC` while
  `in_func[0]` is 1 and fall back to the global table otherwise.
- Six builtins compile to single opcodes: `length` → `LEN`,
  `concat` → `STRCAT`, `ord` → `SGET`, `chr` → `CHR`, `str` → `I2S`,
  `mklist` → `LNEW`.
- `scripts/test-self-codegen.mjs` grew to 31 cases covering zero/one/two
  argument functions, functions using locals + `while` loops, functions
  calling other functions, recursive factorial, recursive `fib(10)`, and
  the `mklist`/`length` builtins. Every case matches the JS bootstrap
  byte-for-byte.

**Milestone 5h (strings, lists, and indexing in the self-hosted compiler) — shipped:**
- `codegen.sdev` grew expression-type tracking: a global `expr_type[0]`
  set by every parse_* to 0 (int) or 1 (str). Two parallel tables,
  `sym_types` and `loc_types`, remember the type of every stored global
  and local so later loads restore it. `say` now picks `SAY_I32` vs
  `SAY_STR` from `expr_type[0]`, and `+` promotes to `STRCAT` when
  either operand is string-typed.
- String literals `"…"` are compiled without a shared string pool
  (the self-hosted bytecode runs in a fresh WASM instance with an empty
  pool). Each literal is built at runtime as `LNEW(0)` + one
  `PUSH_I32 c; CHR; STRCAT` per byte, yielding a heap-string block that
  `SAY_STR` handles transparently. Empty strings compile to a bare
  `LNEW(0)`.
- List literals `[a, b, c]` emit each element then `NEWLIST <u16 n>`.
  Postfix indexing `x[i]` chains any number of `LGET`s after an atom via
  a new `parse_postfix` helper wired into `parse_mul`. Index assignment
  `set xs[i] to v` emits `LOAD xs; expr(i); expr(v); LSET`.
- Driver upgrades in `scripts/test-self-codegen.mjs`: the inline lexer
  now tokenizes `"…"` as string tokens (kind 3), and the driver seeds
  the new type tables. The suite grew from 31 to 43 test cases, adding
  literals, concat, `chr`/`ord`, list literals + reads, in-place list
  mutation via `set xs[i] to v`, and string-aware `+` — all match the
  JS bootstrap's output byte-for-byte.

**Milestone 5i (forward references + return types) — shipped:**
- `codegen.sdev` gained a pending-calls patch table: unresolved `CALL`s
  now emit a zero u16 target and record the patch position in two
  parallel globals (`pend_names` / `pend_pos`). After the whole program
  parses, `resolve_pending_calls` walks the table and back-patches every
  site once all `fn_offsets` are known. Forward references and mutual
  recursion (`is_even ↔ is_odd`) compile without reordering.
- Function return types are tracked in a new `fn_ret_types` table
  parallel to `fn_names`. Every `return EXPR` inside a body upgrades the
  current function's slot to `str` if the returned expression is
  string-typed; `emit_call` writes that recorded type into
  `expr_type[0]` so `say greet("world")` picks `SAY_STR` and
  `"hi " + greet(name)` promotes to `STRCAT`.
- The JS bootstrap now runs a matching fixed-point return-type inference
  pass (`inferReturnTypeOf`) before emitting bodies, so its `call`
  emitter agrees with the self-hosted compiler on every case in the
  suite — 50/50 tests pass byte-for-byte.
- `scripts/test-self-codegen.mjs` grew seven new cases: forward calls,
  forward calls inside expressions, mutual `is_even`/`is_odd` recursion,
  zero-arg string-returning fns, string-fn concat, string-fn with a
  string parameter, and a fn returning `str` down every branch.

**Milestone 5j (semantic fixed-point self-compile) — shipped:**
- `scripts/test-self-codegen.mjs` now diffs the self-hosted compiler
  against the JS bootstrap on two axes: (1) runtime output equivalence
  and (2) byte-for-byte bytecode identity. All 50/50 cases achieve
  output equivalence — the self-hosted codegen is a semantic fixed point
  of the JS bootstrap.
- Byte-for-byte identity currently holds on 2/50 trivial cases. Two
  architectural divergences account for every remaining mismatch, both
  semantics-preserving:
  - **String encoding.** The JS bootstrap folds every string literal
    into a shared string pool and emits `LSTR` (opcode `0x02`) with a
    pool index. The self-hosted compiler has no pool: literals compile
    to `LNEW(0)` plus one `LI32/CHR/STRCAT` per byte.
  - **Function placement.** The JS bootstrap pre-scans and lifts every
    `to …` definition ahead of top-level code, so a program that calls
    a function before defining it produces the same layout as one that
    defines it first. The self-hosted compiler emits in source order,
    with a `JMP` over each body where it appears; forward references
    are patched by `resolve_pending_calls` (see Milestone 5i).
- Both divergences are tracked as the "byte-identity cleanup" pass that
  precedes deletion of the JS bootstrap. Reaching byte identity requires
  either teaching the self-hosted compiler to build a string pool +
  hoist function definitions, or removing those features from the JS
  bootstrap. Milestone 5k will pick one direction and land it.

**Milestone 5k (byte-identity fixed point) — shipped:**
- `lang/compiler/codegen.sdev` now converges on the JS bootstrap's exact
  wire format. All 50/50 test cases produce byte-identical bytecode **and**
  a byte-identical string pool. The `≡` marker replaces `~` across the
  entire suite.
- Four architectural pieces landed together:
  - **Two-pass compilation.** `emit_byte` is gated on `emit_enabled[0]`.
    Pass 1 runs `parse_stmt` twice with emit disabled: it registers each
    function (name, arity, body-start token index, extras count) and lets
    `return EXPR` statements populate `fn_ret_types[i]` to fixed point.
    Pass 2 resets globals and emits for real.
  - **Function hoisting.** Pass 2 emits a leading `JMP → main`
    placeholder, then walks the registered functions in registration
    order — each body is re-parsed from `fn_body_start[i]` and emitted
    contiguously. The leading `JMP` is back-patched once every body is
    laid down, then main is emitted with `skip_fn_defs[0]=1` so
    `parse_stmt` silently consumes any `to … end` block it encounters.
  - **ENTER elision.** `fn_extras[i]` is measured during pass 1 by
    reading `loc_names[0] - n_params` after the walk. Pass 2 emits
    `ENTER extras` only when `extras > 0`, matching the JS bootstrap's
    zero-locals shortcut.
  - **Shared string pool.** New helper `intern_str(s)` builds a pool
    matching the bootstrap's `[u32 len][utf8…]` records. `parse_atom`'s
    string branch now emits `PUSH_STR` (`0x02`) + u16 pool offset
    instead of the runtime `LNEW/CHR/STRCAT` sequence. The test driver
    ingests the pool from a trailing `say` dump and installs it at
    memory offset 0 for execution.
- One `emit_call` refinement was needed for byte identity: mutually
  recursive calls (like `is_even ↔ is_odd`) can hit a callee whose
  offset is not yet set even though its name resolves. `emit_call` now
  treats any `fn_offsets[idx+1] == 0` as a deferred call and records a
  patch site; `resolve_pending_calls` fills in the u16 target after
  every body is emitted.
- `scripts/test-self-codegen.mjs` was reworked to (a) receive both a
  bytecode stream and a string pool from the codegen, (b) diff both
  against the JS bootstrap, and (c) fail on any mismatch. Its summary
  now reports `bytecode: 50/50` and `pool: 50/50`.

**Milestone 5l (self-hosted compile module surface) — shipped:**
- Introduced `lang/compiler/compile-self.mjs`, a Node module that exposes
  the SDEV-authored codegen as a plain `compile(source) -> { bytecode,
  stringPool }` function — the same shape the JS bootstrap offers. Internally
  it drives `lang/compiler/codegen.sdev` through the seed WASM VM (with the
  bootstrap used once, in-memory, only to compile the driver harness itself).
- New gate `scripts/test-shim-fixed-point.mjs` re-runs the codegen suite
  through the new module surface and asserts byte-identity against the JS
  bootstrap. Result: **43/43 cases byte-identical.**
- The JS bootstrap remains the ground truth for `test-self-lexer.mjs`,
  `test-self-parser.mjs`, and `wasm-runtime.ts` until the shim can compile
  the entire toolchain. Widening the self-hosted codegen to cover
  `lexer.sdev` / `parser.sdev` / `codegen.sdev` is Milestone 5m; only
  after that can `compile.mjs` be deleted and the runtime path fully
  rewired.

**Milestone 5m (toolchain round-trip through the shim) — partial:**
- Added a `#`-comment branch to the inline lexer in `compile-self.mjs`.
  With that single fix, the self-hosted codegen now compiles the real
  `lang/compiler/lexer.sdev` **byte-identically** to the JS bootstrap
  (`bc=746, pool=41`) and the real `lang/compiler/parser.sdev`
  **byte-identically** (`bc=380, pool=38`).
- New gate `scripts/test-self-toolchain.sdev` diffs each toolchain source
  through the shim and hard-fails on required-target mismatches. Current
  status: **lexer ✓, parser ✓, codegen ⚠** — the third one throws
  `string pool overflow` inside the JS bootstrap that compiles the shim
  driver, because embedding `codegen.sdev` itself as a `set src to "…"`
  string literal blows past the seed VM's 8 KiB pool region.
- Probe script `scripts/probe-self-lexer.sdev` reports the first diverging
  bytecode / pool offset for any input, making the next regression easy
  to bisect.

**Milestone 5n (widen seed pool / driver plumbing) — shipped:**
- Bumped `seed.wat` memory layout: string pool grew from 8 KiB to
  **64 KiB** (0x00000..0x0FFFF), and every downstream region moved up in
  lockstep — `VAR_BASE=0x10000`, `STACK_BASE=0x14000`,
  `CALL_BASE=0x18000`, `CODE_BASE=0x1C000`, `HEAP_BASE=0x30000`. Linear
  memory grew from 4 → 32 pages (256 KiB → 2 MiB) so the heap has room
  for the driver's larger scratch lists. u16 `PUSH_STR` offsets still
  fit (max 0xFFFF) so no opcode changes.
- Bumped the bootstrap emitter's compile-time pool buffer in lockstep
  (`lang/bootstrap/compile.mjs`: `0x2000 → 0x10000`) so it can intern
  the ~21 KiB `codegen.sdev` source literal that the shim driver embeds.
- Widened the driver's inline scratch lists in `compile-self.mjs`
  (`tk_kind/tk_num/tk_txt` 2000 → 20000, `bc` 16384 → 65536,
  `pool_bytes` 8192 → 32768) so the self-hosted codegen can process a
  20 KiB+ source without silently overflowing heap allocations.
- Result: `test-self-toolchain.mjs` now runs codegen.sdev through the
  shim end-to-end without throwing. Lexer + parser still byte-identical
  (`bc=746/pool=41`, `bc=380/pool=38`); codegen.sdev now diverges
  *semantically* (self=486B / ref=5620B) — function bodies aren't being
  emitted — instead of failing at the seed VM boundary. That's the
  Milestone 5o gap, not 5n's.

**Milestone 5o (self-hosted codegen self-compile) — shipped:**
- Diagnosed the 486 B divergence: `codegen.sdev`'s own parser was
  missing two things it needed to parse itself. First, `parse_mul` did
  not recognize `%` (MOD, opcode `0x14`), so `emit_i32`'s body — which
  chains `v % 256` twice — halted mid-function. Second, `parse_stmt`
  had no expression-statement fallthrough, so bare calls like
  `emit_byte(x)` (used ~200 times throughout the compiler) fell through
  every keyword branch and returned `pos` unchanged, stopping the pass-1
  walk at the first such call.
- Fixed both: `parse_mul` now emits opcode `0x14` on `%`, and
  `parse_stmt` finishes with an "identifier ⇒ parse expression + POP"
  branch that mirrors `exprStmt` in the JS bootstrap. Both changes are
  strict supersets — no existing case regresses.
- Result: `test-self-toolchain.mjs` now reports **codegen.sdev
  byte-identical (bc=5730, pool=136)** through the shim. All three
  toolchain sources (lexer, parser, codegen) round-trip byte-for-byte
  through the self-hosted compiler.

(Milestone 5p — retiring the JS bootstrap — is documented after Milestone 14,
in milestone order.)



**Milestone 6 (floats + math opcodes) — shipped:**
- **Representation:** boxed f64. A float lives on the heap as an 8-byte
  cell; the stack cell holds the pointer. Existing i32 opcodes are
  untouched, so int-only programs pay zero cost.
- **New seed opcodes** (`seed.wat`):
  `PUSH_F64 0xA0` (with 8-byte little-endian payload),
  `FADD/FSUB/FMUL/FDIV 0xA1..0xA4`,
  `FLT/FGT/FEQ 0xA5..0xA7` (result is i32 boolean),
  `I2F/F2I 0xA8..0xA9`, `FNEG/FABS/FSQRT 0xAA..0xAC`,
  `SAY_F64 0xAD`, and `FMATH 0xAE <u8 op>` for transcendentals
  (`0 sin, 1 cos, 2 tan, 3 exp, 4 log, 5 pow`).
- **Two new host imports:** `env.host_say_f64(f64)` and
  `env.host_fmath(op:i32, a:f64, b:f64) -> f64`. Every wrapper
  (`wasm-runtime.ts`, all test scripts, and `compile-self.mjs`) provides
  them; the JS side delegates to `Math.sin/cos/tan/exp/log/pow`.
- **Compiler (`compile.mjs`):**
  - Tokenizer now flags any number containing `.` as `isFloat`; the
    bootstrap parser turns those into `fnum` AST nodes and emits
    `PUSH_F64` with the correct 8-byte payload.
  - Mixed-type arithmetic requires an explicit `i2f()` / `f2i()`
    coercion — codegen is single-pass, so we can't retroactively
    promote the already-emitted left operand. If BOTH sides are
    `float`, `+ - * /` become `FADD/FSUB/FMUL/FDIV` and `< > is`
    become `FLT/FGT/FEQ`.
  - `say <float>` picks `SAY_F64` automatically via the same
    type-tracking used for `SAY_STR`.
  - `inferReturnTypeOf` learned about `float`, so a function that
    returns `2.5 + x` propagates its float type across call sites.
- **New builtins:** `i2f, f2i, fneg, fabs, fsqrt` (single-opcode) and
  `fsin, fcos, ftan, fexp, flog, fpow` (via `FMATH`).
- **Tests:** `test-wasm-runtime.mjs` grew 5 float cases (literals +
  arithmetic; `fsqrt/fabs/fneg`; `i2f/f2i` round-trip; comparisons;
  transcendentals). Full self-hosted toolchain still 100%
  byte-identical — 50/50 codegen, 6/6 lexer, 7/7 parser.
- **Why boxed and not stack-widened:** every existing opcode
  (LOAD/STORE, JZ, CALL frames, list cells, string handles, etc.)
  assumes 4-byte stack slots. Widening the operand stack to 8 bytes
  would touch every dispatch arm and every codegen path in
  `lang/compiler/codegen.sdev`. Boxing pays one heap allocation per
  produced float in exchange for a strictly additive change — this
  is the correct trade-off for a bootstrap VM. If tensor math shows
  it's a bottleneck, the ML stdlib will store contiguous `f64`
  buffers directly on the heap (as list-of-bytes) and index them via
  new `TENSOR_*` opcodes, bypassing per-value boxing entirely.

**Milestone 7 (file I/O + networking) — shipped:**
- Host imports for `read_file`, `write_file`, and `http_get(url) → text`.
- In the browser these are stubs (sync HTTP is unavailable in-page) and
  return `void`; the Node/Electron and Native tracks do the real work.
- This is what lets the ML stack read a corpus, write checkpoints, and
  crawl training data without leaving sdev.

**Milestone 8 (ML stdlib — tensors + autograd) — shipped:**
- `lang/stdlib/ml/tensor.sdev`: flat `data` + `shape` tensors, element-wise
  ops, `matmul`, `transpose`, `softmax`, `cross_entropy`.
- `lang/stdlib/ml/autograd.sdev`: reverse-mode AD over a global tape
  (`record` / `backward`), rules for `add`, `mul`, `matmul`, `relu`, `mse`.
- `lang/stdlib/ml/nn.sdev`: `linear`, `sequential`, parameter collection,
  `sgd_step`.

**Milestone 9 (FFI) — shipped:**
- `lang/stdlib/ffi.sdev` plus a host bridge in `src/lang/builtins.ts`:
  `ffi_buf`, `ffi_write_f64`, `ffi_read_f64` are pure JS (`DataView`) so
  they work in the browser; `ffi_open` / `ffi_sym` / `ffi_call` /
  `ffi_close` are gated to native hosts and degrade gracefully.
- Targets OpenBLAS and cuBLAS symbol signatures for `matmul` fast paths.

**Milestone 10 (WebGPU) — shipped:**
- `lang/stdlib/webgpu.sdev` dispatches tensor kernels through
  `navigator.gpu` when present, falling back to the scalar path otherwise.

**Milestone 11 (CUDA) — shipped:**
- `lang/stdlib/ml/cuda.sdev` binds cuBLAS through the M9 FFI layer.
  `cuda_device_default()` reports availability instead of crashing, so the
  same program runs on a laptop and on a GPU box.

**Milestone 12 (transformers, data, self-modification) — shipped:**
- `transformer.sdev`: `embedding`, `layer_norm`, `attention_head`,
  `transformer_block`, `gpt(vocab, dim, hidden, layers)`, `generate`.
- `data.sdev`: `char_vocab` / `encode` / `decode`, corpus loading, web
  crawling, and teacher-model distillation helpers.
- `self_modify.sdev` + `auto_evolve.sdev`: the model can read the real
  source tree and propose patches, but every write goes through a review
  hook and a path whitelist — both off by default.

**Milestone 13 (ML host bindings) — shipped:**
- `src/lang/builtins.ts` gained `ord(s, i)`, `rand`, `ln`, `read_file`,
  `write_file`, `http_get`, and the FFI buffer family.
- `executeIndex` in `src/lang/interpreter.ts` now yields `void` (not
  `undefined`) for a missing tome key, so `tome[k] equals void` holds.
- `scripts/test-ml-stdlib.ts` runs the whole ML stack on the v1
  interpreter as a regression gate.

**Milestone 14 (end-to-end LM training) — shipped:**
- `autograd.sdev`: `d_softmax_ce(logits, targets)` with its `bw_sce`
  backward rule (row-wise softmax, then `probs − onehot` scaled by the
  batch size), `zero_grads`, `clip_grads(params, max_norm)` global-norm
  clipping, and `adam_new` / `adam_step` with bias correction.
- `lang/stdlib/ml/train.sdev` (new): `lm_batches` sliding-window pairs,
  `lm_step`, `lm_fit(model, ids, block, epochs, lr)`, `lm_loss`,
  `perplexity`, `sample_topk(logits, temperature, k)`, `lm_generate`,
  `lm_complete`, and plain-text `save_checkpoint` / `load_checkpoint`
  (`shape|values`, one parameter tensor per line).
- Tests: cross-entropy gradient checked against the analytic rule,
  `lm_fit` must lower loss on a repeating corpus, top-1 sampling must
  never leak, checkpoints must round-trip. 15/15 ML checks green with the
  self-hosted toolchain still byte-identical.

**Milestone 5p (retire the JS bootstrap from the runtime path) — shipped:**
- The driver program is now **source-independent**: instead of embedding the
  user program as a string literal, it does `set src to read_file("<stdin>")`
  and the host answers with the program bytes via `alloc_str`.
- Because the driver no longer varies per input, its bytecode is compiled
  **once** by `scripts/build-driver.mjs` and checked in as
  `lang/compiler/driver-artifact.mjs` (base64, bc=7741, pool=147).
  `compile-self.mjs` imports that artifact and no longer imports the
  bootstrap at all.
- `src/lang-bridge/wasm-runtime.ts` now compiles through the self-hosted
  shim (`setSeedLoader` lets the browser hand it a `fetch`-based loader).
  `src/lang-bridge/bootstrap.d.ts` is deleted; `compile-self.d.ts` replaces it.
- `scripts/test-wasm-runtime.mjs` runs on the shim too.
- New gate: `node bin/sdevhost.mjs scripts/test-driver-artifact.sdev` re-derives the driver
  from the bootstrap oracle and fails if the checked-in bytes drift, then
  compiles four programs through the bootstrap-free shim.
- The JS bootstrap now exists **only** as a build/test-time oracle
  (`build-driver.mjs`, `test-self-codegen.mjs`, `test-self-toolchain.mjs`).

**Milestone 5q (floats + host I/O in the self-hosted codegen) — shipped:**
- **New seed opcode** `0xB4 FBYTE`: pops an index `0..7` and a boxed float,
  pushes that little-endian IEEE-754 byte. This is the one primitive the
  self-hosted codegen needed to materialise a `PUSH_F64` operand without
  bitwise integer ops in the source language. Exposed to programs as the
  builtin `fbyte(x, i)` (bootstrap and self-hosted alike).
- **Lexer**: the inline driver lexer now recognises `123.456`, emitting
  token kind `6` with the mantissa in `tk_num` and the fractional-digit
  count in the new `tk_num2` table. The value is reconstructed as
  `i2f(mantissa) / i2f(10^scale)` — a single correctly-rounded IEEE
  division, so it lands on exactly the double the JS oracle parses.
- **Codegen**: `expr_type` grew a third state (`0` int, `1` str, `2` float).
  `both_float()` gates `FADD/FSUB/FMUL/FDIV` and `FEQ/FLT/FGT`; `say` picks
  `SAY_F64`; mixed int/float still requires an explicit `i2f`, matching the
  oracle. `emit_call` learned `i2f`, `f2i`, `fneg`, `fabs`, `fsqrt`,
  `fsin/fcos/ftan/fexp/flog/fpow`, `fbyte`, `read_file`, `write_file`,
  and `http_get`.
- The browser bridge's `NOT_YET_SELF_HOSTED` carve-out is **deleted**: every
  v2 program in the IDE, floats and host I/O included, compiles through the
  self-hosted codegen running on the seed VM.
- All float and I/O cases in `test-wasm-runtime.mjs` now run self-hosted, and
  float programs compile **byte-identically** to the bootstrap oracle.

**Milestone 5r (booleans, `not`, unary minus, `true`/`false`/`nothing`) — shipped:**
- **New expression tiers in `codegen.sdev`**: `parse_expr → parse_or →
  parse_and → parse_not → parse_cmp`. Every former `parse_cmp` entry point
  (statements, call arguments, list items, parenthesised groups, index
  expressions) now enters at `parse_expr`, so boolean operators are legal
  anywhere an expression is.
- **Short-circuiting** mirrors the oracle byte-for-byte: `a and b` emits
  `a`, `JZ →end`, `b`; `a or b` emits `a`, `NOT`, `JZ →end`, `b`. Both tiers
  are left-associative loops and always yield an int.
- **`not x`** is right-recursive (`not not x` is legal) and emits `NOT`.
- **Unary minus** got its own tier between `mul` and the atom/postfix pair:
  `-x` emits `PUSH_I32 0`, the operand, then `SUB`, exactly as the bootstrap
  does. Postfix indexing still binds tighter, so `-xs[0]` negates the element.
- **`true` / `false` / `nothing`** lower to plain integers (`1` / `0` / `0`)
  in both the self-hosted codegen and the bootstrap oracle, keeping the two
  emitters identical. The oracle's `canStartAtom` accepts them too, so they
  work as arguments in the `f with a b` call form.
- Three new cases in `scripts/test-wasm-runtime.mjs` cover short-circuiting,
  unary minus, and the literals; the byte-identity, shim fixed-point, and
  driver-artifact gates all stay green (driver artifact rebuilt: bc=9739).
- Parity registry updated: `logic_and`, `logic_or`, `bool_true`, `bool_false`
  and `nothing` are no longer v2 gaps, and the native track now declares the
  shared bootstrap parser among its sources.



**Milestone 5s (`break`, `continue`, `for each … in`, `else if`) — shipped:**
- **`for each NAME in EXPR ... end`** is desugared, in both emitters, to an
  index loop over two hidden variables named after the loop's lexical
  foreach-nesting depth (`_fe_l1` / `_fe_i1`, `_fe_l2` / `_fe_i2`, …). Depth
  naming is what lets the single-pass self-hosted compiler pick the same
  names as the AST-based oracle without a desugaring pass:

  ```text
  EXPR ; STORE _fe_lD ; PUSH_I32 0 ; STORE _fe_iD
  top: LOAD _fe_iD ; LOAD _fe_lD ; LEN ; LT ; JZ →exit
       LOAD _fe_lD ; LOAD _fe_iD ; LGET ; STORE NAME
       <body>
  cont: LOAD _fe_iD ; PUSH_I32 1 ; ADD ; STORE _fe_iD ; JMP →top
  exit:
  ```

  The bootstrap's `collectSets` registers the two hidden bindings and the
  loop variable in exactly that order, so local slot numbers agree.
- **`break` / `continue`** emit a `JMP` with an unresolved target. The
  self-hosted codegen records `(placeholder, loop_depth)` in the `brk_*` /
  `cnt_*` tables and resolves them in `patch_breaks` / `patch_conts` when the
  enclosing loop closes (breaks → loop exit, continues → the `while` header
  or the foreach increment). The oracle does the same with a loop-context
  stack on the emitter. Both keywords lex as plain identifiers, so they are
  matched ahead of the expression-statement fallback.
- **`else if`** chains: after `else`, a following `if` is parsed as a nested
  statement that consumes its own `end`, so the outer level does not eat one.
  Emission order (`cond, JZ, then, JMP, patch JZ, else-branch, patch JMP`) is
  unchanged, which keeps chains byte-identical to the oracle.
- Six new cases in `scripts/test-wasm-runtime.mjs` and six more in
  `scripts/test-shim-fixed-point.mjs` (now 49/49 byte-identical). Driver
  artifact rebuilt: bc=11215, pool=383. Toolchain, driver-artifact, native
  and parity gates all green; `for_each`, `break` and `continue` are no
  longer v2 parity gaps.



**Milestone 5t (tomes — string-keyed dictionaries) — shipped:**
- **Heap shape.** A tome is a 16-byte header `[MAGIC | count | cap |
  entriesPtr]` plus a separate entries block of `cap` `(keyPtr, value)` i32
  pairs, so growth reallocates only the entries block and every existing
  handle to the tome stays valid. `MAGIC` is `0x7FED10E5` — a length no list
  can legitimately have — which lets the VM recognise a tome from its
  pointer alone.
- **New seed opcodes** (`lang/bootstrap/seed.wat`): `TNEW (0x8A) <u16 cap>`,
  `TSET (0x8B)` (pops value + key, leaves the tome on the stack so a literal
  is a single expression), `TGET (0x8C)`, `THAS (0x8D)`, `TKEYS (0x8E)` and
  `TVALS (0x8F)`. Lookup is a linear scan with byte-wise key comparison
  (`$streq`); note that pool offset 0 is a legal string handle, so a zero
  pointer must not be read as "absent".
- **Run-time dispatch.** `LGET`, `LSET` and `LEN` check the magic word first:
  on a tome they perform a key read / key write / entry count, on anything
  else the original list behaviour. That is what makes a tome passed into a
  function work without a type annotation, since the single-pass compiler
  types parameters as opaque ints.
- **Compile-time kinds.** Both emitters extend the kind lattice with
  `tome` (int-valued), `tomestr` (string-valued) and `liststr` (the list
  `keys()` returns), so `say t[k]`, `k + "="` and `for each v in values(t)`
  pick `SAY_STR` / `STRCAT` correctly. The self-hosted codegen encodes them
  as 3, 4 and 5 alongside 0/1/2 for int/str/float. Because TNEW's count
  operand precedes the entries in the byte stream, the streaming compiler
  reserves the u16 and back-patches it once the literal closes.
- **Syntax.** `{ "k": v, name: v2 }`, with newlines allowed between entries;
  a bare identifier key is sugar for the string of the same name, matching
  v1's `{name: "x"}` form.
- Nine new cases in `scripts/test-wasm-runtime.mjs` and ten more in
  `scripts/test-shim-fixed-point.mjs` (now 59/59 byte-identical). Driver
  artifact rebuilt: bc=12261, pool=408. The seed VM is now built by
  `scripts/build-seed-wasm.mjs` (wabt, no system toolchain). Toolchain,
  driver-artifact, native and parity gates all green; `tome_literal`,
  `keys`, `values` and `has` are no longer v2 parity gaps.

**Milestone 5u (string + numeric standard library) — shipped:**
- **New seed opcodes** (`lang/bootstrap/seed.wat`): `UPPER (0x92)`,
  `LOWER (0x93)`, `TRIM (0x94)`, `SUBSTR (0x95)`, `FIND (0x96)`,
  `SPLIT (0x97)`, `JOIN (0x98)`, `REPLACE (0x99)`, `S2I (0x9A)`,
  `IABS (0x9B)`, `IMIN (0x9C)`, `IMAX (0x9D)`, `RANGE (0x9E)`,
  `SUM (0x9F)`, `FCEIL (0xB5)`, `FFLOOR (0xB6)`, `FROUND (0xB7)` and
  `RANDINT (0xB8)`.
- **All results are ordinary blobs.** Every string op allocates a fresh
  `[len|bytes]` blob with the same shape the string pool uses, so computed
  strings and literals are indistinguishable downstream. `split` returns a
  regular list of blobs, which means `for each p in split(s, ",")` and
  `length(split(...))` work with no extra machinery; `replace` is literally
  `join(split(s, old), new)` inside the VM.
- **No new host imports.** `ceil`/`floor`/`round` use the WebAssembly
  `f64.ceil` / `f64.floor` / `f64.nearest` instructions, and `random(n)` is a
  deterministic in-VM xorshift32 so every host (browser, Node, extension)
  observes the same sequence. That keeps the four host functions of Milestone
  7 as the complete host surface.
- **Both compilers.** The bootstrap oracle gains a `BUILTINS` entry per call
  and the self-hosted `emit_call` in `lang/compiler/codegen.sdev` gains the
  matching opcode branch plus its result kind, so `say upper(x)` still picks
  `SAY_STR` and `split()` is typed `liststr`. `contains(h, n)` is sugar,
  emitted as `FIND; PUSH_I32 0; GE`.
- Seven new fixed-point cases (66/66 byte-identical) and seven new runtime
  cases (45/45 passing). Driver artifact rebuilt: bc=13070, pool=575.
  `upper`, `lower`, `trim`, `contains`, `replace`, `split`, `join`, `int`,
  `abs`, `min`, `max`, `ceil` and `round` are no longer v2 parity gaps; only
  `num`, closures/classes, exceptions and `import` remain.

**Milestone 5v (error handling + `num`) — shipped:**
- **New seed opcodes**: `TRY (0xC0) <i16 rel>`, `ENDTRY (0xC1)`,
  `THROW (0xC2)` and `S2F (0xC3)`.
- **Handler stack.** A 16-byte record `[handler_ip | sp | fp | csp]` is pushed
  by `TRY` into a dedicated region at `0x13000` (between the global slots and
  the operand stack). `ENDTRY` pops it. `THROW` pops the message handle,
  unwinds to the newest record — restoring the operand stack, frame pointer
  and call-stack tip — and re-pushes the message so the handler can bind it.
  A throw with no live handler prints the message and halts the program.
- **Surface syntax**: `attempt … rescue [err] … end` and `throw EXPR`. The
  rescue binding is an ordinary local (typed `str`); `rescue` with no name
  drops the message with a `POP`. Because the unwind restores `fp`/`csp`, a
  `throw` from arbitrarily deep inside nested calls lands in the right handler.
- **`num(s)`** parses `[+-]?digits[.digits]` into a boxed f64 via `S2F`,
  mirroring `int(s)`: unparseable input yields `0.0`.
- **Both compilers.** The bootstrap oracle parses `attempt`/`rescue`/`throw`
  as plain identifiers (no new lexer keywords, so `lexer.sdev` is untouched),
  and `codegen.sdev` gained the same emitter plus a `rescue` block terminator.
- Five new fixed-point cases (71/71 byte-identical) and six new runtime cases
  (51/51 passing). Driver artifact rebuilt: bc=13431, pool=612. `try_catch`,
  `rescue`, `throw` and `num` are no longer v2 parity gaps; only
  closures/classes and `import` remain.



**Milestone 5w (first-class function values) — shipped:**
- **New seed opcode**: `CALLV (0xC4) <u8 n_args>` — identical to `CALL`
  except the target code offset is popped off the operand stack instead of
  read from a u16 immediate, so the frame/arg-copy path is shared.
- **Surface syntax**: `ref NAME` evaluates to a function value (the callee's
  byte offset, an ordinary int), and `call TARGET(args)` invokes one. Both
  words stay plain identifiers, so the lexer is untouched.
- **Patching.** `ref` emits `PUSH_I32` with a zero placeholder; forward and
  mutually-recursive references reuse the existing pending-call table. The
  resolver distinguishes the two site shapes by reading the opcode byte in
  front of the patch position: `0x60` → u16 target, otherwise `0x01` → i32.
- Function values are plain ints, so they compose with everything: store them
  in lists and tomes, pass them to functions, build dispatch tables. There is
  no capture — a `ref` closes over nothing, which keeps the calling
  convention identical to a direct `CALL`.
- Three new fixed-point cases (74/74 byte-identical) and four new runtime
  cases (55/55 passing). Driver artifact rebuilt: bc=14025, pool=627.

**Milestone 5x (lambdas + closures) — shipped:**
- **New seed opcodes**: `CLOSURE (0xC5) <u16 code_off> <u8 ncaps>` pops
  `ncaps` values and allocates a heap blob
  `[CLOS_MAGIC 0x7FC105E5][code_off][ncaps][cap0..capN]`; `CALLV (0xC4)`
  now inspects its target — a raw offset (from `ref`) calls directly, a
  closure handle first copies the captured values into the new frame right
  after the arguments, so captures are just trailing locals.
- **Surface syntax**: `make [with p1 p2…] [capture c1 c2…]` NL body `end`.
  Both words stay plain identifiers; the lexer is untouched.
- **Emission order** (identical in `compile.mjs` and `codegen.sdev`):
  load each capture in the *enclosing* scope → `JMP` over the body →
  body at `body_off` with a fresh local scope (params, then captures, then
  the body's own `set`s, sized by an `ENTER`) → `PUSH_I32 0` + `RET` →
  patch the jump → `CLOSURE body_off ncaps`.
- The self-hosted codegen counts the body's extra locals with a
  non-emitting pre-pass over `parse_block`, mirroring the bootstrap's
  `collectSets`, which is what keeps the two byte-identical.
- Capture is by value at creation time. `make` bodies do not nest yet.
- Four new fixed-point cases (78/78 byte-identical) and five new runtime
  cases (60/60 passing). Driver artifact rebuilt: bc=15085, pool=646.
- Parity registry updated: `lambda` is now present on v2 as `make`.

**Milestone 5y (kinds — objects and methods) — shipped:**
- **No VM change.** A kind is pure compiler sugar over tomes + function
  values, so `seed.wat` is byte-for-byte the same as after 5x.
- **Desugaring pre-pass** (`desugarKinds` in `compile.mjs`, `desugar_kinds`
  in `codegen.sdev`, run identically from `compile-self.mjs`): the
  `kind Name` header and its closing `end` are blanked out, and each nested
  `to m with self …` becomes a top-level function `Name_m`. Line count is
  preserved so error lines stay accurate. The pass records, per class, the
  ordered list of `(method key, mangled function name)` pairs.
- **`new Name`** (parentheses optional) emits `TNEW` sized to the method
  count, then one `PUSH_STR key` + function-value push + `TSET` per method.
  An instance is therefore an ordinary tome; fields are keys created on
  first write.
- **Member access**: `obj.f` → `PUSH_STR "f"` + `TGET`; `set obj.f to v` →
  `TSET`; `obj.m(a, b)` → receiver, args, then receiver + `PUSH_STR "m"` +
  `TGET` and `CALLV nargs+1`, so the receiver is the implicit first
  argument.
- **Return typing**: the receiver's class is not tracked statically, so a
  method call is string-typed when *any* declared method of that name
  returns a string (`methodRetType` / `method_ret_type`). Both compilers
  apply the identical rule, which is what keeps them byte-identical.
- Five new fixed-point cases (83/83 byte-identical) and four new runtime
  cases (64/64 passing). Driver artifact rebuilt: bc=17153, pool=666.
  `codegen.sdev` still compiles itself byte-identically.
- Parity registry: `class` → `kind`, `instantiate` → `new` on v2; `self` is
  marked n/a there because it is a plain parameter, not a keyword.
  `inherit` / `super` remain the open v2 OOP gaps.

**Milestone 6b (inheritance — `extends` + `super`) — shipped:**
- **No VM change.** Inheritance, like kinds, is compiler sugar over tomes.
- **Desugaring**: `kind Child extends Parent` blanks the two extra header
  tokens and records the parent index. After the child's own methods are
  collected, the parent's entries are merged in: every parent method the
  child does not override is copied under its own key, and each one also
  gets a class-qualified alias `super_<Child>_<key>` bound to the parent's
  mangled function. Aliases inherited from grandparents are copied verbatim,
  so a `C → B → A` chain carries `super_C_tag` and `super_B_tag`.
- **`super.m(...)`** is rewritten at the token level to
  `self.super_<Class>_m(...)` — three tokens in, three tokens out, so no
  insertion is needed and both compilers stay in lockstep. Because the key
  is qualified with the *lexical* class, super is statically bound and deep
  chains terminate instead of recursing on the receiver's override.
- Registry arrays gained `mth_sup` (alias flag) in `compile-self.mjs`, and
  the JS oracle's method records gained the matching `sup` field.
- Four new fixed-point cases (87/87 byte-identical) and four new runtime
  cases. Driver artifact rebuilt: bc=18576, pool=721.
- Parity registry: `inherit` → `extends` on v2; the v2 OOP column is now
  complete.

**Milestone 6c (native strings, lists and builtins) — shipped:**
- **Heap.** `runtime.s` gained `sdev_alloc`: a bump allocator over one 64 MiB
  anonymous `mmap` region, no free (native runs are short-lived). Two heap
  shapes share a header word: a string is `[i64 byte-len][bytes]` and a list
  is `[i64 count][i64 words]`, so `length(x)` is one load either way.
- **New runtime entry points**: `sdev_concat` (joins two strings into a fresh
  allocation), `sdev_chr` (one-byte string), `sdev_str_int` (decimal text for
  an int64, sign included).
- **Static value kinds** in `codegen-x64.mjs` (`typeOf` + `inferFnTypes`):
  every word is classified `int` / `str` / `list` at compile time, mirroring
  the WASM codegen's rule set. `say` picks `sdev_say_str` vs `sdev_say_int`
  from the inferred kind instead of "is this a literal", `+` lowers to
  `sdev_concat` when either operand is text (ints are coerced through
  `sdev_str_int`), and user function return kinds are inferred in two passes
  so `to greet with n / return "hi " + str(n)` prints as text.
- **Builtins**: `length`, `abs`, `ord(s, i)`, `chr(n)`, `str(v)`,
  `list_new(n)` / `mklist(n)`, plus list literals `[a, b, c]`, indexing
  `xs[i]` and indexed assignment `set xs[i] to v` — all emitted inline.
- Eleven new cases in `scripts/test-native.mjs` (17/17 passing against real
  `as` + `ld` ELFs).
- Parity registry: the eight remaining native `should` gaps are closed —
  **must gaps 0, should gaps 0 across all three tracks.**

**Milestone 6e (native floats and math) — shipped:**
- **Representation.** A float is the raw IEEE-754 bit pattern in a 64-bit
  word — no tag, no box. The compiler already tracks kinds statically, so
  `float` simply joins `int` / `str` / `list` / `tome` and decides which
  instruction family to emit. Float literals become `movabsq $<bits>, %rax`.
- **Arithmetic.** `+ - * /` and all six comparisons emit SSE2
  (`addsd`/`subsd`/`mulsd`/`divsd`, `ucomisd` + `seta/setb/...`) whenever
  either operand's kind is `float`; integer operands are widened inline with
  `cvtsi2sdq`, so `1 + 0.5` and `3.0 * 2` work without explicit casts.
  Unary minus flips the sign bit rather than calling `negq`.
- **Printing.** `sdev_str_float` formats a double by hand: sign extraction,
  `cvttsd2si` for the integer part, ×10^6 + rounding for the fraction,
  trailing-zero trimming (always at least one digit, so `3.0` prints as
  `3.0`), then reuse of `sdev_str_int` / `sdev_concat` / `sdev_chr`.
  `say` dispatches to `sdev_say_float`, and `"pi=" + 3.25` coerces through
  the same formatter.
- **Math in assembly.** `sqrt` is `sqrtsd`; `floor` / `ceil` / `round` are
  built from `cvttsd2si` plus a correction step (no SSE4.1 dependency);
  `sin` / `cos` use x87 `fsin` / `fcos`; `log` is `fldln2` + `fyl2x`; `exp`
  and `pow` share the classic `frndint` / `f2xm1` / `fscale` sequence.
  `random()` is the same xorshift32 generator the seed VM uses, divided by
  2^32 to land in `[0, 1)`. `num("3.5")` is a hand-written decimal parser and
  `int(x)` truncates toward zero.
- **Parameter kinds from call sites.** `inferFnTypes` now walks every call in
  the program and records `@param:<fn>:<i>`, so `to half with n / return n /
  2.0` compiles `n` as a float when it is only ever called with floats.
- Fifteen new cases in `scripts/test-native.mjs` (47/47 passing against real
  `as` + `ld` ELFs); 87/87 fixed-point cases still byte-identical.
- Parity registry: twelve former native `n/a` entries (`num`, `floor`,
  `ceil`, `round`, `sqrt`, `pow`, `sin`, `cos`, `exp`, `log`, `random`,
  `float`) became `should` and are satisfied — **must gaps 0, should gaps 0
  across all three tracks.**

**Milestone 6d (native strings, tomes and for-each) — shipped:**
- **Runtime (`lang/native/runtime.s`)** gained a hand-written string library:
  `sdev_str_eq`, `sdev_index_of`, `sdev_contains`, `sdev_substr`,
  `sdev_upper`, `sdev_lower`, `sdev_trim`, `sdev_replace`, `sdev_split`
  (returns a heap list of pieces), `sdev_join` and `sdev_empty`. `replace`
  and `split` are built out of `index_of` + `substr` + `concat`, so there is
  one matching algorithm rather than three.
- **Tomes natively.** A tome is `[i64 count][i64 cap][cap × (key-ptr, value)]`
  with `cap = 64`, so `length(t)` still reads the header word exactly like
  strings and lists. `sdev_tnew` / `sdev_tfind` / `sdev_tset` / `sdev_tget` /
  `sdev_thas` / `sdev_tkeys` / `sdev_tvals` implement association-list
  lookup keyed by `sdev_str_eq` (value equality, not pointer equality).
- **Codegen (`codegen-x64.mjs`)**: tome literals `{ k: v }` lower to `tnew`
  plus one `tset` per pair; `t["k"]` and `set t["k"] to v` dispatch to
  `tget`/`tset` when the container's inferred kind is `tome`, and stay
  list-indexing otherwise. `is` / `is not` compare text by value when either
  side is a string.
- **Kind inference widened**: a fourth kind `tome` joins `int` / `str` /
  `list`; per-key value kinds are remembered as `@tome:<var>:<key>` and list
  element kinds as `@elem:<var>`, so `say parts[1]` after `split` prints
  text instead of a pointer.
- **`for each x in xs … end`** is lowered natively to a counted index loop
  over two hidden slots named by the loop's foreach depth (`@fe_i<d>`,
  `@fe_s<d>`, sanitised for asm labels); iterating a tome walks its keys.
  Local frames grew from 16 to 32 slots to make room.
- **Builtins added**: `upper`, `lower`, `trim`, `contains`, `index_of`,
  `substring`, `replace`, `split`, `join`, `min`, `max`, `tome_new`, `keys`,
  `values`, `has`.
- Fifteen new cases in `scripts/test-native.mjs` (32/32 passing against real
  `as` + `ld` ELFs); 87/87 fixed-point cases still byte-identical.
- Parity registry: fourteen former native `n/a` entries became `should` and
  are satisfied — **must gaps 0, should gaps 0 across all three tracks.**

**Milestone 6f (native closures, objects, errors, break/continue) — shipped:**
- **Codegen** now parses through `parseWithKinds()` (exported from
  `lang/bootstrap/compile.mjs`), so the x86-64 backend sees the same
  desugared kind/method registry as the WASM track.
- **Function values.** `ref f` allocates a 16-byte block
  `[code-ptr][ncaps]`; `make with p… capture c… end` allocates
  `[code-ptr][ncaps][cap₀…]` and stores each captured value from the
  enclosing frame. `call f(args)` pushes arguments right→left, loads the
  closure pointer into `%r10`, and does `call *(%r10)`; the callee copies
  params from `16(%rbp)…` and captures from `16(%r10)…` into local slots.
  Lambda bodies are emitted after `sdev_main` from a pending queue, so
  nested lambdas are handled by index growth during the emit loop.
- **Objects.** `new K` builds a tome and binds each method as a closure;
  `o.field` and `o.field to v` compile to `sdev_tget`/`sdev_tset`, and
  `o.m(...)` loads the method closure and binds the receiver in `%r10`.
  Inheritance and `super` come for free from the shared desugaring.
- **Errors.** `runtime.s` gained a 64-deep handler stack of
  `(handler, %rsp, %rbp)` triples with `sdev_try_push`, `sdev_try_pop` and
  `sdev_throw`; a throw restores the saved stack registers and jumps to the
  handler with the message pointer in `%rax`. Uncaught throws print
  `uncaught: <msg>` and exit 1.
- **Control flow.** `break`/`continue` use a loop-label stack in the emit
  context; `continue` in `for each` targets the index increment.
- **Return-kind tracking** for function values: `@fnval:<var>` records what
  a `ref`/lambda bound to a variable returns, so `say call f(x)` selects
  `sdev_say_str` vs `sdev_say_int` correctly.
- Tests: 62/62 in `scripts/test-native.mjs`; 87/87 fixed-point cases still
  byte-identical.



**Milestone 6i (native sequence + numeric library) — shipped:**
- **`runtime.s`** gained `sdev_range` (list `[0 .. n-1]`, negative clamped to
  empty), `sdev_sum` (linear add over a list's payload words), `sdev_ftan`
  (`fptan`, discarding the pushed 1.0), `sdev_fabs` / `sdev_fneg` (`btrq` /
  `btcq` on bit 63 of the raw double word), `sdev_i2f` (`cvtsi2sdq`),
  `sdev_f2i` (`cvttsd2si`, truncating toward zero) and `sdev_fbyte`
  (little-endian byte `i` of a double, 0 outside 0..7).
- **Codegen**: `range` joins the list-typed builtins, `sum`/`f2i`/`fbyte` the
  int-typed ones, and `tan`/`fabs`/`fneg`/`i2f` the float-typed ones, so
  `say` keeps picking `sdev_say_int` vs `sdev_say_float` correctly and
  `for each i in range(n)` iterates ints.
- Tests: six new cases (81/81 in `scripts/test-native.mjs`); 87/87
  fixed-point cases still byte-identical.
- Parity: `range` and `sum` moved from `n/a` to `should` on the native
  track — **must gaps 0, should gaps 0.**

**Milestone 6h (native process / OS layer) — shipped:**

- **`_start`** now captures `argc`, `argv` and `envp` from the initial stack
  into `sdev_argc` / `sdev_argv` / `sdev_envp` before calling `sdev_main`.
- **`runtime.s`** gained: `sdev_from_cstr` (length-prefixed copy of a NUL
  terminated string), `sdev_args` (list of `argv[1..]`), `sdev_env` (linear
  scan of `envp` for `NAME=`, `""` when unset), `sdev_exit` (`sys_exit`),
  `sdev_now_ms` (`clock_gettime(CLOCK_REALTIME)` folded to milliseconds),
  `sdev_sleep_ms` (`sys_nanosleep`), `sdev_append_file`
  (`O_WRONLY|O_CREAT|O_APPEND`) and `sdev_say_err` (write to fd 2).
- **Codegen**: `env` is string-typed, `args` list-typed with `str` elements
  (so `for each a in args()` prints text), `append_file`/`now_ms` int-typed;
  `exit`, `sleep_ms` and `say_err` are statement-style calls.
- Tests: seven new cases (75/75 in `scripts/test-native.mjs`, which now
  drives argv, a custom env, exit status and stderr); 87/87 fixed-point
  cases still byte-identical.

**Milestone 6g (native host I/O and modules) — shipped:**
- **`runtime.s`** gained a small POSIX layer, all direct syscalls, no libc:
  `sdev_cstr` (NUL-terminated copy of a length-prefixed string),
  `sdev_read_file` (open/lseek/read loop, returns `""` on any error),
  `sdev_write_file` (`O_WRONLY|O_CREAT|O_TRUNC`, mode 0644, returns 1/0),
  `sdev_file_exists` (`access(F_OK)`), and `sdev_input`
  (byte-at-a-time read from stdin up to a newline, 4088-byte cap).
- **Codegen**: `read_file`/`input` join the string-typed builtins,
  `write_file`/`file_exists` the int-typed ones, so `say read_file(p)`
  selects `sdev_say_str` automatically.
- **Modules**: `generateAsm(source, { readModule })` threads a resolver into
  the shared `prelink` pass; `scripts/sdev-native.mjs` resolves `use "path"`
  relative to the importing file first, then the CWD.
- Tests: six new cases (68/68 in `scripts/test-native.mjs`, run in a temp
  cwd with stdin piped); 87/87 fixed-point cases still byte-identical.
- Parity: `read_file` / `write_file` moved from `n/a` to `should` on the
  native track — **must gaps 0, should gaps 0.**

**Milestone 5z (modules — `use "path"`) — shipped:**
- **No VM change.** Modules are a source→source prelink pass that runs
  before lexing, so the seed VM is untouched since 5x.
- **Pass**: `prelink()` in `lang/bootstrap/compile.mjs` and
  `prelink_source` in `lang/compiler/codegen.sdev` implement the identical
  algorithm — walk the source line by line, and when a trimmed line is
  exactly `use "path"`, splice in the recursively prelinked text of that
  file followed by a newline; every other line is copied verbatim with its
  newline. Include-once is tracked by path (a `Set` in JS, a `|`-delimited
  global string in sdev), so diamond dependencies emit a module once.
- **Resolution is the host's job**: the self-hosted compiler reads modules
  with `read_file(path)`. `compile-self.mjs` now answers `<stdin>` with the
  program under compilation and any other path from an optional module map,
  falling back to disk under Node. The driver program gained a single line,
  `set src to prelink_source(src)`, between the codegen and the inline
  lexer.
- **Bootstrap API**: `compile(source, { readModule })`; `setModuleReader()`
  lets a host (browser IDE) override resolution globally.
- Two new runtime cases (66/66 passing), 83/83 fixed-point cases still
  byte-identical, driver artifact rebuilt: bc=17475, pool=683.
- Parity: `import` on v2 is now `use`; `inherit` / `super` are the last two
  v2 gaps in the registry.

**Milestone 15 (training at scale) — planned:**
- Batched (multi-sequence) forward passes instead of one context at a time.
- Route `matmul` through the M10/M11 accelerators inside the training loop.
- Binary checkpoints (length-prefixed f64 blocks) to replace the text format.






#### Where we're going (Milestone 2 — post-launch)

Three-stage bootstrap. Every stage builds the next; the seed is only
needed once, to rebuild from absolute zero.

```
lang/bootstrap/seed.wat        (hand-written WebAssembly Text)
        │  wat2wasm
        ▼
lang/bootstrap/seed.wasm       runs sdev-min
        │
        │  compiles lang/compiler/*.sdev (written in sdev-min)
        ▼
lang/bootstrap/stage1.wasm     runs full SDEV, emits WASM
        │
        │  compiles lang/compiler/*.sdev (written in full SDEV)
        ▼
dist/sdev-core.wasm            self-hosting. Recompiles itself, byte-identical.
```

##### Sub-language `sdev-min`

The stage-0 seed only understands a strict subset:

- Integers, strings, booleans, `nothing`.
- Lists (indexed, appendable). No dicts.
- `set … to`, `if / else / end`, `while / end`, `to / end` (no `for each`).
- Function calls, `return`.
- One built-in call table: `print`, `read_file`, `write_file`, `error`,
  and the WASM emit primitives (`emit_byte`, `emit_u32`, `emit_leb128`,
  `patch_u32`).

That's enough to write a lexer, a parser, and a WASM code generator.

##### WASM ABI

`sdev-core.wasm` exports:

| export                    | signature                             | purpose                    |
| ------------------------- | ------------------------------------- | -------------------------- |
| `sdev_version`            | `() -> i32`                           | ABI + language version     |
| `sdev_compile`            | `(src_ptr, src_len) -> module_handle` | source → WASM module bytes |
| `sdev_run`                | `(module_handle) -> exit_code`        | execute a compiled module  |
| `sdev_step`               | `(module_handle) -> state`            | single-step (for the IDE)  |
| `sdev_emit_graphics`      | `(handle) -> cmd_buffer`              | drain graphics commands    |
| `sdev_translate`          | `(src_ptr, lang_code) -> out`         | run the 26-language translator |
| `sdev_transpile_board`    | `(src_ptr) -> ino_bytes`              | board { } → Arduino .ino   |

Memory layout: linear memory starts with a 64 KB scratch region, then a
freelist-managed heap. Strings are UTF-8, length-prefixed.

#### Repository layout

```
lang/
  bootstrap/
    seed.wat            # hand-written WAT (stage 0 source)
    seed.wasm           # built artifact — CI regenerates via wat2wasm
    stage1.wasm         # built artifact — CI regenerates by running seed
  compiler/             # .sdev sources: lexer, parser, codegen + compile-self.mjs
  native/               # Track B: x86-64 GAS codegen, runtime.s, linker
  stdlib/
    ffi.sdev            # M9 — native library binding
    webgpu.sdev         # M10 — browser GPU compute
    ml/
      tensor.sdev       # M8 — tensors + shape ops
      autograd.sdev     # M8/M14 — reverse-mode AD, losses, Adam
      nn.sdev           # M8 — layers, parameter collection
      transformer.sdev  # M12 — decoder-only GPT
      train.sdev        # M14 — LM training, sampling, checkpoints
      data.sdev         # M12 — tokenizers, crawling, distillation
      cuda.sdev         # M11 — cuBLAS fast paths
      self_modify.sdev  # M12 — gated source rewriting
      auto_evolve.sdev  # M12 — whitelisted evolution loop
  runtime/
    v2.js               # Milestone 1 reference runtime (pure JS)
    vm.sdev             # Milestone 2 VM
    kernel.sdev         # tasks, syscalls, GC
  paradigms/            # functional, systems, data, hardware — .sdev
  translator/           # 26-language keyword tables + engine — .sdev
  legacy/
    v1_frontend.sdev    # refine mode: parses forge/conjure/:: /;; into v2 AST

electron/               # desktop IDE shell (Track B host: build + run native)

src/lang-bridge/        # thin TS glue — the ONLY TS in the exec path
  bridge.ts             # picks runtime and dispatches
  v2.d.ts               # ambient types for lang/runtime/v2.js

dist/
  sdev-core.wasm        # shipped artifact (Milestone 2)
```


#### Verification

The gates that run today:

1. `node bin/sdevhost.mjs scripts/test-self-toolchain.sdev` — `lexer.sdev`, `parser.sdev`, and
   `codegen.sdev` must all round-trip **byte-identical** through the
   self-hosted compiler (currently bc=746/380/5730).
2. `node scripts/test-shim-fixed-point.mjs` — the compile shim reaches a
   fixed point against the JS bootstrap oracle.
3. `node scripts/test-wasm-runtime.mjs` — seed VM opcode suite (ints, call
   frames, heap/lists, strings, floats + transcendentals).
4. `node bin/sdevhost.mjs scripts/test-driver-artifact.sdev` — the checked-in driver bytecode
   matches a fresh bootstrap build, and the bootstrap-free shim compiles.
5. `node scripts/test-native.mjs` — Track B x86-64 emission and linking.
6. `bun run scripts/test-ml-stdlib.ts` — 15 checks across tensors, autograd,
   tokenizers, transformer shapes, LM training, sampling, checkpoints, and
   accelerator fallback.
7. `bun run scripts/test-translator.ts` — 26-language keyword translation.

Planned additions: `test-v2-goldens.mjs` (docs examples diffed against a
recorded transcript), `test-v1-parity.mjs`, `test-hardware.mjs` (`board`
blocks vs. checked-in `.ino` snapshots), and a Playwright smoke test that
opens `/ide`, runs `blink.sdev`, and verifies the canvas + output panels.


#### Why not just keep the TypeScript interpreter?

Because SDEV wants to be a real language, not a project's DSL. Every serious
language is written in itself. Self-hosting proves the design is complete
enough to describe itself, and gives the community a single artifact
(`sdev-core.wasm`) that runs the same anywhere WebAssembly runs — browser,
Node, Deno, Bun, wasmtime, a microcontroller with a WASM interpreter.

#### Parity matrix

Generated by `lang/parity/agent.sdev`. Do not edit by hand.

<!-- PARITY:BEGIN -->

| Feature | Area | sdev v1 (TypeScript interpreter) | sdev v2 (self-hosted compiler on the seed VM) | native x86-64 backend |
| --- | --- | --- | --- | --- |
| `say` | io | `speak` | `say` | `say` |
| `length` | core | `measure` | `length` | `length` |
| `concat` | text | `etch` | `concat` | `concat` |
| `ord` | text | `ord` | `ord` | `ord` |
| `chr` | text | `chr` | `chr` | `chr` |
| `str` | text | `str` | `str` | `str` |
| `int` | types | `int` | `int` | `int` |
| `num` | types | `num` | `num` | `num` |
| `list_new` | list | `gather` | `mklist` | `list_new` |
| `list_get` | list | `pluck` | `mklist` | `index` |
| `upper` | text | `upper` | `upper` | `upper` |
| `lower` | text | `lower` | `lower` | `lower` |
| `trim` | text | `trim` | `trim` | `trim` |
| `contains` | text | `contains` | `contains` | `contains` |
| `replace` | text | `replace` | `replace` | `replace` |
| `split` | text | `shatter` | `split` | `split` |
| `join` | text | `weave` | `join` | `join` |
| `abs` | math | `abs` | `fabs` | `abs` |
| `min` | math | `least` | `min` | `min` |
| `max` | math | `greatest` | `max` | `max` |
| `floor` | math | `ground` | `f2i` | `floor` |
| `ceil` | math | `elevate` | `fceil` | `ceil` |
| `round` | math | `nearby` | `fround` | `round` |
| `sqrt` | math | `root` | `fsqrt` | `sqrt` |
| `pow` | math | `pow` | `fpow` | `pow` |
| `sin` | math | `sin` | `fsin` | `sin` |
| `cos` | math | `cos` | `fcos` | `cos` |
| `exp` | math | `exp` | `fexp` | `exp` |
| `log` | math | `ln` | `flog` | `log` |
| `random` | math | `rand` | `random` | `random` |
| `range` | list | `range` | `range` | `range` |
| `sum` | list | `sum` | `sum` | `sum` |
| `keys` | tome | `tome_keys` | `keys` | `keys` |
| `read_file` | io | `read_file` | `read_file` | `read_file` |
| `write_file` | io | `write_file` | `write_file` | `write_file` |
| `http_get` | net | `http_get` | `http_get` | — |
| `var_decl` | syntax | `forge` | `set` | `set` |
| `assign` | syntax | `be` | `set` | `set` |
| `if` | syntax | `either` | `if` | `if` |
| `else` | syntax | `otherwise` | `else` | `else` |
| `while` | syntax | `cycle` | `while` | `while` |
| `for_each` | syntax | `iterate` | `each` | `foreach` |
| `break` | syntax | `yeet` | `break` | `break` |
| `continue` | syntax | `skip` | `continue` | `continue` |
| `function` | syntax | `conjure` | `to` | `call` |
| `return` | syntax | `yield` | `return` | `return` |
| `params` | syntax | `conjure` | `with` | `call` |
| `recursion` | syntax | `conjure` | `to` | `call` |
| `lambda` | syntax | `ARROW` | `make` | — |
| `class` | oop | `essence` | `kind` | — |
| `inherit` | oop | `extend` | `extends` | — |
| `self` | oop | `self` | — | — |
| `super` | oop | `super` | `super` | — |
| `instantiate` | oop | `new` | `new` | — |
| `try_catch` | errors | `attempt` | `attempt` | — |
| `rescue` | errors | `rescue` | `rescue` | — |
| `throw` | errors | `throw` | `throw` | — |
| `logic_and` | syntax | `also` | `and` | `and` |
| `logic_or` | syntax | `within` | `or` | `or` |
| `logic_not` | syntax | `nope` | `not` | `un` |
| `equality` | syntax | `equals` | `is` | `is` |
| `inequality` | syntax | `differs` | `not` | `isnot` |
| `bool_true` | types | `yep` | `true` | `true` |
| `bool_false` | types | `nope` | `false` | `false` |
| `nothing` | types | `void` | `nothing` | `nothing` |
| `list_literal` | types | `gather` | `mklist` | `list` |
| `tome_literal` | types | `tome_keys` | `tome_literal` | `tome` |
| `import` | modules | `summon` | `use` | — |
| `float` | types | `num` | `i2f` | `float` |
| `string` | types | `str` | `str` | `str` |
| `values` | tome | `values` | `values` | `values` |
| `has` | tome | `has` | `has` | `has` |
| `py_print` | python | `print` | — | — |
| `py_str` | python | `str` | — | — |
| `py_repr` | python | `repr` | — | — |
| `py_int` | python | `int` | — | — |
| `py_float` | python | `float` | — | — |
| `py_bool` | python | `bool` | — | — |
| `py_complexish` | python | `complexish` | — | — |
| `py_bytes` | python | `bytes` | — | — |
| `py_list` | python | `list` | — | — |
| `py_tuple` | python | `tuple` | — | — |
| `py_set` | python | `set` | — | — |
| `py_frozenset` | python | `frozenset` | — | — |
| `py_dict` | python | `dict` | — | — |
| `py_len` | python | `len` | — | — |
| `py_range` | python | `range` | — | — |
| `py_enumerate` | python | `enumerate` | — | — |
| `py_zip` | python | `zip` | — | — |
| `py_zip_longest` | python | `zip_longest` | — | — |
| `py_map` | python | `map` | — | — |
| `py_filter` | python | `filter` | — | — |
| `py_any` | python | `any` | — | — |
| `py_all` | python | `all` | — | — |
| `py_sorted` | python | `sorted` | — | — |
| `py_reversed` | python | `reversed` | — | — |
| `py_min` | python | `min` | — | — |
| `py_max` | python | `max` | — | — |
| `py_sum` | python | `sum` | — | — |
| `py_abs` | python | `abs` | — | — |
| `py_round` | python | `round` | — | — |
| `py_pow` | python | `pow` | — | — |
| `py_divmod` | python | `divmod` | — | — |
| `py_bin` | python | `bin` | — | — |
| `py_oct` | python | `oct` | — | — |
| `py_hex` | python | `hex` | — | — |
| `py_type` | python | `type` | — | — |
| `py_isinstance` | python | `isinstance` | — | — |
| `py_issubclass` | python | `issubclass` | — | — |
| `py_getattr` | python | `getattr` | — | — |
| `py_setattr` | python | `setattr` | — | — |
| `py_hasattr` | python | `hasattr` | — | — |
| `py_delattr` | python | `delattr` | — | — |
| `py_vars` | python | `vars` | — | — |
| `py_dir` | python | `dir` | — | — |
| `py_callable` | python | `callable` | — | — |
| `py_id` | python | `id` | — | — |
| `py_hash` | python | `hash` | — | — |
| `py_format` | python | `format` | — | — |
| `py_iter` | python | `iter` | — | — |
| `py_next` | python | `next` | — | — |
| `py_send` | python | `send` | — | — |
| `py_close` | python | `close` | — | — |
| `py_collect` | python | `collect` | — | — |
| `py_property` | python | `property` | — | — |
| `py_staticmethod` | python | `staticmethod` | — | — |
| `py_classmethod` | python | `classmethod` | — | — |
| `py_wraps` | python | `wraps` | — | — |
| `py_cache` | python | `cache` | — | — |
| `py_partial` | python | `partial` | — | — |
| `py_reduce` | python | `reduce` | — | — |
| `py_dataclass` | python | `dataclass` | — | — |
| `py_count` | python | `count` | — | — |
| `py_cycle` | python | `cycle` | — | — |
| `py_repeat` | python | `repeat` | — | — |
| `py_chain` | python | `chain` | — | — |
| `py_islice` | python | `islice` | — | — |
| `py_product` | python | `product` | — | — |
| `py_permutations` | python | `permutations` | — | — |
| `py_combinations` | python | `combinations` | — | — |
| `py_accumulate` | python | `accumulate` | — | — |
| `py_groupby` | python | `groupby` | — | — |
| `py_Counter` | python | `Counter` | — | — |
| `py_defaultdict` | python | `defaultdict` | — | — |
| `py_namedtuple` | python | `namedtuple` | — | — |
| `py_deque` | python | `deque` | — | — |
| `py_OrderedDict` | python | `OrderedDict` | — | — |
| `py_union` | python | `union` | — | — |
| `py_intersection` | python | `intersection` | — | — |
| `py_difference` | python | `difference` | — | — |
| `py_symmetric_difference` | python | `symmetric_difference` | — | — |
| `py_issubset` | python | `issubset` | — | — |
| `py_set_add` | python | `set_add` | — | — |
| `py_set_remove` | python | `set_remove` | — | — |
| `py_keys` | python | `keys` | — | — |
| `py_values` | python | `values` | — | — |
| `py_items` | python | `items` | — | — |
| `py_get` | python | `get` | — | — |
| `py_setdefault` | python | `setdefault` | — | — |
| `py_update` | python | `update` | — | — |
| `py_pop` | python | `pop` | — | — |
| `py_slice_assign` | python | `slice_assign` | — | — |
| `py_module` | python | `module` | — | — |
| `py_truthy` | python | `truthy` | — | — |
| `py_is_generator` | python | `is_generator` | — | — |
| `py_freeze` | python | `freeze` | — | — |
| `py_ascii` | python | `ascii` | — | — |
| `pysyn_generator` | python-syntax | `generator` | — | — |
| `pysyn_with` | python-syntax | `with` | — | — |
| `pysyn_as` | python-syntax | `as` | — | — |
| `pysyn_match` | python-syntax | `match` | — | — |
| `pysyn_case` | python-syntax | `case` | — | — |
| `pysyn_async` | python-syntax | `async` | — | — |
| `pysyn_await` | python-syntax | `await` | — | — |
| `pysyn_lambda` | python-syntax | `lambda` | — | — |
| `pysyn_assert` | python-syntax | `assert` | — | — |
| `pysyn_del` | python-syntax | `del` | — | — |
| `pysyn_global` | python-syntax | `global` | — | — |
| `pysyn_nonlocal` | python-syntax | `nonlocal` | — | — |
| `pysyn_pass` | python-syntax | `pass` | — | — |
| `pysyn_raise` | python-syntax | `raise` | — | — |
| `pysyn_from` | python-syntax | `from` | — | — |
| `pysyn_finally` | python-syntax | `finally` | — | — |
| `pysyn_in` | python-syntax | `in` | — | — |
| `pysyn_not` | python-syntax | `not` | — | — |
| `pysyn_is` | python-syntax | `is` | — | — |
| `pysyn_elif` | python-syntax | `elif` | — | — |
| `pysyn_try` | python-syntax | `try` | — | — |
| `pysyn_except` | python-syntax | `except` | — | — |
| `pysyn_class` | python-syntax | `class` | — | — |
| `pysyn_def` | python-syntax | `def` | — | — |
| `pysyn_import` | python-syntax | `import` | — | — |
| `pysyn_return` | python-syntax | `return` | — | — |
| `pysyn_while` | python-syntax | `while` | — | — |
| `pysyn_for` | python-syntax | `for` | — | — |
| `pysyn_break` | python-syntax | `break` | — | — |
| `pysyn_continue` | python-syntax | `continue` | — | — |
| `pysyn_true` | python-syntax | `true` | — | — |
| `pysyn_false` | python-syntax | `false` | — | — |
| `pysyn_none` | python-syntax | `none` | — | — |
| `pysyn_and` | python-syntax | `and` | — | — |
| `pysyn_or` | python-syntax | `or` | — | — |
| `args` | os | — | — | `args` |
| `env` | os | — | — | `env` |
| `exit` | os | — | — | `exit` |
| `now_ms` | os | — | — | `now_ms` |
| `sleep_ms` | os | — | — | `sleep_ms` |
| `append_file` | io | — | — | `append_file` |
| `say_err` | io | — | — | `say_err` |

<!-- PARITY:END -->

---

### Personal SDEV internals — dialects, signatures, extensions, libraries

This subsystem lets anyone run their own surface of the language without
forking the compiler. **A dialect is data, not a compiler fork.** The
self-hosted `lexer.sdev` / `parser.sdev` / `codegen.sdev` are never modified;
a canonicalizer sits in front of them.

```text
dialect source ──canonicalize──▶ canonical sdev v2 ──▶ lexer ▶ parser ▶ codegen ▶ seed VM / x86-64
        ▲                                   │
        └──────────── dialectize ◀──────────┘   (lossless reverse)
```

#### 1. Dialect spec (`src/lang/dialect/spec.ts`)

A `DialectSpec` has four parts:

| Part | Contents |
|---|---|
| `meta` | slug, name, version, languages, visibility, `extends` |
| `names` / `synonyms` | canonical word → this dialect's word(s), any script |
| `style` | block style (`end` / braces), comment marker, string quote, argument separator, assignment form (`set-to` / `equals` / `arrow`) |
| `constructs` | added functions (sdev source) and operators (`symbol` → `fn`) |

`validateDialect` reports collisions, duplicate names, illegal operator
symbols and reserved-word clashes; `isPublishable` gates publishing on zero
errors. `preludeSource` renders the dialect's added functions.

#### 2. Canonicalizer (`src/lang/dialect/canonicalize.ts`)

A token-level rewriter, line by line:

1. `splitLine` separates code, string literals and comments; strings are
   masked with `\u0000n\u0000` placeholders so no rule can touch literal text.
2. `mapWords` rewrites identifier-position words through the forward or
   reverse dictionary built from `CATALOG_WORDS`.
3. `desugarOperators` turns `a <sym> b` into `fn(a, b)` (longest symbol first,
   up to 8 passes for chained operands).
4. Style normalization: `{` / `}` become block open/`end`; `x = 1` and
   `1 -> x` become `set x to 1`.
5. The dialect prelude is prepended unless `withPrelude: false`.

`dialectize` is the same pipeline in reverse, and `translateDialect(src, a, b)`
is `dialectize(canonicalize(src, a), b)` — which is what makes dialect→dialect
translation lossless by construction. Golden tests live in
`scripts/test-dialect.ts`.

#### 3. File signature (`src/lang/dialect/signature.ts`)

One leading line per file:

```text
#⟨sdev⟩ <base64url payload>
```

The payload is `{ v, rt, dialect, dialectVersion, libs[], origin, sum, ts }`.
`sum` is an FNV-1a hash of the body, so a damaged or hand-edited file is
detected by `isSignatureStale` and re-stamped by `repairSignature`.

Lifecycle:

- **Read** — on import and on cloud load the line is parsed, then removed with
  `stripSignature` so the editor buffer only ever holds the body.
- **Retranslate on open** — if `sig.dialect` differs from the active dialect,
  the body is translated into the reader's own words before it reaches the
  editor (`src/pages/IDE.tsx`).
- **Write** — `writeSignature` stamps the line on every cloud save
  (`src/hooks/useCloudFiles.ts`) and on export (single file and "download
  all"). The lexer treats it as an ordinary comment, so signed files run
  anywhere.
- **Mirror** — the same fields are written to `code_files.dialect_slug`,
  `dialect_version`, `runtime` and `lib_pins` so files are searchable by
  dialect; `lib_pins` is scraped from the file's `use "@user/lib"` lines.

#### 4. Extensions (`src/lang/dialect/extensions.ts`)

An extension is plain sdev source, private/unlisted/public per author. Enabled
extensions are cached in `localStorage` (so they work offline) and wired into
the run path:

```text
file body ─▶ canonicalize (dialect) ─▶ desugarExtensionOperators ─▶ prepend function bodies ─▶ toolchain
```

`applyExtensions(source)` performs the last two steps. Operator extensions
desugar exactly like dialect operators. "Propose for core" files a row in
`core_requests` — a review queue, never an automatic language change.

#### 5. Library registry (`src/lang/dialect/registry.ts`)

`use "@user/library@1.2.0"` is resolved before compilation:

1. `parseAddress` (`address.ts`) matches `@username/slug[@version]`.
2. `fetchLibrary` resolves the owner through `usernames`, then the pinned (or
   latest) row in `library_versions`.
3. Bundles are cached locally; `exportOfflineBundle` / `importOfflineBundle`
   move them between machines with no network.
4. `resolveLibraries(source)` returns a module map that is merged with the
   workspace files and handed to the same `use`-resolution the compiler
   already uses for local modules.

#### 6. Living documentation (`src/lang/dialect/docs.ts`)

The canonical reference is a template rendered per dialect: every keyword table
is generated from `CATALOG`, the sample program is passed through `dialectize`,
and added functions/operators are appended.

`TEMPLATE_VERSION` stamps each rendering. `getOrGenerateDocs` reads the
`dialect_docs` cache for `(dialect_id, dialect_version, template_version)`;
when the cached copy came from an older core template, rows are marked `stale`
and the docs are regenerated and re-cached. Offline, it falls back to a direct
local render.

#### 7. Data model

| Table | Purpose |
|---|---|
| `usernames` | one handle per account; makes `@user/...` addresses resolvable |
| `dialects` / `dialect_versions` | spec storage, share codes, published versions |
| `sdev_extensions` / `core_requests` | authored extensions and the core-inclusion queue |
| `libraries` / `library_versions` | the registry and its pinned versions |
| `dialect_docs` | generated documentation cache with staleness flags |
| `code_files.dialect_slug` / `dialect_version` / `runtime` / `lib_pins` | signature mirror for search and sharing |

All tables are owner-scoped with public read where visibility allows, and every
table carries explicit grants. Published specs are **data only** — no
user-supplied executable host code — so opening someone else's dialect is safe.

---


### lang/ — language sources overview

_Source: `lang/README.md`_


This directory contains the core source code for the **SDEV programming language**.

> **Self-Hosting Status: 100% Pure SDEV**
>
> The SDEV language is completely self-hosted. There are **zero foreign programming language source files** (`.js`, `.mjs`, `.ts`, `.py`, `.wat`, `.s`) in `lang/`. Every compiler stage, virtual machine, operating system kernel, standard library module, paradigm expansion, linter, and translator is authored exclusively in pure `.sdev` files.
> Host bridges and test harnesses reside outside this directory in `src/lang-bridge/` and `scripts/`.

---

#### Directory Overview

```
lang/
├── compiler/              # Self-hosted compiler toolchain
│   ├── lexer.sdev         # Tokenizer: splits SDEV source code into tokens
│   ├── parser.sdev        # Recursive-descent AST parser
│   ├── codegen.sdev       # Bytecode generator: AST -> bytecode & string pool
│   └── driver.sdev        # Compiler driver: compiles source code to runnable bytecode
├── bootstrap/             # Stage-0 bootstrap & VM bytecode emitter
│   ├── seed_vm.sdev       # WebAssembly bytecode emitter & LEB128 encoding
│   └── bootstrap.sdev     # Stage-0 bootstrap bytecode compiler
├── runtime/               # Virtual Machine & OS Kernel
│   ├── vm.sdev            # Stack-based bytecode virtual machine & disassembler
│   └── kernel.sdev        # Virtual OS Kernel: VFS, process scheduler, pipes, syscalls
├── native/                # Native x86-64 code generation & linking
│   ├── codegen_x64.sdev   # x86-64 machine code instruction generator
│   ├── runtime_x64.sdev   # System V AMD64 runtime generator
│   ├── link.sdev          # Standalone ELF linker driver
│   └── README.md          # Native backend documentation
├── stdlib/                # Standard Library
│   ├── v2/                # Core v2 modular standard library
│   │   ├── text.sdev      # String manipulation, padding, reversal, v1 aliases
│   │   ├── list.sdev      # List manipulation, fold, filter, map, sorting
│   │   ├── tome.sdev      # Key-value map/dictionary operations
│   │   ├── math.sdev      # Math utilities, gcd/lcm, primes, stats, clamp
│   │   ├── bits.sdev      # Bitwise shifts, bitmask tests, popcount, hex
│   │   ├── time.sdev      # Time calculations, leap years, duration formatting
│   │   ├── func.sdev      # Functional combinators, take, drop, compose
│   │   ├── json.sdev      # JSON serialization and escape sequences
│   │   ├── types.sdev     # Dynamic type checking, conversions, coalesce
│   │   └── random.sdev    # Linear Congruential PRNG
│   ├── ml/                # Machine learning standard library
│   │   ├── tensor.sdev    # N-dimensional tensor operations
│   │   ├── autograd.sdev  # Reverse-mode automatic differentiation
│   │   ├── nn.sdev        # Neural network layers (dense, activation, loss)
│   │   ├── transformer.sdev # Attention and transformer architectures
│   │   ├── train.sdev     # Optimizers, training loops, checkpoints
│   │   ├── data.sdev      # Datasets, tokenization, batching
│   │   ├── cuda.sdev      # Hardware accelerator dispatch
│   │   ├── self_modify.sdev # Code introspection & self-modification
│   │   └── auto_evolve.sdev # Automated code evolution & benchmarking
│   ├── ffi.sdev           # Foreign Function Interface bindings
│   ├── testkit.sdev       # Unit test assertion framework
│   └── webgpu.sdev        # WebGPU shader & compute dispatch
├── paradigms/             # Multi-paradigm extensions
│   ├── functional.sdev    # Algebraic Data Types (`Option`, `Result`) and pattern matching
│   ├── systems.sdev       # Linear memory arenas, pointers, structs, peek/poke
│   ├── data.sdev          # DataFrames, columnar tables, CSV & Markdown serialization
│   └── hardware.sdev      # Microcontroller hardware transpiler (Arduino / C++)
├── translator/            # Natural language keyword translation
│   └── translator.sdev    # 26-language keyword translator & script detector
├── legacy/                # Compatibility frontends
│   └── v1_frontend.sdev   # SDEV v1 mystical syntax to v2 canonical syntax translator
├── linter/                # Diagnostic linter
│   └── linter.sdev        # Levenshtein distance, spelling corrections, linting rules
├── agent/                 # SDEV Understander & dialect agents
│   ├── ai-dialect.sdev    # AI conversational dialect translator
│   ├── blocks.sdev        # Block delimiter analyzer & balancer
│   ├── parser_eval.sdev   # AST evaluation engine in SDEV
│   ├── project.sdev       # Multi-file project indexer & resolver
│   └── understander.sdev  # Natural English to canonical SDEV code understander
└── parity/                # Parity test tracking
    ├── agent.sdev         # Parity validation agent in pure SDEV
    ├── features.json      # 209 language features across v1, v2, and native tracks
    └── report.json        # Auto-generated verification report (0 missing required features)
```

---

#### Toolchain & Compilation Architecture

##### 1. Stage-0 Bootstrap & Seed VM (`lang/bootstrap/`)
The foundation begins with a minimal 8KB WebAssembly execution seed (`src/lang-bridge/seed/seed.wat`). The seed VM implements a compact bytecode instruction set. `lang/bootstrap/seed_vm.sdev` provides the complete specification of bytecode opcodes, LEB128 variable-length integer encoding, and binary WebAssembly generation in pure SDEV. `lang/bootstrap/bootstrap.sdev` compiles stage-0 AST nodes into runnable bytecode.

##### 2. Self-Hosted Compiler (`lang/compiler/`)
The self-hosted compiler is structured into three clean stages:
- **`lexer.sdev`**: Scans SDEV source text into a stream of typed tokens (`INT`, `STR`, `IDENT`, `OP`, `KW`).
- **`parser.sdev`**: Recursive-descent parser that constructs the structured Abstract Syntax Tree (AST).
- **`codegen.sdev`**: Walks the AST to generate compact bytecode instructions and an interned string pool table.
- **`driver.sdev`**: Standalone compiler driver that compiles SDEV source files directly into self-contained bytecode bundles.

Fixed-point self-compilation is verified by compiling the compiler with itself:
$$\text{Compiler}_{\text{self}}(\text{Compiler}_{\text{src}}) \equiv \text{Compiler}_{\text{oracle}}(\text{Compiler}_{\text{src}})$$
Producing byte-identical bytecode across all stages (`bc=19214, pool=737`).

##### 3. Native x86-64 Backend (`lang/native/`)
The native compiler produces bare-metal x86-64 machine code:
- **`codegen_x64.sdev`**: Emits System V AMD64 instructions (`mov`, `push`, `pop`, `add`, `sub`, `imul`, `idiv`, `cmp`, `jmp`, `call`, `syscall`).
- **`runtime_x64.sdev`**: Generates the minimal standalone runtime containing `_start`, memory allocators, string formatting, and Linux syscall wrappers (`write`, `exit`, `clock_gettime`).
- **`link.sdev`**: Drives standard native linkers (`ld`, `ld.lld`, `gcc`) to generate static or dynamic ELF executables.

##### 4. Virtual Machine & Operating System Kernel (`lang/runtime/`)
- **`vm.sdev`**: Stack-based bytecode virtual machine capable of stepping, disassembling, and executing SDEV bytecode with full call-frame management and arithmetic/control-flow opcode dispatch.
- **`kernel.sdev`**: Virtual operating system kernel with an in-memory Virtual File System (VFS), process table, round-robin scheduler, inter-process pipes, environment variables, and POSIX-like system calls (`sys_read`, `sys_write`, `sys_spawn`, `sys_open`).

##### 5. Standard Library (`lang/stdlib/v2/`)
Modular, high-performance standard library components covering strings (`text.sdev`), lists (`list.sdev`), associative dictionaries (`tome.sdev`), advanced arithmetic & prime testing (`math.sdev`), bitwise manipulation (`bits.sdev`), calendar/clock calculations (`time.sdev`), functional combinators (`func.sdev`), JSON encoding (`json.sdev`), runtime type introspection (`types.sdev`), and pseudo-random number generation (`random.sdev`).

---

#### Test Verification

The entire language toolchain is tested using the SDEV host environment:

| Test Suite | Command | Description |
| :--- | :--- | :--- |
| **Toolchain** | `npm run test:toolchain` | Lexer, parser, and codegen self-compilation |
| **Driver** | `npm run test:driver` | Standalone driver artifact verification |
| **Lexer** | `npm run test:self-lexer` | Self-hosted lexer tokenizer suite |
| **Parser** | `npm run test:self-parser` | Self-hosted AST parser suite |
| **Codegen** | `npm run test:self-codegen` | 52/52 bytecode emission test cases |
| **Fixed-Point** | `npm run test:fixed-point` | Shim and bootstrap fixed-point parity |
| **WASM Runtime** | `node scripts/test-wasm-runtime.mjs` | Seed VM bytecode execution (73/73 passed) |
| **Native x86-64** | `wsl node scripts/test-native.mjs` | Bare-metal Linux ELF generation (81/81 passed) |
| **Self-Hosted Stdlib** | `node bin/sdevhost.mjs scripts/test-selfhosted-stdlib.sdev` | All 10 v2 stdlib modules |
| **Self-Hosted Subsystems** | `node bin/sdevhost.mjs scripts/test-selfhosted-subsystems.sdev` | VM, Kernel, Translator, Frontend, Paradigms, Linter |
| **Parity Gate** | `node scripts/run-ts.mjs scripts/test-parity.ts` | 209 features across 3 tracks (0 missing required) |

---


### Native x86-64 backend

_Source: `lang/native/README.md`_


The **browser IDE** runs SDEV on WebAssembly (see `lang/bootstrap/seed_vm.sdev` and `src/lang-bridge/seed/`).
This directory is the **desktop** backend: it compiles SDEV to real x86-64 assembly (GAS/AT&T syntax) and links it into a static Linux ELF without libc.

#### Files

- `codegen_x64.sdev` — SDEV-authored x86-64 GAS assembly codegen and feature catalogue.
- `runtime_x64.sdev` — SDEV-authored System V AMD64 assembly runtime generator (`_start`, `sdev_say_int`, `sdev_say_str`, syscalls).
- `link.sdev` — SDEV-authored native ELF assembler and linker driver.

The host bridge and pre-built asm runtime live under `src/lang-bridge/native/` and `bin/runtime.s`.

#### Usage (CLI)

```bash
node scripts/sdev-native.mjs prog.sdev -o prog
./prog
```

The compiler will:
1. Parse `prog.sdev`,
2. Emit `prog.s` next to `prog`,
3. Assemble + link into `prog` (static ELF, no libc, ~1 KB).

---


### Desktop IDE shell

_Source: `electron/README.md`_


A real, out-of-browser SDEV IDE. It bundles the same UI as the web IDE
(`/ide`) and adds a native-assembly compile path:

- **Web IDE** → runs SDEV inside WebAssembly (browser's own assembly).
- **Desktop IDE** → same UI, plus **"Build Native"** which pipes your
  program through `lang/native/codegen-x64.mjs` + `as` + `ld` and produces
  a real x86-64 Linux ELF you can execute on your machine.

#### Requirements on the host
- Node.js 20+
- `binutils` on `PATH` (`as`, `ld`) for the native backend
  - Linux: `sudo apt install binutils` / `pacman -S binutils`
  - macOS: `xcode-select --install` (uses `as`/`ld64`, Linux ELF target
    needs a cross-binutils; see `lang/native/README.md`)

#### Dev loop

```bash
# terminal 1
npm run dev                        # vite at http://localhost:8080

# terminal 2
SDEV_DESKTOP_DEV=1 npx electron electron/main.cjs
```

#### Production build

```bash
# 1) Build the web bundle with relative asset paths (file:// safe)
SDEV_ELECTRON=1 npm run build

# 2) Package the desktop app (installs electron + packager on first run)
npm install --save-dev electron @electron/packager
npx @electron/packager . "SDEV" \
  --platform=linux --arch=x64 \
  --out=electron-release --overwrite \
  --ignore='^/src' --ignore='^/public' --ignore='^/electron-release'
```

The output at `electron-release/SDEV-linux-x64/SDEV` is a standalone
desktop program. Ship it as a `.tar.gz`:

```bash
tar czf SDEV-linux-x64.tar.gz -C electron-release SDEV-linux-x64/
```

#### Renderer bridge

Inside the app, `window.sdevDesktop` exposes:

| method                                | purpose                                 |
| ------------------------------------- | --------------------------------------- |
| `platform()`                          | `{platform, arch, version}`             |
| `openFile()`                          | native open dialog → `{path, content}`  |
| `saveFile({path, content})`           | native save dialog / overwrite          |
| `compileNative({source, outPath?})`   | SDEV → x86-64 → ELF via `as`+`ld`       |
| `runNative({outPath})`                | spawn the produced binary, capture I/O  |

The web build does not define `window.sdevDesktop`, so any UI that gates
on it stays hidden in the browser.

#### Updates

The desktop app opens the live editor from the website, so it is always the newest version; without internet it uses the bundled copy. When the desktop shell itself changes, it offers the new download.

---


## Part V — Python parity


### Python feature-parity reference

_Source: `public/SDEV_PYTHON_PARITY_DOCUMENTATION.md`_


> Status: living document. Every feature listed here is implemented in the
> sdev v1 interpreter (`src/lang/`) and exercised by the parity smoke tests.
> sdev keeps two spellings for every keyword: the **mystic** v1 spelling
> (`forge`, `conjure`, `either`) and the **plain** v2/Python-like spelling
> (`let`, `def`, `if`). Both compile to the same tokens.

---

#### 1. Keyword map

| Python | sdev plain | sdev mystic | Notes |
| --- | --- | --- | --- |
| `=` (binding) | `let` | `forge` | `forge x be 1` |
| `=` (rebind) | `set` | `be` | `be x be 2` |
| `def` | `def` | `conjure` | |
| `return` | `return` | `yield` | `yield` as generator uses `emit` (see §6) |
| `class` | `class` / `kind` | `essence` | `essence` and `kind` are *contextual* — still usable as identifiers |
| `if` / `elif` / `else` | `if` / `elif` / `else` | `either` / `elsewise` / `otherwise` | |
| `while` | `while` | `cycle` | |
| `for x in xs` | `for x in xs` | `iterate x through xs` | |
| `break` / `continue` | `break` / `continue` | `yeet` / `skip` | |
| `pass` | `pass` | `idle` | |
| `try` / `except` / `finally` | `try` / `except` / `finally` | `attempt` / `rescue` / `ensure` | |
| `raise` | `raise` / `throw` | `hurl` | |
| `assert` | `assert` | `insist` | |
| `with` | `with` | `enfold` | `weave` stays the list-join builtin |
| `match` | `match` | `discern` | `sift` stays the filter builtin |
| `import` / `from` | `import` / `from` | `summon` / `from` | |
| `as` | `as` | `alias` | |
| `global` / `nonlocal` | `global` / `nonlocal` | `worldly` / `outer` | |
| `del` | `del` | `banish` | |
| `lambda` | `lambda` | `spell` | |
| `async` / `await` | `async` / `await` | `async` / `await` | |
| `True` / `False` / `None` | `true` / `false` / `null` | `yep` / `nope` / `void` | |
| `and` / `or` / `not` | `and` / `or` / `not` | `also` / `either`-form / `isnt` | |
| `==` / `!=` / `is` | `==` / `!=` / `is` | `equals` / `differs` / `same` | |

Contextual keywords (`essence`, `kind`) are only treated as class
declarations when a name follows them, so legacy programs that use `kind`
as a variable keep working.

---

#### 2. Literals and data types

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

Supported literal forms: underscores in numbers (`1_000_000`), hex/octal/binary
(`0xff`, `0o17`, `0b1010`), complex-free float exponents (`1e-9`),
raw strings (`r"\d+"`), f-strings with `{expr}`, `{expr!r}`, `{expr:spec}`
and `{expr=}` debug output, and triple-quoted multiline strings.

---

#### 3. Operators

Arithmetic `+ - * / // % **`, bitwise `& | ^ ~ << >>`, comparison
`< <= > >= == != is is not in not in`, boolean `and or not`, ternary
`a if cond else b`, walrus `:=`, chained comparisons (`0 < x < 10`),
augmented assignment (`+= -= *= /= //= %= **= &= |= ^= <<= >>=`).

Slicing follows Python exactly, negative indices included:

```sdev
xs[1:]        xs[:3]        xs[::2]       xs[::-1]      xs[-2:]
```

---

#### 4. Destructuring

```sdev
forge a, b be (1, 2)
forge head, *rest be [1, 2, 3, 4]     // rest == [2, 3, 4]
forge *init, last be [1, 2, 3]        // init == [1, 2]
iterate k, v through d.items() :: speak(k) ;;
```

---

#### 5. Functions

```sdev
conjure greet(name, greeting be "hi", *args, **kwargs) ::
    yield greeting + " " + name
;;
```

Supported: positional/keyword arguments, defaults, `*args`, `**kwargs`,
keyword-only parameters after `*`, unpacking at call sites (`f(*xs, **kw)`),
nested functions, closures, recursion, decorators (stacked and
parameterised), and first-class function values.

```sdev
conjure twice(fn) ::
    conjure inner(x) :: yield fn(fn(x)) ;;
    yield inner
;;

@twice
conjure inc(x) :: yield x + 1 ;;
speak(inc(1))   // 3
```

---

#### 6. Generators, iterators, async

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

`emit from` delegates (Python `yield from`). `async conjure` + `await`
drive the same generator machinery; `await` suspends and resumes on
promise settlement.

---

#### 7. Classes and protocols

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

Dunder methods are automatically aliased onto sdev's native protocol slots
(`__init__` ↔ `on_create`, `__add__` ↔ `on_add`, `__str__` ↔ `on_text`,
`__repr__` ↔ `on_repr`, `__len__` ↔ `size`, `__iter__`, `__getitem__`,
`__setitem__`, `__call__`, `__eq__`, `__lt__`, `__contains__`, `__enter__`,
`__exit__`, …). Writing either spelling works.

Multiple inheritance resolves via **C3 linearization**, matching Python's
MRO. `super()` walks the linearised chain. `@staticmethod`,
`@classmethod`, `@property` and metaclasses are supported.

---

#### 8. Exceptions

```sdev
attempt ::
    hurl ValueError("bad")
rescue ValueError alias e ::
    speak(str(e))        // "bad" — str(exc) is the message, as in Python
ensure ::
    speak("cleanup")
;;
```

Built-in exception hierarchy: `Exception`, `ValueError`, `TypeError`,
`KeyError`, `IndexError`, `AttributeError`, `ZeroDivisionError`,
`StopIteration`, `RuntimeError`, `NotImplementedError`, `AssertionError`,
`OSError` and friends. Multiple `rescue` clauses, tuple-of-types clauses,
bare `rescue`, and `else` blocks all behave as in Python.

---

#### 9. Comprehensions

```sdev
[x * x for x in range(10) if x % 2 == 0]
{x for x in xs}
{v: k for k, v in pairs.items()}      // keys are expressions, not bare words
(x for x in xs)                        // generator expression
```

Nested clauses and multiple `if` filters are supported. Inside a dict
comprehension the key is always evaluated as an expression — the
bare-identifier shorthand only applies to dict *literals*.

---

#### 10. Context managers

```sdev
enfold open("f.txt") alias fh ::
    speak(fh.read())
;;
```

`__enter__` / `__exit__` (or the mystic `on_enter` / `on_exit`) are called,
and `__exit__` still runs when the body raises.

---

#### 11. Pattern matching

```sdev
discern value ::
    when 0 :: speak("zero") ;;
    when [x, y] :: speak(x + y) ;;
    when {"kind": k} :: speak(k) ;;
    when Point(x be px) :: speak(px) ;;
    when _ :: speak("other") ;;
;;
```

Literal, capture, wildcard, sequence, mapping, class and or-patterns
(`when 1 | 2 | 3`) with guards (`when x if x > 10`).

---

#### 12. Builtins

All Python builtins are available. Where a name would shadow an existing
sdev v1 builtin, the Python version is exposed with a `py_` prefix
(for example `py_sum`, `py_map`, `py_filter`); non-colliding names are
global.

`abs any all ascii bin bool bytes callable chr dict dir divmod enumerate
eval filter float format frozenset getattr hasattr hash hex id input int
isinstance issubclass iter len list map max min next object oct ord pow
print range repr reversed round set setattr slice sorted str sum tuple
type vars zip`

Method-call sugar works on plain values, so both spellings are valid:

```sdev
xs.append(4)        // same as append(xs, 4)
d.items()           // same as items(d)
"a,b".split(",")    // same as split("a,b", ",")
```

String methods: `upper lower strip lstrip rstrip split rsplit splitlines
join replace find rfind index startswith endswith count center ljust
rjust zfill title capitalize swapcase encode format isdigit isalpha
isalnum isspace islower isupper partition removeprefix removesuffix`.

List methods: `append extend insert remove pop clear index count sort
reverse copy`. Dict methods: `keys values items get pop popitem setdefault
update clear copy`. Set methods: `add discard remove union intersection
difference symmetric_difference issubset issuperset`.

---

#### 13. Modules

```sdev
summon math
from collections summon Counter alias Bag
```

Bundled parity modules: `math`, `random`, `json`, `re`, `time`, `datetime`,
`itertools`, `functools`, `collections`, `string`, `os.path`, `sys`,
`statistics`, `decimal`-lite, `textwrap`, `heapq`, `bisect`.

---

#### 14. Track coverage

The Python-parity surface described here is implemented on the **v1
interpreter track** (browser IDE and Node CLI). The self-hosted v2
compiler and the native x86-64 backend track the core language subset
listed in the [Track Parity Matrix](/docs?doc=parity); the parity agent
(`lang/parity/agent.sdev`) fails CI whenever a required feature regresses
on any track.

---


## Part V — Track parity


### Parity registry, agent and matrix

_Source: `public/SDEV_PARITY_DOCUMENTATION.md`_


Every sdev track — the v1 TypeScript interpreter, the self-hosted v2 compiler
running on the seed VM, and the native x86-64 backend — is measured against a
single canonical feature registry: `lang/parity/features.json`.

#### How parity is enforced

1. `lang/parity/features.json` lists every feature once: its name, area, kind,
   signature, and the required support level per track (`must`, `should`,
   `n/a`), plus the track-local name (v1's `measure` is v2's `length`).
2. `lang/parity/agent.sdev` — the parity agent, itself written in sdev and
   executed on sdev — loads the registry, reads each track's source, probes
   every feature, writes `lang/parity/report.json`, and regenerates the matrix
   below.
3. `scripts/test-parity.ts` runs the agent in CI. A missing `must` feature is a
   build failure; a missing `should` feature is a reported gap.

Adding a new track (a v3, another backend) means appending one entry to the
registry's `tracks` array — the agent picks it up with no code change.

#### Levels

| Level | Meaning |
| --- | --- |
| `must` | The track is broken without it. Missing = red build. |
| `should` | Expected; the gap is a tracked bug, not a build failure. |
| `n/a` | Physically impossible on that track (canvas on the seed VM, floats in the current native backend). |

#### Parity matrix

The table below is generated by the agent. Do not edit it by hand.

<!-- PARITY:BEGIN -->

| Feature | Area | sdev v1 (TypeScript interpreter) | sdev v2 (self-hosted compiler on the seed VM) | native x86-64 backend |
| --- | --- | --- | --- | --- |
| `say` | io | `speak` | `say` | `say` |
| `length` | core | `measure` | `length` | `length` |
| `concat` | text | `etch` | `concat` | `concat` |
| `ord` | text | `ord` | `ord` | `ord` |
| `chr` | text | `chr` | `chr` | `chr` |
| `str` | text | `str` | `str` | `str` |
| `int` | types | `int` | `int` | `int` |
| `num` | types | `num` | `num` | `num` |
| `list_new` | list | `gather` | `mklist` | `list_new` |
| `list_get` | list | `pluck` | `mklist` | `index` |
| `upper` | text | `upper` | `upper` | `upper` |
| `lower` | text | `lower` | `lower` | `lower` |
| `trim` | text | `trim` | `trim` | `trim` |
| `contains` | text | `contains` | `contains` | `contains` |
| `replace` | text | `replace` | `replace` | `replace` |
| `split` | text | `shatter` | `split` | `split` |
| `join` | text | `weave` | `join` | `join` |
| `abs` | math | `abs` | `fabs` | `abs` |
| `min` | math | `least` | `min` | `min` |
| `max` | math | `greatest` | `max` | `max` |
| `floor` | math | `ground` | `f2i` | `floor` |
| `ceil` | math | `elevate` | `fceil` | `ceil` |
| `round` | math | `nearby` | `fround` | `round` |
| `sqrt` | math | `root` | `fsqrt` | `sqrt` |
| `pow` | math | `pow` | `fpow` | `pow` |
| `sin` | math | `sin` | `fsin` | `sin` |
| `cos` | math | `cos` | `fcos` | `cos` |
| `exp` | math | `exp` | `fexp` | `exp` |
| `log` | math | `ln` | `flog` | `log` |
| `random` | math | `rand` | `random` | `random` |
| `range` | list | `range` | `range` | `range` |
| `sum` | list | `sum` | `sum` | `sum` |
| `keys` | tome | `tome_keys` | `keys` | `keys` |
| `read_file` | io | `read_file` | `read_file` | `read_file` |
| `write_file` | io | `write_file` | `write_file` | `write_file` |
| `http_get` | net | `http_get` | `http_get` | — |
| `var_decl` | syntax | `forge` | `set` | `set` |
| `assign` | syntax | `be` | `set` | `set` |
| `if` | syntax | `either` | `if` | `if` |
| `else` | syntax | `otherwise` | `else` | `else` |
| `while` | syntax | `cycle` | `while` | `while` |
| `for_each` | syntax | `iterate` | `each` | `foreach` |
| `break` | syntax | `yeet` | `break` | `break` |
| `continue` | syntax | `skip` | `continue` | `continue` |
| `function` | syntax | `conjure` | `to` | `call` |
| `return` | syntax | `yield` | `return` | `return` |
| `params` | syntax | `conjure` | `with` | `call` |
| `recursion` | syntax | `conjure` | `to` | `call` |
| `lambda` | syntax | `ARROW` | `make` | — |
| `class` | oop | `essence` | `kind` | — |
| `inherit` | oop | `extend` | `extends` | — |
| `self` | oop | `self` | — | — |
| `super` | oop | `super` | `super` | — |
| `instantiate` | oop | `new` | `new` | — |
| `try_catch` | errors | `attempt` | `attempt` | — |
| `rescue` | errors | `rescue` | `rescue` | — |
| `throw` | errors | `throw` | `throw` | — |
| `logic_and` | syntax | `also` | `and` | `and` |
| `logic_or` | syntax | `within` | `or` | `or` |
| `logic_not` | syntax | `nope` | `not` | `un` |
| `equality` | syntax | `equals` | `is` | `is` |
| `inequality` | syntax | `differs` | `not` | `isnot` |
| `bool_true` | types | `yep` | `true` | `true` |
| `bool_false` | types | `nope` | `false` | `false` |
| `nothing` | types | `void` | `nothing` | `nothing` |
| `list_literal` | types | `gather` | `mklist` | `list` |
| `tome_literal` | types | `tome_keys` | `tome_literal` | `tome` |
| `import` | modules | `summon` | `use` | — |
| `float` | types | `num` | `i2f` | `float` |
| `string` | types | `str` | `str` | `str` |
| `values` | tome | `values` | `values` | `values` |
| `has` | tome | `has` | `has` | `has` |
| `py_print` | python | `print` | — | — |
| `py_str` | python | `str` | — | — |
| `py_repr` | python | `repr` | — | — |
| `py_int` | python | `int` | — | — |
| `py_float` | python | `float` | — | — |
| `py_bool` | python | `bool` | — | — |
| `py_complexish` | python | `complexish` | — | — |
| `py_bytes` | python | `bytes` | — | — |
| `py_list` | python | `list` | — | — |
| `py_tuple` | python | `tuple` | — | — |
| `py_set` | python | `set` | — | — |
| `py_frozenset` | python | `frozenset` | — | — |
| `py_dict` | python | `dict` | — | — |
| `py_len` | python | `len` | — | — |
| `py_range` | python | `range` | — | — |
| `py_enumerate` | python | `enumerate` | — | — |
| `py_zip` | python | `zip` | — | — |
| `py_zip_longest` | python | `zip_longest` | — | — |
| `py_map` | python | `map` | — | — |
| `py_filter` | python | `filter` | — | — |
| `py_any` | python | `any` | — | — |
| `py_all` | python | `all` | — | — |
| `py_sorted` | python | `sorted` | — | — |
| `py_reversed` | python | `reversed` | — | — |
| `py_min` | python | `min` | — | — |
| `py_max` | python | `max` | — | — |
| `py_sum` | python | `sum` | — | — |
| `py_abs` | python | `abs` | — | — |
| `py_round` | python | `round` | — | — |
| `py_pow` | python | `pow` | — | — |
| `py_divmod` | python | `divmod` | — | — |
| `py_bin` | python | `bin` | — | — |
| `py_oct` | python | `oct` | — | — |
| `py_hex` | python | `hex` | — | — |
| `py_type` | python | `type` | — | — |
| `py_isinstance` | python | `isinstance` | — | — |
| `py_issubclass` | python | `issubclass` | — | — |
| `py_getattr` | python | `getattr` | — | — |
| `py_setattr` | python | `setattr` | — | — |
| `py_hasattr` | python | `hasattr` | — | — |
| `py_delattr` | python | `delattr` | — | — |
| `py_vars` | python | `vars` | — | — |
| `py_dir` | python | `dir` | — | — |
| `py_callable` | python | `callable` | — | — |
| `py_id` | python | `id` | — | — |
| `py_hash` | python | `hash` | — | — |
| `py_format` | python | `format` | — | — |
| `py_iter` | python | `iter` | — | — |
| `py_next` | python | `next` | — | — |
| `py_send` | python | `send` | — | — |
| `py_close` | python | `close` | — | — |
| `py_collect` | python | `collect` | — | — |
| `py_property` | python | `property` | — | — |
| `py_staticmethod` | python | `staticmethod` | — | — |
| `py_classmethod` | python | `classmethod` | — | — |
| `py_wraps` | python | `wraps` | — | — |
| `py_cache` | python | `cache` | — | — |
| `py_partial` | python | `partial` | — | — |
| `py_reduce` | python | `reduce` | — | — |
| `py_dataclass` | python | `dataclass` | — | — |
| `py_count` | python | `count` | — | — |
| `py_cycle` | python | `cycle` | — | — |
| `py_repeat` | python | `repeat` | — | — |
| `py_chain` | python | `chain` | — | — |
| `py_islice` | python | `islice` | — | — |
| `py_product` | python | `product` | — | — |
| `py_permutations` | python | `permutations` | — | — |
| `py_combinations` | python | `combinations` | — | — |
| `py_accumulate` | python | `accumulate` | — | — |
| `py_groupby` | python | `groupby` | — | — |
| `py_Counter` | python | `Counter` | — | — |
| `py_defaultdict` | python | `defaultdict` | — | — |
| `py_namedtuple` | python | `namedtuple` | — | — |
| `py_deque` | python | `deque` | — | — |
| `py_OrderedDict` | python | `OrderedDict` | — | — |
| `py_union` | python | `union` | — | — |
| `py_intersection` | python | `intersection` | — | — |
| `py_difference` | python | `difference` | — | — |
| `py_symmetric_difference` | python | `symmetric_difference` | — | — |
| `py_issubset` | python | `issubset` | — | — |
| `py_set_add` | python | `set_add` | — | — |
| `py_set_remove` | python | `set_remove` | — | — |
| `py_keys` | python | `keys` | — | — |
| `py_values` | python | `values` | — | — |
| `py_items` | python | `items` | — | — |
| `py_get` | python | `get` | — | — |
| `py_setdefault` | python | `setdefault` | — | — |
| `py_update` | python | `update` | — | — |
| `py_pop` | python | `pop` | — | — |
| `py_slice_assign` | python | `slice_assign` | — | — |
| `py_module` | python | `module` | — | — |
| `py_truthy` | python | `truthy` | — | — |
| `py_is_generator` | python | `is_generator` | — | — |
| `py_freeze` | python | `freeze` | — | — |
| `py_ascii` | python | `ascii` | — | — |
| `pysyn_generator` | python-syntax | `generator` | — | — |
| `pysyn_with` | python-syntax | `with` | — | — |
| `pysyn_as` | python-syntax | `as` | — | — |
| `pysyn_match` | python-syntax | `match` | — | — |
| `pysyn_case` | python-syntax | `case` | — | — |
| `pysyn_async` | python-syntax | `async` | — | — |
| `pysyn_await` | python-syntax | `await` | — | — |
| `pysyn_lambda` | python-syntax | `lambda` | — | — |
| `pysyn_assert` | python-syntax | `assert` | — | — |
| `pysyn_del` | python-syntax | `del` | — | — |
| `pysyn_global` | python-syntax | `global` | — | — |
| `pysyn_nonlocal` | python-syntax | `nonlocal` | — | — |
| `pysyn_pass` | python-syntax | `pass` | — | — |
| `pysyn_raise` | python-syntax | `raise` | — | — |
| `pysyn_from` | python-syntax | `from` | — | — |
| `pysyn_finally` | python-syntax | `finally` | — | — |
| `pysyn_in` | python-syntax | `in` | — | — |
| `pysyn_not` | python-syntax | `not` | — | — |
| `pysyn_is` | python-syntax | `is` | — | — |
| `pysyn_elif` | python-syntax | `elif` | — | — |
| `pysyn_try` | python-syntax | `try` | — | — |
| `pysyn_except` | python-syntax | `except` | — | — |
| `pysyn_class` | python-syntax | `class` | — | — |
| `pysyn_def` | python-syntax | `def` | — | — |
| `pysyn_import` | python-syntax | `import` | — | — |
| `pysyn_return` | python-syntax | `return` | — | — |
| `pysyn_while` | python-syntax | `while` | — | — |
| `pysyn_for` | python-syntax | `for` | — | — |
| `pysyn_break` | python-syntax | `break` | — | — |
| `pysyn_continue` | python-syntax | `continue` | — | — |
| `pysyn_true` | python-syntax | `true` | — | — |
| `pysyn_false` | python-syntax | `false` | — | — |
| `pysyn_none` | python-syntax | `none` | — | — |
| `pysyn_and` | python-syntax | `and` | — | — |
| `pysyn_or` | python-syntax | `or` | — | — |
| `args` | os | — | — | `args` |
| `env` | os | — | — | `env` |
| `exit` | os | — | — | `exit` |
| `now_ms` | os | — | — | `now_ms` |
| `sleep_ms` | os | — | — | `sleep_ms` |
| `append_file` | io | — | — | `append_file` |
| `say_err` | io | — | — | `say_err` |

<!-- PARITY:END -->

#### Reading a gap

A cell reading `gap (should)` means the registry expects the feature on that
track but the probe did not find it. That is the working list for the
self-hosting milestones (5q–5x): floats and host I/O, logical operators,
`break`/`continue`/`for each`, tomes, closures, `try`/`catch`, classes, and the
remaining sugar — each one landing in `lang/compiler/*.sdev` plus the seed VM,
and each one preserving the byte-identical self-compilation fixed point.

---


## Part VI — Machine learning and LLMs


### ML & LLM standard library

_Source: `public/SDEV_ML_DOCUMENTATION.md`_


A complete ML/LLM stack written in sdev itself. Everything lives under
`lang/stdlib/ml/` and runs on both the WASM (browser) and Native ASM
(desktop CLI) tracks, gated on the Phase-A prerequisites (Milestone 6
floats, Milestone 7 file I/O + `http_get`).

#### Modules

| File | Purpose |
| --- | --- |
| `tensor.sdev` | Core tensor primitive (data + shape), element-wise ops, `matmul`, activations (`relu`, `sigmoid`, `softmax`), losses (`mse`, `cross_entropy`), initializers (`zeros`, `ones`, `randn`). |
| `autograd.sdev` | Reverse-mode autograd. Global tape, differentiable ops (`d_add`, `d_mul`, `d_matmul`, `d_relu`, `d_mse`), `backward(out)`, `sgd_step(params, lr)`. |
| `nn.sdev` | High-level layers (`linear`, `relu_layer`, `sequential`) and a `fit(model, xs, ys, epochs, lr)` training loop. |
| `transformer.sdev` | Decoder-only transformer: `embedding`, `layer_norm`, `attention_head`, `transformer_block`, `gpt(vocab, dim, hidden, layers)`, plus `generate(model, prompt, max_new)` for autoregressive sampling. |
| `train.sdev` | Language-model training (M14): `lm_batches`, `lm_step`, `lm_fit`, `lm_loss`, `perplexity`, `sample_topk`, `lm_generate`, `lm_complete`, `save_checkpoint` / `load_checkpoint`. |
| `data.sdev` | Dataset I/O (`load_text`, `save_text`), char-level tokenizer (`char_vocab`, `encode`, `decode`), web crawler (`crawl`, `crawl_many`), teacher-model distillation helpers, and `save_model`. |
| `self_modify.sdev` | Gated self-modification: `self_read`, `self_propose` (routes through a review hook), `mine_demand` for feature-demand scraping, `update_docs`, and `rewrite_weights` for out-of-band parameter surgery. |

#### Quick start

```sdev
link "stdlib/ml/nn.sdev"

// Learn y = 2x + 1
forge xs be gather()
forge ys be gather()
forge i be 0
cycle i < 32 ::
    forge v be i * 0.1
    pluck(xs, tensor([v], [1, 1]))
    pluck(ys, tensor([2.0 * v + 1.0], [1, 1]))
    be i be i + 1
;;

forge model be sequential([
    linear(1, 8),
    relu_layer(),
    linear(8, 1)
])

fit(model, xs, ys, 100, 0.05)
```

#### Training a tiny LLM

```sdev
link "stdlib/ml/transformer.sdev"
link "stdlib/ml/data.sdev"

forge text be load_text("corpus.txt")
forge vocab be char_vocab(text)
forge ids be encode(vocab, text)

forge model be gpt(vocab.size, 64, 128, 2)  // dim=64, ffn=128, 2 blocks

// train_step / fit works the same as MLPs — feed context windows.
```

#### Teacher-model distillation

```sdev
link "stdlib/ml/data.sdev"

forge prompts be ["explain gravity", "what is a compiler?"]
forge pairs be distill_batch(
    "https://ai.gateway.lovable.dev/v1/chat",
    "$LOVABLE_API_KEY",
    prompts
)
// pairs now holds { prompt, target } — train your local model to imitate.
```

#### Self-modification (gated)

```sdev
link "stdlib/ml/self_modify.sdev"

// Install a review hook — every proposed edit passes through this.
set_review_hook(conjure(path, body) :: yield confirm("Apply edit to " + path + "?") ;;)

forge src be self_read("src/lang/interpreter.ts")
// ... model generates a patched version in `patched` ...
self_propose("src/lang/interpreter.ts", patched)

// Mine feature demand from GitHub / Reddit / HN
forge topics be mine_demand([
    "https://api.github.com/repos/rust-lang/rust/issues",
    "https://www.reddit.com/r/programminglanguages/top.json"
])
```

#### Backend acceleration

The ML stdlib runs unaccelerated on the seed VM today. Later milestones
add hardware backends without changing the sdev API surface:

- **M9 — FFI:** call `libcudart`, `libc`, and Metal from the Native track.
- **M10 — WebGPU:** browser tensors dispatch through `navigator.gpu`.
- **M11 — CUDA:** `matmul` / `attention` fast paths bind to cuBLAS + FlashAttention.

#### Safety notes

- `self_modify.sdev` is off by default. Nothing writes to disk until
  `set_review_hook` is called with a function that returns `yep`.
- `http_get` in the browser runtime is a stub (sync HTTP is unavailable
  in-page); use the Native/Electron builds for live training data.
- Weights are stored in host memory only — no telemetry, no upload.

#### Training a language model end to end (M14)

`train.sdev` closes the loop: real next-token cross-entropy with a proper
backward pass, Adam with global-norm gradient clipping, temperature/top-k
sampling, evaluation, and plain-text checkpoints.

```sdev
link "stdlib/ml/train.sdev"

forge text be load_text("corpus.txt")
forge v be char_vocab(text)
forge ids be encode(v, text)

forge model be gpt(v.size, 32, 64, 2)
forge result be lm_fit(model, ids, 16, 20, 0.01)   // block, epochs, lr
speak("final loss: " + str(result.final))
speak("perplexity: " + str(perplexity(model, ids, 16)))

save_checkpoint("model.ckpt", model)
speak(lm_complete(model, v, "hello", 40, 0.8, 5))  // prompt, tokens, temp, k
```

##### API

- `lm_batches(ids, block)` → `{ xs, ys, block, count }` sliding-window pairs.
- `lm_step(model, opt, ctx, targets, lr)` → scalar loss for one update.
- `lm_fit(model, ids, block, epochs, lr)` → `{ history, final, opt }`.
- `lm_loss(model, ids, block)` / `perplexity(model, ids, block)` — evaluation.
- `sample_topk(logits, temperature, k)` → token id.
- `lm_generate(model, prompt_ids, max_new, temperature, k)` → token list.
- `lm_complete(model, vocab, prompt, max_new, temperature, k)` → text.
- `save_checkpoint(path, model)` / `load_checkpoint(path, model)` — one
  parameter tensor per line as `shape|values`; requires host file I/O.

Autograd gained the pieces this needs: `d_softmax_ce(logits, targets)` with
its `bw_sce` backward rule, `zero_grads`, `clip_grads(params, max_norm)`,
and `adam_new` / `adam_step`.

---


### Autonomous evolution loop

_Source: `public/SDEV_AUTOEVOLVE_DOCUMENTATION.md`_


The final piece of the ML stack: a loop that lets an sdev-trained
model read demand signals, patch sdev's own source, and fine-tune
itself on fresh teacher data — all written in sdev, all gated
behind a single review hook.

Lives in `lang/stdlib/ml/auto_evolve.sdev`.

#### Safety model

Nothing writes to disk until you install a review hook:

```sdev
link "stdlib/ml/self_modify.sdev"
set_review_hook(conjure(path, body) ::
    yield confirm("Apply " + path + "?")
;;)
```

Without a hook, `apply_proposal(...)` silently returns `nope`.
Even with a hook, only files in `SDEV_SOURCE_FILES` are eligible —
`is_allowed(path)` rejects anything else before the hook ever sees it.

#### API

| Function | Purpose |
| --- | --- |
| `is_allowed(path)` | Whitelist check. |
| `make_proposal(path, old, new_body, reason)` | Build a patch record; fields are `path`, `old`, `updated`, `reason`, `applied`. |
| `apply_proposal(p)` | Route through the review hook and write. |
| `draft_from_demand(model, demand, path)` | Ask the model to rewrite a file toward the top demand topic. |
| `evolve_weights(model, url, key, prompts, epochs, lr)` | Distill a teacher model and SGD-step on the pairs. |
| `evolve_tick(model, sources, url, key)` | One full loop: mine → draft → apply → train. |
| `evolve_forever(model, sources, url, key, ticks)` | Long-running driver. |

#### Example

```sdev
link "stdlib/ml/auto_evolve.sdev"
link "stdlib/ml/transformer.sdev"

forge model be gpt(256, 64, 128, 2)
forge sources be [
    "https://api.github.com/repos/rust-lang/rust/issues",
    "https://www.reddit.com/r/programminglanguages/top.json"
]

set_review_hook(conjure(path, body) :: yield yep ;;)

evolve_forever(
    model, sources,
    "https://ai.gateway.lovable.dev/v1/chat",
    "$LOVABLE_API_KEY",
    24
)
```

#### Routing rules

`pick_target` picks the file to patch based on top-topic keywords:

- `parse*` → `lang/compiler/parser.sdev`
- `lex*` → `lang/compiler/lexer.sdev`
- `doc*` → `public/SDEV_DOCUMENTATION.md`
- everything else → `lang/stdlib/ml/nn.sdev`

Extend `SDEV_SOURCE_FILES` and `pick_target` to widen or narrow
what the loop is allowed to touch.

---


## Part VII — Acceleration and interop


### FFI and native acceleration

_Source: `public/SDEV_FFI_DOCUMENTATION.md`_


sdev now speaks the C ABI. The `ffi.sdev` stdlib lets any sdev program
open a shared library (`.so`, `.dylib`, `.dll`), resolve symbols, and
call them with typed arguments — which is the foundation the ML stdlib
uses to reach BLAS, cuBLAS, cuDNN, and anything else the host exposes.

FFI runs on the **native / Node** track. In the browser IDE the calls
are stubbed to `void` so the same program can be edited safely; run it
through the desktop IDE or `scripts/sdev-native.mjs` to actually cross
the boundary.

#### Quick tour

```sdev
link "ffi.sdev"

forge lib be Library("/usr/lib/libm.so.6")
forge cos be bind(lib, "cos", FFI_F64, [FFI_F64])
speak invoke(cos, [0.0])   // 1.0
lib_close(lib)
```

#### Type kinds

| Constant   | Meaning                     |
| ---------- | --------------------------- |
| `FFI_VOID` | no value                    |
| `FFI_I32`  | 32-bit signed int           |
| `FFI_I64`  | 64-bit signed int           |
| `FFI_F32`  | 32-bit float                |
| `FFI_F64`  | 64-bit float                |
| `FFI_PTR`  | opaque pointer (buffer addr)|
| `FFI_CSTR` | NUL-terminated UTF-8        |
| `FFI_BUF`  | length-carrying byte buffer |
| `FFI_BOOL` | 0 / 1                       |

#### Buffers

`buf_f64(n)` allocates a native f64 array. `buf_from_list(xs)` and
`buf_to_list(b)` shuttle sdev lists across the boundary. Buffers are
the standard way to hand large tensors to BLAS or CUDA without going
through the boxed-float heap.

#### BLAS matmul (drop-in acceleration for `ml/tensor.sdev`)

```sdev
link "ffi.sdev"
link "ml/tensor.sdev"

forge blas be open_blas("/usr/lib/libopenblas.so.0")
forge a be tensor([1.0,2.0,3.0,4.0], [2,2])
forge b be tensor([5.0,6.0,7.0,8.0], [2,2])
forge c be blas_matmul(blas, a, b)   // uses cblas_dgemm when available
```

`blas_matmul` transparently falls back to the pure-sdev `matmul` when
the library isn't installed, so the ML stdlib keeps running everywhere.

#### CUDA fast path

```sdev
forge cuda be open_cuda("/usr/lib/libcudart.so", "/usr/lib/libcublas.so")
either cuda_ok(cuda) ::
    speak "GPU ready — cublasDgemm bound as cuda.dgemm"
;;
```

The `open_cuda` helper binds the minimal cuBLAS surface the training
loop needs (`Create/Destroy`, `Dgemm`, `Malloc/Free/Memcpy/Sync`).
Higher-level kernels can be added by binding whatever additional
symbols your build of libcublas / libcudnn exports.

#### Host builtins the FFI stdlib expects

The native runtime provides these (Node CLI wires them through
`koffi` when installed; the browser stubs them to `void`):

```
ffi_open(path)               -> lib handle | void
ffi_sym(lib, name)           -> fn handle  | void
ffi_call(fn, ret, args, argv)-> typed result
ffi_close(lib)               -> yep/nope
ffi_buf(nbytes)              -> raw pointer int
ffi_read_f64(buf, i)  / ffi_write_f64(buf, i, x)
ffi_read_i32(buf, i)  / ffi_write_i32(buf, i, n)
```

#### Safety

FFI bypasses sdev's runtime checks — a wrong signature crashes the
process. Keep bindings in one module per library, treat every pointer
as untrusted, and always `lib_close` on shutdown.

---


### WebGPU compute

_Source: `public/SDEV_WEBGPU_DOCUMENTATION.md`_


The `webgpu` stdlib module gives sdev programs GPU acceleration inside
the browser IDE — no toolchain, no plugins — while transparently
falling back to the pure-sdev CPU kernels when a GPU adapter is not
available (e.g. Node CLI, the sandbox preview, or a browser without
WebGPU support). It sits alongside `ffi.sdev` (CPU BLAS / cuBLAS) so
`ml/*` code can pick whichever backend the host offers.

```sdev
use "lang/stdlib/webgpu.sdev" as gpu
use "lang/stdlib/ml/tensor.sdev" as T

print(gpu.device_info())

let a = T.rand([512, 512])
let b = T.rand([512, 512])
let c = gpu.matmul(a, b)     # runs on the GPU if available, CPU otherwise
```

#### Availability

| Environment                 | GPU path      | Notes                              |
| --------------------------- | ------------- | ---------------------------------- |
| Chrome / Edge (WebGPU on)   | Yes           | Native adapter                     |
| Safari 17+ (feature flag)   | Yes           |                                    |
| Firefox Nightly             | Partial       | Falls back where features missing  |
| Lovable preview sandbox     | No            | Auto CPU fallback                  |
| Node CLI / Electron desktop | Optional      | Uses Dawn if bundled, else CPU     |

`gpu.is_available()` returns `true` only when both `navigator.gpu`
exists **and** `requestAdapter()` returned a real adapter — matching
the platform notes.

#### API

| Function                          | Description                                      |
| --------------------------------- | ------------------------------------------------ |
| `is_available()`                  | Probe for a working WebGPU adapter               |
| `init()`                          | Lazy device request; returns 0 on fallback       |
| `device_info()`                   | Adapter / vendor string for logging              |
| `upload(t)` / `download(g)`       | Move a tensor to / from GPU memory               |
| `free(g)`                         | Release a GPU buffer                             |
| `matmul(a, b)`                    | Batched f32 matmul (8x8 workgroups)              |
| `add(a, b)`                       | Element-wise add (64-wide workgroups)            |
| `relu(x)`                         | In-place ReLU                                    |
| `kernel(name, wgsl)`              | Register a custom WGSL compute shader            |
| `run(pipe, bufs, uniforms, x,y,z)`| Dispatch a registered kernel                     |
| `heartbeat()`                     | Re-initialise after a device-lost event          |

#### Writing custom WGSL

The runtime keeps bindings tight (≤ 3 storage buffers by default) so
shaders compile under the standard `maxStorageBuffersPerShaderStage`
limit of 8. Use `f32` for numeric payloads and pad `vec3<f32>` to 16
bytes — WGSL enforces the alignment rules called out in the platform
notes.

```sdev
let src = "
  @group(0) @binding(0) var<storage, read_write> X : array<f32>;
  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let i = gid.x;
    if (i >= arrayLength(&X)) { return; }
    X[i] = X[i] * X[i];
  }
"

let pipe = gpu.kernel("square", src)
let g = gpu.upload(T.range(1024))
gpu.run(pipe, [g], [], (1024 + 63) / 64, 1, 1)
print(T.data(gpu.download(g))[0..8])
gpu.free(g)
```

##### Reserved-word gotchas

WGSL reserves `meta`, `target`, `type`, `namespace`, and others. Using
them as identifiers causes silent shader compilation failure. Prefer
`info`, `dest`, etc.

##### Device loss

Call `gpu.heartbeat()` between training steps in long loops. When the
adapter is lost (driver reset, tab suspension), the module drops its
cached device and pipelines and reinitialises on the next call.

#### Integration with the ML stdlib

`ml/tensor.sdev` inspects `gpu.is_available()` at import time and
routes `matmul`, `add`, and `relu` through this module when a GPU is
present. Training loops in `ml/nn.sdev` therefore accelerate
automatically — no code changes required.

#### Limits and next steps

Milestone 10 delivers f32 kernels and manual custom-shader dispatch.
Milestone 11 (CUDA) will provide the same surface for cuBLAS / cuDNN
via the FFI layer so large-model training on desktop GPUs works
through the exact same tensor API.

---


### CUDA fast path

_Source: `public/SDEV_CUDA_DOCUMENTATION.md`_


`ml/cuda.sdev` puts the sdev ML stack on the GPU. It sits on top of
`ffi.sdev`'s cuBLAS/cudart bindings, hides the C ABI awkwardness, and
transparently falls back to the pure-sdev tensor ops when CUDA isn't
present — so the same program still runs in the browser IDE.

#### Quick start

```sdev
link "ml/cuda.sdev"

forge dev be cuda_device_default()
speak cuda_report(dev)

forge a be tensor([1.0,2.0,3.0,4.0], [2,2])
forge b be tensor([5.0,6.0,7.0,8.0], [2,2])
forge c be cuda_matmul(dev, a, b)   // GPU when available, CPU otherwise
speak c.data

cuda_free_device(dev)
```

#### Device handle

- `cuda_device(cudart_path, cublas_path)` — open explicit shared libs.
- `cuda_device_default()` — Debian/Ubuntu paths under
  `/usr/lib/x86_64-linux-gnu/`. Override for macOS, WSL, or custom
  CUDA toolkit installs.
- `cuda_free_device(dev)` — destroy the cublas handle and close both
  libraries. Always call before process exit.
- `cuda_report(dev)` — one-line status string for logs.

The returned tome carries `ok`, the loaded `cu` bindings, and a live
`cublasHandle_t`. When `ok` is `nope`, every helper falls back to CPU.

#### Device memory

- `cuda_alloc(dev, n_f64)` → `{ dptr, n, bytes }`
- `cuda_upload(dev, list)` — host list → device buffer.
- `cuda_download(dev, buf)` — device buffer → host list.
- `cuda_free(dev, buf)` — free device memory.

Use these directly only when writing custom kernels. `cuda_matmul`
and `cuda_forward_linear` handle the upload/compute/download cycle
for you.

#### Accelerated ops

- `cuda_matmul(dev, a, b)` — row-major matmul via `cublasDgemm`. The
  wrapper swaps operands under the hood to reinterpret cuBLAS's
  column-major output as row-major, matching `ml/tensor.sdev`'s layout.
- `cuda_forward_linear(dev, x, w, bias)` — one linear layer forward
  pass, ready to slot into `nn.fit`.
- `best_matmul(dev, blas, a, b)` — pick the fastest available backend:
  CUDA → BLAS → pure sdev.

#### Fallback semantics

Every helper checks `dev.ok` (and, for `best_matmul`, the BLAS handle)
before touching FFI. In the browser IDE the FFI builtins are stubbed
to `void`, so `cuda_device_default()` returns `{ ok: nope, ... }` and
`cuda_matmul` calls straight through to `matmul(a, b)`. Programs
authored on a workstation run unchanged in the web playground.

#### Safety notes

- Always pair `cuda_alloc` with `cuda_free` and `cuda_device*` with
  `cuda_free_device`. FFI leaks bypass sdev's runtime accounting.
- cuBLAS handles are not thread-safe across sdev tasks — use one
  device per task, or serialize access at the caller.
- `cuda_matmul` synchronizes with `cudaDeviceSynchronize` before
  downloading results. Skip the sync only if you chain multiple GPU
  ops and download once at the end.

---


## Part VIII — Domains


### Hardware and boards

_Source: `public/SDEV_HARDWARE_DOCUMENTATION.md`_


Program **30 microcontrollers** (Arduino Uno R3 / R4 Minima / R4 WiFi / Uno Q, Nano family, Mega 2560, Leonardo, Micro, MKR family, Zero, Due, Giga R1, Portenta H7, ESP32 / C3 / S2 / S3, ESP8266, Raspberry Pi Pico / Pico W, ATtiny85, and Teensy 4.1) directly in **sdev**.

This reference covers:
1. **Block Syntax**: `board "<id>" :: ... ;;` and `board "<id>" { ... }`
2. **Supported Boards (30)**: FQBNs, MCUs, memory, cloud vs. local compilation, and USB IDs
3. **SDEV Hardware DSL & Statements**: pins, PWM, timing, serial, interrupts, tone, shiftOut, raw `cpp { ... }`
4. **Complete Arduino Core Reference (75 functions, 14 constant groups, 16 types, Serial & String APIs)**
5. **Curated Libraries (61)** with SDEV `device` declarations, methods, and transpiled C++ examples
6. **Arduino Library Manager Integration (10,232 indexed libraries)**
7. **Browser Flashing Protocols (7 uploaders)**: STK500v1, STK500v2, AVR109, SAM-BA / BOSSA, WebUSB DFU 1.1, ESP32/ESP8266 SLIP, and RP2040 UF2

---

#### 1. The `board` Block

A `board` block embeds a hardware sketch inside any `.sdev` file. When you run the file in the desktop/browser sdev interpreter, `stripBoardBlocks()` strips all `board` blocks automatically so desktop code and microcontroller firmware can live side-by-side in one file.

Both sdev `:: ... ;;` delimiters and brace `{ ... }` delimiters are supported:

```sdev
board "uno" ::
  conjure setup() ::
    pin led be output
    speak("Arduino Uno ready!")
  ;;

  conjure loop() ::
    pin led toggle
    wait 500
  ;;
;;
```

Or with `{ ... }`:

```sdev
board "uno" {
  conjure setup() {
    pin 13 be output
    serial begin 9600
  }
  conjure loop() {
    pin 13 write high
    wait 500
    pin 13 write low
    wait 500
  }
}
```

---

#### 2. Supported Boards (30)

| ID (`board "<id>"`) | Board | FQBN | MCU | Flash / RAM | Uploader | Browser Flash | Zero-Install Cloud Build |
|---|---|---|---|---|---|---|---|
| `uno` | Arduino Uno (R3) | `arduino:avr:uno` | ATmega328P | 32 KB / 2 KB | `stk500v1` | Yes (`stk500v1`) | Yes (`uno`) |
| `uno-r4-minima` | Arduino Uno R4 Minima | `arduino:renesas_uno:minima` | RA4M1 | 256 KB / 32 KB | `dfu` | Yes (`dfu`) | Local CLI |
| `uno-r4-wifi` | Arduino Uno R4 WiFi | `arduino:renesas_uno:unor4wifi` | RA4M1 + ESP32-S3 | 256 KB / 32 KB | `samba` | Yes (`samba`) | Local CLI |
| `uno-q` | Arduino Uno Q | `arduino:zephyr:unoq` | Qualcomm Dragonwing QRB2210 + STM32U585 | 2048 KB / 786 KB | `app-lab` | No (`app-lab`) | Local CLI |
| `nano` | Arduino Nano (ATmega328P) | `arduino:avr:nano:cpu=atmega328` | ATmega328P | 32 KB / 2 KB | `stk500v1` | Yes (`stk500v1`) | Yes (`nano`) |
| `nano-old` | Arduino Nano (ATmega168 / Old Bootloader) | `arduino:avr:nano:cpu=atmega168` | ATmega168 | 16 KB / 1 KB | `stk500v1` | Yes (`stk500v1`) | Local CLI |
| `nano-every` | Arduino Nano Every | `arduino:megaavr:nona4809` | ATmega4809 | 48 KB / 6 KB | `samba` | Yes (`samba`) | Local CLI |
| `nano-33-iot` | Arduino Nano 33 IoT | `arduino:samd:nano_33_iot` | SAMD21G18A | 256 KB / 32 KB | `samba` | Yes (`samba`) | Local CLI |
| `nano-33-ble` | Arduino Nano 33 BLE / Sense | `arduino:mbed_nano:nano33ble` | nRF52840 | 1024 KB / 256 KB | `samba` | Yes (`samba`) | Local CLI |
| `nano-rp2040` | Arduino Nano RP2040 Connect | `arduino:mbed_nano:nanorp2040connect` | RP2040 | 16384 KB / 264 KB | `uf2` | Yes (`uf2`) | Yes (`nano-rp2040-connect`) |
| `nano-esp32` | Arduino Nano ESP32 | `arduino:esp32:nano_nora` | ESP32-S3 | 16384 KB / 512 KB | `esptool` | Yes (`esptool`) | Local CLI |
| `mega` | Arduino Mega 2560 | `arduino:avr:mega:cpu=atmega2560` | ATmega2560 | 256 KB / 8 KB | `stk500v2` | Yes (`stk500v2`) | Yes (`mega`) |
| `leonardo` | Arduino Leonardo | `arduino:avr:leonardo` | ATmega32U4 | 32 KB / 2.5 KB | `avr109` | Yes (`avr109`) | Local CLI |
| `micro` | Arduino Micro | `arduino:avr:micro` | ATmega32U4 | 32 KB / 2.5 KB | `avr109` | Yes (`avr109`) | Local CLI |
| `mkr-wifi-1010` | Arduino MKR WiFi 1010 | `arduino:samd:mkrwifi1010` | SAMD21G18A | 256 KB / 32 KB | `samba` | Yes (`samba`) | Local CLI |
| `mkr-zero` | Arduino MKR Zero | `arduino:samd:mkrzero` | SAMD21G18A | 256 KB / 32 KB | `samba` | Yes (`samba`) | Local CLI |
| `mkr-wan-1310` | Arduino MKR WAN 1310 | `arduino:samd:mkrwan1310` | SAMD21G18A | 256 KB / 32 KB | `samba` | Yes (`samba`) | Local CLI |
| `zero` | Arduino Zero | `arduino:samd:arduino_zero_native` | SAMD21G18A | 256 KB / 32 KB | `samba` | Yes (`samba`) | Local CLI |
| `due` | Arduino Due | `arduino:sam:arduino_due_x` | AT91SAM3X8E | 512 KB / 96 KB | `samba` | Yes (`samba`) | Local CLI |
| `giga` | Arduino Giga R1 WiFi | `arduino:mbed_giga:giga` | STM32H747XI | 2048 KB / 1024 KB | `dfu` | Yes (`dfu`) | Local CLI |
| `portenta-h7` | Arduino Portenta H7 | `arduino:mbed_portenta:envie_m7` | STM32H747XI | 2048 KB / 1024 KB | `dfu` | Yes (`dfu`) | Local CLI |
| `esp32` | ESP32 DevKit (generic) | `esp32:esp32:esp32` | ESP32 | 4096 KB / 520 KB | `esptool` | Yes (`esptool`) | Yes (`esp32`) |
| `esp32-c3` | ESP32-C3 DevKit | `esp32:esp32:esp32c3` | ESP32-C3 | 4096 KB / 400 KB | `esptool` | Yes (`esptool`) | Yes (`esp32-c3-devkitm-1`) |
| `esp32-s2` | ESP32-S2 DevKit | `esp32:esp32:esp32s2` | ESP32-S2 | 4096 KB / 320 KB | `esptool` | Yes (`esptool`) | Yes (`esp32-s2-devkitm-1`) |
| `esp32-s3` | ESP32-S3 DevKit | `esp32:esp32:esp32s3` | ESP32-S3 | 8192 KB / 512 KB | `esptool` | Yes (`esptool`) | Local CLI |
| `esp8266` | ESP8266 NodeMCU | `esp8266:esp8266:nodemcuv2` | ESP8266 | 4096 KB / 80 KB | `esptool` | Yes (`esptool`) | Yes (`esp8266`) |
| `pico` | Raspberry Pi Pico (RP2040) | `rp2040:rp2040:rpipico` | RP2040 | 2048 KB / 264 KB | `uf2` | Yes (`uf2`) | Yes (`pi-pico`) |
| `pico-w` | Raspberry Pi Pico W (RP2040) | `rp2040:rp2040:rpipicow` | RP2040 | 2048 KB / 264 KB | `uf2` | Yes (`uf2`) | Local CLI |
| `attiny85` | ATtiny85 | `attiny:avr:ATtinyX5:cpu=attiny85` | ATtiny85 | 8 KB / 0.5 KB | `stk500v1` | Yes (`stk500v1`) | Yes (`attiny85`) |
| `teensy41` | Teensy 4.1 | `teensy:avr:teensy41` | iMXRT1062 | 8192 KB / 1024 KB | `arduino-cli` | No (`arduino-cli`) | Local CLI |

##### Special Board Notes
- **Arduino Uno R4 Minima (`uno-r4-minima`)**: Uses the Renesas RA4M1 (48 MHz Cortex-M4F) and flashes directly from the browser over **WebUSB DFU 1.1** (`0x2341:0x0369`).
- **Arduino Uno R4 WiFi (`uno-r4-wifi`)**: Uses the Renesas RA4M1 + ESP32-S3 co-processor and flashes over **SAM-BA / BOSSA** (`flashSamba`) after a 1200-baud touch reset.
- **Arduino Uno Q (`uno-q`)**: Hybrid Qualcomm Dragonwing QRB2210 Linux SBC + STM32U585 real-time MCU running Zephyr (`arduino:zephyr:unoq`). Sketches are deployed via **Arduino App Lab** or `arduino-cli` over ADB/network rather than browser Web Serial; use **Export .ino** in the Hardware panel.
- **Raspberry Pi Pico / Pico W / Nano RP2040 Connect (`pico`, `pico-w`, `nano-rp2040`)**: Compiles to an RP2040 **UF2** image (`0x0A324655` / `0x9E5D5157` / family `0xE48BFF56`) and writes directly to the mounted `RPI-RP2` drive via the File System Access API (or downloads `.uf2`).

---

#### 3. SDEV Hardware DSL Cheat Sheet

| SDEV Statement / Expression | Generated Arduino C++ |
|---|---|
| `use "Servo"` | `#include <Servo.h>` |
| `use "Ethernet"` | `#include <SPI.h>` + `#include <Ethernet.h>` |
| `device arm be Servo` | `Servo arm;` |
| `device lcd be LiquidCrystal_I2C(0x27, 16, 2)` | `LiquidCrystal_I2C lcd(0x27, 16, 2);` |
| `conjure setup() :: ... ;;` / `to setup` | `void setup() { ... }` (auto-inserts `Serial.begin(9600);` when `speak`/`say` is used) |
| `conjure loop() :: ... ;;` / `to loop` | `void loop() { ... }` |
| `conjure blink(pin: int, ms: long) :: ... ;;` | `auto blink(int pin, long ms) { ... }` |
| `forge x: float be 3.14` | `float x = 3.14;` |
| `forge notes be [262, 294, 330]` | `auto notes[] = {262, 294, 330};` |
| `fixed forge LED: int be 13` | `const int LED = 13;` |
| `keep forge counter: long be 0` | `static long counter = 0;` |
| `volatile forge ticks: long be 0` | `volatile long ticks = 0;` |
| `pin 13 be output` / `input` / `input_pullup` / `input_pulldown` | `pinMode(13, OUTPUT / INPUT / INPUT_PULLUP / INPUT_PULLDOWN);` |
| `pin led on` / `pin led off` | `digitalWrite(LED_BUILTIN, HIGH / LOW);` |
| `pin 13 toggle` | `digitalWrite(13, !digitalRead(13));` |
| `pin 13 write high` / `pin 13 write low` | `digitalWrite(13, HIGH / LOW);` |
| `pin 9 analog 128` / `pin 9 pwm 128` / `analog 9 write 128` | `analogWrite(9, 128);` |
| `analog reference internal` | `analogReference(INTERNAL);` |
| `pin 2 read` / `read pin 2` | `digitalRead(2)` |
| `analog 0 read` / `read analog A0` | `analogRead(A0)` |
| `wait 500` | `delay(500);` |
| `wait 2 seconds` | `delay((2) * 1000);` |
| `wait 50 us` / `wait_us 50` | `delayMicroseconds(50);` |
| `now()` / `nowus()` | `millis()` / `micros()` |
| `serial begin 115200` | `Serial.begin(115200);` |
| `speak("Value:", x)` | `Serial.print("Value:"); Serial.print(" "); Serial.println(x);` |
| `say "hello"` | `Serial.println("hello");` |
| `serial read` / `serial avail` | `Serial.read()` / `Serial.available()` |
| `tone 8 440 200` / `notone 8` | `tone(8, 440, 200);` / `noTone(8);` |
| `pulsein 7 high` | `pulseIn(7, HIGH)` |
| `shiftout 11 12 msbfirst 0xAA` | `shiftOut(11, 12, MSBFIRST, 0xAA);` |
| `attach 2 rising onPress` / `detach 2` | `attachInterrupt(digitalPinToInterrupt(2), onPress, RISING);` / `detachInterrupt(...)` |
| `ponder x equals 0 :: ... otherwise :: ... ;;` | `if (x == 0) { ... } else { ... }` |
| `within i be sequence(8) :: ... ;;` | `for (long i = 0; i < 8; i++) { ... }` |
| `within i be sequence(1, 127) :: ... ;;` | `for (long i = 1; i < 127; i++) { ... }` |
| `within a be sequence(0, 181, 5) :: ... ;;` | `for (long a = 0; (5) >= 0 ? a < 181 : a > 181; a += (5)) { ... }` |
| `cycle x < 10 :: ... ;;` | `while (x < 10) { ... }` |
| `yeet` / `skip` / `yield val` | `break;` / `continue;` / `return val;` |
| `randint(1, 6)` | `random(1, (6) + 1)` |
| `equals` / `differs` / `also` / `either` / `isnt` / `yep` / `nope` | `==` / `!=` / `&&` / `||` / `!` / `true` / `false` |
| `cpp { ... }` | Raw C/C++ copied verbatim without line translation |

---

#### 4. Arduino Core Functions (75)

##### Digital I/O

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `pinMode` | `pinMode(pin, mode)` | `void` | `pin 13 be output` | Configure a pin as INPUT, OUTPUT, INPUT_PULLUP (or INPUT_PULLDOWN on boards that have it). |
| `digitalWrite` | `digitalWrite(pin, value)` | `void` | `pin 13 write high · pin 13 on · pin 13 off · pin 13 toggle` | Set a digital pin HIGH or LOW. |
| `digitalRead` | `digitalRead(pin)` | `int` | `pin 2 read · read pin 2` | Read a digital pin: HIGH or LOW. |

##### Analog I/O

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `analogRead` | `analogRead(pin)` | `int` | `analog 0 read · read analog A0` | Read an analog pin (0–1023 at the default 10-bit resolution). |
| `analogWrite` | `analogWrite(pin, value)` | `void` | `pin 9 analog 128 · pin 9 pwm 128` | Write a PWM value (0–255) to a PWM pin, or a voltage to a DAC pin. |
| `analogReference` | `analogReference(type)` | `void` | `analog reference internal` | Choose the reference voltage for analogRead (DEFAULT, INTERNAL, EXTERNAL, …). |
| `analogReadResolution` | `analogReadResolution(bits)` | `void` | `analogReadResolution(bits)` | Set the number of bits analogRead returns. *(Boards: Zero, Due, MKR, Nano 33, Uno R4, Giga, Portenta, ESP32, RP2040)* |
| `analogWriteResolution` | `analogWriteResolution(bits)` | `void` | `analogWriteResolution(bits)` | Set the number of bits analogWrite accepts. *(Boards: Zero, Due, MKR, Nano 33, Uno R4, Giga, Portenta, RP2040)* |

##### Advanced I/O

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `tone` | `tone(pin, frequency[, duration])` | `void` | `tone 8 440 200` | Play a square wave of the given frequency (Hz) on a pin. |
| `noTone` | `noTone(pin)` | `void` | `notone 8` | Stop a tone started with tone(). |
| `pulseIn` | `pulseIn(pin, value[, timeout])` | `unsigned long` | `pulsein 7 high` | Measure how long (µs) a pin stays HIGH or LOW. |
| `pulseInLong` | `pulseInLong(pin, value[, timeout])` | `unsigned long` | `pulseInLong(pin, value[, timeout])` | Like pulseIn, but works with interrupts and long pulses. |
| `shiftOut` | `shiftOut(dataPin, clockPin, bitOrder, value)` | `void` | `shiftout 11 12 msbfirst 0xAA` | Send a byte one bit at a time (for shift registers). |
| `shiftIn` | `shiftIn(dataPin, clockPin, bitOrder)` | `byte` | `shiftIn(dataPin, clockPin, bitOrder)` | Read a byte one bit at a time. |

##### Time

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `delay` | `delay(ms)` | `void` | `wait 500 · wait 2 seconds` | Pause the program for a number of milliseconds. |
| `delayMicroseconds` | `delayMicroseconds(us)` | `void` | `wait 50 us · wait_us 50` | Pause for a number of microseconds. |
| `millis` | `millis()` | `unsigned long` | `now()` | Milliseconds since the board started. |
| `micros` | `micros()` | `unsigned long` | `nowus()` | Microseconds since the board started. |

##### Math

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `abs` | `abs(x)` | `number` | `abs(x)` | Absolute value. |
| `constrain` | `constrain(x, low, high)` | `number` | `constrain(x, low, high)` | Limit a number to a range. |
| `map` | `map(value, fromLow, fromHigh, toLow, toHigh)` | `long` | `map(value, fromLow, fromHigh, toLow, toHigh)` | Re-map a number from one range to another. |
| `max` | `max(a, b)` | `number` | `max(a, b)` | Larger of two numbers. |
| `min` | `min(a, b)` | `number` | `min(a, b)` | Smaller of two numbers. |
| `pow` | `pow(base, exponent)` | `double` | `pow(base, exponent)` | Raise a number to a power. |
| `sq` | `sq(x)` | `number` | `sq(x)` | Square of a number. |
| `sqrt` | `sqrt(x)` | `double` | `sqrt(x)` | Square root. |
| `floor` | `floor(x)` | `double` | `floor(x)` | Round down. |
| `ceil` | `ceil(x)` | `double` | `ceil(x)` | Round up. |
| `round` | `round(x)` | `long` | `round(x)` | Round to the nearest whole number. |
| `fabs` | `fabs(x)` | `double` | `fabs(x)` | Absolute value of a decimal number. |
| `fmod` | `fmod(x, y)` | `double` | `fmod(x, y)` | Remainder of a decimal division. |
| `log` | `log(x)` | `double` | `log(x)` | Natural logarithm. |
| `log10` | `log10(x)` | `double` | `log10(x)` | Base-10 logarithm. |
| `exp` | `exp(x)` | `double` | `exp(x)` | e raised to x. |

##### Trigonometry

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `sin` | `sin(rad)` | `double` | `sin(rad)` | Sine of an angle in radians. |
| `cos` | `cos(rad)` | `double` | `cos(rad)` | Cosine of an angle in radians. |
| `tan` | `tan(rad)` | `double` | `tan(rad)` | Tangent of an angle in radians. |
| `asin` | `asin(x)` | `double` | `asin(x)` | Arc sine. |
| `acos` | `acos(x)` | `double` | `acos(x)` | Arc cosine. |
| `atan` | `atan(x)` | `double` | `atan(x)` | Arc tangent. |
| `atan2` | `atan2(y, x)` | `double` | `atan2(y, x)` | Angle of the point (x, y). |
| `radians` | `radians(deg)` | `double` | `radians(deg)` | Degrees to radians. |
| `degrees` | `degrees(rad)` | `double` | `degrees(rad)` | Radians to degrees. |

##### Characters

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `isAlpha` | `isAlpha(c)` | `bool` | `isAlpha(c)` | Is the character a letter? |
| `isAlphaNumeric` | `isAlphaNumeric(c)` | `bool` | `isAlphaNumeric(c)` | Is the character a letter or digit? |
| `isAscii` | `isAscii(c)` | `bool` | `isAscii(c)` | Is the character ASCII? |
| `isControl` | `isControl(c)` | `bool` | `isControl(c)` | Is the character a control character? |
| `isDigit` | `isDigit(c)` | `bool` | `isDigit(c)` | Is the character a digit? |
| `isGraph` | `isGraph(c)` | `bool` | `isGraph(c)` | Is the character printable and not a space? |
| `isHexadecimalDigit` | `isHexadecimalDigit(c)` | `bool` | `isHexadecimalDigit(c)` | Is the character 0-9, a-f or A-F? |
| `isLowerCase` | `isLowerCase(c)` | `bool` | `isLowerCase(c)` | Is the character lower case? |
| `isPrintable` | `isPrintable(c)` | `bool` | `isPrintable(c)` | Is the character printable? |
| `isPunct` | `isPunct(c)` | `bool` | `isPunct(c)` | Is the character punctuation? |
| `isSpace` | `isSpace(c)` | `bool` | `isSpace(c)` | Is the character white space (space, tab, newline…)? |
| `isUpperCase` | `isUpperCase(c)` | `bool` | `isUpperCase(c)` | Is the character upper case? |
| `isWhitespace` | `isWhitespace(c)` | `bool` | `isWhitespace(c)` | Is the character a space or tab? |

##### Random numbers

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `random` | `random([min,] max)` | `long` | `randint(1, 6)  (inclusive)` | Random number from min up to (not including) max. |
| `randomSeed` | `randomSeed(seed)` | `void` | `randomSeed(seed)` | Start the random generator from a seed, e.g. analogRead of a floating pin. |

##### Bits and bytes

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `bit` | `bit(n)` | `number` | `bit(n)` | The value of bit n (1, 2, 4, 8, …). |
| `bitClear` | `bitClear(x, n)` | `void` | `bitClear(x, n)` | Set bit n of x to 0. |
| `bitRead` | `bitRead(x, n)` | `int` | `bitRead(x, n)` | Read bit n of x. |
| `bitSet` | `bitSet(x, n)` | `void` | `bitSet(x, n)` | Set bit n of x to 1. |
| `bitWrite` | `bitWrite(x, n, b)` | `void` | `bitWrite(x, n, b)` | Write 0 or 1 to bit n of x. |
| `highByte` | `highByte(x)` | `byte` | `highByte(x)` | The high (left) byte of a word. |
| `lowByte` | `lowByte(x)` | `byte` | `lowByte(x)` | The low (right) byte of a word. |
| `word` | `word(high, low)` | `word` | `word(high, low)` | Combine two bytes into a word. |

##### External interrupts

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `attachInterrupt` | `attachInterrupt(digitalPinToInterrupt(pin), handler, mode)` | `void` | `attach 2 rising onPress` | Run a function when a pin changes (RISING, FALLING, CHANGE, LOW, HIGH). |
| `detachInterrupt` | `detachInterrupt(digitalPinToInterrupt(pin))` | `void` | `detach 2` | Stop running the interrupt handler. |
| `digitalPinToInterrupt` | `digitalPinToInterrupt(pin)` | `int` | `digitalPinToInterrupt(pin)` | The interrupt number for a pin. |

##### Interrupts

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `interrupts` | `interrupts()` | `void` | `interrupts()` | Re-enable interrupts. |
| `noInterrupts` | `noInterrupts()` | `void` | `noInterrupts()` | Disable interrupts (for timing-critical code). |

##### Utilities

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `sizeof` | `sizeof(x)` | `size_t` | `sizeof(x)` | Size of a variable or array in bytes. |
| `F` | `F("text")` | `text` | `F("text")` | Keep a string in flash memory instead of RAM. |
| `PROGMEM` | `const int table[] PROGMEM = {…}` | `modifier` | `const int table[] PROGMEM = {…}` | Store data in flash memory. |
| `yield` | `yield()` | `void` | `yield()` | Let background tasks run (ESP32/ESP8266/RP2040). In sdev, `yield x` inside a function means return. |

##### Constants

| Constant | SDEV Alias | Description |
|---|---|---|
| `HIGH` | `high` | Pin is on (5 V or 3.3 V). |
| `LOW` | `low` | Pin is off (0 V). |
| `INPUT` | `input` | Pin mode: read a signal. |
| `OUTPUT` | `output` | Pin mode: drive a signal. |
| `INPUT_PULLUP` | `input_pullup` | Pin mode: input with the internal pull-up resistor. |
| `INPUT_PULLDOWN` | `input_pulldown` | Pin mode: input with a pull-down resistor (SAMD, ESP32, RP2040, Renesas). |
| `LED_BUILTIN` | `led` | The pin of the on-board LED. |
| `A0 … A7` | — | Analog input pins. |
| `RISING / FALLING / CHANGE` | `rising · falling · change` | Interrupt modes. |
| `MSBFIRST / LSBFIRST` | `msbfirst · lsbfirst` | Bit order for shiftIn/shiftOut and SPI. |
| `DEC / HEX / OCT / BIN` | — | Number formats for print(). |
| `DEFAULT / INTERNAL / INTERNAL1V1 / INTERNAL2V56 / EXTERNAL` | — | analogReference() options (depend on the board). |
| `true / false` | `yep · nope` | Booleans. |
| `PI, HALF_PI, TWO_PI, DEG_TO_RAD, RAD_TO_DEG` | — | Math constants. |

##### Types & Qualifiers

| C++ Type | SDEV Type | Summary |
|---|---|---|
| `bool` | `bool` | true or false. |
| `byte` | `byte` | 0–255. |
| `char` | `char` | One character. |
| `int` | `int` | Whole number (16-bit on AVR, 32-bit on ARM/ESP). |
| `unsigned int` | — | Non-negative whole number. |
| `long` | `long` | 32-bit whole number (default for untyped sdev parameters). |
| `unsigned long` | `ulong` | 32-bit non-negative — use for millis() values. |
| `short` | — | 16-bit whole number. |
| `word` | — | 16-bit non-negative. |
| `float` | `float · decimal` | Decimal number. |
| `double` | `double` | Decimal number (same as float on AVR). |
| `String` | `text · string` | Text object. |
| `size_t` | — | Size in bytes. |
| `uint8_t … int64_t` | — | Fixed-size integers. |
| `arrays` | `forge notes be [262, 294, 330]` | Fixed list of values. |
| `const / static / volatile` | `fixed · keep · volatile` | Qualifiers. |

##### `Serial` / `Stream` Methods

| Method | Description |
|---|---|
| `Serial.begin(speed[, config])` | Open the port at a baud rate (9600, 115200, …). |
| `Serial.end()` | Close the port. |
| `Serial.available()` | Number of bytes waiting to be read. |
| `Serial.availableForWrite()` | Bytes that can be written without blocking. |
| `Serial.read()` | Read one byte (-1 if none). |
| `Serial.peek()` | Look at the next byte without removing it. |
| `Serial.write(value | buffer, len)` | Send raw bytes. |
| `Serial.print(value[, format])` | Send text (format: DEC, HEX, OCT, BIN or decimal places). |
| `Serial.println(value[, format])` | Send text followed by a new line. |
| `Serial.flush()` | Wait until all outgoing data is sent. |
| `Serial.find(target)` | Read until the target text is found. |
| `Serial.findUntil(target, terminal)` | Read until target or terminal text is found. |
| `Serial.parseInt()` | Read the next whole number. |
| `Serial.parseFloat()` | Read the next decimal number. |
| `Serial.readBytes(buffer, length)` | Read bytes into a buffer. |
| `Serial.readBytesUntil(char, buffer, length)` | Read bytes until a character. |
| `Serial.readString()` | Read everything into a String. |
| `Serial.readStringUntil(char)` | Read into a String until a character, e.g. '\n'. |
| `Serial.setTimeout(ms)` | How long the read/parse functions wait. |
| `Serial.if (Serial)` | True once a USB serial port is open (Leonardo, Zero, R4, …). |
| `Serial.serialEvent()` | Define this function to run when data arrives. |

##### `String` Methods

| Method | Description |
|---|---|
| `str.charAt(n)` | Character at a position. |
| `str.compareTo(other)` | Compare alphabetically. |
| `str.concat(value)` | Append a value. |
| `str.c_str()` | C string pointer. |
| `str.endsWith(text)` | Ends with the text? |
| `str.equals(other)` | Same text? |
| `str.equalsIgnoreCase(other)` | Same text ignoring case? |
| `str.getBytes(buf, len)` | Copy bytes into a buffer. |
| `str.indexOf(text[, from])` | Position of text (-1 if missing). |
| `str.lastIndexOf(text[, from])` | Last position of text. |
| `str.length()` | Number of characters. |
| `str.remove(index[, count])` | Remove characters. |
| `str.replace(find, with)` | Replace text. |
| `str.reserve(size)` | Reserve memory. |
| `str.setCharAt(index, c)` | Change one character. |
| `str.startsWith(text)` | Starts with the text? |
| `str.substring(from[, to])` | Part of the text. |
| `str.toCharArray(buf, len)` | Copy into a char array. |
| `str.toDouble()` | Convert to a decimal number. |
| `str.toFloat()` | Convert to a decimal number. |
| `str.toInt()` | Convert to a whole number. |
| `str.toLowerCase()` | Make lower case. |
| `str.toUpperCase()` | Make upper case. |
| `str.trim()` | Remove spaces at both ends. |

---

#### 5. Curated Libraries (61)

Every curated library below has pre-mapped headers (including multi-header libraries like `Ethernet`, `Adafruit SSD1306`, `DallasTemperature`, `MFRC522`, `ArduinoModbus`, and `ArduinoIoTCloud`) so `use "<Name>"` emits the exact `#include` directives needed.

##### Wire (`use "Wire"`)

- **Category**: Communication
- **Headers**: `#include <Wire.h>`
- **Delivery**: Bundled with board core
- **Summary**: I²C / TWI bus — talk to sensors, displays and other boards.

**Class `Wire`**

| Method | Summary |
|---|---|
| `begin([address])` | Join the bus (as controller, or as peripheral with an address). |
| `end()` | Leave the bus. |
| `setClock(hz)` | Bus speed (100000 or 400000). |
| `beginTransmission(address)` | Start writing to a device. |
| `write(value)` | Queue bytes. |
| `endTransmission([stop])` | Send the queued bytes (0 = success). |
| `requestFrom(address, count)` | Ask a device for bytes. |
| `available()` | Bytes waiting. |
| `read()` | Read a byte. |
| `onReceive(handler)` | Peripheral: run when data arrives. |
| `onRequest(handler)` | Peripheral: run when data is requested. |
| `setWireTimeout(us, reset)` | Avoid hanging on a stuck bus. |
| `getWireTimeoutFlag()` | Did a timeout happen? |
| `clearWireTimeoutFlag()` | Clear the timeout flag. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "Wire"
  conjure setup() ::
    Wire.begin()
    speak("I2C scan")
    within a be sequence(1, 127) ::
      Wire.beginTransmission(a)
      ponder Wire.endTransmission() equals 0 ::
        speak("found device at", a)
      ;;
    ;;
  ;;
  conjure loop() ::
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <Wire.h>



void setup() {
  Serial.begin(9600);
  Wire.begin();
  Serial.println("I2C scan");
  for (long a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      Serial.print("found device at"); Serial.print(" "); Serial.println(a);
    }
  }
}
void loop() {
}
```

##### SPI (`use "SPI"`)

- **Category**: Communication
- **Headers**: `#include <SPI.h>`
- **Delivery**: Bundled with board core
- **Summary**: Serial Peripheral Interface bus.

**Class `SPI`**

| Method | Summary |
|---|---|
| `begin()` | Start the bus. |
| `end()` | Stop the bus. |
| `beginTransaction(SPISettings(speed, MSBFIRST, SPI_MODE0))` | Claim the bus with settings. |
| `endTransaction()` | Release the bus. |
| `transfer(value)` | Send and receive one byte. |
| `transfer16(value)` | Send and receive 16 bits. |
| `transfer(buffer, size)` | Send and receive a buffer. |
| `usingInterrupt(n)` | Make SPI interrupt-safe. |
| `setBitOrder(order)` | Deprecated: use SPISettings. |
| `setClockDivider(div)` | Deprecated: use SPISettings. |
| `setDataMode(mode)` | Deprecated: use SPISettings. |

##### EEPROM (`use "EEPROM"`)

- **Category**: Data storage
- **Headers**: `#include <EEPROM.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: AVR, Uno R4, ESP32/ESP8266 (emulated), RP2040 (emulated)
- **Summary**: Memory that keeps its value when the power is off.

**Class `EEPROM`**

| Method | Summary |
|---|---|
| `read(address)` | Read a byte. |
| `write(address, value)` | Write a byte. |
| `update(address, value)` | Write only if different (saves wear). |
| `get(address, variable)` | Read any type. |
| `put(address, variable)` | Write any type. |
| `length()` | Size in bytes. |
| `EEPROM[address]` | Read/write like an array. |
| `begin(size) / commit()` | ESP32/ESP8266/RP2040 only: open and save the emulated EEPROM. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "EEPROM"
  conjure setup() ::
    forge boots be EEPROM.read(0) + 1
    EEPROM.update(0, boots)
    speak("This board has started", boots, "times")
  ;;
  conjure loop() ::
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <EEPROM.h>



void setup() {
  Serial.begin(9600);
  auto boots = EEPROM.read(0) + 1;
  EEPROM.update(0, boots);
  Serial.print("This board has started"); Serial.print(" "); Serial.print(boots); Serial.print(" "); Serial.println("times");
}
void loop() {
}
```

##### SoftwareSerial (`use "SoftwareSerial"`)

- **Category**: Communication
- **Headers**: `#include <SoftwareSerial.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: AVR, Uno R4, ESP8266
- **Summary**: Extra serial ports on any digital pins.

**Class `SoftwareSerial`** — `device bt be SoftwareSerial(10, 11)`

| Method | Summary |
|---|---|
| `begin(speed)` | Same as Serial. |
| `available()` | Same as Serial. |
| `read()` | Same as Serial. |
| `peek()` | Same as Serial. |
| `write(value)` | Same as Serial. |
| `print(value)` | Same as Serial. |
| `println(value)` | Same as Serial. |
| `end()` | Same as Serial. |
| `listen()` | Make this port the one that receives. |
| `isListening()` | Is this port receiving? |
| `overflow()` | Did the buffer overflow? |

##### HID (`use "HID"`)

- **Category**: Device control
- **Headers**: `#include <HID.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: Leonardo, Micro, Zero, MKR, Due, Uno R4
- **Summary**: Low-level USB HID (used by Keyboard and Mouse).

##### Servo (`use "Servo"`)

- **Category**: Device control
- **Headers**: `#include <Servo.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Control hobby servo motors.

**Class `Servo`** — `device arm be Servo`

| Method | Summary |
|---|---|
| `attach(pin[, min, max])` | Connect the servo to a pin. |
| `write(angle)` | Move to an angle (0–180). |
| `writeMicroseconds(us)` | Set the pulse width directly. |
| `read()` | Last angle written. |
| `attached()` | Is it attached? |
| `detach()` | Release the pin. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "Servo"
  device arm be Servo
  conjure setup() ::
    arm.attach(9)
  ;;
  conjure loop() ::
    within angle be sequence(0, 181, 5) ::
      arm.write(angle)
      wait 15
    ;;
    within angle be sequence(180, -1, -5) ::
      arm.write(angle)
      wait 15
    ;;
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <Servo.h>



Servo arm;
void setup() {
  arm.attach(9);
}
void loop() {
  for (long angle = 0; (5) >= 0 ? angle < 181 : angle > 181; angle += (5)) {
    arm.write(angle);
    delay(15);
  }
  for (long angle = 180; (-5) >= 0 ? angle < -1 : angle > -1; angle += (-5)) {
    arm.write(angle);
    delay(15);
  }
}
```

##### Stepper (`use "Stepper"`)

- **Category**: Device control
- **Headers**: `#include <Stepper.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Unipolar and bipolar stepper motors.

**Class `Stepper`** — `device motor be Stepper(200, 8, 9, 10, 11)`

| Method | Summary |
|---|---|
| `setSpeed(rpm)` | Speed in turns per minute. |
| `step(steps)` | Turn a number of steps (negative = backwards). |

##### LiquidCrystal (`use "LiquidCrystal"`)

- **Category**: Display
- **Headers**: `#include <LiquidCrystal.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Character LCDs (HD44780) wired directly to pins.

**Class `LiquidCrystal`** — `device lcd be LiquidCrystal(12, 11, 5, 4, 3, 2)`

| Method | Summary |
|---|---|
| `begin(cols, rows)` | Start the display. |
| `clear()` | Clear the screen. |
| `home()` | Cursor to top-left. |
| `setCursor(col, row)` | Move the cursor. |
| `print(value)` | Show text. |
| `write(char)` | Show one character. |
| `cursor() / noCursor()` | Show or hide the cursor. |
| `blink() / noBlink()` | Blinking cursor. |
| `display() / noDisplay()` | Turn text on/off. |
| `scrollDisplayLeft() / scrollDisplayRight()` | Scroll. |
| `autoscroll() / noAutoscroll()` | Automatic scrolling. |
| `leftToRight() / rightToLeft()` | Text direction. |
| `createChar(n, bytes)` | Define a custom character. |

##### LiquidCrystal I2C (`use "LiquidCrystal I2C"`)

- **Category**: Display
- **Headers**: `#include <LiquidCrystal_I2C.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Character LCDs with an I²C backpack (2 wires).

**Class `LiquidCrystal_I2C`** — `device lcd be LiquidCrystal_I2C(0x27, 16, 2)`

| Method | Summary |
|---|---|
| `init()` | Start the display. |
| `backlight() / noBacklight()` | Backlight on/off. |
| `clear()` | Clear. |
| `setCursor(col, row)` | Move the cursor. |
| `print(value)` | Show text. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "LiquidCrystal I2C"
  device lcd be LiquidCrystal_I2C(0x27, 16, 2)
  conjure setup() ::
    lcd.init()
    lcd.backlight()
    lcd.print("Hello from sdev")
  ;;
  conjure loop() ::
    lcd.setCursor(0, 1)
    lcd.print(now() / 1000)
    wait 500
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <LiquidCrystal_I2C.h>



LiquidCrystal_I2C lcd(0x27, 16, 2);
void setup() {
  lcd.init();
  lcd.backlight();
  lcd.print("Hello from sdev");
}
void loop() {
  lcd.setCursor(0, 1);
  lcd.print(millis() / 1000);
  delay(500);
}
```

##### SD (`use "SD"`)

- **Category**: Data storage
- **Headers**: `#include <SD.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Read and write files on SD cards.

**Class `SD`**

| Method | Summary |
|---|---|
| `begin(csPin)` | Start the card. |
| `exists(path)` | Does a file exist? |
| `mkdir(path)` | Make a folder. |
| `open(path, FILE_READ | FILE_WRITE)` | Open a file. |
| `remove(path)` | Delete a file. |
| `rmdir(path)` | Delete a folder. |

**Class `File`**

| Method | Summary |
|---|---|
| `available()` | File operation. |
| `close()` | File operation. |
| `flush()` | File operation. |
| `peek()` | File operation. |
| `position()` | File operation. |
| `print(v)` | File operation. |
| `println(v)` | File operation. |
| `seek(pos)` | File operation. |
| `size()` | File operation. |
| `read()` | File operation. |
| `write(v)` | File operation. |
| `isDirectory()` | File operation. |
| `openNextFile()` | File operation. |
| `rewindDirectory()` | File operation. |
| `name()` | File operation. |

##### Keyboard (`use "Keyboard"`)

- **Category**: Device control
- **Headers**: `#include <Keyboard.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Leonardo, Micro, Zero, MKR, Due, Uno R4, Nano 33 IoT, Giga
- **Summary**: Act as a USB keyboard.

**Class `Keyboard`**

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `end()` | Stop. |
| `press(key)` | Hold a key. |
| `release(key)` | Let go of a key. |
| `releaseAll()` | Let go of all keys. |
| `write(key)` | Press and release. |
| `print(text)` | Type text. |
| `println(text)` | Type text + Enter. |

##### Mouse (`use "Mouse"`)

- **Category**: Device control
- **Headers**: `#include <Mouse.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Leonardo, Micro, Zero, MKR, Due, Uno R4, Nano 33 IoT, Giga
- **Summary**: Act as a USB mouse.

**Class `Mouse`**

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `end()` | Stop. |
| `click([button])` | Click. |
| `move(x, y[, wheel])` | Move the pointer. |
| `press([button])` | Hold a button. |
| `release([button])` | Release a button. |
| `isPressed([button])` | Is a button held? |

##### Ethernet (`use "Ethernet"`)

- **Category**: Communication
- **Headers**: `#include <SPI.h>`, `#include <Ethernet.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Wired networking with the Ethernet shield (W5100/W5500).

**Class `Ethernet`**

| Method | Summary |
|---|---|
| `begin(mac[, ip])` | Connect (DHCP if no ip). |
| `localIP()` | Our address. |
| `maintain()` | Renew DHCP. |
| `hardwareStatus()` | Which chip. |
| `linkStatus()` | Cable connected? |

**Class `EthernetClient`**

| Method | Summary |
|---|---|
| `connect(host, port)` | Open a connection. |
| `print/println/write` | Send. |
| `available() / read()` | Receive. |
| `stop()` | Close. |
| `connected()` | Still connected? |

**Class `EthernetServer`**

| Method | Summary |
|---|---|
| `begin()` | Listen. |
| `available()` | Next client. |

##### WiFiS3 (`use "WiFiS3"`)

- **Category**: Communication
- **Headers**: `#include <WiFiS3.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: Uno R4 WiFi
- **Summary**: Wi-Fi on the Uno R4 WiFi.

**Class `WiFi`**

| Method | Summary |
|---|---|
| `begin(ssid, pass)` | Connect. |
| `status()` | WL_CONNECTED when connected. |
| `localIP()` | Our address. |
| `RSSI()` | Signal strength. |
| `disconnect()` | Disconnect. |
| `scanNetworks()` | List networks. |
| `beginAP(ssid, pass)` | Make a hotspot. |

**Class `WiFiClient / WiFiServer / WiFiUDP / WiFiSSLClient`**

| Method | Summary |
|---|---|
| `connect(host, port)` | Open a connection. |
| `available() / read()` | Receive. |
| `print/write` | Send. |
| `stop()` | Close. |

##### WiFiNINA (`use "WiFiNINA"`)

- **Category**: Communication
- **Headers**: `#include <WiFiNINA.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Nano 33 IoT, MKR WiFi 1010, Uno WiFi Rev2, Nano RP2040 Connect
- **Summary**: Wi-Fi on Nano 33 IoT, MKR WiFi 1010, Uno WiFi Rev2, Nano RP2040 Connect.

**Class `WiFi`**

| Method | Summary |
|---|---|
| `begin(ssid, pass)` | Connect. |
| `status()` | Connection state. |
| `localIP()` | Our address. |
| `RSSI()` | Signal. |

##### WiFi (`use "WiFi"`)

- **Category**: Communication
- **Headers**: `#include <WiFi.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: ESP32, Nano ESP32, Giga, Portenta, Pico W
- **Summary**: Wi-Fi on ESP32, Nano ESP32, Pico W, Giga and Portenta.

**Class `WiFi`**

| Method | Summary |
|---|---|
| `begin(ssid, pass)` | Connect. |
| `status()` | WL_CONNECTED when connected. |
| `localIP()` | Our address. |
| `softAP(ssid, pass)` | Make a hotspot. |
| `scanNetworks()` | List networks. |
| `disconnect()` | Disconnect. |

##### ESP8266WiFi (`use "ESP8266WiFi"`)

- **Category**: Communication
- **Headers**: `#include <ESP8266WiFi.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: ESP8266
- **Summary**: Wi-Fi on ESP8266 boards.

**Class `WiFi`**

| Method | Summary |
|---|---|
| `begin(ssid, pass)` | Connect. |
| `status()` | Connection state. |
| `localIP()` | Our address. |

##### ArduinoBLE (`use "ArduinoBLE"`)

- **Category**: Communication
- **Headers**: `#include <ArduinoBLE.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Uno R4 WiFi, Nano 33 BLE, Nano 33 IoT, Nano RP2040 Connect, Nano ESP32, MKR WiFi 1010, Giga, Portenta
- **Summary**: Bluetooth Low Energy.

**Class `BLE`**

| Method | Summary |
|---|---|
| `begin()` | Start BLE. |
| `setLocalName(name)` | Advertised name. |
| `advertise()` | Start advertising. |
| `scan()` | Look for devices. |
| `available()` | Next found device. |
| `central()` | Connected central device. |
| `poll()` | Process BLE events. |

**Class `BLEService / BLECharacteristic`**

| Method | Summary |
|---|---|
| `BLEService(uuid)` | A service. |
| `BLEIntCharacteristic(uuid, BLERead | BLENotify)` | A value. |
| `writeValue(v)` | Update the value. |
| `value()` | Read the value. |
| `written()` | Was it written? |

##### Arduino_LED_Matrix (`use "Arduino_LED_Matrix"`)

- **Category**: Display
- **Headers**: `#include <Arduino_LED_Matrix.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: Uno R4 WiFi
- **Summary**: The 12×8 LED matrix on the Uno R4 WiFi.

**Class `ArduinoLEDMatrix`** — `device matrix be ArduinoLEDMatrix`

| Method | Summary |
|---|---|
| `begin()` | Start the matrix. |
| `loadFrame(frame)` | Show a frame (3 × uint32_t). |
| `renderBitmap(bitmap, 8, 12)` | Show a byte[8][12] bitmap. |
| `loadSequence(frames)` | Load an animation. |
| `play([loop])` | Play the animation. |
| `autoscroll(ms)` | Scroll text drawn with ArduinoGraphics. |
| `beginDraw() / endDraw()` | Draw with ArduinoGraphics. |
| `textScrollSpeed(ms)` | Scroll speed. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "Arduino_LED_Matrix"
  device matrix be ArduinoLEDMatrix
  conjure setup() ::
    matrix.begin()
  ;;
  conjure loop() ::
    matrix.loadFrame(LEDMATRIX_HEART_BIG)
    wait 500
    matrix.loadFrame(LEDMATRIX_HEART_SMALL)
    wait 500
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <Arduino_LED_Matrix.h>



ArduinoLEDMatrix matrix;
void setup() {
  matrix.begin();
}
void loop() {
  matrix.loadFrame(LEDMATRIX_HEART_BIG);
  delay(500);
  matrix.loadFrame(LEDMATRIX_HEART_SMALL);
  delay(500);
}
```

##### ArduinoGraphics (`use "ArduinoGraphics"`)

- **Category**: Display
- **Headers**: `#include <ArduinoGraphics.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Draw text and shapes (used with the R4 LED matrix and displays).

**Class `ArduinoGraphics`**

| Method | Summary |
|---|---|
| `beginDraw() / endDraw()` | Start/finish drawing. |
| `stroke(r, g, b)` | Line color. |
| `textFont(Font_5x7)` | Choose a font. |
| `text(str, x, y)` | Draw text. |
| `beginText(x, y, color) / endText(SCROLL_LEFT)` | Scrolling text. |
| `point / line / rect / circle` | Shapes. |

##### RTC (`use "RTC"`)

- **Category**: Timing
- **Headers**: `#include <RTC.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: Uno R4 Minima, Uno R4 WiFi
- **Summary**: Real-time clock of the Uno R4.

**Class `RTC`**

| Method | Summary |
|---|---|
| `begin()` | Start the clock. |
| `setTime(RTCTime)` | Set the date and time. |
| `getTime(RTCTime&)` | Read the date and time. |
| `setPeriodicCallback(fn, Period::ONCE_EVERY_1_SEC)` | Run a function periodically. |
| `setAlarmCallback(fn, time, match)` | Alarm. |

##### Firmata (`use "Firmata"`)

- **Category**: Communication
- **Headers**: `#include <Firmata.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Control the board from a computer with the Firmata protocol.

**Class `Firmata`**

| Method | Summary |
|---|---|
| `begin(speed)` | Start. |
| `processInput()` | Handle incoming messages. |
| `sendAnalog(pin, value)` | Report a value. |
| `attach(command, handler)` | Handle a command. |

##### Adafruit NeoPixel (`use "Adafruit NeoPixel"`)

- **Category**: Display
- **Headers**: `#include <Adafruit_NeoPixel.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: WS2812 / NeoPixel RGB LED strips and rings.

**Class `Adafruit_NeoPixel`** — `device strip be Adafruit_NeoPixel(8, 6, NEO_GRB + NEO_KHZ800)`

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `show()` | Send colors to the LEDs. |
| `clear()` | All off. |
| `setPixelColor(i, r, g, b)` | Color one LED. |
| `Color(r, g, b)` | Pack a color. |
| `ColorHSV(hue)` | Color from a hue. |
| `setBrightness(0-255)` | Overall brightness. |
| `numPixels()` | How many LEDs. |
| `fill(color, first, count)` | Fill a range. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "Adafruit NeoPixel"
  device strip be Adafruit_NeoPixel(8, 6, NEO_GRB + NEO_KHZ800)
  conjure setup() ::
    strip.begin()
    strip.setBrightness(40)
  ;;
  conjure loop() ::
    within i be sequence(8) ::
      strip.clear()
      strip.setPixelColor(i, strip.Color(0, 80, 255))
      strip.show()
      wait 80
    ;;
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <Adafruit_NeoPixel.h>



Adafruit_NeoPixel strip(8, 6, NEO_GRB + NEO_KHZ800);
void setup() {
  strip.begin();
  strip.setBrightness(40);
}
void loop() {
  for (long i = 0; i < 8; i++) {
    strip.clear();
    strip.setPixelColor(i, strip.Color(0, 80, 255));
    strip.show();
    delay(80);
  }
}
```

##### FastLED (`use "FastLED"`)

- **Category**: Display
- **Headers**: `#include <FastLED.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Fast control of many kinds of LED strips.

**Class `FastLED`**

| Method | Summary |
|---|---|
| `addLeds<WS2812B, PIN, GRB>(leds, count)` | Register a strip. |
| `show()` | Send colors. |
| `clear()` | All off. |
| `setBrightness(v)` | Brightness. |
| `CRGB(r, g, b) / CHSV(h, s, v)` | Colors. |

##### DHT sensor library (`use "DHT sensor library"`)

- **Category**: Sensors
- **Headers**: `#include <DHT.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: DHT11 / DHT22 temperature and humidity sensors (also install "Adafruit Unified Sensor").

**Class `DHT`** — `device dht be DHT(2, DHT22)`

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `readTemperature([fahrenheit])` | Temperature. |
| `readHumidity()` | Humidity %. |
| `computeHeatIndex(t, h)` | Feels-like temperature. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "DHT sensor library"
  use "Adafruit Unified Sensor"
  device dht be DHT(2, DHT22)
  conjure setup() ::
    dht.begin()
  ;;
  conjure loop() ::
    forge t: float be dht.readTemperature()
    forge h: float be dht.readHumidity()
    speak("Temperature:", t, "C  Humidity:", h, "%")
    wait 2 seconds
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <DHT.h>
#include <Adafruit_Sensor.h>




DHT dht(2, DHT22);
void setup() {
  Serial.begin(9600);
  dht.begin();
}
void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  Serial.print("Temperature:"); Serial.print(" "); Serial.print(t); Serial.print(" "); Serial.print("C  Humidity:"); Serial.print(" "); Serial.print(h); Serial.print(" "); Serial.println("%");
  delay((2) * 1000);
}
```

##### Adafruit Unified Sensor (`use "Adafruit Unified Sensor"`)

- **Category**: Sensors
- **Headers**: `#include <Adafruit_Sensor.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Common base used by Adafruit sensor libraries.

##### Adafruit GFX Library (`use "Adafruit GFX Library"`)

- **Category**: Display
- **Headers**: `#include <Adafruit_GFX.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Shapes, text and bitmaps for displays.

**Class `Adafruit_GFX`**

| Method | Summary |
|---|---|
| `drawPixel(x, y, c)` | Drawing. |
| `drawLine(x0, y0, x1, y1, c)` | Drawing. |
| `drawRect(x, y, w, h, c)` | Drawing. |
| `fillRect(x, y, w, h, c)` | Drawing. |
| `drawCircle(x, y, r, c)` | Drawing. |
| `fillCircle(x, y, r, c)` | Drawing. |
| `setCursor(x, y)` | Drawing. |
| `setTextSize(n)` | Drawing. |
| `setTextColor(c)` | Drawing. |
| `print(v)` | Drawing. |
| `drawBitmap(x, y, bmp, w, h, c)` | Drawing. |

##### Adafruit SSD1306 (`use "Adafruit SSD1306"`)

- **Category**: Display
- **Headers**: `#include <Adafruit_GFX.h>`, `#include <Adafruit_SSD1306.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: 128×64 / 128×32 OLED displays.

**Class `Adafruit_SSD1306`** — `device oled be Adafruit_SSD1306(128, 64, &Wire, -1)`

| Method | Summary |
|---|---|
| `begin(SSD1306_SWITCHCAPVCC, 0x3C)` | Start. |
| `clearDisplay()` | Clear. |
| `display()` | Show what was drawn. |
| `…all Adafruit GFX methods` | Drawing. |

##### U8g2 (`use "U8g2"`)

- **Category**: Display
- **Headers**: `#include <U8g2lib.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Monochrome displays of almost every kind.

**Class `U8G2_*`**

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `clearBuffer() / sendBuffer()` | Frame. |
| `setFont(font)` | Font. |
| `drawStr(x, y, text)` | Text. |

##### TM1637 (`use "TM1637"`)

- **Category**: Display
- **Headers**: `#include <TM1637Display.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: 4-digit 7-segment displays.

**Class `TM1637Display`** — `device digits be TM1637Display(2, 3)`

| Method | Summary |
|---|---|
| `setBrightness(0-7)` | Brightness. |
| `showNumberDec(n)` | Show a number. |
| `clear()` | Clear. |

##### LedControl (`use "LedControl"`)

- **Category**: Display
- **Headers**: `#include <LedControl.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: MAX7219 LED matrices and 7-segment displays.

**Class `LedControl`** — `device leds be LedControl(12, 11, 10, 1)`

| Method | Summary |
|---|---|
| `shutdown(dev, false)` | Wake up. |
| `setIntensity(dev, 0-15)` | Brightness. |
| `setLed(dev, row, col, on)` | One LED. |
| `clearDisplay(dev)` | Clear. |

##### NewPing (`use "NewPing"`)

- **Category**: Sensors
- **Headers**: `#include <NewPing.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: HC-SR04 ultrasonic distance sensors.

**Class `NewPing`** — `device sonar be NewPing(9, 10, 200)`

| Method | Summary |
|---|---|
| `ping_cm()` | Distance in cm. |
| `ping_in()` | Distance in inches. |
| `ping_median(n)` | Median of n pings (µs). |

##### AccelStepper (`use "AccelStepper"`)

- **Category**: Device control
- **Headers**: `#include <AccelStepper.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Steppers with acceleration.

**Class `AccelStepper`** — `device motor be AccelStepper(AccelStepper::DRIVER, 2, 3)`

| Method | Summary |
|---|---|
| `setMaxSpeed(s)` | Top speed. |
| `setAcceleration(a)` | Acceleration. |
| `moveTo(pos)` | Target position. |
| `run()` | Call often to move. |
| `distanceToGo()` | Steps left. |

##### IRremote (`use "IRremote"`)

- **Category**: Communication
- **Headers**: `#include <IRremote.hpp>`
- **Delivery**: Arduino Library Manager
- **Summary**: Send and receive infrared remote codes.

**Class `IrReceiver / IrSender`**

| Method | Summary |
|---|---|
| `IrReceiver.begin(pin)` | Start receiving. |
| `IrReceiver.decode()` | Got a code? |
| `IrReceiver.decodedIRData.command` | The code. |
| `IrReceiver.resume()` | Ready for the next one. |
| `IrSender.sendNEC(addr, cmd, repeats)` | Send. |

##### PubSubClient (`use "PubSubClient"`)

- **Category**: Communication
- **Headers**: `#include <PubSubClient.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: MQTT messaging.

**Class `PubSubClient`**

| Method | Summary |
|---|---|
| `setServer(host, port)` | Broker. |
| `connect(id)` | Connect. |
| `publish(topic, msg)` | Send. |
| `subscribe(topic)` | Listen. |
| `setCallback(fn)` | Handle messages. |
| `loop()` | Call often. |

##### ArduinoJson (`use "ArduinoJson"`)

- **Category**: Data processing
- **Headers**: `#include <ArduinoJson.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Read and write JSON.

**Class `JsonDocument`**

| Method | Summary |
|---|---|
| `deserializeJson(doc, input)` | Parse. |
| `serializeJson(doc, output)` | Write. |
| `doc["key"]` | Get/set values. |

##### OneWire (`use "OneWire"`)

- **Category**: Communication
- **Headers**: `#include <OneWire.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: 1-Wire bus (DS18B20 and more).

**Class `OneWire`** — `device bus be OneWire(4)`

| Method | Summary |
|---|---|
| `reset()` | Reset. |
| `search(addr)` | Find devices. |
| `write(b)` | Send. |
| `read()` | Receive. |

##### DallasTemperature (`use "DallasTemperature"`)

- **Category**: Sensors
- **Headers**: `#include <OneWire.h>`, `#include <DallasTemperature.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: DS18B20 temperature sensors (also install "OneWire").

**Class `DallasTemperature`** — `device temps be DallasTemperature(&bus)`

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `requestTemperatures()` | Measure. |
| `getTempCByIndex(0)` | Temperature in °C. |

##### MFRC522 (`use "MFRC522"`)

- **Category**: Sensors
- **Headers**: `#include <SPI.h>`, `#include <MFRC522.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: RFID card readers.

**Class `MFRC522`** — `device rfid be MFRC522(10, 9)`

| Method | Summary |
|---|---|
| `PCD_Init()` | Start. |
| `PICC_IsNewCardPresent()` | Card near? |
| `PICC_ReadCardSerial()` | Read its id. |
| `uid.uidByte[i]` | Id bytes. |

##### TinyGPSPlus (`use "TinyGPSPlus"`)

- **Category**: Sensors
- **Headers**: `#include <TinyGPSPlus.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Read GPS modules.

**Class `TinyGPSPlus`**

| Method | Summary |
|---|---|
| `encode(c)` | Feed a character. |
| `location.lat() / lng()` | Position. |
| `location.isValid()` | Have a fix? |

##### RTClib (`use "RTClib"`)

- **Category**: Timing
- **Headers**: `#include <RTClib.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: DS1307 / DS3231 / PCF8523 clock modules.

**Class `RTC_DS3231`** — `device clock be RTC_DS3231`

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `now()` | Current DateTime. |
| `adjust(DateTime(F(__DATE__), F(__TIME__)))` | Set the time. |

##### Bounce2 (`use "Bounce2"`)

- **Category**: Signal input/output
- **Headers**: `#include <Bounce2.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Clean button presses.

**Class `Bounce`** — `device button be Bounce`

| Method | Summary |
|---|---|
| `attach(pin, INPUT_PULLUP)` | Connect. |
| `interval(ms)` | Debounce time. |
| `update()` | Call each loop. |
| `fell() / rose()` | Pressed / released. |

##### Keypad (`use "Keypad"`)

- **Category**: Signal input/output
- **Headers**: `#include <Keypad.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Matrix keypads.

**Class `Keypad`**

| Method | Summary |
|---|---|
| `getKey()` | Pressed key or 0. |
| `waitForKey()` | Wait for a key. |

##### HX711 (`use "HX711"`)

- **Category**: Sensors
- **Headers**: `#include <HX711.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Load-cell (scale) amplifiers.

**Class `HX711`** — `device scale be HX711`

| Method | Summary |
|---|---|
| `begin(dout, sck)` | Start. |
| `read()` | Raw value. |
| `get_units(n)` | Weight. |
| `tare()` | Zero. |
| `set_scale(f)` | Calibrate. |

##### Adafruit BME280 Library (`use "Adafruit BME280 Library"`)

- **Category**: Sensors
- **Headers**: `#include <Adafruit_BME280.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: BME280 temperature, pressure and humidity.

**Class `Adafruit_BME280`** — `device bme be Adafruit_BME280`

| Method | Summary |
|---|---|
| `begin(0x76)` | Start. |
| `readTemperature()` | °C. |
| `readPressure()` | Pa. |
| `readHumidity()` | %. |

##### Adafruit MPU6050 (`use "Adafruit MPU6050"`)

- **Category**: Sensors
- **Headers**: `#include <Adafruit_MPU6050.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: MPU-6050 accelerometer and gyroscope.

**Class `Adafruit_MPU6050`** — `device imu be Adafruit_MPU6050`

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `getEvent(&a, &g, &temp)` | Read all values. |

##### Encoder (`use "Encoder"`)

- **Category**: Signal input/output
- **Headers**: `#include <Encoder.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Rotary encoders.

**Class `Encoder`** — `device knob be Encoder(2, 3)`

| Method | Summary |
|---|---|
| `read()` | Position. |
| `write(n)` | Set position. |

##### CapacitiveSensor (`use "CapacitiveSensor"`)

- **Category**: Sensors
- **Headers**: `#include <CapacitiveSensor.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Touch sensing with a resistor and foil.

**Class `CapacitiveSensor`** — `device touch be CapacitiveSensor(4, 2)`

| Method | Summary |
|---|---|
| `capacitiveSensor(samples)` | Touch value. |

##### ArduinoHttpClient (`use "ArduinoHttpClient"`)

- **Category**: Communication
- **Headers**: `#include <ArduinoHttpClient.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: HTTP and WebSocket client.

**Class `HttpClient`**

| Method | Summary |
|---|---|
| `get(path)` | GET request. |
| `post(path, type, body)` | POST request. |
| `responseStatusCode()` | Status. |
| `responseBody()` | Body. |

##### ArduinoMqttClient (`use "ArduinoMqttClient"`)

- **Category**: Communication
- **Headers**: `#include <ArduinoMqttClient.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: MQTT client from Arduino.

**Class `MqttClient`**

| Method | Summary |
|---|---|
| `connect(broker, port)` | Connect. |
| `beginMessage(topic) / print / endMessage()` | Publish. |
| `subscribe(topic)` | Listen. |
| `poll()` | Call often. |

##### Arduino_JSON (`use "Arduino_JSON"`)

- **Category**: Data processing
- **Headers**: `#include <Arduino_JSON.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Simple JSON from Arduino.

**Class `JSON`**

| Method | Summary |
|---|---|
| `JSON.parse(text)` | Parse. |
| `JSON.stringify(value)` | Write. |

##### ArduinoModbus (`use "ArduinoModbus"`)

- **Category**: Communication
- **Headers**: `#include <ArduinoRS485.h>`, `#include <ArduinoModbus.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Modbus RTU/TCP (also install "ArduinoRS485").

##### ArduinoRS485 (`use "ArduinoRS485"`)

- **Category**: Communication
- **Headers**: `#include <ArduinoRS485.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: RS-485 serial.

##### Arduino_LSM9DS1 (`use "Arduino_LSM9DS1"`)

- **Category**: Sensors
- **Headers**: `#include <Arduino_LSM9DS1.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Nano 33 BLE
- **Summary**: IMU of the Nano 33 BLE.

**Class `IMU`**

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `readAcceleration(x, y, z)` | Acceleration. |
| `readGyroscope(x, y, z)` | Rotation. |
| `readMagneticField(x, y, z)` | Compass. |

##### Arduino_LSM6DS3 (`use "Arduino_LSM6DS3"`)

- **Category**: Sensors
- **Headers**: `#include <Arduino_LSM6DS3.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Nano 33 IoT, Uno WiFi Rev2
- **Summary**: IMU of the Nano 33 IoT and Uno WiFi Rev2.

**Class `IMU`**

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `readAcceleration(x, y, z)` | Acceleration. |
| `readGyroscope(x, y, z)` | Rotation. |

##### Arduino_APDS9960 (`use "Arduino_APDS9960"`)

- **Category**: Sensors
- **Headers**: `#include <Arduino_APDS9960.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Gesture, color and proximity (Nano 33 BLE Sense).

##### Arduino_HTS221 (`use "Arduino_HTS221"`)

- **Category**: Sensors
- **Headers**: `#include <Arduino_HTS221.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Temperature and humidity (Nano 33 BLE Sense).

##### Arduino_LPS22HB (`use "Arduino_LPS22HB"`)

- **Category**: Sensors
- **Headers**: `#include <Arduino_LPS22HB.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Barometric pressure (Nano 33 BLE Sense).

##### ArduinoIoTCloud (`use "ArduinoIoTCloud"`)

- **Category**: Communication
- **Headers**: `#include <ArduinoIoTCloud.h>`, `#include <Arduino_ConnectionHandler.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Connect to Arduino Cloud.

##### Scheduler (`use "Scheduler"`)

- **Category**: Timing
- **Headers**: `#include <Scheduler.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Due, Zero, MKR
- **Summary**: Run several loops at once.

**Class `Scheduler`**

| Method | Summary |
|---|---|
| `startLoop(fn)` | Run another loop. |

##### Arduino_FreeRTOS (`use "Arduino_FreeRTOS"`)

- **Category**: Timing
- **Headers**: `#include <Arduino_FreeRTOS.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: AVR
- **Summary**: FreeRTOS tasks on AVR boards.

---

#### 6. Arduino Library Manager Index (10,232 Libraries)

The IDE bundles the complete Arduino Library Manager catalogue at `/arduino/library-index.json` (**10,232 libraries**). Any library in the index can be searched offline in **Hardware → Library Manager** and included with `use "<LibraryName>"` or `use "<HeaderName.h>"`.

| Category | Indexed Libraries |
|---|---|
| Communication | 2,326 |
| Sensors | 2,025 |
| Device Control | 1,708 |
| Display | 882 |
| Other | 842 |
| Signal Input/Output | 800 |
| Data Processing | 618 |
| Uncategorized | 385 |
| Timing | 372 |
| Data Storage | 274 |

---

#### 7. Browser Upload Protocols & Architecture

`src/lang/hardware/web-serial.ts` implements 7 distinct browser flashing protocols dispatched by `flashBoard(board, port, firmware, onProgress)`:

1. **`stk500v1` (`flashAvr`)**: Optiboot / AVR061 protocol (`GET_SYNC=0x30`, `ENTER_PROGMODE=0x50`, `LOAD_ADDRESS=0x55`, `PROG_PAGE=0x64`, `LEAVE_PROGMODE=0x51`, `CRC_EOP=0x20` -> `IN_SYNC=0x14, OK=0x10`). Used by Arduino Uno R3, Nano (ATmega328P @ 115200 & ATmega168 @ 57600), and ATtiny85.
2. **`stk500v2` (`flashStk500v2`)**: AVR068 framed protocol (`MESSAGE_START=0x1B`, sequence number, 16-bit length, `TOKEN=0x0E`, XOR checksum, `CMD_SIGN_ON=0x01`, `CMD_ENTER_PROGMODE_ISP=0x10`, `CMD_LOAD_ADDRESS=0x06`, `CMD_PROGRAM_FLASH_ISP=0x13`, `CMD_LEAVE_PROGMODE_ISP=0x11`). Used by Arduino Mega 2560.
3. **`avr109` (`flashAvr109`)**: Caterina bootloader protocol with 1200-baud touch reset (`'S'` software ID, `'P'` enter prog mode, `'A'` word address, `'B'` block load, `'L'` leave, `'E'` exit). Used by Arduino Leonardo and Arduino Micro (ATmega32U4).
4. **`samba` (`flashSamba`)**: Atmel/Microchip SAM-BA & BOSSA monitor over Web Serial (`N#` binary mode, `V#` version, `X<addr>#` erase, `S<sram>,<len>#` + `Y<sram>,0#` + `Y<flash>,<len>#` applet page write, `K#` reset). Used by Arduino Uno R4 WiFi, Zero, Due, MKR family, Nano 33 IoT/BLE, and Nano Every.
5. **`dfu` (`flashDfuWebUsb`)**: USB DFU 1.1 & DfuSe over **WebUSB** (`DFU_DNLOAD=1`, `DFU_GETSTATUS=3`, `DFU_CLRSTATUS=4`, DfuSe Set Address Pointer `0x21` to `flashBase`, 1024-byte blocks starting at `wValue=2`, zero-length manifest). Used by Arduino Uno R4 Minima, Giga R1 WiFi, and Portenta H7.
6. **`esptool` (`flashEsp`)**: Espressif ROM bootloader SLIP framing (`0xC0` frame end, `0xDB 0xDC` / `0xDB 0xDD` escapes, `SYNC=0x08`, `FLASH_BEGIN=0x02`, `FLASH_DATA=0x03`, `FLASH_END=0x04`) with DTR/RTS auto-reset. Used by ESP32, ESP32-C3, ESP32-S2, ESP32-S3, Nano ESP32, and ESP8266.
7. **`uf2` (`buildUf2FromHexOrBin` + `flashUf2`)**: Generates 512-byte RP2040 UF2 blocks (`magicStart0=0x0A324655`, `magicStart1=0x9E5D5157`, `familyId=0xE48BFF56`, `magicEnd=0x0AB16F30`, 256-byte payloads at `0x10000000`) and writes directly to the `RPI-RP2` USB volume via `showDirectoryPicker` or downloads `.uf2`. Used by Raspberry Pi Pico, Pico W, and Arduino Nano RP2040 Connect.

---


### Leaflet, mapping and GIS

_Source: `public/SDEV_LEAFLET_DOCUMENTATION.md`_


#### Interactive Maps for sdev

The sdev Leaflet module provides powerful geographic mapping capabilities, allowing you to create interactive maps, markers, shapes, and more using the familiar sdev syntax.

---

#### Table of Contents

1. [Getting Started](#getting-started)
2. [Map Creation](#map-creation)
3. [Markers & Popups](#markers--popups)
4. [Shapes](#shapes)
5. [Polylines & Polygons](#polylines--polygons)
6. [Layers](#layers)
7. [Events](#events)
8. [Controls](#controls)
9. [GeoJSON](#geojson)
10. [Utilities](#utilities)
11. [Complete Examples](#complete-examples)

---

#### Getting Started

##### Basic Setup

To use Leaflet features in sdev, first create a map container:

```sdev
// Create a map centered on coordinates with zoom level
forge myMap be createMap("map-container", 51.505, -0.09, 13)
```

##### HTML Setup

Your HTML page needs a container div and Leaflet CSS/JS:

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="sdev-interpreter.js"></script>
    <style>
        #map-container { height: 500px; width: 100%; }
    </style>
</head>
<body>
    <div id="map-container"></div>
    <script>
        const interpreter = new SdevInterpreter();
        interpreter.run(`
            forge map be createMap("map-container", 51.505, -0.09, 13)
            addMarker(map, 51.505, -0.09, "Hello from sdev!")
        `);
    </script>
</body>
</html>
```

---

#### Map Creation

##### createMap(containerId, lat, lng, zoom)

Creates a new Leaflet map instance.

| Parameter | Type | Description |
|-----------|------|-------------|
| containerId | text | ID of the HTML container element |
| lat | number | Initial latitude center |
| lng | number | Initial longitude center |
| zoom | number | Initial zoom level (1-18) |

```sdev
// Create a map of London
forge londonMap be createMap("map", 51.505, -0.09, 13)

// Create a map of New York
forge nyMap be createMap("nyc-map", 40.7128, -74.0060, 12)
```

##### setMapView(map, lat, lng, zoom)

Changes the map's center and zoom level.

```sdev
forge map be createMap("map", 0, 0, 2)

// Pan to Paris
setMapView(map, 48.8566, 2.3522, 14)
```

##### getMapCenter(map)

Returns the current center coordinates as a tome (dictionary).

```sdev
forge center be getMapCenter(map)
speak("Lat: " + morph(center["lat"], "text"))
speak("Lng: " + morph(center["lng"], "text"))
```

##### getMapZoom(map)

Returns the current zoom level.

```sdev
forge zoom be getMapZoom(map)
speak("Current zoom: " + morph(zoom, "text"))
```

##### getMapBounds(map)

Returns the visible map bounds.

```sdev
forge bounds be getMapBounds(map)
// bounds contains: north, south, east, west
```

---

#### Markers & Popups

##### addMarker(map, lat, lng, popupText?)

Adds a marker to the map with an optional popup.

```sdev
forge map be createMap("map", 51.505, -0.09, 13)

// Simple marker
forge marker1 be addMarker(map, 51.505, -0.09)

// Marker with popup
forge marker2 be addMarker(map, 51.51, -0.08, "Click me!")
```

##### addMarkerIcon(map, lat, lng, iconUrl, iconSize, popupText?)

Adds a marker with a custom icon.

| Parameter | Type | Description |
|-----------|------|-------------|
| iconUrl | text | URL to the icon image |
| iconSize | list | [width, height] in pixels |

```sdev
forge map be createMap("map", 51.505, -0.09, 13)

forge customMarker be addMarkerIcon(
    map, 
    51.505, 
    -0.09, 
    "https://example.com/pin.png",
    [32, 32],
    "Custom icon marker!"
)
```

##### removeMarker(map, marker)

Removes a marker from the map.

```sdev
forge marker be addMarker(map, 51.505, -0.09, "Temporary")
// Later...
removeMarker(map, marker)
```

##### setMarkerPosition(marker, lat, lng)

Moves an existing marker to new coordinates.

```sdev
forge marker be addMarker(map, 51.505, -0.09)

// Animate marker movement
forge i be 0
cycle i < 100 ::
    setMarkerPosition(marker, 51.505 + i * 0.001, -0.09 + i * 0.001)
    delay(50)
    i be i + 1
;;
```

##### bindPopup(marker, content)

Attaches a popup to an existing marker.

```sdev
forge marker be addMarker(map, 51.505, -0.09)
bindPopup(marker, "<b>Bold text!</b><br>HTML works here")
```

##### bindTooltip(marker, content)

Attaches a tooltip (shows on hover) to a marker.

```sdev
forge marker be addMarker(map, 51.505, -0.09)
bindTooltip(marker, "Hover tooltip")
```

##### openPopup(marker)

Programmatically opens the marker's popup.

```sdev
forge marker be addMarker(map, 51.505, -0.09, "Hello!")
openPopup(marker)
```

---

#### Shapes

##### addCircle(map, lat, lng, radius, options?)

Adds a circle to the map.

| Parameter | Type | Description |
|-----------|------|-------------|
| radius | number | Radius in meters |
| options | tome | Style options (optional) |

```sdev
forge map be createMap("map", 51.505, -0.09, 13)

// Simple circle
forge circle1 be addCircle(map, 51.505, -0.09, 500)

// Styled circle
forge options be :: 
    "color": "#ff0000",
    "fillColor": "#ff6666",
    "fillOpacity": 0.5,
    "weight": 2
;;
forge circle2 be addCircle(map, 51.51, -0.08, 300, options)
```

##### addCircleMarker(map, lat, lng, radius, options?)

Adds a circle marker (radius in pixels, not meters).

```sdev
forge dot be addCircleMarker(map, 51.505, -0.09, 10, :: 
    "color": "#3388ff",
    "fillColor": "#3388ff",
    "fillOpacity": 0.8
;;)
```

##### addRectangle(map, lat1, lng1, lat2, lng2, options?)

Adds a rectangle defined by opposite corners.

```sdev
forge rect be addRectangle(
    map,
    51.49, -0.10,  // Southwest corner
    51.52, -0.06,  // Northeast corner
    :: "color": "#ff7800", "weight": 1 ;;
)
```

---

#### Polylines & Polygons

##### addPolyline(map, points, options?)

Draws a line through multiple points.

| Parameter | Type | Description |
|-----------|------|-------------|
| points | list | List of [lat, lng] coordinate pairs |
| options | tome | Style options |

```sdev
forge map be createMap("map", 51.505, -0.09, 13)

forge route be [
    [51.505, -0.09],
    [51.51, -0.08],
    [51.52, -0.06],
    [51.515, -0.05]
]

forge line be addPolyline(map, route, ::
    "color": "#ff0000",
    "weight": 4,
    "opacity": 0.8,
    "dashArray": "10, 10"
;;)
```

##### addPolygon(map, points, options?)

Creates a closed polygon shape.

```sdev
forge triangle be [
    [51.509, -0.08],
    [51.503, -0.06],
    [51.51, -0.047]
]

forge poly be addPolygon(map, triangle, ::
    "color": "#00ff00",
    "fillColor": "#00ff88",
    "fillOpacity": 0.4
;;)
```

##### addMultiPolygon(map, polygons, options?)

Creates multiple polygons as a single layer.

```sdev
forge shapes be [
    [[51.51, -0.12], [51.51, -0.10], [51.52, -0.10], [51.52, -0.12]],
    [[51.51, -0.08], [51.51, -0.06], [51.52, -0.06], [51.52, -0.08]]
]

forge multiPoly be addMultiPolygon(map, shapes, ::
    "color": "#9900ff"
;;)
```

---

#### Layers

##### addTileLayer(map, urlTemplate, options?)

Adds a custom tile layer (base map).

```sdev
forge map be createMap("map", 51.505, -0.09, 13)

// OpenStreetMap (default)
addTileLayer(map, "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", ::
    "attribution": "© OpenStreetMap contributors"
;;)

// Satellite imagery
addTileLayer(map, "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", ::
    "attribution": "© Esri"
;;)
```

##### createLayerGroup()

Creates an empty layer group for organizing layers.

```sdev
forge markers be createLayerGroup()
addMarker(markers, 51.505, -0.09, "Marker 1")
addMarker(markers, 51.51, -0.08, "Marker 2")
addLayerToMap(map, markers)
```

##### addLayerToMap(map, layer)

Adds a layer or layer group to the map.

```sdev
forge group be createLayerGroup()
// Add items to group...
addLayerToMap(map, group)
```

##### removeLayerFromMap(map, layer)

Removes a layer from the map.

```sdev
removeLayerFromMap(map, markers)
```

##### clearLayer(layer)

Removes all items from a layer group.

```sdev
clearLayer(markers)
```

---

#### Events

##### onMapClick(map, callback)

Handles map click events.

```sdev
forge map be createMap("map", 51.505, -0.09, 13)

onMapClick(map, (event) -> ::
    forge lat be event["lat"]
    forge lng be event["lng"]
    addMarker(map, lat, lng, "Clicked at " + morph(lat, "text") + ", " + morph(lng, "text"))
;;)
```

##### onMapZoom(map, callback)

Handles zoom changes.

```sdev
onMapZoom(map, (event) -> ::
    forge zoom be getMapZoom(map)
    speak("Zoom changed to: " + morph(zoom, "text"))
;;)
```

##### onMapMove(map, callback)

Handles map movement (pan).

```sdev
onMapMove(map, (event) -> ::
    forge center be getMapCenter(map)
    speak("Map moved to: " + morph(center["lat"], "text") + ", " + morph(center["lng"], "text"))
;;)
```

##### onMarkerClick(marker, callback)

Handles marker click events.

```sdev
forge marker be addMarker(map, 51.505, -0.09)

onMarkerClick(marker, (event) -> ::
    speak("Marker was clicked!")
;;)
```

##### onMarkerDrag(marker, callback)

Handles marker drag events (marker must be draggable).

```sdev
forge marker be addMarker(map, 51.505, -0.09)
setMarkerDraggable(marker, yep)

onMarkerDrag(marker, (event) -> ::
    forge pos be getMarkerPosition(marker)
    speak("Dragged to: " + morph(pos["lat"], "text"))
;;)
```

---

#### Controls

##### addZoomControl(map, position?)

Adds zoom controls to the map.

| Position | Description |
|----------|-------------|
| "topleft" | Top left corner |
| "topright" | Top right corner |
| "bottomleft" | Bottom left corner |
| "bottomright" | Bottom right corner |

```sdev
addZoomControl(map, "bottomright")
```

##### addScaleControl(map, options?)

Adds a scale indicator.

```sdev
addScaleControl(map, ::
    "position": "bottomleft",
    "metric": yep,
    "imperial": nope
;;)
```

##### addAttributionControl(map, prefix?)

Adds attribution text.

```sdev
addAttributionControl(map, "Powered by sdev")
```

##### addLayerControl(map, baseLayers, overlays)

Adds a layer switcher control.

```sdev
forge osm be addTileLayer(map, "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
forge satellite be addTileLayer(map, "https://server.arcgisonline.com/...")

forge bases be ::
    "Streets": osm,
    "Satellite": satellite
;;

forge markers be createLayerGroup()
forge overlays be ::
    "Markers": markers
;;

addLayerControl(map, bases, overlays)
```

---

#### GeoJSON

##### addGeoJSON(map, geoJsonData, options?)

Adds GeoJSON data to the map.

```sdev
forge geojson be ::
    "type": "FeatureCollection",
    "features": [
        ::
            "type": "Feature",
            "geometry": ::
                "type": "Point",
                "coordinates": [-0.09, 51.505]
            ;;,
            "properties": ::
                "name": "London"
            ;;
        ;;
    ]
;;

forge layer be addGeoJSON(map, geojson, ::
    "style": ::
        "color": "#ff0000",
        "weight": 2
    ;;
;;)
```

##### geoJSONStyle(feature)

Custom style function for GeoJSON features.

```sdev
forge layer be addGeoJSON(map, geojson, ::
    "style": (feature) -> ::
        ponder feature["properties"]["type"] equals "road" ::
            yield :: "color": "#888888", "weight": 3 ;;
        ;;
        otherwise ::
            yield :: "color": "#00ff00", "weight": 1 ;;
        ;;
    ;;
;;)
```

---

#### Utilities

##### latLng(lat, lng)

Creates a coordinate object.

```sdev
forge coord be latLng(51.505, -0.09)
speak("Latitude: " + morph(coord["lat"], "text"))
```

##### distance(lat1, lng1, lat2, lng2)

Calculates distance between two points in meters.

```sdev
forge dist be distance(51.505, -0.09, 51.51, -0.08)
speak("Distance: " + morph(dist, "text") + " meters")
```

##### boundsContains(bounds, lat, lng)

Checks if a point is within bounds.

```sdev
forge bounds be getMapBounds(map)
forge inside be boundsContains(bounds, 51.505, -0.09)
ponder inside ::
    speak("Point is visible on map")
;;
```

##### fitBounds(map, lat1, lng1, lat2, lng2)

Adjusts the map view to fit the given bounds.

```sdev
fitBounds(map, 51.49, -0.12, 51.52, -0.05)
```

##### invalidateSize(map)

Recalculates map size (use after container resize).

```sdev
invalidateSize(map)
```

---

#### Navigation & Animation

##### panTo(map, lat, lng, options?)

Smoothly pans the map to a new center.

```sdev
panTo(map, 48.8566, 2.3522)
```

##### panBy(map, x, y)

Pans the map by a given number of pixels.

```sdev
panBy(map, 100, 50)  // Pan right 100px, down 50px
```

##### flyTo(map, lat, lng, zoom, options?)

Animates the map to a new position with a smooth flying effect.

```sdev
flyTo(map, 40.7128, -74.0060, 14)  // Fly to New York
```

##### flyToBounds(map, lat1, lng1, lat2, lng2, options?)

Animates to fit the given bounds.

```sdev
flyToBounds(map, 51.49, -0.12, 51.52, -0.05)
```

##### zoomIn(map, delta?)

Increases the zoom level by delta (default 1).

```sdev
zoomIn(map)        // Zoom in by 1
zoomIn(map, 2)     // Zoom in by 2
```

##### zoomOut(map, delta?)

Decreases the zoom level by delta (default 1).

```sdev
zoomOut(map)
```

##### setZoom(map, zoom)

Sets the zoom level directly.

```sdev
setZoom(map, 15)
```

##### setMinZoom(map, zoom) / setMaxZoom(map, zoom)

Sets zoom constraints.

```sdev
setMinZoom(map, 5)
setMaxZoom(map, 18)
```

##### getMinZoom(map) / getMaxZoom(map)

Gets the current zoom constraints.

```sdev
forge minZ be getMinZoom(map)
forge maxZ be getMaxZoom(map)
```

##### setMaxBounds(map, lat1, lng1, lat2, lng2)

Restricts the map to a given geographical area.

```sdev
setMaxBounds(map, 51.0, -0.5, 52.0, 0.5)  // Lock to London area
```

---

#### Popup & Tooltip Control

##### closePopup(marker)

Closes an open popup.

```sdev
closePopup(marker)
```

##### openTooltip(marker) / closeTooltip(marker)

Opens or closes a marker's tooltip.

```sdev
openTooltip(marker)
closeTooltip(marker)
```

##### setPopupContent(marker, content)

Updates popup content dynamically.

```sdev
setPopupContent(marker, "Updated content!")
```

##### setTooltipContent(marker, content)

Updates tooltip content dynamically.

```sdev
setTooltipContent(marker, "New tooltip text")
```

---

#### Layer Styling

##### setMarkerIcon(marker, iconUrl, iconSize)

Changes a marker's icon.

```sdev
setMarkerIcon(marker, "https://example.com/new-icon.png", [32, 32])
```

##### setMarkerOpacity(marker, opacity)

Sets marker transparency (0-1).

```sdev
setMarkerOpacity(marker, 0.5)
```

##### setMarkerZIndex(marker, zIndex)

Controls marker stacking order.

```sdev
setMarkerZIndex(marker, 1000)
```

##### setCircleRadius(circle, radius)

Updates a circle's radius in meters.

```sdev
setCircleRadius(myCircle, 750)
```

##### setCircleStyle(circle, options) / setPolylineStyle / setPolygonStyle

Updates styling of shapes.

```sdev
setCircleStyle(myCircle, :: "color": "#ff0000", "fillOpacity": 0.8 ;;)
setPolylineStyle(myLine, :: "color": "#00ff00", "weight": 5 ;;)
setPolygonStyle(myPoly, :: "fillColor": "#0000ff" ;;)
```

##### getPolylineLatLngs(polyline)

Gets all points of a polyline.

```sdev
forge points be getPolylineLatLngs(myRoute)
```

##### setPolylineLatLngs(polyline, points)

Replaces all points of a polyline.

```sdev
setPolylineLatLngs(myRoute, [[51.5, -0.1], [51.6, -0.05]])
```

##### addLatLng(polyline, lat, lng)

Adds a point to a polyline.

```sdev
addLatLng(myRoute, 51.52, -0.08)
```

##### bringToFront(layer) / bringToBack(layer)

Controls layer z-ordering.

```sdev
bringToFront(importantLayer)
bringToBack(backgroundLayer)
```

---

#### Additional Events

##### onLayerClick(layer, callback)

Handles click events on any layer.

```sdev
onLayerClick(myCircle, (e) -> ::
    speak("Circle clicked at " + morph(e["lat"], "text"))
;;)
```

##### onLayerMouseover(layer, callback) / onLayerMouseout(layer, callback)

Handles hover events.

```sdev
onLayerMouseover(myPolygon, (e) -> ::
    setPolygonStyle(myPolygon, :: "fillOpacity": 0.8 ;;)
;;)

onLayerMouseout(myPolygon, (e) -> ::
    setPolygonStyle(myPolygon, :: "fillOpacity": 0.4 ;;)
;;)
```

##### onMapDoubleClick(map, callback)

Handles double-click events.

```sdev
onMapDoubleClick(map, (e) -> ::
    setMapView(map, e["lat"], e["lng"], getMapZoom(map) + 1)
;;)
```

##### onMapRightClick(map, callback)

Handles right-click (context menu) events.

```sdev
onMapRightClick(map, (e) -> ::
    speak("Right click at " + morph(e["lat"], "text"))
;;)
```

##### onMapMousemove(map, callback)

Tracks mouse movement over the map.

```sdev
onMapMousemove(map, (e) -> ::
    updateCoordinateDisplay(e["lat"], e["lng"])
;;)
```

---

#### Geolocation

##### locate(map, options?)

Starts browser geolocation.

```sdev
locate(map, :: "setView": yep, "maxZoom": 16 ;;)
```

##### onLocationFound(map, callback)

Handles successful location.

```sdev
onLocationFound(map, (e) -> ::
    speak("Found you at " + morph(e["lat"], "text") + ", " + morph(e["lng"], "text"))
    addMarker(map, e["lat"], e["lng"], "You are here!")
;;)
```

##### onLocationError(map, callback)

Handles geolocation errors.

```sdev
onLocationError(map, (e) -> ::
    speak("Location error: " + e["message"])
;;)
```

##### stopLocate(map)

Stops continuous location updates.

```sdev
stopLocate(map)
```

---

#### Overlays

##### addImageOverlay(map, imageUrl, lat1, lng1, lat2, lng2, options?)

Adds an image overlay to the map.

```sdev
forge overlay be addImageOverlay(map, "historical-map.jpg", 51.4, -0.2, 51.6, 0.1)
```

##### addVideoOverlay(map, videoUrl, lat1, lng1, lat2, lng2, options?)

Adds a video overlay.

```sdev
forge video be addVideoOverlay(map, "timelapse.mp4", 51.4, -0.2, 51.6, 0.1)
```

##### setImageOpacity(overlay, opacity)

Sets overlay transparency.

```sdev
setImageOpacity(overlay, 0.7)
```

##### setImageUrl(overlay, url)

Changes the overlay image.

```sdev
setImageUrl(overlay, "new-image.jpg")
```

##### setBounds(overlay, lat1, lng1, lat2, lng2)

Repositions an overlay.

```sdev
setBounds(overlay, 51.3, -0.3, 51.7, 0.2)
```

---

#### Feature Groups

##### createFeatureGroup()

Creates a feature group (like layer group but with bounds).

```sdev
forge group be createFeatureGroup()
```

##### addToFeatureGroup(featureGroup, layer)

Adds a layer to the feature group.

```sdev
addToFeatureGroup(group, myMarker)
addToFeatureGroup(group, myCircle)
```

##### removeFromFeatureGroup(featureGroup, layer)

Removes a layer from the feature group.

```sdev
removeFromFeatureGroup(group, myMarker)
```

##### getFeatureGroupBounds(featureGroup)

Gets the combined bounds of all layers.

```sdev
forge bounds be getFeatureGroupBounds(group)
```

##### fitFeatureGroup(map, featureGroup, options?)

Zooms the map to fit all layers in the group.

```sdev
fitFeatureGroup(map, group)
```

##### eachLayer(layerGroup, callback)

Iterates over all layers in a group.

```sdev
eachLayer(group, (layer) -> ::
    speak("Processing layer")
;;)
```

##### getLayers(layerGroup)

Returns all layers as a list.

```sdev
forge layers be getLayers(group)
```

##### hasLayer(layerGroup, layer)

Checks if a layer exists in the group.

```sdev
ponder hasLayer(group, myMarker) ::
    speak("Marker is in group")
;;
```

---

#### Custom Markers

##### addDivIcon(map, lat, lng, html, className, size)

Creates a marker with custom HTML content.

```sdev
forge customMarker be addDivIcon(map, 51.505, -0.09, "<div class='pulse'>🎯</div>", "custom-marker", [40, 40])
```

---

#### Coordinate Utilities

##### getSize(map)

Gets map container size in pixels.

```sdev
forge size be getSize(map)
speak("Width: " + morph(size["width"], "text") + ", Height: " + morph(size["height"], "text"))
```

##### latLngToContainerPoint(map, lat, lng)

Converts coordinates to pixel position.

```sdev
forge pixel be latLngToContainerPoint(map, 51.505, -0.09)
speak("Pixel X: " + morph(pixel["x"], "text"))
```

##### containerPointToLatLng(map, x, y)

Converts pixel position to coordinates.

```sdev
forge coord be containerPointToLatLng(map, 200, 150)
```

##### wrapLng(lng)

Wraps longitude to -180 to 180.

```sdev
forge wrapped be wrapLng(370)  // Returns 10
```

##### wrapLat(lat)

Clamps latitude to -90 to 90.

```sdev
forge clamped be wrapLat(95)  // Returns 90
```

##### degreesToDMS(degrees)

Converts decimal degrees to DMS string.

```sdev
forge dms be degreesToDMS(51.5074)  // "51° 30' 26.64""
```

##### DMSToDegrees(d, m, s)

Converts DMS to decimal degrees.

```sdev
forge deg be DMSToDegrees(51, 30, 26.64)  // 51.5074
```

##### metersToPixels(map, meters, lat)

Converts meters to pixels at the current zoom.

```sdev
forge px be metersToPixels(map, 1000, 51.505)
```

##### pixelsToMeters(map, pixels, lat)

Converts pixels to meters at the current zoom.

```sdev
forge m be pixelsToMeters(map, 100, 51.505)
```

---

#### GIS Analysis Functions

##### bearing(lat1, lng1, lat2, lng2)

Calculates bearing between two points (0-360 degrees).

```sdev
forge b be bearing(51.5, -0.1, 48.8, 2.3)  // London to Paris
speak("Bearing: " + morph(b, "text") + "°")
```

##### midpoint(lat1, lng1, lat2, lng2)

Calculates the midpoint between two coordinates.

```sdev
forge mid be midpoint(51.5, -0.1, 48.8, 2.3)
addMarker(map, mid["lat"], mid["lng"], "Midpoint")
```

##### destination(lat, lng, bearing, distance)

Calculates destination point given bearing and distance.

```sdev
forge dest be destination(51.5, -0.1, 90, 50000)  // 50km east of London
addMarker(map, dest["lat"], dest["lng"], "Destination")
```

##### area(points)

Calculates polygon area in square meters.

```sdev
forge polygon be [[51.5, -0.1], [51.5, 0.0], [51.4, 0.0], [51.4, -0.1]]
forge sqMeters be area(polygon)
speak("Area: " + morph(ground(sqMeters / 1000000), "text") + " km²")
```

##### length(points)

Calculates polyline length in meters.

```sdev
forge route be [[51.5, -0.1], [51.52, -0.08], [51.55, -0.05]]
forge len be length(route)
speak("Route length: " + morph(ground(len), "text") + " meters")
```

##### centroid(points)

Calculates the center point of a polygon.

```sdev
forge center be centroid(polygon)
addMarker(map, center["lat"], center["lng"], "Center")
```

##### isPointInPolygon(lat, lng, points)

Checks if a point is inside a polygon.

```sdev
ponder isPointInPolygon(51.45, -0.05, polygon) ::
    speak("Point is inside the polygon")
;; otherwise ::
    speak("Point is outside")
;;
```

##### simplify(points, tolerance)

Simplifies a polyline using Douglas-Peucker algorithm.

```sdev
forge simplified be simplify(complexRoute, 0.0001)
```

##### interpolateAlong(points, fraction)

Gets a point at a fraction (0-1) along a polyline.

```sdev
forge halfway be interpolateAlong(route, 0.5)
addMarker(map, halfway["lat"], halfway["lng"], "Halfway point")
```

---

#### Layer Visibility

##### getLayerType(layer)

Gets the type of a layer.

```sdev
forge type be getLayerType(myLayer)  // "marker", "circle", etc.
```

##### isLayerVisible(layer)

Checks if a layer is currently on the map.

```sdev
ponder isLayerVisible(myMarker) ::
    speak("Marker is visible")
;;
```

##### showLayer(map, layer) / hideLayer(map, layer)

Shows or hides a layer.

```sdev
hideLayer(map, secretMarker)
// Later...
showLayer(map, secretMarker)
```

##### toggleLayer(map, layer)

Toggles layer visibility.

```sdev
toggleLayer(map, myLayer)
```

---

#### Complete Examples

##### Interactive City Markers

```sdev
// Create a world map with major cities
forge map be createMap("map", 20, 0, 2)

// City data
forge cities be [
    :: "name": "London", "lat": 51.505, "lng": -0.09 ;;,
    :: "name": "Paris", "lat": 48.8566, "lng": 2.3522 ;;,
    :: "name": "New York", "lat": 40.7128, "lng": -74.0060 ;;,
    :: "name": "Tokyo", "lat": 35.6762, "lng": 139.6503 ;;,
    :: "name": "Sydney", "lat": -33.8688, "lng": 151.2093 ;;
]

// Add markers for each city
each(cities, (city) -> ::
    forge marker be addMarker(map, city["lat"], city["lng"], city["name"])
    bindTooltip(marker, city["name"])
;;)

// Click to add new markers
onMapClick(map, (e) -> ::
    addMarker(map, e["lat"], e["lng"], "New Location")
;;)
```

##### Route Visualization

```sdev
// Visualize a hiking route
forge map be createMap("map", 51.505, -0.09, 14)

forge trailPoints be [
    [51.500, -0.10],
    [51.502, -0.095],
    [51.505, -0.09],
    [51.508, -0.085],
    [51.510, -0.08],
    [51.512, -0.075]
]

// Draw the route
forge trail be addPolyline(map, trailPoints, ::
    "color": "#e74c3c",
    "weight": 5,
    "opacity": 0.8
;;)

// Add start and end markers
addMarker(map, 51.500, -0.10, "🚶 Start")
addMarker(map, 51.512, -0.075, "🏁 Finish")

// Add distance markers along the way
forge totalDist be 0
forge i be 1
cycle i < measure(trailPoints) ::
    forge prev be pluck(trailPoints, i - 1)
    forge curr be pluck(trailPoints, i)
    forge dist be distance(prev[0], prev[1], curr[0], curr[1])
    totalDist be totalDist + dist
    
    addCircleMarker(map, curr[0], curr[1], 5, ::
        "color": "#3498db",
        "fillColor": "#3498db",
        "fillOpacity": 1
    ;;)
    i be i + 1
;;

speak("Total distance: " + morph(ground(totalDist), "text") + " meters")
```

##### Heatmap Zones

```sdev
// Create density visualization with circles
forge map be createMap("map", 51.505, -0.09, 13)

// Data points with intensity
forge hotspots be [
    :: "lat": 51.505, "lng": -0.09, "intensity": 100 ;;,
    :: "lat": 51.510, "lng": -0.08, "intensity": 75 ;;,
    :: "lat": 51.500, "lng": -0.10, "intensity": 50 ;;,
    :: "lat": 51.508, "lng": -0.095, "intensity": 90 ;;
]

// Create gradient circles for each hotspot
each(hotspots, (spot) -> ::
    // Outer glow
    addCircle(map, spot["lat"], spot["lng"], spot["intensity"] * 5, ::
        "color": "transparent",
        "fillColor": "#ff6600",
        "fillOpacity": 0.2
    ;;)
    
    // Inner core
    addCircle(map, spot["lat"], spot["lng"], spot["intensity"] * 2, ::
        "color": "transparent",
        "fillColor": "#ff0000",
        "fillOpacity": 0.5
    ;;)
;;)
```

##### Layer Toggle System

```sdev
// Multi-layer map with toggle controls
forge map be createMap("map", 51.505, -0.09, 13)

// Create layer groups
forge restaurants be createLayerGroup()
forge hotels be createLayerGroup()
forge attractions be createLayerGroup()

// Add restaurant markers
addMarker(restaurants, 51.505, -0.09, "Pizza Place")
addMarker(restaurants, 51.508, -0.085, "Sushi Bar")
addMarker(restaurants, 51.502, -0.095, "Burger Joint")

// Add hotel markers  
addMarker(hotels, 51.510, -0.08, "Grand Hotel")
addMarker(hotels, 51.500, -0.10, "Budget Inn")

// Add attraction markers
addMarker(attractions, 51.507, -0.09, "Museum")
addMarker(attractions, 51.503, -0.07, "Park")

// Add all layers to map
addLayerToMap(map, restaurants)
addLayerToMap(map, hotels)
addLayerToMap(map, attractions)

// Create layer control
forge overlays be ::
    "🍕 Restaurants": restaurants,
    "🏨 Hotels": hotels,
    "🎭 Attractions": attractions
;;

addLayerControl(map, ::;;, overlays)
```

##### Animated Marker

```sdev
// Animate a marker along a path
forge map be createMap("map", 51.505, -0.09, 14)

forge path be [
    [51.500, -0.10],
    [51.502, -0.095],
    [51.505, -0.09],
    [51.508, -0.085],
    [51.510, -0.08]
]

// Draw the path
addPolyline(map, path, :: "color": "#3498db", "weight": 3, "dashArray": "5, 10" ;;)

// Create moving marker
forge mover be addMarker(map, path[0][0], path[0][1], "🚗")

// Animate along path
conjure animateMarker(marker, points, index) ::
    ponder index >= measure(points) ::
        yield void
    ;;
    
    forge target be pluck(points, index)
    setMarkerPosition(marker, target[0], target[1])
    
    delay(500)
    animateMarker(marker, points, index + 1)
;;

animateMarker(mover, path, 0)
```

---

#### Style Reference

##### Common Style Options

| Property | Type | Description |
|----------|------|-------------|
| color | text | Stroke color (hex or name) |
| weight | number | Stroke width in pixels |
| opacity | number | Stroke opacity (0-1) |
| fillColor | text | Fill color |
| fillOpacity | number | Fill opacity (0-1) |
| dashArray | text | Stroke dash pattern |
| lineCap | text | Line cap style |
| lineJoin | text | Line join style |

##### Icon Options

| Property | Type | Description |
|----------|------|-------------|
| iconUrl | text | URL to icon image |
| iconSize | list | [width, height] |
| iconAnchor | list | [x, y] anchor point |
| popupAnchor | list | [x, y] popup offset |
| shadowUrl | text | URL to shadow image |

---

#### Tips & Best Practices

1. **Performance**: Use layer groups for many markers
2. **Memory**: Remove unused layers with `removeLayerFromMap`
3. **Mobile**: Use `invalidateSize` after orientation changes
4. **Clustering**: For 100+ markers, consider marker clustering
5. **Tile Caching**: Custom tile layers can be cached for offline use

---

#### Error Handling

```sdev
attempt ::
    forge map be createMap("nonexistent-id", 0, 0, 10)
;; rescue error ::
    speak("Failed to create map: " + error)
;;
```

---

*sdev Leaflet Module — Mapping made magical* ✨🗺️

---


## Part IX — Generated reference

Everything below is extracted from the implementation at build time.

### Builtin index — v1 runtime (217 builtins)

Every function registered into the interpreter's global environment, grouped by
the module that installs it.

#### `src/lang/builtins.ts` — Core standard library — I/O, types, math, collections, strings, regex, time

0 builtins. Signatures are inferred from the implementation; "Rules" lists the constraints the runtime enforces at call time.

| Call | What it does | Rules | Source |
| --- | --- | --- | --- |

#### `src/lang/advanced.ts` — Pro layer — file I/O, hashing, base64, JSON, async, OS glue, buffers, FFI bridge

34 builtins. Signatures are inferred from the implementation; "Rules" lists the constraints the runtime enforces at call time.

| Call | What it does | Rules | Source |
| --- | --- | --- | --- |
| `acos(a)` | Inverse cosine, in radians. | acos() takes 1 argument | `advanced.ts:175` |
| `asin(a)` | Inverse sine, in radians. | asin() takes 1 argument | `advanced.ts:167` |
| `assert(…)` | ============= Assertions (for testing) =============. | assert() takes at least 1 argument | `advanced.ts:361` |
| `asserteq(a, b)` | Throws when the two values differ — the built-in test assertion. | asserteq() takes 2 arguments; Assertion failed: ${a} differs ${b} | `advanced.ts:374` |
| `atan(a)` | Inverse tangent, in radians. | atan() takes 1 argument | `advanced.ts:183` |
| `atan2(a, b)` | Angle in radians from the origin to the point (b, a), correct in all four quadrants. | atan2() takes 2 arguments (y, x) | `advanced.ts:191` |
| `cos(a)` | Cosine of an angle in radians. | cos() takes 1 argument | `advanced.ts:151` |
| `decipher(a)` | Parses a string back into a structured value (numbers, lists, tomes). | decipher() takes 1 argument (path); File not found: ${path} | `advanced.ts:45` |
| `E()` | Euler's number, the base of the natural logarithm. | — | `advanced.ts:229` |
| `erase(a, b)` | handles both tome key deletion and virtual file deletion. | erase() takes 1 argument (path) or 2 arguments (tome, key) | `advanced.ts:59` |
| `etch(a)` | ============= JSON Operations =============. | etch() takes 1 argument | `advanced.ts:10` |
| `exp(a)` | e raised to the given power. | exp() takes 1 argument | `advanced.ts:215` |
| `find(a, b)` | Returns the index of the first matching element, or -1 when nothing matches. | find() takes 2 arguments (list, predicate); First argument must be a list | `advanced.ts:263` |
| `inscribe(a, b)` | Formats values into a template string and returns the result. | inscribe() takes 2 arguments (path, content) | `advanced.ts:33` |
| `intersect(a, b)` | The set intersection of two lists — values present in both. | intersect() takes 2 arguments; Arguments must be lists | `advanced.ts:311` |
| `invoke(…)` | ============= HTTP/Networking (async simulation) =============. | invoke() takes at least 1 argument (url); Network error: ${e} | `advanced.ts:89` |
| `log(a)` | Natural logarithm. | log() takes 1 argument | `advanced.ts:199` |
| `log10(a)` | Base-10 logarithm. | log10() takes 1 argument | `advanced.ts:207` |
| `now()` | ============= Time Operations =============. | — | `advanced.ts:123` |
| `pause(a)` | Blocks or awaits for the given number of milliseconds. | pause() takes 1 argument (ms) | `advanced.ts:133` |
| `PI()` | Constants. | — | `advanced.ts:224` |
| `pick(a)` | Returns one element chosen at random from a list. | pick() takes 1 argument; Argument must be a list | `advanced.ts:334` |
| `position(a, b)` | The index at which a value or substring first appears. | position() takes 2 arguments; First argument must be a list | `advanced.ts:277` |
| `randint(a, b)` | ============= Random =============. | randint() takes 2 arguments (min, max) | `advanced.ts:324` |
| `scroll()` | Scrolls the rendered output or a target element. | — | `advanced.ts:81` |
| `shuffle(a)` | Returns the list in a random order (Fisher–Yates). | shuffle() takes 1 argument; Argument must be a list | `advanced.ts:345` |
| `sin(a)` | ============= Advanced Math =============. | sin() takes 1 argument | `advanced.ts:143` |
| `sort(…)` | ============= Sorting & Searching =============. | sort() takes at least 1 argument; First argument must be a list | `advanced.ts:240` |
| `tan(a)` | Tangent of an angle in radians. | tan() takes 1 argument | `advanced.ts:159` |
| `TAU()` | The constant τ — a full turn in radians, equal to 2π. | — | `advanced.ts:234` |
| `timestamp()` | Current time in milliseconds since the Unix epoch. | — | `advanced.ts:128` |
| `unetch(a)` | The inverse of `etch`: decodes an encoded string back to its original value. | unetch() takes 1 argument; Invalid JSON | `advanced.ts:18` |
| `union(a, b)` | The set union of two lists — every distinct value from either side. | union() takes 2 arguments; Arguments must be lists | `advanced.ts:299` |
| `unique(a)` | ============= Set Operations =============. | unique() takes 1 argument; Argument must be a list | `advanced.ts:289` |

#### `src/lang/matrix.ts` — Matrix and linear algebra

13 builtins. Signatures are inferred from the implementation; "Rules" lists the constraints the runtime enforces at call time.

| Call | What it does | Rules | Source |
| --- | --- | --- | --- |
| `dot(a, b)` | Dot product. | dot() takes 2 arguments; Arguments must be lists | `matrix.ts:64` |
| `flatten(a)` | Flatten. | flatten() takes 1 argument | `matrix.ts:155` |
| `identity(a)` | Identity matrix. | identity() takes 1 argument (size) | `matrix.ts:26` |
| `matadd(a, b)` | Element-wise operations. | matadd() takes 2 arguments | `matrix.ts:115` |
| `matmean(a)` | Mean of every element in a matrix. | matmean() takes 1 argument; Arguments must be 2D lists | `matrix.ts:209` |
| `matmul(a, b)` | Matrix multiplication. | matmul() takes 2 arguments; Arguments must be 2D lists | `matrix.ts:83` |
| `matrix(…)` | Create a matrix. | matrix() takes at least 2 arguments (rows, cols, fill?) | `matrix.ts:10` |
| `matscale(a, b)` | Multiplies every element of a matrix by a scalar. | matscale() takes 2 arguments (matrix, scalar) | `matrix.ts:131` |
| `matsub(a, b)` | Element-wise subtraction of two matrices of the same shape. | matsub() takes 2 arguments | `matrix.ts:123` |
| `matsum(a)` | Sum/mean. | matsum() takes 1 argument | `matrix.ts:198` |
| `reshape(a, b, c)` | Reshape. | reshape() takes 3 arguments (list, rows, cols); First argument must be a list | `matrix.ts:177` |
| `shape(a)` | Shape. | shape() takes 1 argument | `matrix.ts:142` |
| `transpose(a)` | Transpose matrix. | transpose() takes 1 argument; Argument must be a 2D list | `matrix.ts:42` |

#### `src/lang/graphics.ts` — Canvas 2D drawing and turtle graphics

75 builtins. Signatures are inferred from the implementation; "Rules" lists the constraints the runtime enforces at call time.

| Call | What it does | Rules | Source |
| --- | --- | --- | --- |
| `alpha(a)` | Sets the global drawing opacity for subsequent canvas operations. | alpha() takes 1 argument (0-1) | `graphics.ts:136` |
| `arc(…)` | Draws a circular arc from a start angle to an end angle. | arc() takes 5-6 arguments (x, y, radius, startAngle, endAngle, anticlockwise?) | `graphics.ts:196` |
| `background(…)` | Fills the whole canvas with a colour, clearing what was drawn. | background() takes at least 1 argument | `graphics.ts:65` |
| `backward(a)` | Moves the turtle backwards by the given distance, drawing if the pen is down. | backward() takes 1 argument (distance) | `graphics.ts:546` |
| `beginPath()` | ========== Path Drawing ==========. | — | `graphics.ts:374` |
| `bezierTo(a, b, c, d, e, f)` | Adds a cubic Bézier segment using two control points. | bezierTo() takes 6 arguments (cp1x, cp1y, cp2x, cp2y, x, y) | `graphics.ts:408` |
| `canvas(a, b)` | ========== Canvas Setup ==========. | canvas() takes 2 arguments (width, height) | `graphics.ts:45` |
| `circle(a, b, c)` | Draws a circle at a centre point with the given radius. | circle() takes 3 arguments (x, y, radius) | `graphics.ts:178` |
| `clear(a)` | Erases the canvas contents. | — | `graphics.ts:56` |
| `closePath()` | Closes the current path back to its starting point. | — | `graphics.ts:382` |
| `constrain(a, b, c)` | Clamps a number into the inclusive range `[low, high]`. | constrain() takes 3 arguments (value, min, max) | `graphics.ts:811` |
| `createSprite(…)` | ========== Sprite System ==========. | createSprite() takes 4-5 arguments (x, y, width, height, color?) | `graphics.ts:443` |
| `degrees(a)` | Converts radians to degrees. | degrees() takes 1 argument (radians) | `graphics.ts:779` |
| `dist(a, b, c, d)` | Euclidean distance between two points. | dist() takes 4 arguments (x1, y1, x2, y2) | `graphics.ts:822` |
| `dot(a, b)` | Dot product of two vectors. | — | `graphics.ts:706` |
| `drawSprite(a)` | Renders a sprite at its current position and frame. | drawSprite() takes 1 argument (sprite); Invalid sprite | `graphics.ts:467` |
| `ellipse(…)` | Draws an ellipse with independent width and height radii. | ellipse() takes 4-5 arguments (x, y, rx, ry, rotation?) | `graphics.ts:187` |
| `fill(a)` | ========== Drawing State ==========. | fill() takes 1 argument (color) | `graphics.ts:75` |
| `fillPath()` | Fills the current path with the active fill colour. | — | `graphics.ts:426` |
| `font(…)` | Sets the font family and size used by text drawing. | font() takes 1-2 arguments (fontFamily, style?) | `graphics.ts:291` |
| `forward(a)` | Moves the turtle forwards by the given distance, drawing if the pen is down. | forward() takes 1 argument (distance) | `graphics.ts:528` |
| `goto(a, b)` | Moves the turtle straight to an absolute canvas coordinate. | goto() takes 2 arguments (x, y) | `graphics.ts:622` |
| `heading()` | The turtle's current facing angle in degrees. | — | `graphics.ts:663` |
| `heart(a, b, c)` | Draws a heart shape at the given position and size. | heart() takes 3 arguments (x, y, size) | `graphics.ts:263` |
| `home()` | Returns the turtle to the canvas centre facing its default direction. | — | `graphics.ts:638` |
| `hsla(a, b, c, d)` | Builds a colour from hue, saturation, lightness, and alpha. | hsla() takes 4 arguments (h, s, l, a) | `graphics.ts:754` |
| `hue(…)` | ========== Color Helpers ==========. | hue() takes 1-3 arguments (h, s?, l?) | `graphics.ts:727` |
| `left(a)` | Turns the turtle counter-clockwise by the given angle. | left() takes 1 argument (degrees) | `graphics.ts:564` |
| `lerp(a, b, c)` | Linear interpolation between two values by a factor in 0..1. | lerp() takes 3 arguments (a, b, t) | `graphics.ts:787` |
| `line(a, b, c, d)` | Draws a straight line between two points. | line() takes 4 arguments (x1, y1, x2, y2) | `graphics.ts:211` |
| `linearGradient(…)` | ========== Gradients ==========. | linearGradient() takes 5+ arguments (x1, y1, x2, y2, ...colorStops) | `graphics.ts:301` |
| `lineCap(a)` | Sets how stroked line ends are drawn: `butt`, `round`, or `square`. | lineCap() takes 1 argument (round, square, butt) | `graphics.ts:118` |
| `lineJoin(a)` | Sets how stroked corners join: `miter`, `round`, or `bevel`. | lineJoin() takes 1 argument (round, bevel, miter) | `graphics.ts:127` |
| `lineTo(a, b)` | Adds a straight segment from the current path point to the given point. | lineTo() takes 2 arguments (x, y) | `graphics.ts:399` |
| `lineWidth(a)` | Sets stroke thickness in pixels. | lineWidth() takes 1 argument | `graphics.ts:109` |
| `mapRange(a, b, c, d, e)` | Re-maps a number from one numeric range into another, proportionally. | mapRange() takes 5 arguments (value, inMin, inMax, outMin, outMax) | `graphics.ts:798` |
| `moveSprite(a, b, c)` | Moves a sprite to a new position. | moveSprite() takes 3 arguments (sprite, dx, dy); Invalid sprite | `graphics.ts:478` |
| `moveTo(a, b)` | Starts a new path segment at the given point without drawing. | moveTo() takes 2 arguments (x, y) | `graphics.ts:390` |
| `noFill()` | Turns off filling for subsequent shapes. | — | `graphics.ts:84` |
| `noShadow()` | Clears any configured drop shadow. | — | `graphics.ts:160` |
| `noStroke()` | Turns off outlining for subsequent shapes. | — | `graphics.ts:101` |
| `pencolor(a)` | Sets the stroke colour used by the turtle and shape outlines. | pencolor() takes 1 argument (color) | `graphics.ts:604` |
| `pendown()` | Lowers the pen so turtle movement draws. | — | `graphics.ts:596` |
| `penup()` | Raises the pen so turtle movement does not draw. | — | `graphics.ts:588` |
| `penwidth(a)` | Sets the stroke width in pixels. | penwidth() takes 1 argument (width) | `graphics.ts:613` |
| `point(…)` | Draws a single pixel-sized dot. | point() takes 2-3 arguments (x, y, size?) | `graphics.ts:220` |
| `polygon(…)` | Draws a regular polygon with the given number of sides. | polygon() takes points [[x,y], ...]; polygon() argument must be a list of points | `graphics.ts:238` |
| `pos()` | The turtle's current `[x, y]` position. | — | `graphics.ts:671` |
| `quadraticTo(a, b, c, d)` | Adds a quadratic Bézier segment using one control point. | quadraticTo() takes 4 arguments (cpx, cpy, x, y) | `graphics.ts:417` |
| `radialGradient(…)` | Creates a radial gradient fill between two circles and colour stops. | radialGradient() takes 7+ arguments (x1, y1, r1, x2, y2, r2, ...colorStops) | `graphics.ts:311` |
| `radians(a)` | ========== Math Utilities for Graphics ==========. | radians() takes 1 argument (degrees) | `graphics.ts:771` |
| `randomColor()` | Returns a random colour value. | — | `graphics.ts:762` |
| `rect(…)` | ========== Basic Shapes ==========. | rect() takes 4-5 arguments (x, y, w, h, radius?) | `graphics.ts:169` |
| `resetTransform()` | Restores the canvas coordinate system to its identity state. | — | `graphics.ts:365` |
| `restore()` | Pops the last saved canvas transform and style state. | — | `graphics.ts:357` |
| `rgb(a, b, c)` | Builds an opaque colour from red, green, and blue channels. | rgb() takes 3 arguments (r, g, b) | `graphics.ts:738` |
| `rgba(a, b, c, d)` | Builds a colour from red, green, blue, and alpha channels. | rgba() takes 4 arguments (r, g, b, a) | `graphics.ts:746` |
| `right(a)` | Turns the turtle clockwise by the given angle. | right() takes 1 argument (degrees) | `graphics.ts:576` |
| `rotate(a)` | Rotates the canvas coordinate system by an angle. | rotate() takes 1 argument (angle in radians) | `graphics.ts:331` |
| `save()` | Pushes the current canvas transform and style state onto a stack. | — | `graphics.ts:349` |
| `scale(…)` | Scales the canvas coordinate system on the x and y axes. | scale() takes 1-2 arguments (x, y?) | `graphics.ts:340` |
| `setheading(a)` | Points the turtle at an absolute angle in degrees. | setheading() takes 1 argument (angle) | `graphics.ts:651` |
| `shadow(…)` | Configures the drop shadow applied to subsequent drawing. | shadow() takes 3-4 arguments (color, blur, offsetX, offsetY?) | `graphics.ts:145` |
| `spriteCollides(a, b)` | True when two sprites' bounding boxes overlap. | spriteCollides() takes 2 arguments (sprite1, sprite2); Invalid sprites | `graphics.ts:502` |
| `stamp()` | Imprints the turtle's current shape onto the canvas without moving it. | — | `graphics.ts:717` |
| `star(…)` | Draws a star with the given number of points. | star() takes 4-5 arguments (x, y, outerRadius, innerRadius, points?) | `graphics.ts:249` |
| `stroke(…)` | Strokes the current path with the active pen colour and width. | stroke() takes 1-2 arguments (color, width?) | `graphics.ts:92` |
| `strokePath()` | Strokes the current path outline with the active pen. | — | `graphics.ts:434` |
| `text(…)` | ========== Text ==========. | text() takes 3-4 arguments (str, x, y, size?) | `graphics.ts:273` |
| `textAlign(…)` | Sets horizontal (and optionally vertical) alignment for drawn text. | textAlign() takes 1-2 arguments (horizontal, vertical?) | `graphics.ts:282` |
| `translate(a, b)` | ========== Transformations ==========. | translate() takes 2 arguments (x, y) | `graphics.ts:322` |
| `triangle(a, b, c, d, e, f)` | Draws a triangle through three points. | triangle() takes 6 arguments (x1, y1, x2, y2, x3, y3) | `graphics.ts:229` |
| `turtle()` | ========== Turtle Graphics ==========. | — | `graphics.ts:519` |
| `turtleCircle(…)` | Drives the turtle around a circle of the given radius, drawing as it goes. | turtleCircle() takes 1-2 arguments (radius, steps?) | `graphics.ts:679` |
| `updateSprite(a)` | Advances a sprite's animation and physics by one step. | updateSprite() takes 1 argument (sprite); Invalid sprite | `graphics.ts:490` |

#### `src/lang/ui.ts` — App widget runtime used by the IDE App preview

33 builtins. Signatures are inferred from the implementation; "Rules" lists the constraints the runtime enforces at call time.

| Call | What it does | Rules | Source |
| --- | --- | --- | --- |
| `alert(a)` | Programmatic dialog. | — | `ui.ts:283` |
| `button(a, b, c)` | ───────────────────────── Interactive widgets ─────────────────────────. | — | `ui.ts:183` |
| `checkbox(a, b)` | Adds a checkbox widget bound to a named state key. | — | `ui.ts:209` |
| `column()` | Starts a vertical layout column; close it with `endcolumn`. | — | `ui.ts:108` |
| `divider()` | Draws a horizontal separator line between widgets. | — | `ui.ts:165` |
| `endcolumn()` | Closes the column opened by `column`. | — | `ui.ts:109` |
| `endgroup()` | Closes the group opened by `group`. | — | `ui.ts:115` |
| `endmenu()` | Closes the menu opened by `menu`. | — | `ui.ts:249` |
| `endrow()` | Closes the row opened by `row`. | — | `ui.ts:107` |
| `endtab()` | Closes the tab opened by `tab`. | — | `ui.ts:123` |
| `endtabs()` | Closes the tab strip opened by `tabs`. | — | `ui.ts:118` |
| `endwindow()` | Closes the window opened by `window`. | — | `ui.ts:104` |
| `group(a)` | Starts a labelled group box; close it with `endgroup`. | — | `ui.ts:111` |
| `heading(a, b)` | Renders a heading-styled text widget. | — | `ui.ts:142` |
| `image(a, b, c, d)` | Renders an image widget from a URL or data URI. | — | `ui.ts:160` |
| `input(a, b)` | Adds a single-line text input bound to a state key. | — | `ui.ts:192` |
| `label(a)` | Renders a short static text label. | — | `ui.ts:148` |
| `menu(a)` | ───────────────────────── Menu ─────────────────────────. | — | `ui.ts:245` |
| `menuitem(a, b)` | Adds one clickable entry to the current menu. | — | `ui.ts:250` |
| `paragraph(a)` | Renders a block of body text. | — | `ui.ts:154` |
| `progress(a, b)` | Renders a progress bar for a value between 0 and 1. | — | `ui.ts:168` |
| `row()` | Starts a horizontal layout row; close it with `endrow`. | — | `ui.ts:106` |
| `select(a, b)` | Adds a drop-down list bound to a state key. | — | `ui.ts:227` |
| `show()` | Show window (re-emit in case). | — | `ui.ts:280` |
| `slider(a, b, c, d)` | Adds a numeric slider with a range bound to a state key. | — | `ui.ts:217` |
| `spacer(a)` | Evaluates `{ pushNode('spacer', { size: asNumber(a, 8) }); return null; }`. | — | `ui.ts:166` |
| `tab(a)` | Declares one tab inside a `tabs` container. | — | `ui.ts:119` |
| `table(a, b)` | ───────────────────────── Tables ─────────────────────────. | — | `ui.ts:236` |
| `tabs()` | Starts a tab strip; close it with `endtabs`. | — | `ui.ts:117` |
| `textarea(a, b, c)` | Adds a multi-line text input bound to a state key. | — | `ui.ts:200` |
| `uiget(a)` | ───────────────────────── Reactive value helpers ─────────────────────────. | — | `ui.ts:260` |
| `uiset(a, b)` | Writes a value into the app widget state store, re-rendering the UI. | — | `ui.ts:264` |
| `window(a, b, c)` | ───────────────────────── Containers ─────────────────────────. | — | `ui.ts:90` |

#### `src/lang/web.ts` — Web DSL — HTML tags, CSS, JS hooks, raw passthrough

16 builtins. Signatures are inferred from the implementation; "Rules" lists the constraints the runtime enforces at call time.

| Call | What it does | Rules | Source |
| --- | --- | --- | --- |
| `close()` | Closes an open handle (file, socket, page, or window) and releases it. | — | `web.ts:227` |
| `endpage()` | Closes the document opened by `page`. | — | `web.ts:191` |
| `keyframes(a, b)` | Emits a CSS `@keyframes` animation block. | — | `web.ts:244` |
| `link(a, b)` | Emits a `<link>` tag — typically a stylesheet or icon. | — | `web.ts:207` |
| `meta(a)` | Emits a `<meta>` tag into the document head. | — | `web.ts:202` |
| `on(a, b, c)` | on("input", "#id", "...")  — generic event. | — | `web.ts:269` |
| `onclick(a, b)` | onclick("#id", "alert('hi')"). | — | `web.ts:261` |
| `open(…)` | open(name, attrs?)  /  close(). | — | `web.ts:222` |
| `page(a)` | Opens an HTML document; close it with `endpage`. | — | `web.ts:180` |
| `raw_css(a)` | Evaluates `{ state.css.push(asStr(a)); mark(); return null; }`. | — | `web.ts:280` |
| `raw_html(a)` | Evaluates `{ push(asStr(a)); mark(); return null; }`. | — | `web.ts:279` |
| `raw_js(a)` | Injects raw JavaScript into the generated page untouched. | — | `web.ts:281` |
| `script(a)` | Emits a `<script>` tag with the given source or URL. | — | `web.ts:256` |
| `style(a, b)` | style(selector, props_dict)  — or  style(raw_css_string). | — | `web.ts:232` |
| `tag(…)` | tag(name, text?, attrs?)  — works for any HTML tag, even ones we didn't list. | — | `web.ts:215` |
| `title(a)` | Sets the document title in the generated page head. | — | `web.ts:198` |

#### `src/lang/kernel.ts` — Virtual kernel — tasks, syscalls, IPC, GC, process table

46 builtins. Signatures are inferred from the implementation; "Rules" lists the constraints the runtime enforces at call time.

| Call | What it does | Rules | Source |
| --- | --- | --- | --- |
| `closeWindow(a)` | Closes a virtual window and frees its resources. | closeWindow() takes 1 argument | `kernel.ts:910` |
| `createTask(a, b, c)` | Task shortcuts. | createTask() requires a function | `kernel.ts:819` |
| `createWindow(a, b, c, d, e)` | Window manager. | — | `kernel.ts:899` |
| `deviceList()` | HAL. | — | `kernel.ts:944` |
| `deviceRead(a)` | Reads from a virtual device by name. | deviceRead() takes 1 argument; Device not found: ${args[0]} | `kernel.ts:949` |
| `deviceStatus(a)` | Reports whether a virtual device is attached and ready. | deviceStatus() takes 1 argument; Device not found: ${args[0]} | `kernel.ts:970` |
| `deviceWrite(a, b)` | Writes a value to a virtual device by name. | deviceWrite() takes 2 arguments; Device not found: ${args[0]} | `kernel.ts:959` |
| `emitEvent(…)` | Fires a named kernel event, invoking every registered handler. | emitEvent() takes at least 1 argument | `kernel.ts:1067` |
| `f32()` | FFI type tag: 32-bit float. | — | `kernel.ts:1048` |
| `f64()` | FFI type tag: 64-bit float. | — | `kernel.ts:1049` |
| `fsAppend(a, b)` | Appends text to the end of a virtual filesystem file. | fsAppend() takes 2 arguments | `kernel.ts:809` |
| `fsDelete(a)` | Deletes a virtual filesystem entry. | fsDelete() takes 1 argument | `kernel.ts:785` |
| `fsExists(a)` | True when the path exists in the virtual filesystem. | fsExists() takes 1 argument | `kernel.ts:793` |
| `fsList(a)` | Lists the children of a virtual filesystem directory. | fsList() takes 1 argument | `kernel.ts:768` |
| `fsMkdir(a)` | Creates a directory in the virtual filesystem. | fsMkdir() takes 1 argument | `kernel.ts:776` |
| `fsRead(a)` | VFS shortcuts. | fsRead() takes 1 argument | `kernel.ts:751` |
| `fsStat(a)` | Returns metadata (size, kind, timestamps) for a virtual filesystem entry. | fsStat() takes 1 argument | `kernel.ts:801` |
| `fsWrite(a, b)` | Writes text to a path in the virtual filesystem, creating it if needed. | fsWrite() takes 2 arguments (path, content) | `kernel.ts:759` |
| `gc()` | Runs the virtual kernel's mark-and-sweep collector immediately. | — | `kernel.ts:893` |
| `getPrivilege()` | Privilege. | — | `kernel.ts:1003` |
| `getTime()` | getTime. | — | `kernel.ts:1095` |
| `heapAlloc(a)` | Heap. | heapAlloc() takes 1 argument (size) | `kernel.ts:854` |
| `heapFree(a)` | Releases a kernel heap handle so the collector can reclaim it. | heapFree() takes 1 argument (address) | `kernel.ts:862` |
| `heapLoad(a)` | Reads the value behind a kernel heap handle. | heapLoad() takes 1 argument (address) | `kernel.ts:871` |
| `heapStats()` | Returns live/free counts and totals for the kernel heap. | — | `kernel.ts:888` |
| `heapStore(a, b)` | Allocates a value on the kernel heap and returns its handle. | heapStore() takes 2 arguments (address, value) | `kernel.ts:879` |
| `i16()` | FFI type tag: signed 16-bit integer. | — | `kernel.ts:1046` |
| `i32()` | FFI type tag: signed 32-bit integer. | — | `kernel.ts:1047` |
| `i8()` | FFI type tag: signed 8-bit integer. | — | `kernel.ts:1045` |
| `kernelBoot()` | Boot. | — | `kernel.ts:745` |
| `killTask(a)` | Terminates the task with the given id. | killTask() takes 1 argument | `kernel.ts:828` |
| `loadModule(a)` | Module loader (simulated). | loadModule() takes 1 argument (path); Module not found: ${path} | `kernel.ts:1082` |
| `moveWindow(a, b, c)` | Moves a virtual window to new coordinates. | moveWindow() takes 3 arguments (id, x, y) | `kernel.ts:918` |
| `onEvent(a, b)` | Registers a handler to run when a named kernel event fires. | onEvent() takes 2 arguments (event, handler); Second argument must be a function | `kernel.ts:1054` |
| `onInterrupt(a, b)` | Interrupt registration. | onInterrupt() takes 2 arguments (num, handler); Second argument must be a function | `kernel.ts:981` |
| `resizeWindow(a, b, c)` | Resizes a virtual window. | resizeWindow() takes 3 arguments (id, w, h) | `kernel.ts:927` |
| `runTasks()` | Runs the scheduler until every ready task has had a turn. | — | `kernel.ts:848` |
| `setPrivilege(a)` | Sets the privilege ring of the current task. | Invalid privilege level; Permission denied | `kernel.ts:1008` |
| `syscall(…)` | syscall(name, ...args). | syscall() requires at least 1 argument (name) | `kernel.ts:735` |
| `taskList()` | Returns the process table as a list of task records. | — | `kernel.ts:841` |
| `triggerInterrupt(a)` | Raises a virtual interrupt, invoking its registered handler. | triggerInterrupt() takes 1 argument | `kernel.ts:992` |
| `u16()` | FFI type tag: unsigned 16-bit integer. | — | `kernel.ts:1043` |
| `u32()` | FFI type tag: unsigned 32-bit integer. | — | `kernel.ts:1044` |
| `u8()` | FFI type tag: unsigned 8-bit integer. | — | `kernel.ts:1042` |
| `windowList()` | Lists the windows currently open in the virtual desktop. | — | `kernel.ts:936` |
| `yieldTask()` | Voluntarily gives up the rest of the current task's time slice. | — | `kernel.ts:836` |


### Keyword table — v1 lexer


### Seed VM memory map


### Seed VM opcode table

The seed VM is a stack machine: every instruction consumes operands from the
operand stack and pushes its result back. Inline operands are little-endian and
follow the opcode byte directly in the bytecode stream.

| Opcode | Mnemonic | Behaviour |
| --- | --- | --- |



### sdev-written source index (28 files, 294 functions)

Every function defined in sdev itself — the self-hosted compiler, the parity
agent, and the standard library.

#### `lang\compiler\codegen.sdev`

SDEV self-hosted codegen (Milestone 5g). Compiles SDEV source to real seed-VM bytecode, entirely in SDEV. Emits the byte stream to a global buffer `bc` whose cell 0 holds the current byte count and cells 1..count hold the bytes. The scripts/test-self- codegen.mjs driver harvests the buffer via `say`, reconstructs it as a Uint8Array, feeds it into a fresh seed WASM instance, and verifies the executed output matches the JS bootstrap compiler's output. Grammar this milestone covers: program := stmt* stmt    := 'say' expr | 'set' IDENT 'to' expr | 'if' expr NL block ('else' NL block)? 'end' | 'while' expr NL block 'end' | 'to' IDENT ('with' IDENT*)? NL block 'end' | 'return' expr? block   := stmt*                              (until 'else' or 'end') expr    := cmp cmp     := add ( ('is' | 'is' 'not' | '<' | '>' | '<=' | '>=') add )? add     := mul (('+'|'-') mul)* mul     := atom (('*'|'/') atom)* atom    := INT | IDENT                              (variable load) | IDENT '(' args? ')'                (function call / builtin) | '(' expr ')' Restriction: functions must be defined before their call sites — the self-hosted compiler emits function bodies inline, bracketed by a JMP that skips over them, and records each body's byte offset in a global table. Forward references / mutual recursion land in a later milestone.

47 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `is_digit` | `c` | True when the byte at the given index is an ASCII digit 0-9. | `0` | 35 |
| `is_alpha` | `c` | True when the byte is an ASCII letter or underscore — the start of an identifier. | `1` | 45 |
| `is_alnum` | `c` | True when the byte may continue an identifier: a letter, digit, or underscore. | `1` | 66 |
| `slice` | `src i j` | Extracts the substring between two byte offsets, byte by byte. | `out` | 73 |
| `both_float` | `a b` | Milestone 5q: expression types are 0 = int, 1 = str, 2 = float. Float arithmetic only kicks in when BOTH operands are floats (mixed arithmetic requires an explicit i2f), matching the bootstrap oracle exactly. | `1` | 85 |
| `str_eq` | `a b` | Byte-exact string comparison, used instead of host equality so both tracks agree. | `0` | 94 |
| `prelink_source` | `s` | Part of the Milestone 5z: modules (`use "path"`) section of this module. | `out` | 120 |
| `emit_byte` | `b` | Appends one byte to the bytecode buffer being built. | `0` | 168 |
| `intern_str` | `s` | Interns a string literal into the pool and returns its handle, reusing duplicates. | `0` | 185 |
| `emit_i32` | `v` | Appends a little-endian 32-bit operand to the bytecode buffer. | `0` | 217 |
| `placeholder16` | _none_ | Reserve a two-byte i16 placeholder and return the byte offset at which it starts (0-indexed, list cell = pos + 1). | `p` | 230 |
| `patch_i16` | `pos target` | Patch a two-byte i16 at byte offset `pos` so a JZ/JMP jumps to byte offset `target`. Offsets are relative to the end of the instruction (pos + 2). Negative offsets get two's-complement 16-bit encoding. | `0` | 240 |
| `intern_name` | `name` | Interns an identifier and returns its global slot index, allocating on first sight. | `k - 1` | 263 |
| `find_local` | `name` | Looks up a local variable in the current frame, returning its slot or -1. | `k - 1` | 279 |
| `add_local` | `name` | Allocates a new local slot in the current function frame. | `loc_names[0] - 1` | 291 |
| `find_fn` | `name` | Looks up a declared function by name, returning its index or -1. | `k - 1` | 301 |
| `emit_load_ident` | `name` | Emits `LOAD_LOC` for a local or `LOAD` for a global, whichever the name resolves to. | `0` | 320 |
| `emit_store_ident` | `name` | Emits `STORE_LOC` or `STORE` for an assignment target. | `0` | 337 |
| `set_ident_type` | `name t` | Milestone 5t: retype an existing variable without emitting anything — used when `set t[k] to "s"` promotes a tome from int-valued to string-valued so later reads pick SAY_STR. | `0` | 359 |
| `emit_call` | `name nargs` | Emits the argument pushes plus the `CALL` instruction for a function call. | `0` | 380 |
| `emit_ref` | `name` | Milestone 5w: `ref NAME` pushes a function value — the callee's code offset as a plain i32. Unknown offsets reuse the pending-call table; the resolver tells the two site shapes apart by looking at the opcode byte that precedes the patch position (0x60 CALL → u16 target, otherwise 0x01 PUSH_I32 → i32 target). | `0` | 666 |
| `resolve_pending_calls` | _none_ | Back-patch every deferred CALL now that all function offsets are known. | `0` | 690 |
| `patch_breaks` | `target` | Part of the Milestone 5s: loop-exit patch tables section of this module. | `0` | 718 |
| `patch_conts` | `target` | Part of the Milestone 5s: loop-exit patch tables section of this module. | `0` | 745 |
| `blank_tok` | `i` | Part of the Milestone 5y: kinds (classes) section of this module. | `0` | 782 |
| `prev_word_is` | `j w` | Part of the Milestone 5y: kinds (classes) section of this module. | `0` | 787 |
| `is_kind_opener` | `j` | Part of the Milestone 5y: kinds (classes) section of this module. | `0` | 807 |
| `desugar_kinds` | _none_ | Part of the Milestone 5y: kinds (classes) section of this module. | _no explicit yield_ | 848 |
| `emit_new` | `cname` | `new NAME` — TNEW sized to the method count, then one PUSH_STR / function value / TSET triple per method, in declaration order. | `0` | 1012 |
| `method_ret_type` | `name` | A method call is string-typed when ANY kind declares a method of that name returning a string — mirrors the bootstrap oracle's name-based rule. | `1` | 1052 |
| `emit_member_key` | `name` | Emit PUSH_STR for a member name (shared by field reads, writes and calls). | `0` | 1070 |
| `is_op_c` | `pos c` | True when the character can begin an operator token. | `0` | 1081 |
| `is_ident_word` | `pos w` | True when the token text is a plain identifier rather than a keyword. | `0` | 1093 |
| `parse_atom` | `pos` | Parses the tightest-binding expression: literal, identifier, call, index, or parenthesised group. | `pos + 1` | 1110 |
| `parse_postfix` | `pos` | Postfix indexing: after an atom, chain any number of `[ EXPR ]` reads, each emitting an LGET. | _no explicit yield_ | 1476 |
| `parse_unary` | `pos` | Milestone 5r: unary layer. `-x` compiles exactly like the bootstrap oracle does — PUSH_I32 0, the operand, then SUB — so byte identity is preserved. Postfix indexing binds tighter than the unary minus. | `pos` | 1551 |
| `parse_mul` | `pos` | Parses the multiplication / division / modulo precedence level. | `pos` | 1565 |
| `parse_add` | `pos` | Parses the addition / subtraction precedence level. | `pos` | 1608 |
| `parse_cmp` | `pos` | Comparisons: `is`, `is not`, `<`, `>`, `<=`, `>=`. Two-char `<=` / `>=` are pre-folded by the driver's lexer into sentinel punctuation codes 300 / 301. Every comparison yields an int (0 / 1). When both operands are floats, `is`, `<` and `>` use the FEQ / FLT / FGT opcodes. | `pos` | 1659 |
| `parse_not` | `pos` | Part of the and  := not ('and' not) section of this module. | `pos` | 1768 |
| `parse_and` | `pos` | Part of the and  := not ('and' not) section of this module. | `pos` | 1778 |
| `parse_or` | `pos` | Part of the and  := not ('and' not) section of this module. | `pos` | 1795 |
| `parse_expr` | `pos` | Part of the and  := not ('and' not) section of this module. | `parse_or(pos)` | 1813 |
| `skip_nl` | `pos` | Advances the cursor past newline tokens so statements may be separated freely. | `pos` | 1819 |
| `parse_block` | `pos` | Parse a sequence of statements until `else`, `rescue`, `end`, or EOF. | `pos` | 1836 |
| `parse_params` | `pos` | Parse the parameter list of a `to NAME with p1 p2 ...` declaration and push each param into loc_names. Returns (new_pos, n_params) packed into a two-cell scratch list. Since SDEV functions can only return one value, we return new_pos and stash n_params in a global scratch cell. | `pos` | 1871 |
| `parse_stmt` | `pos` | Parses one statement and emits its bytecode: binding, assignment, control flow, or expression. | `pos` | 1893 |

#### `lang\compiler\driver.sdev`

The self-hosted SDEV compiler driver — written in SDEV. This file IS the compiler that ships: the self-hosted compiler compiles this program (with codegen.sdev pulled in by `use`) to the bytecode that the browser IDE, the CLI and every test run on the seed VM. It is source-independent: the program being compiled arrives through read_file("<stdin>"), which the host answers from memory. Modules named by `use "path"` inside that program are fetched through read_file(path). Output protocol (one value per `say`): <bytecode length> <byte>... <pool length> <byte>... Rebuild + verify (no JavaScript compiler involved): node bin/sdevhost.mjs scripts/bake-driver.sdev node bin/sdevhost.mjs scripts/test-driver-artifact.sdev

_No top-level functions — this file is a script or data module._

#### `lang\compiler\lexer.sdev`

SDEV lexer, written in SDEV. This is the first piece of the Milestone-5 self-hosted compiler. The bootstrap JS compiler (lang/bootstrap/compile.mjs) still compiles this file to bytecode for now; once the parser + codegen are also ported, the JS compiler is deleted. The lexer streams tokens straight to stdout via `say`, one per line, in a stable text format: N=<int>      integer literal I=<ident>    identifier or keyword S=<text>     string literal (contents only, no quotes) P=<char>     single-char punctuation NL           newline EOF          end of source The `scripts/test-self-lexer.mjs` driver splices a `set src to "..."` stub in front of this file and diffs the output against a JS reference lexer built from the same rules.

5 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `is_digit` | `c` | True when the byte at the given index is an ASCII digit 0-9. | `0` | 22 |
| `is_alpha` | `c` | True when the byte is an ASCII letter or underscore — the start of an identifier. | `1` | 32 |
| `is_alnum` | `c` | True when the byte may continue an identifier: a letter, digit, or underscore. | `1` | 54 |
| `slice` | `src i j` | Extracts the substring between two byte offsets, byte by byte. | `out` | 61 |
| `lex` | `src` | Turns source text into the token stream: kinds, lexemes, and line numbers. | _no explicit yield_ | 70 |

#### `lang\compiler\parser.sdev`

SDEV expression parser, written in SDEV. This is the second slice of Milestone 5 (self-hosted compiler). It sits on top of the lexer (lang/compiler/lexer.sdev) and, for now, handles arithmetic expressions with correct precedence: expr  := add add   := mul (('+' | '-') mul)* mul   := atom (('*' | '/') atom)* atom  := NUM | '(' expr ')' The parser reads tokens from globals populated by an inlined top-level lex loop (see scripts/test-self-parser.mjs for the harness). It streams the parse in reverse-Polish form via `say`, one atom or operator per line — that's easy to diff against a JS reference implementation. The full statement parser lands next; this file exercises recursion, global-buffer reads, and function-return threading of the cursor.

4 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `is_op_c` | `pos c` | True when the character can begin an operator token. | `0` | 22 |
| `parse_atom` | `pos` | Parses the tightest-binding expression: literal, identifier, call, index, or parenthesised group. | `pos + 1` | 37 |
| `parse_mul` | `pos` | Parses the multiplication / division / modulo precedence level. | `pos` | 54 |
| `parse_add` | `pos` | Parses the addition / subtraction precedence level. | `pos` | 73 |

#### `lang\parity\agent.sdev`

sdev Parity Agent — written in sdev, runs on sdev Phase 0/1 of the v1 <-> v2 parity plan. The agent is the machine that keeps every sdev track honest: 1. loads the canonical registry (lang/parity/features.json), 2. loads the source of every track listed in that registry, 3. probes each track for each feature, 4. prints a gap report and writes lang/parity/report.json, 5. regenerates the parity matrix inside the documentation, between <!-- PARITY:BEGIN --> / <!-- PARITY:END --> markers, 6. reports how many `must` features are missing so CI can fail. Adding a track = one entry in the registry. The agent needs no change. Host builtins used: read_file, write_file.

12 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `unquote` | `s` | Strips the surrounding quotes from a JSON string value. | `t` | 21 |
| `field_key` | `line` | Split a `"key": "value"` line. Values may contain colons, so only the first colon separates; the rest is re-joined. | `unquote(parts[0])` | 38 |
| `field_value` | `line` | Reads one field out of a JSON object, without a full JSON parser. | `""` | 43 |
| `load_registry` | `path` | Reads `lang/parity/features.json` into memory as the canonical feature list. | `{ tracks: tracks, features: features }` | 59 |
| `load_track_source` | `spec` | Loads the implementation source for one track so it can be probed for a feature. | `out` | 99 |
| `probe` | `src, name` | A feature is present on a track when its track-local name appears as a quoted token in that track's source — the shape every implementation uses for keyword tables and builtin dispatch. | `nope` | 113 |
| `mark` | `level, present` | Records the support verdict for one feature on one track. | `"n/a"` | 128 |
| `audit` | `registry` | Probes every feature against every track and builds the full verdict table. | `{ tracks: tracks, rows: rows, must_missing: must_missing, should_missing: should_missing }` | 138 |
| `matrix_markdown` | `report` | Renders the audit result as the markdown parity matrix. | `out` | 183 |
| `report_json` | `report` | Serialises the audit result to `lang/parity/report.json`. | `out` | 219 |
| `sync_doc` | `path, block` | Rewrites the parity matrix block inside the parity documentation in place. | `0` | 266 |
| `run_parity_agent` | `registry_path, doc_paths` | Entry point: audit, then write both the JSON report and the documentation. | `measure(report.must_missing)` | 283 |

#### `lang\stdlib\ffi.sdev`

sdev Stdlib — Foreign Function Interface (Milestone 9) Call into native shared libraries (.so / .dylib / .dll) from sdev. This is the bridge that lets the ML stdlib reach BLAS, libcudart, cuBLAS, cuDNN, and any other C ABI library the host system exposes. Requires host builtins provided by the native runtime: ffi_open(path)                  -> lib handle (int)   or void on error ffi_sym(lib, name)              -> fn handle (int)    or void on error ffi_call(fn, ret_kind, args)    -> result (kind-typed) ffi_close(lib)                  -> yep/nope ffi_buf(size)                   -> raw byte buffer addr (int) ffi_read_f64(buf, i) / ffi_write_f64(buf, i, x) ffi_read_i32(buf, i) / ffi_write_i32(buf, i, n) The browser WASM runtime stubs these to void — FFI only runs on the native/Node track. The interpreter's `advanced.ts` wires the Node side via `koffi` when installed. Type kinds are small ints so the host can dispatch fast: 0 void   1 i32   2 i64   3 f32   4 f64 5 ptr    6 cstr  7 buf   8 bool

11 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `Library` | `path` | library handle wrapper | `{ ok: nope, path: path, handle: void, err: "cannot open " + path }` | 39 |
| `lib_close` | `lib` | Closes a loaded native library handle. | `yep` | 47 |
| `bind` | `lib, name, ret_kind, arg_kinds` | function binding bind(lib, "matmul_f64", FFI_VOID, [FFI_PTR, FFI_PTR, FFI_PTR, FFI_I32, FFI_I32, FFI_I32]) | `{` | 55 |
| `invoke` | `binding, argv` | Calls a native symbol with marshalled arguments and returns the marshalled result. | `ffi_call(binding.fn, binding.ret, binding.args, argv)` | 68 |
| `buf_f64` | `n` | raw buffers (for passing float arrays) | `{ addr: b, len: n, kind: FFI_F64 }` | 74 |
| `buf_from_list` | `xs` | Packs a list of numbers into a raw FFI byte buffer. | `b` | 79 |
| `buf_to_list` | `b` | Unpacks a raw FFI byte buffer back into a list of numbers. | `out` | 90 |
| `open_blas` | `path` | BLAS-style convenience wrappers Open an OpenBLAS-compatible library and bind the two calls the ML stdlib actually needs for accelerated matmul. | `{ lib: lib, dgemm: dgemm, daxpy: daxpy }` | 103 |
| `blas_matmul` | `blas, a, b` | BLAS-accelerated matmul that plugs straight into ml/tensor.sdev. Falls back to the pure-sdev matmul when the binding is void. | `tensor(buf_to_list(bc), [m, n])` | 127 |
| `open_cuda` | `cudart_path, cublas_path` | CUDA fast path Open libcudart + libcublas and expose the handful of symbols the ML stdlib needs for GPU-accelerated training. | `{` | 145 |
| `cuda_ok` | `cuda` | True when a CUDA runtime and device are reachable from this host. | `yep` | 167 |

#### `lang\stdlib\ml\auto_evolve.sdev`

sdev ML Stdlib — Autonomous Evolution Loop (Milestone 12) Wires the ML stack into sdev's own source tree. A trained sdev model reads demand signals, drafts patches to the language, runs them through a review hook, and — on approval — commits them to disk. The same loop can also fine-tune the model on fresh distilled data or teacher outputs. Nothing here writes to disk unless `set_review_hook(...)` has been called with a function that returns `yep`. That is the single gate protecting the entire pipeline.

10 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `is_allowed` | `path` | Guards the evolution loop: true only for paths the policy permits editing. | `nope` | 34 |
| `make_proposal` | `path, old_body, new_body, reason` | proposal record | `{` | 44 |
| `apply_proposal` | `p` | Applies an approved proposal to the source tree and records it in the log. | `ok` | 54 |
| `draft_from_demand` | `model, demand, target_path` | demand → proposal Given a ranked demand map from `mine_demand`, ask the model to draft a patch for the top topic. `model` is any sdev model exposing `generate(model, prompt, max_new)`. | `make_proposal(target_path, cur, patched,` | 65 |
| `top_topic` | `counts` | Picks the most-requested topic out of the harvested demand signals. | `best_k` | 77 |
| `evolve_weights` | `model, teacher_url, teacher_key, prompts, epochs, lr` | fine-tune on live distillation Pulls prompt/answer pairs from a teacher endpoint and runs a short SGD pass so the local model tracks the frontier without leaving the sdev runtime. | `measure(pairs)` | 95 |
| `evolve_tick` | `model, sources, teacher_url, teacher_key` | the loop One tick: mine demand → draft → review → apply → fine-tune. Returns a report tome so the caller can log or throttle. | `{` | 112 |
| `pick_target` | `demand` | Chooses which file the next evolution step should modify. | `"lang/stdlib/ml/nn.sdev"` | 133 |
| `prompt_pool` | `demand` | Builds the prompt set handed to the teacher model for the next round. | `out` | 145 |
| `evolve_forever` | `model, sources, teacher_url, teacher_key, ticks` | long-running driver | _no explicit yield_ | 160 |

#### `lang\stdlib\ml\autograd.sdev`

sdev ML Stdlib — Autograd Tape (Milestone 8b) Reverse-mode automatic differentiation implemented as a global operation tape. Each recorded op stores its inputs, output, and a "kind" tag; `backward(out)` walks the tape in reverse and accumulates gradients into each tensor's `grad` list.

20 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `tape_reset` | _none_ | Clears the global autograd tape before a new forward pass. | _no explicit yield_ | 13 |
| `record` | `kind, inputs, out` | Appends one operation and its inputs to the autograd tape. | _no explicit yield_ | 17 |
| `d_add` | `a, b` | differentiable ops | `o` | 22 |
| `d_mul` | `a, b` | Local derivative rule for element-wise multiplication. | `o` | 28 |
| `d_matmul` | `a, b` | Local derivative rule for matrix multiplication. | `o` | 34 |
| `d_relu` | `a` | Local derivative rule for ReLU: pass gradient where the input was positive. | `o` | 41 |
| `d_mse` | `pred, target` | Local derivative rule for mean squared error. | `o` | 48 |
| `d_softmax_ce` | `logits, targets` | Row-wise softmax + cross-entropy over next-token targets. logits: [rows, vocab]; targets: list of `rows` class ids. Returns the mean negative log-likelihood as a 1-element tensor. | `o` | 65 |
| `backward` | `out` | backward pass | _no explicit yield_ | 102 |
| `bw_sce` | `e` | Backward pass for softmax cross-entropy, fused for numerical stability. | _no explicit yield_ | 118 |
| `bw_add` | `e` | Backward pass for addition: routes the incoming gradient to both operands. | _no explicit yield_ | 140 |
| `bw_mul` | `e` | Backward pass for element-wise multiplication. | _no explicit yield_ | 152 |
| `bw_matmul` | `e` | Backward pass for matrix multiplication, producing both operand gradients. | _no explicit yield_ | 164 |
| `bw_relu` | `e` | Backward pass for ReLU. | _no explicit yield_ | 204 |
| `bw_mse` | `e` | Backward pass for mean squared error. | _no explicit yield_ | 216 |
| `sgd_step` | `params, lr` | optimizers | _no explicit yield_ | 229 |
| `zero_grads` | `params` | Resets every parameter gradient to zero before the next backward pass. | _no explicit yield_ | 244 |
| `clip_grads` | `params, max_norm` | Global-norm gradient clipping — keeps LM training from exploding. | `norm` | 255 |
| `adam_new` | `params` | Adam | `{ m: m, v: v, t: 0, b1: 0.9, b2: 0.999, eps: 0.00000001 }` | 279 |
| `adam_step` | `opt, params, lr` | Applies one Adam optimiser update using the stored moment estimates. | _no explicit yield_ | 296 |

#### `lang\stdlib\ml\cuda.sdev`

sdev ML Stdlib — CUDA Fast Path (Milestone 11) Thin sdev-native layer over the FFI cuBLAS/cudart bindings in ffi.sdev. Gives the ML stack a real GPU matmul + training loop when the process is on a CUDA-capable box, and transparently falls back to the pure-sdev tensor ops otherwise so the same program keeps running in the browser IDE. Everything here is sdev source that runs on both interpreter tracks. The native/Node runtime wires the FFI symbols; the browser stubs them to void, which forces `cuda_ok(...)` to nope and every helper below to take the CPU path.

11 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `cuda_device` | `cudart_path, cublas_path` | device handle A "device" bundles the loaded cuBLAS/cudart bindings with a live cublasHandle_t. We keep it as a tome so callers can pass it around like any other sdev value. | `{ ok: nope, cu: void, handle: void, err: "cuda unavailable" }` | 22 |
| `cuda_device_default` | _none_ | Returns the default CUDA device handle, initialising the runtime if needed. | `cuda_device("/usr/lib/x86_64-linux-gnu/libcudart.so",` | 34 |
| `cuda_free_device` | `dev` | Releases a CUDA device handle. | `yep` | 40 |
| `cuda_alloc` | `dev, n_f64` | device memory A cuda_buf is host-visible metadata around a device pointer. | `{ dptr: ffi_read_i32(pbuf, 0), n: n_f64, bytes: nbytes }` | 51 |
| `cuda_free` | `dev, b` | Frees a device-side allocation. | `yep` | 58 |
| `cuda_upload` | `dev, host_list` | cudaMemcpyKind: HostToDevice=1, DeviceToHost=2 | `db` | 65 |
| `cuda_download` | `dev, db` | Copies a buffer from device memory back to host memory. | `buf_to_list(hb)` | 73 |
| `cuda_matmul` | `dev, a, b` | accelerated ops Row-major C = A · B via cublasDgemm. cuBLAS is column-major, so we compute Bᵀ · Aᵀ under the hood and interpret the result as row-major C — same trick numpy's cublas backend uses. | `tensor(out, [m, n])` | 83 |
| `best_matmul` | `dev, blas, a, b` | Convenience: pick the fastest available matmul path. Priority: CUDA → BLAS → pure sdev. | `matmul(a, b)` | 113 |
| `cuda_forward_linear` | `dev, x, w, bias` | training-loop hook Drop-in replacement for nn.fit's inner matmul step. The rest of the training loop (loss, autograd tape, optimizer) stays pure sdev — only the hot kernel moves to the GPU. | `t_add(y, bias)` | 125 |
| `cuda_report` | `dev` | diagnostics | `"CUDA: unavailable (running on CPU fallback)"` | 131 |

#### `lang\stdlib\ml\data.sdev`

sdev ML Stdlib — Data & Web (Milestone 8e) Dataset loaders, web scraping, and LLM-distillation utilities. Uses host builtins: read_file, write_file, http_get.

10 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `load_text` | `path` | text I/O | `read_file(path)` | 10 |
| `save_text` | `path, s` | Writes a text corpus to disk for later training runs. | _no explicit yield_ | 14 |
| `char_vocab` | `text` | byte-pair-ish tokenizer (char level) | `{ size: measure(order), stoi: seen, itos: order }` | 19 |
| `encode` | `vocab, text` | Turns text into a list of token ids using the active vocabulary. | `out` | 34 |
| `decode` | `vocab, ids` | Turns a list of token ids back into text. | `s` | 45 |
| `crawl` | `url` | web crawler | `http_get(url)` | 56 |
| `crawl_many` | `urls` | Fetches a list of URLs and returns their extracted text bodies. | `out` | 60 |
| `teacher_query` | `endpoint, api_key, prompt` | teacher-model distillation Uses a remote LLM (Gemini, GPT, etc.) as a teacher: send a prompt, receive logits/text, and train the local sdev model to imitate the teacher's outputs. | `http_get(url)` | 74 |
| `distill_batch` | `endpoint, key, prompts` | Queries a teacher model for a batch of examples so a smaller model can learn from them. | `pairs` | 79 |
| `save_model` | `path, model` | checkpointing | _no explicit yield_ | 91 |

#### `lang\stdlib\ml\nn.sdev`

sdev ML Stdlib — Neural Network Layers (Milestone 8c + M15) High-level layer builders, accelerated matmul dispatch, and batched forward passes. Each layer returns a tome exposing { params: [tensors...], w, b, forward: conjure(x) }.

15 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `set_accel` | `cuda_dev be void, blas_handle be void, webgpu_dev be void` | Part of the Accelerated matmul dispatch (M15) section of this module. | `{ cuda: ACCEL_CUDA, blas: ACCEL_BLAS, webgpu: ACCEL_WEBGPU }` | 17 |
| `t_matmul` | `a, b` | Part of the Accelerated matmul dispatch (M15) section of this module. | `matmul(a, b)` | 24 |
| `accel_matmul` | `a, b, cuda_dev be void, blas_handle be void, webgpu_dev be void` | Priority: CUDA -> BLAS -> WebGPU -> pure-SDEV t_matmul. Accepts optional explicit (cuda_dev, blas_handle) or uses active globals. | `best_matmul(cu, bl, a, b)` | 30 |
| `d_accel_matmul` | `a, b` | Part of the Accelerated matmul dispatch (M15) section of this module. | `o` | 52 |
| `linear` | `in_features, out_features` | Layers | `{` | 60 |
| `broadcast_row` | `row, rows` | Adds a bias row to every row of a matrix. | `t` | 78 |
| `sequential` | `layers` | Chains layers into a single model whose forward pass runs them in order. | `{` | 91 |
| `seq_forward` | `layers, x` | Runs the forward pass of a sequential model. | `cur` | 107 |
| `relu_layer` | _none_ | A layer that applies ReLU element-wise. | `{ params: gather(), forward: (x) -> d_relu(x) }` | 117 |
| `pack_batch_2d` | `batch_x` | Batched forward passes (M15) Accepts either a 2D tensor [batch_size, in_features] or a list of sample tensors / feature lists, packs into [B, in_features], and runs a single batched forward pass. | `batch_x` | 125 |
| `attach_batch_rows` | `out_tensor` | Part of the Batched forward passes (M15) section of this module. | `out_tensor` | 162 |
| `linear_forward_batch` | `layer, batch_x` | Part of the Batched forward passes (M15) section of this module. | `attach_batch_rows(out)` | 184 |
| `sequential_forward_batch` | `model, batch_x` | Part of the Batched forward passes (M15) section of this module. | `attach_batch_rows(out)` | 190 |
| `train_step` | `model, x, y, lr` | training loop | `loss.data[0]` | 197 |
| `fit` | `model, xs, ys, epochs, lr` | Trains a model over a dataset for the given epochs, reporting loss per epoch. | _no explicit yield_ | 206 |

#### `lang\stdlib\ml\self_modify.sdev`

sdev ML Stdlib — Self-Modification (Milestone 8f) GATED: enables an sdev-trained model to read the sdev source tree, propose edits, and rewrite its own weights or the language runtime itself. All mutations pass through a review hook so users can gate every change. Requires host builtins: read_file, write_file, http_get.

7 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `self_read` | `path` | Reads a file from the sdev source tree so the model can inspect its own code. | `read_file(path)` | 15 |
| `self_propose` | `path, new_content` | Produces a proposed source change as a structured, reviewable patch. | `nope` | 19 |
| `set_review_hook` | `fn` | Installs the callback that must approve a proposal before it is applied. | _no explicit yield_ | 30 |
| `mine_demand` | `sources` | feature-demand mining Fetches issue/PR/reddit signals and lets the model pick the next feature to draft. Returns a ranked list of {topic, score}. | `counts` | 37 |
| `harvest_keywords` | `counts, body` | Mines demand signals for language features from collected text. | _no explicit yield_ | 48 |
| `update_docs` | `section, body` | documentation sync | _no explicit yield_ | 69 |
| `rewrite_weights` | `model, transform` | weight rewriting The model can rewrite its own weights outside of gradient descent (e.g. surgery, LoRA-style adapters). Guarded so it only fires when review hook approves. | `yep` | 79 |

#### `lang\stdlib\ml\tensor.sdev`

sdev ML Stdlib — Tensor Core (Milestone 8) A tensor is a tome: { data: [f64...], shape: [int...], grad: [f64...] | void, requires_grad: bool } All ops are pure by default; autograd tape is opt-in per tensor. Fully written in sdev — runs on both the WASM and Native ASM tracks.

16 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `tensor` | `data, shape` | Builds a tensor from flat data plus a shape, with autograd off. | `{ data: data, shape: shape, grad: void, requires_grad: nope }` | 8 |
| `tensor_grad` | `data, shape` | Builds a tensor with a zeroed gradient buffer and autograd enabled. | `{ data: data, shape: shape, grad: g, requires_grad: yep }` | 12 |
| `zeros` | `shape` | A tensor of the given shape filled with 0.0. | `tensor(d, shape)` | 23 |
| `ones` | `shape` | A tensor of the given shape filled with 1.0. | `tensor(d, shape)` | 31 |
| `randn` | `shape` | A tensor of the given shape sampled from a standard normal (Box–Muller). | `tensor(d, shape)` | 39 |
| `shape_size` | `shape` | The total element count implied by a shape — the product of its dimensions. | `n` | 54 |
| `t_add` | `a, b` | element-wise ops | `tensor(d, a.shape)` | 65 |
| `t_sub` | `a, b` | Element-wise subtraction of two tensors of the same shape. | `tensor(d, a.shape)` | 73 |
| `t_mul` | `a, b` | Element-wise multiplication of two tensors of the same shape. | `tensor(d, a.shape)` | 81 |
| `t_scale` | `a, k` | Multiplies every element of a tensor by a scalar. | `tensor(d, a.shape)` | 89 |
| `matmul` | `a, b` | 2-D matmul (rows x cols) | `tensor(d, [m, n])` | 98 |
| `relu` | `a` | activations | `tensor(d, a.shape)` | 124 |
| `sigmoid` | `a` | Element-wise logistic sigmoid. | `tensor(d, a.shape)` | 136 |
| `softmax` | `a` | Row-wise softmax, shifted by the row maximum for numerical stability. | `tensor(d, a.shape)` | 147 |
| `mse` | `pred, target` | losses | `s / n` | 170 |
| `cross_entropy` | `pred, target` | Mean cross-entropy loss between predicted probabilities and target labels. | `s` | 182 |

#### `lang\stdlib\ml\train.sdev`

sdev ML Stdlib — Language-Model Training (Milestone 14 + M15) End-to-end training for the decoder-only model in transformer.sdev: batching, next-token cross-entropy, Adam + gradient clipping, temperature / top-k sampling, text/JSON & binary ("SDEVML01") checkpoint save + load, and an evaluation loop. Written entirely in sdev.

22 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `lm_batches` | `ids, block` | batching Cut a flat token stream into (context, next-token) pairs of length `block`. | `{ xs: xs, ys: ys, block: block, count: measure(xs) }` | 15 |
| `lm_step` | `model, opt, ctx, targets, lr` | one optimisation step | `loss.data[0]` | 36 |
| `lm_fit` | `model, ids, block, epochs, lr` | full training loop | `{ history: history, final: history[measure(history) - 1], opt: opt }` | 48 |
| `lm_loss` | `model, ids, block` | evaluation | `total / batches.count` | 67 |
| `perplexity` | `model, ids, block` | Perplexity = e^(mean NLL). Lower is better. | `exp(lm_loss(model, ids, block))` | 81 |
| `last_logits` | `model, ids` | sampling | `tensor(row, [vocab])` | 86 |
| `sample_topk` | `logits, temperature, k` | Temperature + top-k filtering, then multinomial draw. | `sample_next(tensor(scaled, [n]))` | 100 |
| `lm_generate` | `model, prompt_ids, max_new, temperature, k` | Generates a continuation from a trained language model. | `out` | 136 |
| `lm_complete` | `model, vocab, prompt, max_new, temperature, k` | Convenience wrapper: encode a prompt, generate, and decode the result. | `decode(vocab, lm_generate(model, ids, max_new, temperature, k))` | 149 |
| `checkpoint_text` | `model` | checkpoints (text) Flat text format: one parameter tensor per line, "shape\|values". | `s` | 156 |
| `save_checkpoint` | `path, model` | Serialises every model parameter to a checkpoint file. | `measure(model.params)` | 181 |
| `load_checkpoint` | `path, model` | Loads weights back into an identically-shaped model. | `measure(model.params)` | 187 |
| `ckpt_buf` | _none_ | Part of the binary checkpoints (M15: "SDEVML01") section of this module. | `CKPT_SCRATCH_BUF` | 220 |
| `u32_to_hex8` | `n` | Part of the binary checkpoints (M15: "SDEVML01") section of this module. | `out` | 227 |
| `hex_nibble` | `code` | Part of the binary checkpoints (M15: "SDEVML01") section of this module. | `0` | 238 |
| `hex8_to_u32` | `s, offset` | Part of the binary checkpoints (M15: "SDEVML01") section of this module. | `acc` | 251 |
| `f64_to_hex` | `x` | Part of the binary checkpoints (M15: "SDEVML01") section of this module. | `u32_to_hex8(lo) + u32_to_hex8(hi)` | 262 |
| `hex_to_f64` | `s, offset` | Part of the binary checkpoints (M15: "SDEVML01") section of this module. | `ffi_read_f64(b, 0)` | 270 |
| `checkpoint_bin_encode` | `model, step be 0, loss be 0.0` | Part of the binary checkpoints (M15: "SDEVML01") section of this module. | `s` | 279 |
| `save_checkpoint_bin` | `path, model, step be 0, loss be 0.0` | Part of the binary checkpoints (M15: "SDEVML01") section of this module. | `{` | 304 |
| `load_checkpoint_bin` | `path, model` | Part of the binary checkpoints (M15: "SDEVML01") section of this module. | `{ ok: nope, err: "truncated binary checkpoint", magic: "", version: 0, step: 0, loss: 0.0,` | 318 |
| `split_text` | `s, sep` | Small split helper so checkpoints need no host support beyond file I/O. | `out` | 362 |

#### `lang\stdlib\ml\transformer.sdev`

sdev ML Stdlib — Transformer / LLM Blocks (Milestone 8d + M15) Minimal decoder-only transformer written in sdev. Uses accelerated matmul dispatch (accel_matmul) and supports single-sequence and batched GPT forward passes.

14 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `embedding` | `vocab, dim` | Creates a learnable token embedding table. | `{` | 10 |
| `embed_lookup` | `w, ids` | Gathers embedding rows for a sequence of token ids. | `tensor_grad(d, [n, dim])` | 21 |
| `layer_norm` | `dim` | Creates a layer-norm block with learnable gain and bias. | `{` | 38 |
| `ln_apply` | `x, g, b` | Normalises each row to zero mean and unit variance, then scales and shifts it. | `tensor_grad(d, x.shape)` | 49 |
| `attention_head` | `dim` | attention (single head, causal) | `{` | 79 |
| `attn_forward` | `x, wq, wk, wv, wo, dim` | Scaled dot-product self-attention with causal masking. | `wo.forward(tensor_grad(ctx.data, ctx.shape))` | 99 |
| `transpose` | `a` | Swaps the two dimensions of a 2-D tensor. | `tensor(d, [c, r])` | 112 |
| `transformer_block` | `dim, hidden` | transformer block | `{` | 131 |
| `block_forward` | `x, ln1, attn, ln2, ff1, ff2` | One transformer block: attention, residual, feed-forward, residual. | `d_add(x1, f)` | 152 |
| `gpt` | `vocab, dim, hidden, layers` | decoder-only LM | `{` | 160 |
| `gpt_forward` | `ids, emb, blocks, head, layers` | Full model forward pass: embed, run every block, project to vocabulary logits. | `head.forward(x)` | 189 |
| `gpt_forward_batch` | `model, batch_token_seqs` | Batched GPT forward pass (M15): Accepts a list of token sequences (each a list of token ids or a 1D tensor) or a 2D tensor [batch_size, seq_len], and returns a [batch_size, seq_len, vocab] batch tensor with per-sequence logit tensors in `.outputs` and indexed `[b]`. | `tensor_grad([], [0, 0, 0])` | 204 |
| `sample_next` | `logits` | sampling | `n - 1` | 265 |
| `generate` | `model, prompt_ids, max_new` | Samples tokens autoregressively from the model until the length limit. | `out` | 279 |

#### `lang\stdlib\testkit.sdev`

testkit — assertions and host helpers for SDEV-authored build scripts. use "lang/stdlib/testkit.sdev" Scripts written against this module run under the SDEV host: node bin/sdevhost.mjs scripts/<name>.sdev

6 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `str_same` | `a b` | Byte-wise string equality. `is` on string-typed expressions dispatches to STREQ in the VM; `str_same` wraps `is` for untyped parameter callers. | `concat(a, "") is b` | 15 |
| `first_diff` | `a b` | First differing byte offset, or -1 when the strings match. | `i` | 20 |
| `check` | `name ok` | Computes and yields `0`. | `0` | 38 |
| `tk_report` | `title` | Computes and yields `0`. | `0` | 49 |
| `host_args` | _none_ | Part of the Host helpers section of this module. | `read_file("sdev:args")` | 62 |
| `shell` | `cmd` | Part of the Host helpers section of this module. | `read_file(concat("sdev:exec:", cmd))` | 66 |

#### `lang\stdlib\v2\bits.sdev`

SDEV Standard Library: Bits & Binary Operations (v2) — authored in SDEV.

6 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `bits_shl` | `val shift` | Computes and yields `v`. | `v` | 3 |
| `bits_shr` | `val shift` | Computes and yields `v`. | `v` | 13 |
| `bits_test` | `val bit_pos` | Computes and yields `(val / mask) % 2`. | `(val / mask) % 2` | 23 |
| `bits_popcount` | `val` | Computes and yields `count`. | `count` | 28 |
| `bits_to_hex` | `val` | Computes and yields `"0"`. | `"0"` | 38 |
| `bits_from_hex` | `hex_str` | Computes and yields `v`. | `v` | 53 |

#### `lang\stdlib\v2\func.sdev`

SDEV Standard Library: Functional Combinators (v2) — authored in SDEV.

2 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `func_take` | `xs count` | Computes and yields `out`. | `out` | 3 |
| `func_drop` | `xs count` | Computes and yields `mklist(0)`. | `mklist(0)` | 18 |

#### `lang\stdlib\v2\json.sdev`

SDEV Standard Library: JSON Serialization & Parsing (v2) — authored in SDEV.

3 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `json_escape_string` | `s` | Computes and yields `out`. | `out` | 3 |
| `json_encode_int` | `n` | Computes and yields `str(n)`. | `str(n)` | 32 |
| `json_encode_list` | `xs` | Computes and yields `out`. | `out` | 36 |

#### `lang\stdlib\v2\list.sdev`

SDEV Standard Library: Lists & Sequences (v2) — authored in SDEV.

12 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `list_clone` | `xs` | Computes and yields `out`. | `out` | 3 |
| `list_append` | `xs item` | Computes and yields `out`. | `out` | 14 |
| `list_contains_val` | `xs val` | Computes and yields `1`. | `1` | 26 |
| `list_index_of_val` | `xs val` | Computes and yields `i`. | `i` | 38 |
| `list_concat_two` | `a b` | Computes and yields `out`. | `out` | 50 |
| `list_reverse_new` | `xs` | Computes and yields `out`. | `out` | 67 |
| `list_sum_all` | `xs` | Computes and yields `total`. | `total` | 78 |
| `list_min_val` | `xs` | Computes and yields `0`. | `0` | 89 |
| `list_max_val` | `xs` | Computes and yields `0`. | `0` | 105 |
| `gather` | _none_ | SDEV v1 Compatibility Aliases | `mklist(0)` | 122 |
| `pluck` | `xs item` | Computes and yields `list_append(xs, item)`. | `list_append(xs, item)` | 126 |
| `invert` | `xs` | Computes and yields `list_reverse_new(xs)`. | `list_reverse_new(xs)` | 130 |

#### `lang\stdlib\v2\math.sdev`

SDEV Standard Library: Mathematics & Numerics (v2) — authored in SDEV.

14 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `math_PI` | _none_ | Computes and yields `3.141592653589793`. | `3.141592653589793` | 3 |
| `math_E` | _none_ | Computes and yields `2.718281828459045`. | `2.718281828459045` | 7 |
| `math_TAU` | _none_ | Computes and yields `6.283185307179586`. | `6.283185307179586` | 11 |
| `math_abs` | `x` | Computes and yields `abs(x)`. | `abs(x)` | 15 |
| `math_min` | `a b` | Computes and yields `min(a, b)`. | `min(a, b)` | 19 |
| `math_max` | `a b` | Computes and yields `max(a, b)`. | `max(a, b)` | 23 |
| `math_clamp` | `x lo hi` | Computes and yields `lo`. | `lo` | 27 |
| `math_sign` | `x` | Computes and yields `0 - 1`. | `0 - 1` | 37 |
| `math_gcd` | `a b` | Computes and yields `x`. | `x` | 47 |
| `math_lcm` | `a b` | Computes and yields `0`. | `0` | 58 |
| `math_factorial` | `n` | Computes and yields `1`. | `1` | 68 |
| `math_fib` | `n` | Computes and yields `0`. | `0` | 81 |
| `math_is_prime` | `n` | Computes and yields `0`. | `0` | 100 |
| `math_mean` | `xs` | Computes and yields `0.0`. | `0.0` | 120 |

#### `lang\stdlib\v2\random.sdev`

SDEV Standard Library: Random & Pseudo-RNG (v2) — authored in SDEV.

4 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `rng_make` | `seed` | Computes and yields `{ state: s }`. | `{ state: s }` | 3 |
| `rng_next` | `rng` | Linear Congruential Generator (LCG) step: (state * 1103515245 + 12345) % 2147483648 | `s` | 12 |
| `rng_int_range` | `rng min_val max_val` | Computes and yields `min_val`. | `min_val` | 21 |
| `rng_choice` | `rng xs` | Computes and yields `0`. | `0` | 30 |

#### `lang\stdlib\v2\sql.sdev`

SDEV Standard Library: Relational SQL Primitives — authored in pure SDEV.

10 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `sql_select` | `rows cols` | Computes and yields `out`. | `out` | 3 |
| `sql_where` | `rows predicate` | Computes and yields `out`. | `out` | 25 |
| `sql_limit` | `rows count offset` | Computes and yields `out`. | `out` | 39 |
| `sql_count` | `rows` | Computes and yields `length(rows)`. | `length(rows)` | 55 |
| `sql_sum` | `rows col` | Computes and yields `total`. | `total` | 59 |
| `sql_avg` | `rows col` | Computes and yields `0`. | `0` | 73 |
| `sql_min` | `rows col` | Computes and yields `0`. | `0` | 81 |
| `sql_max` | `rows col` | Computes and yields `0`. | `0` | 98 |
| `sql_distinct` | `rows col` | Computes and yields `out`. | `out` | 115 |
| `sql_join` | `left right left_key right_key` | Computes and yields `out`. | `out` | 132 |

#### `lang\stdlib\v2\text.sdev`

SDEV Standard Library: Text & Strings (v2) — authored in SDEV.

16 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `text_upper` | `s` | Computes and yields `upper(s)`. | `upper(s)` | 3 |
| `text_lower` | `s` | Computes and yields `lower(s)`. | `lower(s)` | 7 |
| `text_trim` | `s` | Computes and yields `trim(s)`. | `trim(s)` | 11 |
| `text_contains` | `s sub` | Computes and yields `contains(s, sub)`. | `contains(s, sub)` | 15 |
| `text_replace` | `s target rep` | Computes and yields `replace(s, target, rep)`. | `replace(s, target, rep)` | 19 |
| `text_split` | `s delim` | Computes and yields `split(s, delim)`. | `split(s, delim)` | 23 |
| `text_join` | `items delim` | Computes and yields `join(items, delim)`. | `join(items, delim)` | 27 |
| `text_starts_with` | `s prefix` | Computes and yields `0`. | `0` | 31 |
| `text_ends_with` | `s suffix` | Computes and yields `0`. | `0` | 39 |
| `text_repeat` | `s count` | Computes and yields `out`. | `out` | 48 |
| `text_pad_left` | `s target_len pad_char` | Computes and yields `s`. | `s` | 58 |
| `text_pad_right` | `s target_len pad_char` | Computes and yields `s`. | `s` | 66 |
| `text_reverse` | `s` | Computes and yields `out`. | `out` | 74 |
| `etch` | `a b` | SDEV v1 Compatibility Aliases | `a + b` | 86 |
| `shatter` | `s delim` | Computes and yields `text_split(s, delim)`. | `text_split(s, delim)` | 90 |
| `weave` | `list delim` | Computes and yields `text_join(list, delim)`. | `text_join(list, delim)` | 94 |

#### `lang\stdlib\v2\time.sdev`

SDEV Standard Library: Time & Calendar (v2) — authored in SDEV.

3 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `time_is_leap_year` | `year` | Computes and yields `1`. | `1` | 3 |
| `time_days_in_month` | `year month` | Computes and yields `29`. | `29` | 16 |
| `time_format_duration_ms` | `ms` | Computes and yields `h_str + ":" + m_str + ":" + s_str`. | `h_str + ":" + m_str + ":" + s_str` | 38 |

#### `lang\stdlib\v2\tome.sdev`

SDEV Standard Library: Tomes & Mappings (v2) — authored in SDEV.

10 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `tome_create` | _none_ | Computes and yields `{}`. | `{}` | 3 |
| `tome_get_or` | `t key fallback` | Computes and yields `t[key]`. | `t[key]` | 7 |
| `tome_put_kv` | `t key val` | Computes and yields `t`. | `t` | 14 |
| `tome_has_key` | `t key` | Computes and yields `has(t, key)`. | `has(t, key)` | 19 |
| `tome_keys_list` | `t` | Computes and yields `keys(t)`. | `keys(t)` | 23 |
| `tome_values_list` | `t` | Computes and yields `values(t)`. | `values(t)` | 27 |
| `tome_merge_two` | `a b` | Computes and yields `out`. | `out` | 31 |
| `tome_pick_keys` | `t wanted_keys` | Computes and yields `out`. | `out` | 50 |
| `inscribe` | `t key val` | SDEV v1 Compatibility Aliases | `tome_put_kv(t, key, val)` | 64 |
| `unscroll` | `t key` | Computes and yields `tome_get_or(t, key, "")`. | `tome_get_or(t, key, "")` | 68 |

#### `lang\stdlib\v2\types.sdev`

SDEV Standard Library: Types & Coercions (v2) — authored in SDEV.

4 functions.

| Function | Parameters | What it does | Returns | Line |
| --- | --- | --- | --- | --- |
| `types_is_empty` | `v` | Computes and yields `1`. | `1` | 3 |
| `types_coalesce` | `a b` | Computes and yields `b`. | `b` | 10 |
| `types_to_int_or` | `s fallback` | Computes and yields `fallback`. | `fallback` | 17 |
| `types_to_bool` | `v` | Computes and yields `0`. | `0` | 46 |

#### `lang\stdlib\webgpu.sdev`

lang/stdlib/webgpu.sdev Milestone 10 — WebGPU acceleration for the browser IDE Provides a thin, sdev-native wrapper over the host's WebGPU bindings. The runtime exposes a handful of host calls (`__wgpu_*`) that the browser build implements through `navigator.gpu`. On Node/native builds without a GPU adapter, every entry point falls back to the pure-sdev CPU tensor kernels so user code stays portable. This module is written entirely in sdev and is compiled by the self-hosted compiler like the rest of the stdlib.

_No top-level functions — this file is a script or data module._


### Parity matrix

Registry: **209 features** across **3 tracks**.

| Feature | Area | sdev v1 (TypeScript interpreter) | sdev v2 (self-hosted compiler on the seed VM) | native x86-64 backend |
| --- | --- | --- | --- | --- |
| `say` | io | `speak` | `say` | `say` |
| `length` | core | `measure` | `length` | `length` |
| `concat` | text | `etch` | `concat` | `concat` |
| `ord` | text | `ord` | `ord` | `ord` |
| `chr` | text | `chr` | `chr` | `chr` |
| `str` | text | `str` | `str` | `str` |
| `int` | types | `int` | `int` | `int` |
| `num` | types | `num` | `num` | `num` |
| `list_new` | list | `gather` | `mklist` | `list_new` |
| `list_get` | list | `pluck` | `mklist` | `index` |
| `upper` | text | `upper` | `upper` | `upper` |
| `lower` | text | `lower` | `lower` | `lower` |
| `trim` | text | `trim` | `trim` | `trim` |
| `contains` | text | `contains` | `contains` | `contains` |
| `replace` | text | `replace` | `replace` | `replace` |
| `split` | text | `shatter` | `split` | `split` |
| `join` | text | `weave` | `join` | `join` |
| `abs` | math | `abs` | `fabs` | `abs` |
| `min` | math | `least` | `min` | `min` |
| `max` | math | `greatest` | `max` | `max` |
| `floor` | math | `ground` | `f2i` | `floor` |
| `ceil` | math | `elevate` | `fceil` | `ceil` |
| `round` | math | `nearby` | `fround` | `round` |
| `sqrt` | math | `root` | `fsqrt` | `sqrt` |
| `pow` | math | `pow` | `fpow` | `pow` |
| `sin` | math | `sin` | `fsin` | `sin` |
| `cos` | math | `cos` | `fcos` | `cos` |
| `exp` | math | `exp` | `fexp` | `exp` |
| `log` | math | `ln` | `flog` | `log` |
| `random` | math | `rand` | `random` | `random` |
| `range` | list | `range` | `range` | `range` |
| `sum` | list | `sum` | `sum` | `sum` |
| `keys` | tome | `tome_keys` | `keys` | `keys` |
| `read_file` | io | `read_file` | `read_file` | `read_file` |
| `write_file` | io | `write_file` | `write_file` | `write_file` |
| `http_get` | net | `http_get` | `http_get` | — |
| `var_decl` | syntax | `forge` | `set` | `set` |
| `assign` | syntax | `be` | `set` | `set` |
| `if` | syntax | `either` | `if` | `if` |
| `else` | syntax | `otherwise` | `else` | `else` |
| `while` | syntax | `cycle` | `while` | `while` |
| `for_each` | syntax | `iterate` | `each` | `foreach` |
| `break` | syntax | `yeet` | `break` | `break` |
| `continue` | syntax | `skip` | `continue` | `continue` |
| `function` | syntax | `conjure` | `to` | `call` |
| `return` | syntax | `yield` | `return` | `return` |
| `params` | syntax | `conjure` | `with` | `call` |
| `recursion` | syntax | `conjure` | `to` | `call` |
| `lambda` | syntax | `ARROW` | `make` | — |
| `class` | oop | `essence` | `kind` | — |
| `inherit` | oop | `extend` | `extends` | — |
| `self` | oop | `self` | — | — |
| `super` | oop | `super` | `super` | — |
| `instantiate` | oop | `new` | `new` | — |
| `try_catch` | errors | `attempt` | `attempt` | — |
| `rescue` | errors | `rescue` | `rescue` | — |
| `throw` | errors | `throw` | `throw` | — |
| `logic_and` | syntax | `also` | `and` | `and` |
| `logic_or` | syntax | `within` | `or` | `or` |
| `logic_not` | syntax | `nope` | `not` | `un` |
| `equality` | syntax | `equals` | `is` | `is` |
| `inequality` | syntax | `differs` | `not` | `isnot` |
| `bool_true` | types | `yep` | `true` | `true` |
| `bool_false` | types | `nope` | `false` | `false` |
| `nothing` | types | `void` | `nothing` | `nothing` |
| `list_literal` | types | `gather` | `mklist` | `list` |
| `tome_literal` | types | `tome_keys` | `tome_literal` | `tome` |
| `import` | modules | `summon` | `use` | — |
| `float` | types | `num` | `i2f` | `float` |
| `string` | types | `str` | `str` | `str` |
| `values` | tome | `values` | `values` | `values` |
| `has` | tome | `has` | `has` | `has` |
| `py_print` | python | `print` | — | — |
| `py_str` | python | `str` | — | — |
| `py_repr` | python | `repr` | — | — |
| `py_int` | python | `int` | — | — |
| `py_float` | python | `float` | — | — |
| `py_bool` | python | `bool` | — | — |
| `py_complexish` | python | `complexish` | — | — |
| `py_bytes` | python | `bytes` | — | — |
| `py_list` | python | `list` | — | — |
| `py_tuple` | python | `tuple` | — | — |
| `py_set` | python | `set` | — | — |
| `py_frozenset` | python | `frozenset` | — | — |
| `py_dict` | python | `dict` | — | — |
| `py_len` | python | `len` | — | — |
| `py_range` | python | `range` | — | — |
| `py_enumerate` | python | `enumerate` | — | — |
| `py_zip` | python | `zip` | — | — |
| `py_zip_longest` | python | `zip_longest` | — | — |
| `py_map` | python | `map` | — | — |
| `py_filter` | python | `filter` | — | — |
| `py_any` | python | `any` | — | — |
| `py_all` | python | `all` | — | — |
| `py_sorted` | python | `sorted` | — | — |
| `py_reversed` | python | `reversed` | — | — |
| `py_min` | python | `min` | — | — |
| `py_max` | python | `max` | — | — |
| `py_sum` | python | `sum` | — | — |
| `py_abs` | python | `abs` | — | — |
| `py_round` | python | `round` | — | — |
| `py_pow` | python | `pow` | — | — |
| `py_divmod` | python | `divmod` | — | — |
| `py_bin` | python | `bin` | — | — |
| `py_oct` | python | `oct` | — | — |
| `py_hex` | python | `hex` | — | — |
| `py_type` | python | `type` | — | — |
| `py_isinstance` | python | `isinstance` | — | — |
| `py_issubclass` | python | `issubclass` | — | — |
| `py_getattr` | python | `getattr` | — | — |
| `py_setattr` | python | `setattr` | — | — |
| `py_hasattr` | python | `hasattr` | — | — |
| `py_delattr` | python | `delattr` | — | — |
| `py_vars` | python | `vars` | — | — |
| `py_dir` | python | `dir` | — | — |
| `py_callable` | python | `callable` | — | — |
| `py_id` | python | `id` | — | — |
| `py_hash` | python | `hash` | — | — |
| `py_format` | python | `format` | — | — |
| `py_iter` | python | `iter` | — | — |
| `py_next` | python | `next` | — | — |
| `py_send` | python | `send` | — | — |
| `py_close` | python | `close` | — | — |
| `py_collect` | python | `collect` | — | — |
| `py_property` | python | `property` | — | — |
| `py_staticmethod` | python | `staticmethod` | — | — |
| `py_classmethod` | python | `classmethod` | — | — |
| `py_wraps` | python | `wraps` | — | — |
| `py_cache` | python | `cache` | — | — |
| `py_partial` | python | `partial` | — | — |
| `py_reduce` | python | `reduce` | — | — |
| `py_dataclass` | python | `dataclass` | — | — |
| `py_count` | python | `count` | — | — |
| `py_cycle` | python | `cycle` | — | — |
| `py_repeat` | python | `repeat` | — | — |
| `py_chain` | python | `chain` | — | — |
| `py_islice` | python | `islice` | — | — |
| `py_product` | python | `product` | — | — |
| `py_permutations` | python | `permutations` | — | — |
| `py_combinations` | python | `combinations` | — | — |
| `py_accumulate` | python | `accumulate` | — | — |
| `py_groupby` | python | `groupby` | — | — |
| `py_Counter` | python | `Counter` | — | — |
| `py_defaultdict` | python | `defaultdict` | — | — |
| `py_namedtuple` | python | `namedtuple` | — | — |
| `py_deque` | python | `deque` | — | — |
| `py_OrderedDict` | python | `OrderedDict` | — | — |
| `py_union` | python | `union` | — | — |
| `py_intersection` | python | `intersection` | — | — |
| `py_difference` | python | `difference` | — | — |
| `py_symmetric_difference` | python | `symmetric_difference` | — | — |
| `py_issubset` | python | `issubset` | — | — |
| `py_set_add` | python | `set_add` | — | — |
| `py_set_remove` | python | `set_remove` | — | — |
| `py_keys` | python | `keys` | — | — |
| `py_values` | python | `values` | — | — |
| `py_items` | python | `items` | — | — |
| `py_get` | python | `get` | — | — |
| `py_setdefault` | python | `setdefault` | — | — |
| `py_update` | python | `update` | — | — |
| `py_pop` | python | `pop` | — | — |
| `py_slice_assign` | python | `slice_assign` | — | — |
| `py_module` | python | `module` | — | — |
| `py_truthy` | python | `truthy` | — | — |
| `py_is_generator` | python | `is_generator` | — | — |
| `py_freeze` | python | `freeze` | — | — |
| `py_ascii` | python | `ascii` | — | — |
| `pysyn_generator` | python-syntax | `generator` | — | — |
| `pysyn_with` | python-syntax | `with` | — | — |
| `pysyn_as` | python-syntax | `as` | — | — |
| `pysyn_match` | python-syntax | `match` | — | — |
| `pysyn_case` | python-syntax | `case` | — | — |
| `pysyn_async` | python-syntax | `async` | — | — |
| `pysyn_await` | python-syntax | `await` | — | — |
| `pysyn_lambda` | python-syntax | `lambda` | — | — |
| `pysyn_assert` | python-syntax | `assert` | — | — |
| `pysyn_del` | python-syntax | `del` | — | — |
| `pysyn_global` | python-syntax | `global` | — | — |
| `pysyn_nonlocal` | python-syntax | `nonlocal` | — | — |
| `pysyn_pass` | python-syntax | `pass` | — | — |
| `pysyn_raise` | python-syntax | `raise` | — | — |
| `pysyn_from` | python-syntax | `from` | — | — |
| `pysyn_finally` | python-syntax | `finally` | — | — |
| `pysyn_in` | python-syntax | `in` | — | — |
| `pysyn_not` | python-syntax | `not` | — | — |
| `pysyn_is` | python-syntax | `is` | — | — |
| `pysyn_elif` | python-syntax | `elif` | — | — |
| `pysyn_try` | python-syntax | `try` | — | — |
| `pysyn_except` | python-syntax | `except` | — | — |
| `pysyn_class` | python-syntax | `class` | — | — |
| `pysyn_def` | python-syntax | `def` | — | — |
| `pysyn_import` | python-syntax | `import` | — | — |
| `pysyn_return` | python-syntax | `return` | — | — |
| `pysyn_while` | python-syntax | `while` | — | — |
| `pysyn_for` | python-syntax | `for` | — | — |
| `pysyn_break` | python-syntax | `break` | — | — |
| `pysyn_continue` | python-syntax | `continue` | — | — |
| `pysyn_true` | python-syntax | `true` | — | — |
| `pysyn_false` | python-syntax | `false` | — | — |
| `pysyn_none` | python-syntax | `none` | — | — |
| `pysyn_and` | python-syntax | `and` | — | — |
| `pysyn_or` | python-syntax | `or` | — | — |
| `args` | os | — | — | `args` |
| `env` | os | — | — | `env` |
| `exit` | os | — | — | `exit` |
| `now_ms` | os | — | — | `now_ms` |
| `sleep_ms` | os | — | — | `sleep_ms` |
| `append_file` | io | — | — | `append_file` |
| `say_err` | io | — | — | `say_err` |


### Repository map

#### `lang/bootstrap/` — JS bootstrap compiler + hand-written WebAssembly seed VM

- `lang\bootstrap\bootstrap.sdev`
- `lang\bootstrap\seed_vm.sdev`

#### `lang/compiler/` — The self-hosted compiler, written in sdev

- `lang\compiler\codegen.sdev`
- `lang\compiler\driver.sdev`
- `lang\compiler\lexer.sdev`
- `lang\compiler\parser.sdev`

#### `lang/native/` — x86-64 GAS backend, assembly runtime, linker driver

- `lang\native\README.md`
- `lang\native\codegen_x64.sdev`
- `lang\native\link.sdev`
- `lang\native\runtime_x64.sdev`

#### `lang/runtime/` — v2 reference runtime (JS, legacy oracle)

- `lang\runtime\kernel.sdev`
- `lang\runtime\vm.sdev`

#### `lang/stdlib/` — Standard library written in sdev (ML, FFI, WebGPU, CUDA)

- `lang\stdlib\ffi.sdev`
- `lang\stdlib\ml\auto_evolve.sdev`
- `lang\stdlib\ml\autograd.sdev`
- `lang\stdlib\ml\cuda.sdev`
- `lang\stdlib\ml\data.sdev`
- `lang\stdlib\ml\nn.sdev`
- `lang\stdlib\ml\self_modify.sdev`
- `lang\stdlib\ml\tensor.sdev`
- `lang\stdlib\ml\train.sdev`
- `lang\stdlib\ml\transformer.sdev`
- `lang\stdlib\testkit.sdev`
- `lang\stdlib\v2\bits.sdev`
- `lang\stdlib\v2\func.sdev`
- `lang\stdlib\v2\json.sdev`
- `lang\stdlib\v2\list.sdev`
- `lang\stdlib\v2\math.sdev`
- `lang\stdlib\v2\random.sdev`
- `lang\stdlib\v2\sql.sdev`
- `lang\stdlib\v2\text.sdev`
- `lang\stdlib\v2\time.sdev`
- `lang\stdlib\v2\tome.sdev`
- `lang\stdlib\v2\types.sdev`
- `lang\stdlib\webgpu.sdev`

#### `lang/parity/` — Feature registry, parity agent, generated report

- `lang\parity\agent.sdev`
- `lang\parity\features.json`
- `lang\parity\report.json`

#### `src/lang/` — v1 TypeScript reference implementation

- `src\lang\advanced.ts`
- `src\lang\agent\brain-prompt.ts`
- `src\lang\agent\brain.ts`
- `src\lang\agent\browser-brain.ts`
- `src\lang\agent\directives.ts`
- `src\lang\agent\index.ts`
- `src\lang\agent\math.ts`
- `src\lang\agent\memory.ts`
- `src\lang\agent\promote.ts`
- `src\lang\agent\repair.ts`
- `src\lang\agent\sdev-engine.ts`
- `src\lang\agent\sense.ts`
- `src\lang\agent\tasks.ts`
- `src\lang\agent\tests\sense.test.ts`
- `src\lang\agent\types.ts`
- `src\lang\agent\vocabulary.ts`
- `src\lang\ast.ts`
- `src\lang\builtins.ts`
- `src\lang\builtins\buffer.ts`
- `src\lang\builtins\dict.ts`
- `src\lang\builtins\functional.ts`
- `src\lang\builtins\host.ts`
- `src\lang\builtins\io.ts`
- `src\lang\builtins\json.ts`
- `src\lang\builtins\list.ts`
- `src\lang\builtins\math.ts`
- `src\lang\builtins\misc.ts`
- `src\lang\builtins\regex.ts`
- `src\lang\builtins\sql.ts`
- `src\lang\builtins\string.ts`
- `src\lang\builtins\text.ts`
- `src\lang\builtins\time.ts`
- `src\lang\builtins\types.ts`
- `src\lang\builtins\utils.ts`
- `src\lang\bytecode.ts`
- `src\lang\compiler.ts`
- `src\lang\dialect\address.ts`
- `src\lang\dialect\canonicalize.ts`
- `src\lang\dialect\catalog.ts`
- `src\lang\dialect\docs.ts`
- `src\lang\dialect\extensions.ts`
- `src\lang\dialect\index.ts`
- `src\lang\dialect\presets.ts`
- `src\lang\dialect\registry.ts`
- `src\lang\dialect\sample.ts`
- `src\lang\dialect\signature.ts`
- `src\lang\dialect\spec.ts`
- `src\lang\environment.ts`
- `src\lang\errors.ts`
- `src\lang\graphics.ts`
- `src\lang\hardware\arduino-api.ts`
- `src\lang\hardware\board-db.test.ts`
- `src\lang\hardware\board-db.ts`
- `src\lang\hardware\cloud-compile.ts`
- `src\lang\hardware\strip.ts`
- `src\lang\hardware\transpile.ts`
- `src\lang\hardware\web-serial.ts`
- `src\lang\index.ts`
- `src\lang\interpreter.ts`
- `src\lang\kernel.ts`
- `src\lang\keywords.ts`
- `src\lang\lexer.ts`
- `src\lang\linker.ts`
- `src\lang\linter.ts`
- `src\lang\matrix.ts`
- `src\lang\parser.ts`
- `src\lang\pyparity.ts`
- `src\lang\registry\api-registry.ts`
- `src\lang\runtime-values.ts`
- `src\lang\tests\vm.test.ts`
- `src\lang\tokens.ts`
- `src\lang\translator-v2.ts`
- `src\lang\translator.ts`
- `src\lang\ui.ts`
- `src\lang\vm.ts`
- `src\lang\web.ts`

#### `src/lang-bridge/` — Runtime selection + WASM bridge for the browser IDE

- `src\lang-bridge\compile-self.d.ts`
- `src\lang-bridge\compile-self.mjs`
- `src\lang-bridge\driver-artifact.mjs`
- `src\lang-bridge\native\codegen-x64.mjs`
- `src\lang-bridge\native\link.mjs`
- `src\lang-bridge\native\runtime.s`
- `src\lang-bridge\oracle\compile.mjs`
- `src\lang-bridge\oracle\v2.js`
- `src\lang-bridge\seed\seed.wat`
- `src\lang-bridge\wasm-runtime.ts`

#### `electron/` — Desktop IDE shell with native build/run IPC

- `electron\README.md`
- `electron\main.cjs`
- `electron\preload.cjs`

#### `scripts/` — Build drivers and the full test-gate suite

- `scripts\_compiler-entry.ts`
- `scripts\_ext-v2-cli.mjs`
- `scripts\build-arduino-library-index.py`
- `scripts\build-book-content.py`
- `scripts\build-book-pdf.py`
- `scripts\build-book.ts`
- `scripts\build-cli.mjs`
- `scripts\build-compiler.ts`
- `scripts\build-driver.mjs`
- `scripts\build-seed-wasm.mjs`
- `scripts\build-ultimate-docs.mjs`
- `scripts\gen-hardware-docs.ts`
- `scripts\probe-self-codegen.sdev`
- `scripts\probe-self-lexer.sdev`
- `scripts\release.mjs`
- `scripts\run-ts.mjs`
- `scripts\sdev-native.mjs`
- `scripts\sdev-runtime-launcher.ts`
- `scripts\test-agent.ts`
- `scripts\test-all.mjs`
- `scripts\test-beginner.ts`
- `scripts\test-bg.ts`
- `scripts\test-brain.ts`
- `scripts\test-dialect.ts`
- `scripts\test-driver-artifact.sdev`
- `scripts\test-formatter.ts`
- `scripts\test-linker.ts`
- `scripts\test-local-brain.ts`
- `scripts\test-math.ts`
- `scripts\test-matrix.ts`
- `scripts\test-ml-stdlib.ts`
- `scripts\test-multi-language-features.ts`
- `scripts\test-native.mjs`
- `scripts\test-parity.ts`
- `scripts\test-preset-dialect.ts`
- `scripts\test-registry.ts`
- `scripts\test-sdev-engine.ts`
- `scripts\test-self-codegen.sdev`
- `scripts\test-self-lexer.sdev`
- `scripts\test-self-parser.sdev`
- `scripts\test-self-toolchain.sdev`
- `scripts\test-selfhosted-stdlib.sdev`
- `scripts\test-selfhosted-stdlib.ts`
- `scripts\test-selfhosted-subsystems.sdev`
- `scripts\test-shim-fixed-point.sdev`
- `scripts\test-strip.ts`
- `scripts\test-tasks.ts`
- `scripts\test-translator.ts`
- `scripts\test-transpile.ts`
- `scripts\test-ui.ts`
- `scripts\test-wasm-runtime.mjs`


### Toolchain and test gates

| Command | Purpose |
| --- | --- |
| `node scripts\_compiler-entry.ts` |  |
| `node scripts\_ext-v2-cli.mjs` | Entry point bundled into extension/interpreter/sdev-v2.cjs. |
| `node scripts\build-arduino-library-index.py` | !/usr/bin/env python3 |
| `node scripts\build-book-content.py` | !/usr/bin/env python3 |
| `node scripts\build-book-pdf.py` | !/usr/bin/env python3 |
| `node scripts\build-book.ts` | Generates the giant sdev Book in English and Bulgarian. |
| `node scripts\build-cli.mjs` | !/usr/bin/env node |
| `node scripts\build-compiler.ts` | Bundles the sdev compiler + VM + interpreter into a single Node.js CLI. |
| `node scripts\build-driver.mjs` | Bake the self-hosted driver bytecode. |
| `node scripts\build-seed-wasm.mjs` | Build the seed VM: lang/bootstrap/seed.wat → public/wasm/sdev-seed.wasm |
| `node scripts\build-ultimate-docs.mjs` | !/usr/bin/env node |
| `node scripts\gen-hardware-docs.ts` | ============================================================ |
| `node scripts\release.mjs` | !/usr/bin/env node |
| `node scripts\run-ts.mjs` | !/usr/bin/env node |
| `node scripts\sdev-native.mjs` | !/usr/bin/env node |
| `node scripts\sdev-runtime-launcher.ts` |  |
| `node scripts\test-agent.ts` | ---- the user's own example ----------------------------------------- |
| `node scripts\test-all.mjs` | ───────────────────────────────────────────────────────────────────────── |
| `node scripts\test-beginner.ts` |  |
| `node scripts\test-bg.ts` |  |
| `node scripts\test-brain.ts` | Quick connectivity check: verify the online brain is reachable before running full suite |
| `node scripts\test-dialect.ts` | ---- a Bulgarian dialect with braces and `=` assignment ------------------- |
| `node scripts\test-formatter.ts` | 1. Basic indentation |
| `node scripts\test-linker.ts` | Test data |
| `node scripts\test-local-brain.ts` | 1. LM Studio endpoint normalization |
| `node scripts\test-math.ts` |  |
| `node scripts\test-matrix.ts` | matrix |
| `node scripts\test-ml-stdlib.ts` | ---- Node host bindings consumed by src/lang/builtins.ts ---- |
| `node scripts\test-multi-language-features.ts` | ── 1. String Interpolation (Phase 2, Item 10) ─────────────────────────────── |
| `node scripts\test-native.mjs` | !/usr/bin/env node |
| `node scripts\test-parity.ts` | The agent parses the registry line-by-line. Validate the same file with a |
| `node scripts\test-preset-dialect.ts` |  |
| `node scripts\test-registry.ts` |  |
| `node scripts\test-sdev-engine.ts` | unsure lines fall back to the TypeScript engine |
| `node scripts\test-selfhosted-stdlib.ts` | 1. Test Seed VM & VM step/run |
| `node scripts\test-strip.ts` |  |
| `node scripts\test-tasks.ts` |  |
| `node scripts\test-translator.ts` | A Bulgarian dialect: `кажи` means say, `нека` means set. Those words are the |
| `node scripts\test-transpile.ts` | Basic case |
| `node scripts\test-ui.ts` | Helper to call built-ins |
| `node scripts\test-wasm-runtime.mjs` | Standalone Node harness: compile + run via the seed WASM. No browser. |


---

## Appendix A — Glossary

| Term | Meaning |
| --- | --- |
| **bootstrap** | `lang/bootstrap/compile.mjs`, the JavaScript compiler used only to build the first self-hosted artifact and as a test oracle. |
| **seed VM** | `lang/bootstrap/seed.wat`, a hand-written WebAssembly stack machine that executes sdev bytecode in the browser. |
| **driver artifact** | `lang/compiler/driver-artifact.mjs`, the pre-compiled, source-independent self-hosted compiler baked in as Base64. |
| **fixed point** | The state where the self-hosted compiler compiles itself to byte-identical output. |
| **track** | One execution path: v1 interpreter, v2 self-hosted, or native x86-64. |
| **parity agent** | `lang/parity/agent.sdev`, written in sdev, that audits every track against the registry and regenerates the matrix. |
| **tome** | sdev's dictionary / map type. |
| **summon** | The decentralised package system that pulls modules from GitHub Gists. |

## Appendix B — Regenerating this document

```sh
node scripts/build-ultimate-docs.mjs
```

The generator reads every guide under `public/` plus the READMEs, then derives
the reference tables straight from `src/lang/`, `lang/`, and `scripts/`. If a
builtin is added or an opcode changes, re-running the generator is the only
step required to bring this document back in sync.
