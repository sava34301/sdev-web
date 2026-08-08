# The Ultimate sdev Documentation

> **Everything about sdev in one file.** Language, runtimes, compiler, virtual
> machine, native backend, standard library, machine-learning stack, hardware,
> GIS, tooling, and the full generated reference tables.
>
> Created by **Sava Milanov**. Generated on 2026-08-08 by
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


> **Status:** Alpha. v2 runs alongside v1. Add `#!sdev v2` as the first line of
> a file, or set the runtime to **V2** in IDE Settings, to try it.
> Every existing `.sdev` file keeps working — v1 remains the default.

SDEV v2 has one guiding rule: **easy to read**.
No sigils to memorize. No type annotations required. English words wherever
possible. If a ten-year-old can guess what a line does, we picked the right
word.

The power (systems programming, functional pipelines, SQL-style queries, board
programming) is still there — it just doesn't get in your way when you don't
need it.

---

#### Hello, world

```sdev
#!sdev v2
say "hello, world"
```

Run it. That's the whole program.

#### Variables

```sdev
set name to "Ada"
set age to 30
say "hi " + name
```

Reassign the same way:

```sdev
set age to age + 1
```

#### Values

| Kind    | Example                   |
| ------- | ------------------------- |
| number  | `42`, `3.14`, `-7`        |
| text    | `"hello"` or `'hello'`    |
| truth   | `true`, `false`           |
| nothing | `nothing`                 |
| list    | `[1, 2, 3]`, `["a", "b"]` |

#### If / else

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

#### Loops

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

#### Functions

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

#### Pipelines

Chain operations left-to-right with `|>`:

```sdev
set nums to [1, 2, 3, 4, 5]
set doubled to nums |> double
say doubled              # [2, 4, 6, 8, 10]
```

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

#### Strings

Text is a first-class value. Concatenate with `+` or `concat`:

```sdev
set name to "sdev"
say "hi " + name + "!"        # hi sdev!
say concat("hello, ", "world") # hello, world
say length("hello")            # 5
```

Byte-level primitives are available when you need to slice or build text
character by character:

| Builtin       | Meaning                                                  |
| ------------- | -------------------------------------------------------- |
| `length(x)`   | length of a list **or** a string                         |
| `concat(a,b)` | concatenate two strings                                  |
| `ord(s, i)`   | byte value of `s` at index `i` (e.g. `ord("A",0)` → 65)  |
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

#### Built-in functions

`say`, `print`, `length`, `concat`, `ord`, `chr`, `str`, `upper`, `lower`,
`number`, `text`, `round`, `floor`, `ceil`, `abs`, `max`, `min`, `sum`,
`range`, `keep`, `map`, `double`, `pi`, `tau`.

#### Runtimes

SDEV v2 ships with **two independent backends** — pick the one that fits
where your program runs.

| Runtime                  | Where it runs                | How it executes                                                                                                                                                                           |
| ------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WASM (web)**           | The browser IDE              | A hand-written WebAssembly stack VM (`lang/bootstrap/seed.wat` → `public/wasm/sdev-seed.wasm`) executes bytecode emitted by the bootstrap compiler. Zero TypeScript in the language core. |
| **Native ASM** (desktop) | Linux / macOS CLI + Electron | The same AST is emitted as x86-64 GAS assembly (`lang/native/codegen-x64.mjs`), then assembled with `as` and linked with `ld` into a standalone static ELF. No libc dependency.           |

Both backends share the same lexer/parser (`lang/bootstrap/compile.mjs`)
so a program that compiles on one side compiles on the other, as long as
you stick to the shared subset (integers, strings, lists, `if`/`while`,
functions, recursion, and the builtins above).

Compile to a native binary from a shell:

```sh
node scripts/sdev-native.mjs hello.sdev -o hello
./hello
```

Or use the Electron desktop IDE — the "Build Native" / "Build & Run"
buttons call the same pipeline (`electron/README.md`).

#### Opt-in power (advanced)

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

See `SDEV_HARDWARE_DOCUMENTATION.md` for the full board reference.

---

#### v1 → v2 cheat sheet

| v1                             | v2                           |
| ------------------------------ | ---------------------------- |
| `forge x be 10`                | `set x to 10`                |
| `speak("hi")`                  | `say "hi"`                   |
| `conjure add(a, b) :: … ;;`    | `to add with a b … end`      |
| `ponder x > 0 :: … ;;`         | `if x > 0 … end`             |
| `iterate n through xs :: … ;;` | `for each n in xs … end`     |
| `cycle x < 10 :: … ;;`         | `while x < 10 … end`         |
| `yield x`                      | `return x`                   |
| `yep` / `nope` / `void`        | `true` / `false` / `nothing` |

To port a v1 file, either rewrite it or just add `#!sdev v1` on line 1 and
keep the old syntax working forever.

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
node scripts/test-self-toolchain.mjs
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
node scripts/test-self-toolchain.mjs    # byte-identity across the toolchain
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
- New gate `scripts/test-self-toolchain.mjs` diffs each toolchain source
  through the shim and hard-fails on required-target mismatches. Current
  status: **lexer ✓, parser ✓, codegen ⚠** — the third one throws
  `string pool overflow` inside the JS bootstrap that compiles the shim
  driver, because embedding `codegen.sdev` itself as a `set src to "…"`
  string literal blows past the seed VM's 8 KiB pool region.
- Probe script `scripts/probe-self-lexer.mjs` reports the first diverging
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
- New gate: `node scripts/test-driver-artifact.mjs` re-derives the driver
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

1. `node scripts/test-self-toolchain.mjs` — `lexer.sdev`, `parser.sdev`, and
   `codegen.sdev` must all round-trip **byte-identical** through the
   self-hosted compiler (currently bc=746/380/5730).
2. `node scripts/test-shim-fixed-point.mjs` — the compile shim reaches a
   fixed point against the JS bootstrap oracle.
3. `node scripts/test-wasm-runtime.mjs` — seed VM opcode suite (ints, call
   frames, heap/lists, strings, floats + transcendentals).
4. `node scripts/test-driver-artifact.mjs` — the checked-in driver bytecode
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
| `length` | core | `measure` | `length` | gap (should) |
| `concat` | text | `etch` | `concat` | gap (should) |
| `ord` | text | `ord` | `ord` | gap (should) |
| `chr` | text | `chr` | `chr` | gap (should) |
| `str` | text | `str` | `str` | `str` |
| `int` | types | `int` | gap (should) | gap (should) |
| `num` | types | `num` | gap (should) | — |
| `list_new` | list | `gather` | `mklist` | gap (should) |
| `list_get` | list | `pluck` | `mklist` | gap (should) |
| `upper` | text | `upper` | gap (should) | — |
| `lower` | text | `lower` | gap (should) | — |
| `trim` | text | `trim` | gap (should) | — |
| `contains` | text | `contains` | gap (should) | — |
| `replace` | text | `replace` | gap (should) | — |
| `split` | text | `shatter` | gap (should) | — |
| `join` | text | `weave` | gap (should) | — |
| `abs` | math | `abs` | `fabs` | gap (should) |
| `min` | math | `least` | gap (should) | — |
| `max` | math | `greatest` | gap (should) | — |
| `floor` | math | `ground` | `f2i` | — |
| `ceil` | math | `elevate` | gap (should) | — |
| `round` | math | `nearby` | gap (should) | — |
| `sqrt` | math | `root` | `fsqrt` | — |
| `pow` | math | `pow` | `fpow` | — |
| `sin` | math | `sin` | `fsin` | — |
| `cos` | math | `cos` | `fcos` | — |
| `exp` | math | `exp` | `fexp` | — |
| `log` | math | `ln` | `flog` | — |
| `random` | math | `rand` | gap (should) | — |
| `range` | list | `range` | gap (should) | — |
| `sum` | list | `sum` | gap (should) | — |
| `keys` | tome | `tome_keys` | gap (should) | — |
| `read_file` | io | `read_file` | `read_file` | — |
| `write_file` | io | `write_file` | `write_file` | — |
| `http_get` | net | `http_get` | `http_get` | — |
| `var_decl` | syntax | `forge` | `set` | `set` |
| `assign` | syntax | `be` | `set` | `set` |
| `if` | syntax | `either` | `if` | `if` |
| `else` | syntax | `otherwise` | `else` | `else` |
| `while` | syntax | `cycle` | `while` | `while` |
| `for_each` | syntax | `iterate` | gap (should) | — |
| `break` | syntax | `yeet` | gap (should) | gap (should) |
| `continue` | syntax | `skip` | gap (should) | gap (should) |
| `function` | syntax | `conjure` | `to` | `call` |
| `return` | syntax | `yield` | `return` | `return` |
| `params` | syntax | `conjure` | `with` | `call` |
| `recursion` | syntax | `conjure` | `to` | `call` |
| `lambda` | syntax | `ARROW` | gap (should) | — |
| `class` | oop | `essence` | gap (should) | — |
| `inherit` | oop | `extend` | gap (should) | — |
| `self` | oop | `self` | gap (should) | — |
| `super` | oop | `super` | gap (should) | — |
| `instantiate` | oop | `new` | gap (should) | — |
| `try_catch` | errors | `attempt` | gap (should) | — |
| `rescue` | errors | `rescue` | gap (should) | — |
| `throw` | errors | `throw` | gap (should) | — |
| `logic_and` | syntax | `also` | gap (should) | gap (should) |
| `logic_or` | syntax | `within` | gap (should) | gap (should) |
| `logic_not` | syntax | `nope` | `not` | `un` |
| `equality` | syntax | `equals` | `is` | `is` |
| `inequality` | syntax | `differs` | `not` | `isnot` |
| `bool_true` | types | `yep` | gap (should) | gap (should) |
| `bool_false` | types | `nope` | gap (should) | gap (should) |
| `nothing` | types | `void` | `none` | gap (should) |
| `list_literal` | types | `gather` | `mklist` | gap (should) |
| `tome_literal` | types | `tome_keys` | gap (should) | — |
| `import` | modules | `summon` | gap (should) | — |
| `float` | types | `num` | `i2f` | — |
| `string` | types | `str` | `str` | `str` |

<!-- PARITY:END -->

---


### lang/ — language sources overview

_Source: `lang/README.md`_


This directory holds the SDEV language itself. It is **not** application code.

#### Status

Milestone 1 (this launch) — **shipped**:
- `runtime/v2.js` — the v2 "Prism" runtime, written in **pure JavaScript** with
  zero TypeScript and zero external dependencies. Implements the full
  beginner-first v2 surface syntax (`say`, `set … to`, `if/else/end`,
  `for each … in … end`, `while … end`, `to <name> with … end`, pipelines,
  lists, comparisons, boolean logic, arithmetic).
- `src/lang-bridge/bridge.ts` — the *only* remaining TypeScript file in the
  execution path. It picks v1 or v2 per file and delegates.

Milestone 2 (post-launch) — **scaffolded**:
- `bootstrap/` — hand-written WebAssembly seed that will execute a minimal
  SDEV subset (`sdev-min`). No TypeScript, no other host language.
- `compiler/` — the real compiler, written in SDEV, compiled by the seed.
- `runtime/vm.sdev`, `runtime/kernel.sdev`, `runtime/std/` — VM + kernel +
  standard library, written in SDEV.
- `paradigms/` — opt-in blocks: functional (`match`, ADTs, pipelines),
  systems (pointers, structs, FFI), data (SQL-ish queries), hardware
  (`board` → C++).
- `translator/` — the 26-language keyword translator, written in SDEV.
- `legacy/v1_frontend.sdev` — refine-mode: parses v1 keywords
  (`forge`, `conjure`, `::`, `;;`) into the v2 AST.

#### Runtime selection (today)

Choose per file with a shebang:

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

Or globally with `localStorage.sdev_runtime = "v2"` in the IDE console.

Default without a shebang is **v1** while we finish the v2 golden-file suite.

#### Build (Milestone 2, when implemented)

```
node build/build.mjs           # runs stage0 → stage1 → stage2
# produces dist/sdev-core.wasm
```

The Milestone 2 plan is in `.lovable/plan.md` (approved by the user).

---


### Native x86-64 backend

_Source: `lang/native/README.md`_


The **browser IDE** runs SDEV on WebAssembly (see `lang/bootstrap/`).
This directory is the **desktop** backend: it compiles SDEV to real
x86-64 assembly (GAS/AT&T syntax) and links it into a static Linux ELF.

#### Files

- `codegen-x64.mjs` — SDEV AST → `.s` (System V AMD64, no libc).
- `runtime.s` — hand-written asm: `_start`, `sdev_say_int`, `sdev_say_str`.
- `link.mjs` — spawns `as` + `ld` to produce an ELF binary.

#### Usage (CLI)

```
node scripts/sdev-native.mjs prog.sdev -o prog
./prog
```

The compiler will:

1. parse `prog.sdev` using the same parser the browser uses,
2. emit `prog.s` next to `prog`,
3. assemble + link into `prog` (static ELF, no libc, ~1 KB).

#### Supported subset (matches WASM seed)

- `set … to`, `if / else / end`, `while / end`
- `to name with p1 p2 … end`, `return`, full recursion
- 64-bit signed integers, string *literals* (immutable)
- `say <expr>` — prints int or string + newline

Not yet: lists, dynamic strings, canvas/graphics, hardware. Those stay
browser-only until we port them to the native backend.

#### Prerequisites

- GNU binutils (`as`, `ld`). On Linux they ship in every distro.
- On this sandbox we pull them via `nix run nixpkgs#binutils`.
- macOS: install `binutils` via Homebrew (`brew install binutils`) — this
  gives you `x86_64-linux-gnu-as`; pass paths through `link()`'s `opts`.
- Windows: assemble the emitted `.s` with MASM/NASM or run under WSL.

#### Why two backends?

Browsers don't execute x86 machine code — they only run JS and WASM.
So the web IDE stays on WebAssembly (which *is* the browser's native
assembly). For real desktop CLI use where you want an actual ELF you can
`strace` or `objdump -d`, use this backend.

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
| `length` | core | `measure` | `length` | gap (should) |
| `concat` | text | `etch` | `concat` | gap (should) |
| `ord` | text | `ord` | `ord` | gap (should) |
| `chr` | text | `chr` | `chr` | gap (should) |
| `str` | text | `str` | `str` | `str` |
| `int` | types | `int` | gap (should) | gap (should) |
| `num` | types | `num` | gap (should) | — |
| `list_new` | list | `gather` | `mklist` | gap (should) |
| `list_get` | list | `pluck` | `mklist` | gap (should) |
| `upper` | text | `upper` | gap (should) | — |
| `lower` | text | `lower` | gap (should) | — |
| `trim` | text | `trim` | gap (should) | — |
| `contains` | text | `contains` | gap (should) | — |
| `replace` | text | `replace` | gap (should) | — |
| `split` | text | `shatter` | gap (should) | — |
| `join` | text | `weave` | gap (should) | — |
| `abs` | math | `abs` | `fabs` | gap (should) |
| `min` | math | `least` | gap (should) | — |
| `max` | math | `greatest` | gap (should) | — |
| `floor` | math | `ground` | `f2i` | — |
| `ceil` | math | `elevate` | gap (should) | — |
| `round` | math | `nearby` | gap (should) | — |
| `sqrt` | math | `root` | `fsqrt` | — |
| `pow` | math | `pow` | `fpow` | — |
| `sin` | math | `sin` | `fsin` | — |
| `cos` | math | `cos` | `fcos` | — |
| `exp` | math | `exp` | `fexp` | — |
| `log` | math | `ln` | `flog` | — |
| `random` | math | `rand` | gap (should) | — |
| `range` | list | `range` | gap (should) | — |
| `sum` | list | `sum` | gap (should) | — |
| `keys` | tome | `tome_keys` | gap (should) | — |
| `read_file` | io | `read_file` | `read_file` | — |
| `write_file` | io | `write_file` | `write_file` | — |
| `http_get` | net | `http_get` | `http_get` | — |
| `var_decl` | syntax | `forge` | `set` | `set` |
| `assign` | syntax | `be` | `set` | `set` |
| `if` | syntax | `either` | `if` | `if` |
| `else` | syntax | `otherwise` | `else` | `else` |
| `while` | syntax | `cycle` | `while` | `while` |
| `for_each` | syntax | `iterate` | gap (should) | — |
| `break` | syntax | `yeet` | gap (should) | gap (should) |
| `continue` | syntax | `skip` | gap (should) | gap (should) |
| `function` | syntax | `conjure` | `to` | `call` |
| `return` | syntax | `yield` | `return` | `return` |
| `params` | syntax | `conjure` | `with` | `call` |
| `recursion` | syntax | `conjure` | `to` | `call` |
| `lambda` | syntax | `ARROW` | gap (should) | — |
| `class` | oop | `essence` | gap (should) | — |
| `inherit` | oop | `extend` | gap (should) | — |
| `self` | oop | `self` | gap (should) | — |
| `super` | oop | `super` | gap (should) | — |
| `instantiate` | oop | `new` | gap (should) | — |
| `try_catch` | errors | `attempt` | gap (should) | — |
| `rescue` | errors | `rescue` | gap (should) | — |
| `throw` | errors | `throw` | gap (should) | — |
| `logic_and` | syntax | `also` | gap (should) | gap (should) |
| `logic_or` | syntax | `within` | gap (should) | gap (should) |
| `logic_not` | syntax | `nope` | `not` | `un` |
| `equality` | syntax | `equals` | `is` | `is` |
| `inequality` | syntax | `differs` | `not` | `isnot` |
| `bool_true` | types | `yep` | gap (should) | gap (should) |
| `bool_false` | types | `nope` | gap (should) | gap (should) |
| `nothing` | types | `void` | `none` | gap (should) |
| `list_literal` | types | `gather` | `mklist` | gap (should) |
| `tome_literal` | types | `tome_keys` | gap (should) | — |
| `import` | modules | `summon` | gap (should) | — |
| `float` | types | `num` | `i2f` | — |
| `string` | types | `str` | `str` | `str` |

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


Program microcontrollers (Arduino, ESP32, ESP8266, Raspberry Pi Pico, Teensy, and more) directly in sdev. This document covers the `board { }` DSL, the compiler/uploader pipeline, the Hardware panel in the IDE, and the Arduino Library Manager integration.

---

#### 1. Overview

sdev's hardware layer lets you write firmware in sdev syntax that transpiles to Arduino-compatible C++ and is uploaded to a physical board over Web Serial. Everything Arduino's C++ ecosystem supports — libraries, sensors, actuators, protocols — is available, because the underlying compilation path is real `arduino-cli`.

Two ways to run hardware code:
1. **Real board** — write a `board { }` block, hit Upload, sdev transpiles → `.ino` → `arduino-cli` compiles → firmware flashed over USB.
2. **Simulation (roadmap)** — future in-browser simulator that runs `board { }` blocks in the IDE's Canvas panel.

---

#### 2. The `board { }` block

A `board { }` block is a hardware sketch. It is stripped from the file before the normal sdev interpreter runs, so a mixed file (sdev on desktop + firmware on device) is legal.

```sdev
board "uno" {
  conjure setup() ::
    pin 13 be output
    serial begin 9600
  ;;

  conjure loop() ::
    pin 13 write high
    wait 500
    pin 13 write low
    wait 500
  ;;
}
```

##### Board targets

The string after `board` selects the target. Supported ids:

| Id | Board | MCU | Uploader |
|----|-------|-----|----------|
| `uno` | Arduino Uno R3 | ATmega328P | STK500 |
| `nano` | Arduino Nano | ATmega328P | STK500 |
| `nano-old` | Arduino Nano (168) | ATmega168 | STK500 |
| `mega` | Arduino Mega 2560 | ATmega2560 | STK500 |
| `leonardo` | Arduino Leonardo | ATmega32U4 | STK500 |
| `micro` | Arduino Micro | ATmega32U4 | STK500 |
| `esp32` | ESP32 DevKit | ESP32 | esptool |
| `esp32-s3` | ESP32-S3 DevKit | ESP32-S3 | esptool |
| `esp8266` | NodeMCU | ESP8266 | esptool |
| `pico` | Raspberry Pi Pico | RP2040 | UF2 drop |
| `teensy41` | Teensy 4.1 | iMXRT1062 | arduino-cli |

##### Required entry points

- `setup()` — runs once at boot.
- `loop()` — runs forever after `setup()` returns.

Both are declared with `conjure` like any other sdev function.

---

#### 3. Hardware statements

Inside a `board { }` block, the following sdev statements transpile to Arduino C++:

##### Pin configuration
```
pin 13 be output       // pinMode(13, OUTPUT);
pin 2  be input        // pinMode(2,  INPUT);
pin 2  be input_pullup // pinMode(2,  INPUT_PULLUP);
```

##### Digital I/O
```
pin 13 write high      // digitalWrite(13, HIGH);
pin 13 write low       // digitalWrite(13, LOW);
forge v be pin 2 read  // int v = digitalRead(2);
```

##### Analog I/O
```
forge x be analog 0 read       // analogRead(A0);
analog 9 write 128             // analogWrite(9, 128);  (PWM, 0-255)
```

##### Timing
```
wait 500          // delay(500);
wait_us 100       // delayMicroseconds(100);
forge t be now()  // millis();
forge u be nowus() // micros();
```

##### Serial
```
serial begin 9600         // Serial.begin(9600);
serial print "hello"      // Serial.print("hello");
serial println x          // Serial.println(x);
forge b be serial read    // Serial.read();
forge n be serial avail   // Serial.available();
```

##### Advanced (pass-through emitted verbatim)
```
tone 8 440 200
notone 8
forge d be pulsein 3 high 1000000
shiftout 11 12 msbfirst 0xAA
attach 0 rising conjure()  ISR
detach 0
```

##### Library includes

Any Arduino C++ library becomes usable with `use`:

```sdev
board "uno" {
  use "Servo"
  use "Wire"
  use "Adafruit_NeoPixel"

  conjure setup() :: ... ;;
  conjure loop()  :: ... ;;
}
```

`use "X"` emits `#include <X.h>` and marks the library as required so the Library Manager materialises it into the sketchbook before `arduino-cli compile` runs.

##### Raw C++ escape hatch
```
cpp {
  Servo s;
  s.attach(9);
  s.write(90);
}
```
Everything inside `cpp { ... }` is copied byte-for-byte into the generated `.ino`. Use it for anything the DSL doesn't cover natively.

---

#### 4. The Hardware panel (IDE)

Open the IDE's left sidebar and click the **USB** icon to reveal the Hardware panel. It contains:

##### 4.1 Board picker
Dropdown of every board in the catalogue. The selection is written into the transpiled sketch as the target FQBN (fully qualified board name). Auto-populated after **Detect Board** succeeds.

##### 4.2 Detect Board
Requests a Web Serial port. The USB VID/PID reported by the port is matched against `src/lang/hardware/board-db.ts` to auto-identify:

- Arduino VIDs `0x2341`, `0x2A03`
- CH340 clones `0x1A86:0x7523`
- CP210x clones `0x10C4:0xEA60`
- FTDI `0x0403:0x6001`
- ESP32-S3 native USB `0x303A:0x1001`
- Raspberry Pi Pico `0x2E8A`
- Teensy `0x16C0`

If the VID/PID isn't recognised, you can still pick the board manually.

##### 4.3 Compile
Sends the current file to the `compile-firmware` edge function, which:
1. Extracts and transpiles the `board { }` block to `.ino`.
2. Merges the selected library set into the `arduino-cli` sketchbook.
3. Runs `arduino-cli compile --fqbn <FQBN>` and returns the resulting `.hex` (AVR), `.bin` (ESP), or `.uf2` (RP2040).

If no build server is configured (`ARDUINO_BUILD_URL` unset), the function returns the generated `.ino` so you can build it locally in the Arduino IDE.

##### 4.4 Upload
Compiles (if not already), then flashes the firmware over the selected Web Serial port:

- **AVR (Uno / Nano / Mega / Leonardo / Micro)** — bundled JS implementation of the STK500v1 bootloader protocol (`src/lang/hardware/web-serial.ts`).
- **ESP32 / ESP8266** — hands the `.bin` to `esptool-js`.
- **RP2040 Pico** — downloads the `.uf2` and prompts you to drop it on the `RPI-RP2` mass-storage volume.

##### 4.5 Serial Monitor
After upload, reopens the same port at the chosen baud rate and streams I/O into the panel. Includes a send-line input and a baud selector (300 – 2 000 000).

##### 4.6 Library Manager
Backed by Arduino's official index (`https://downloads.arduino.cc/libraries/library_index.json`). Search, install, uninstall, version-pin. Installed libraries live per-user under `~/libraries/<name>@<version>/`.

Because the firmware path is real C++, **every** Arduino library works unchanged — Servo, Adafruit_NeoPixel, FastLED, PubSubClient, Wire, SPI, ArduinoJson, LiquidCrystal, DHT sensor, all of them.

---

#### 5. Bytecode compiler additions

The bytecode compiler (`src/lang/compiler.ts` → `src/lang/vm.ts`) was brought up to interpreter parity as part of the hardware work. What changed:

##### 5.1 Loop control
`while`, `iterate ... through` (forEach), and `iterate ... in` (forIn) now compile through a shared `compileIndexedForLoop` helper that maintains a `LoopContext` stack:

```ts
interface LoopContext {
  breakJumps: number[];    // patched to loop exit
  continueJumps: number[]; // patched to loop's continue target
}
```

- `break`   — emits `JUMP -1`, index recorded in the current loop's `breakJumps`, patched to the instruction after the loop.
- `continue` — emits `JUMP -1`, recorded in `continueJumps`, patched to the loop's step/condition instruction.

Previously these compiled to `NOP` and silently did nothing.

##### 5.2 New / clarified opcodes

See `src/lang/bytecode.ts` for the full list. Highlights:

- **Control flow patching**: `JUMP`, `JUMP_IF_FALSE`, `JUMP_IF_TRUE` all support post-hoc target patching via `patchJump()` / `patchJumpTo()`.
- **Bitwise**: `BIT_AND`, `BIT_OR`, `BIT_XOR`, `BIT_NOT`, `BIT_SHL`, `BIT_SHR` — needed for register-level firmware work.
- **Systems**: `SYSCALL`, `ALLOC`, `FREE`, `HEAP_LOAD`, `HEAP_STORE`, `INTERRUPT`.
- **Tasks**: `TASK_CREATE`, `TASK_YIELD`, `TASK_KILL`.

##### 5.3 Binary format

`serializeChunk()` / `deserializeChunk()` in `src/lang/bytecode.ts`:
```
magic (u32 LE) | version (u32 LE) | payloadLen (u32 LE) | payload (JSON)
```
Magic is `0x53444556` ("SDEV"). Current `BYTECODE_VERSION = 2`.

---

#### 6. Runtime files added / touched

| File | Purpose |
|------|---------|
| `src/lang/hardware/strip.ts` | Removes `board { }` blocks before the sdev interpreter runs. |
| `src/lang/hardware/transpile.ts` | sdev → `.ino` C++ transpiler. |
| `src/lang/hardware/board-db.ts` | Board catalogue + USB VID/PID lookup. |
| `src/lang/hardware/web-serial.ts` | Web Serial wrapper, Intel HEX parser, STK500v1 flasher, serial monitor helper. |
| `src/components/ide/HardwarePanel.tsx` | UI: board picker, detect, compile, upload, serial monitor, library manager. |
| `supabase/functions/compile-firmware/index.ts` | Edge proxy to `arduino-cli`; falls back to returning `.ino` when no build server is configured. |
| `src/pages/IDE.tsx` | Registers the Hardware sidebar tab and ships a `blink.sdev` starter file. |
| `src/lang/compiler.ts` | Loop context stack, `break` / `continue` patching. |
| `src/lang/index.ts` | Calls `stripBoardBlocks()` before lex/parse. |

---

#### 7. Quick reference: the blink starter

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

Steps:
1. Plug in an Uno.
2. Hardware panel → **Detect Board** → confirm "Arduino Uno".
3. **Upload** → LED on pin 13 blinks at 1 Hz.

---

#### 8. Browser support

Web Serial is Chromium-only (Chrome, Edge, Opera, Brave, Arc) on desktop. Firefox and Safari will see a "Web Serial not supported" notice; use Chromium for uploading. The rest of the IDE works everywhere.

---

#### 9. Security notes

- Web Serial requires an explicit user gesture and per-origin permission. sdev never opens a port without you clicking **Detect** or **Upload**.
- The `compile-firmware` edge function validates the incoming source length and rejects payloads over the configured cap.
- No library binaries are ever executed in the browser — Arduino libraries only run on the target MCU after flashing.

---

*Hardware support is additive. Non-hardware sdev programs are unaffected; the `board { }` block is invisible to the standard interpreter and VM.*

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

### Builtin index — v1 runtime (441 builtins)

Every function registered into the interpreter's global environment, grouped by
the module that installs it.

#### `src/lang/builtins.ts` — Core standard library — I/O, types, math, collections, strings, regex, time

224 builtins.

`E` · `INFINITY` · `LinkedList` · `Map` · `PI` · `Queue` · `Set` · `Stack` · `TAU` · `Vec2` · `__tryCatch` · `abs` · `acos` · `all` · `any` · `appendFile` · `asin` · `atan` · `atan2` · `average` · `base64decode` · `base64encode` · `bin` · `bitAnd` · `bitNot` · `bitOr` · `bitShiftLeft` · `bitShiftRight` · `bitXor` · `buffer` · `capitalize` · `ceil` · `center` · `chaos` · `charAt` · `chars` · `chr` · `chunk` · `clamp` · `clone` · `compose` · `concat` · `constrain` · `contains` · `contents` · `cos` · `cosh` · `count` · `curry` · `degrees` · `del` · `delay` · `deleteFile` · `difference` · `dist` · `drop` · `each` · `elevate` · `ends` · `endswith` · `entries` · `enumerate` · `essence` · `etch` · `every` · `exit` · `exp` · `ffi_buf` · `ffi_call` · `ffi_close` · `ffi_open` · `ffi_read_f64` · `ffi_read_i32` · `ffi_sym` · `ffi_write_f64` · `ffi_write_i32` · `fileExists` · `find` · `first` · `flatten` · `floor` · `fold` · `format` · `formatTime` · `freeze` · `fromEntries` · `gather` · `get` · `gettype` · `greatest` · `ground` · `groupBy` · `has` · `hash` · `hex` · `http_get` · `indexOf` · `input` · `inscriptions` · `insert` · `int` · `isAlpha` · `isAlphaNum` · `isDigit` · `isFinite` · `isFrozen` · `isFunc` · `isInteger` · `isList` · `isLower` · `isNaN` · `isNum` · `isSpace` · `isText` · `isTome` · `isTruth` · `isUpper` · `isVoid` · `keys` · `last` · `lastIndexOf` · `least` · `len` · `lerp` · `listDir` · `ln` · `locate` · `log` · `log10` · `log2` · `lower` · `magnitude` · `mapRange` · `match` · `matchAll` · `max` · `mean` · `measure` · `memoize` · `merge` · `min` · `morph` · `nearby` · `now` · `num` · `oct` · `ord` · `padLeft` · `padRight` · `padleft` · `padright` · `panic` · `parseNum` · `pick` · `pipe` · `pluck` · `pointer` · `portion` · `pow` · `print` · `println` · `product` · `radians` · `rand` · `randint` · `random` · `range` · `read_file` · `remove` · `repeat` · `replace` · `replaceRegex` · `rest` · `reverse` · `root` · `round` · `seek` · `sequence` · `set` · `shatter` · `shout` · `shuffle` · `sift` · `sign` · `sin` · `sinh` · `sleep` · `snatch` · `some` · `sort` · `sortDesc` · `spawn` · `speak` · `sqrt` · `starts` · `startswith` · `str` · `sum` · `take` · `tan` · `tanh` · `tap` · `test` · `throw` · `time` · `times` · `timestamp` · `title` · `toFixed` · `toPrecision` · `tome_keys` · `trim` · `trimLeft` · `trimRight` · `typeof` · `unetch` · `unique` · `unzip` · `upper` · `values` · `weave` · `whisper` · `write_file` · `zip`

#### `src/lang/advanced.ts` — Pro layer — file I/O, hashing, base64, JSON, async, OS glue, buffers, FFI bridge

34 builtins.

`E` · `PI` · `TAU` · `acos` · `asin` · `assert` · `asserteq` · `atan` · `atan2` · `cos` · `decipher` · `erase` · `etch` · `exp` · `find` · `inscribe` · `intersect` · `invoke` · `log` · `log10` · `now` · `pause` · `pick` · `position` · `randint` · `scroll` · `shuffle` · `sin` · `sort` · `tan` · `timestamp` · `unetch` · `union` · `unique`

#### `src/lang/matrix.ts` — Matrix and linear algebra

13 builtins.

`dot` · `flatten` · `identity` · `matadd` · `matmean` · `matmul` · `matrix` · `matscale` · `matsub` · `matsum` · `reshape` · `shape` · `transpose`

#### `src/lang/graphics.ts` — Canvas 2D drawing and turtle graphics

75 builtins.

`alpha` · `arc` · `background` · `backward` · `beginPath` · `bezierTo` · `canvas` · `circle` · `clear` · `closePath` · `constrain` · `createSprite` · `degrees` · `dist` · `dot` · `drawSprite` · `ellipse` · `fill` · `fillPath` · `font` · `forward` · `goto` · `heading` · `heart` · `home` · `hsla` · `hue` · `left` · `lerp` · `line` · `lineCap` · `lineJoin` · `lineTo` · `lineWidth` · `linearGradient` · `mapRange` · `moveSprite` · `moveTo` · `noFill` · `noShadow` · `noStroke` · `pencolor` · `pendown` · `penup` · `penwidth` · `point` · `polygon` · `pos` · `quadraticTo` · `radialGradient` · `radians` · `randomColor` · `rect` · `resetTransform` · `restore` · `rgb` · `rgba` · `right` · `rotate` · `save` · `scale` · `setheading` · `shadow` · `spriteCollides` · `stamp` · `star` · `stroke` · `strokePath` · `text` · `textAlign` · `translate` · `triangle` · `turtle` · `turtleCircle` · `updateSprite`

#### `src/lang/ui.ts` — App widget runtime used by the IDE App preview

33 builtins.

`alert` · `button` · `checkbox` · `column` · `divider` · `endcolumn` · `endgroup` · `endmenu` · `endrow` · `endtab` · `endtabs` · `endwindow` · `group` · `heading` · `image` · `input` · `label` · `menu` · `menuitem` · `paragraph` · `progress` · `row` · `select` · `show` · `slider` · `spacer` · `tab` · `table` · `tabs` · `textarea` · `uiget` · `uiset` · `window`

#### `src/lang/web.ts` — Web DSL — HTML tags, CSS, JS hooks, raw passthrough

16 builtins.

`close` · `endpage` · `keyframes` · `link` · `meta` · `on` · `onclick` · `open` · `page` · `raw_css` · `raw_html` · `raw_js` · `script` · `style` · `tag` · `title`

#### `src/lang/kernel.ts` — Virtual kernel — tasks, syscalls, IPC, GC, process table

46 builtins.

`closeWindow` · `createTask` · `createWindow` · `deviceList` · `deviceRead` · `deviceStatus` · `deviceWrite` · `emitEvent` · `f32` · `f64` · `fsAppend` · `fsDelete` · `fsExists` · `fsList` · `fsMkdir` · `fsRead` · `fsStat` · `fsWrite` · `gc` · `getPrivilege` · `getTime` · `heapAlloc` · `heapFree` · `heapLoad` · `heapStats` · `heapStore` · `i16` · `i32` · `i8` · `kernelBoot` · `killTask` · `loadModule` · `moveWindow` · `onEvent` · `onInterrupt` · `resizeWindow` · `runTasks` · `setPrivilege` · `syscall` · `taskList` · `triggerInterrupt` · `u16` · `u32` · `u8` · `windowList` · `yieldTask`


### Keyword table — v1 lexer

| Keyword | Token | Note |
| --- | --- | --- |
| `forge` | FORGE |  |
| `conjure` | CONJURE |  |
| `ponder` | PONDER |  |
| `otherwise` | OTHERWISE |  |
| `cycle` | CYCLE |  |
| `iterate` | ITERATE |  |
| `through` | THROUGH |  |
| `within` | WITHIN |  |
| `be` | BE |  |
| `yield` | YIELD |  |
| `yeet` | YEET |  |
| `skip` | SKIP |  |
| `yep` | YEP |  |
| `nope` | NOPE |  |
| `void` | VOID |  |
| `also` | ALSO |  |
| `either` | EITHER |  |
| `isnt` | ISNT |  |
| `equals` | EQUALS |  |
| `differs` | DIFFERS |  |
| `summon` | SUMMON |  |
| `attempt` | ATTEMPT |  |
| `rescue` | RESCUE |  |
| `extend` | EXTEND |  |
| `new` | NEW |  |
| `self` | SELF |  |
| `super` | SUPER |  |
| `async` | ASYNC |  |
| `await` | AWAIT | NOTE: 'essence' is intentionally NOT a keyword here so it can be used as |


### Seed VM memory map

| Range | Region |
| --- | --- |
| `0x00000..0x0FFFF` | string pool  (utf-8 blobs, length-prefixed u32; 64 KiB) |
| `0x10000..0x13FFF` | global variable slots (256 slots × 4 bytes → rounded) |
| `0x14000..0x17FFF` | operand stack (u32 cells; sp grows up) |
| `0x18000..0x1BFFF` | call stack (frames of ret_ip, saved_fp, locals…) |
| `0x1C000..0x2FFFF` | bytecode program (u8 stream, up to 80 KiB) |
| `0x30000..0x7FFFF` | bump-pointer heap  (lists, dynamic strings; 320 KiB) |


### Seed VM opcode table

| Opcode | Mnemonic | Operands / meaning |
| --- | --- | --- |
| `0x01` | `PUSH_I32` | `<i32 LE>` — push signed 32-bit constant |
| `0x02` | `PUSH_STR` | `<u16 idx LE>` — push interned string handle (pool offset) |
| `0x03` | `LOAD` | `<u8 slot>` — push global variable value |
| `0x04` | `STORE` | `<u8 slot>` — pop into global variable |
| `0x05` | `POP` | drop top of stack |
| `0x10` | `ADD` | |
| `0x11` | `SUB` | |
| `0x12` | `MUL` | |
| `0x13` | `DIV` | |
| `0x14` | `MOD` | |
| `0x20` | `EQ` | |
| `0x21` | `NE` | |
| `0x22` | `LT` | |
| `0x23` | `GT` | |
| `0x24` | `LE` | |
| `0x25` | `GE` | |
| `0x30` | `NOT` |  |
| `0x40` | `JMP` | `<i16 off LE>` — unconditional relative jump |
| `0x41` | `JZ` | `<i16 off LE>` — pop; jump if zero |
| `0x50` | `SAY_I32` | pop int; host prints it |
| `0x51` | `SAY_STR` | pop string handle; host prints pool[handle] |
| `0x60` | `CALL` | `<u16 target>` — <u8 n_args>   allocate frame, copy args, jump |
| `0x61` | `RET` | pop retval, restore ip+fp, push retval |
| `0x62` | `ENTER` | `<u8 n_locals>` — reserve additional local slots |
| `0x63` | `LOAD_LOC` | `<u8 slot>` — push local (0..n_args-1 = args) |
| `0x64` | `STORE_LOC` | `<u8 slot>` — pop into local |
| `0x70` | `ALLOC` | pop size, bump HP by (size+3 & ~3), push old HP |
| `0x80` | `NEWLIST` | `<u16 n>` — pop n items (right→left in memory), push arr addr |
| `0x81` | `LGET` | pop idx, pop arr, push arr[idx] |
| `0x82` | `LSET` | pop val, pop idx, pop arr, arr[idx]=val |
| `0x83` | `LEN` | pop addr, push u32 at addr (length header) |
| `0x84` | `SGET` | pop idx, pop str, push byte at bytes[idx] |
| `0x87` | `I2S` | pop int, push decimal-string blob |
| `0x88` | `CHR` | pop byte, push new 1-char string blob |
| `0x89` | `LNEW` | pop n, alloc zeroed list [n | n cells] |
| `0x91` | `STRCAT` | pop b, pop a, allocate new pool-shaped blob, push handle |
| `0xA0` | `PUSH_F64` | `<f64 LE>` — alloc 8-byte cell, store f64, push addr |
| `0xA1` | `FADD` | |
| `0xA2` | `FSUB` | |
| `0xA3` | `FMUL` | |
| `0xA4` | `FDIV` | |
| `0xA5` | `FLT` | |
| `0xA6` | `FGT` | |
| `0xA7` | `FEQ` | |
| `0xA8` | `I2F` | pop int; box as f64 and push |
| `0xA9` | `F2I` | pop float; push i32 truncation |
| `0xAA` | `FNEG` | |
| `0xAB` | `FABS` | |
| `0xAC` | `FSQRT` | |
| `0xAD` | `SAY_F64` | pop float addr; host prints it |
| `0xAE` | `FMATH` | `<u8 op>` — pop f64; call host_fmath(op,x); push new boxed result |
| `0xB0` | `READFILE` | pop path handle; push content handle (0 on error) |
| `0xB1` | `WRITEFILE` | pop data, pop path; push i32 status (0 ok, -1 err) |
| `0xB2` | `HTTPGET` | pop url handle; push response body handle (0 err) |
| `0xB4` | `FBYTE` | pop idx (0..7), pop float; push IEEE-754 LE byte |
| `0xFF` | `HALT` |  |


### sdev-written source index (15 files, 169 functions)

Every function defined in sdev itself — the self-hosted compiler, the parity
agent, and the standard library.

#### `lang/compiler/codegen.sdev` — SDEV self-hosted codegen (Milestone 5g).

30 functions: `is_digit` · `is_alpha` · `is_alnum` · `slice` · `both_float` · `str_eq` · `emit_byte` · `intern_str` · `emit_i32` · `placeholder16` · `patch_i16` · `intern_name` · `find_local` · `add_local` · `find_fn` · `emit_load_ident` · `emit_store_ident` · `emit_call` · `resolve_pending_calls` · `is_op_c` · `is_ident_word` · `parse_atom` · `parse_postfix` · `parse_mul` · `parse_add` · `parse_cmp` · `skip_nl` · `parse_block` · `parse_params` · `parse_stmt`

#### `lang/compiler/lexer.sdev` — SDEV lexer, written in SDEV.

5 functions: `is_digit` · `is_alpha` · `is_alnum` · `slice` · `lex`

#### `lang/compiler/parser.sdev` — SDEV expression parser, written in SDEV.

4 functions: `is_op_c` · `parse_atom` · `parse_mul` · `parse_add`

#### `lang/parity/agent.sdev`

12 functions: `unquote` · `field_key` · `field_value` · `load_registry` · `load_track_source` · `probe` · `mark` · `audit` · `matrix_markdown` · `report_json` · `sync_doc` · `run_parity_agent`

#### `lang/stdlib/ffi.sdev`

11 functions: `Library` · `lib_close` · `bind` · `invoke` · `buf_f64` · `buf_from_list` · `buf_to_list` · `open_blas` · `blas_matmul` · `open_cuda` · `cuda_ok`

#### `lang/stdlib/ml/auto_evolve.sdev`

10 functions: `is_allowed` · `make_proposal` · `apply_proposal` · `draft_from_demand` · `top_topic` · `evolve_weights` · `evolve_tick` · `pick_target` · `prompt_pool` · `evolve_forever`

#### `lang/stdlib/ml/autograd.sdev`

20 functions: `tape_reset` · `record` · `d_add` · `d_mul` · `d_matmul` · `d_relu` · `d_mse` · `d_softmax_ce` · `backward` · `bw_sce` · `bw_add` · `bw_mul` · `bw_matmul` · `bw_relu` · `bw_mse` · `sgd_step` · `zero_grads` · `clip_grads` · `adam_new` · `adam_step`

#### `lang/stdlib/ml/cuda.sdev`

11 functions: `cuda_device` · `cuda_device_default` · `cuda_free_device` · `cuda_alloc` · `cuda_free` · `cuda_upload` · `cuda_download` · `cuda_matmul` · `best_matmul` · `cuda_forward_linear` · `cuda_report`

#### `lang/stdlib/ml/data.sdev`

10 functions: `load_text` · `save_text` · `char_vocab` · `encode` · `decode` · `crawl` · `crawl_many` · `teacher_query` · `distill_batch` · `save_model`

#### `lang/stdlib/ml/nn.sdev`

7 functions: `linear` · `broadcast_row` · `sequential` · `seq_forward` · `relu_layer` · `train_step` · `fit`

#### `lang/stdlib/ml/self_modify.sdev`

7 functions: `self_read` · `self_propose` · `set_review_hook` · `mine_demand` · `harvest_keywords` · `update_docs` · `rewrite_weights`

#### `lang/stdlib/ml/tensor.sdev`

16 functions: `tensor` · `tensor_grad` · `zeros` · `ones` · `randn` · `shape_size` · `t_add` · `t_sub` · `t_mul` · `t_scale` · `matmul` · `relu` · `sigmoid` · `softmax` · `mse` · `cross_entropy`

#### `lang/stdlib/ml/train.sdev`

13 functions: `lm_batches` · `lm_step` · `lm_fit` · `lm_loss` · `perplexity` · `last_logits` · `sample_topk` · `lm_generate` · `lm_complete` · `checkpoint_text` · `save_checkpoint` · `load_checkpoint` · `split_text`

#### `lang/stdlib/ml/transformer.sdev`

13 functions: `embedding` · `embed_lookup` · `layer_norm` · `ln_apply` · `attention_head` · `attn_forward` · `transpose` · `transformer_block` · `block_forward` · `gpt` · `gpt_forward` · `sample_next` · `generate`

#### `lang/stdlib/webgpu.sdev` — =====================================================================

_no top-level functions_


### Parity matrix

Registry: **70 features** across **3 tracks**.

| Feature | Area | sdev v1 (TypeScript interpreter) | sdev v2 (self-hosted compiler on the seed VM) | native x86-64 backend |
| --- | --- | --- | --- | --- |
| `say` | io | `speak` | `say` | `say` |
| `length` | core | `measure` | `length` | gap (should) |
| `concat` | text | `etch` | `concat` | gap (should) |
| `ord` | text | `ord` | `ord` | gap (should) |
| `chr` | text | `chr` | `chr` | gap (should) |
| `str` | text | `str` | `str` | `str` |
| `int` | types | `int` | gap (should) | gap (should) |
| `num` | types | `num` | gap (should) | — |
| `list_new` | list | `gather` | `mklist` | gap (should) |
| `list_get` | list | `pluck` | `mklist` | gap (should) |
| `upper` | text | `upper` | gap (should) | — |
| `lower` | text | `lower` | gap (should) | — |
| `trim` | text | `trim` | gap (should) | — |
| `contains` | text | `contains` | gap (should) | — |
| `replace` | text | `replace` | gap (should) | — |
| `split` | text | `shatter` | gap (should) | — |
| `join` | text | `weave` | gap (should) | — |
| `abs` | math | `abs` | `fabs` | gap (should) |
| `min` | math | `least` | gap (should) | — |
| `max` | math | `greatest` | gap (should) | — |
| `floor` | math | `ground` | `f2i` | — |
| `ceil` | math | `elevate` | gap (should) | — |
| `round` | math | `nearby` | gap (should) | — |
| `sqrt` | math | `root` | `fsqrt` | — |
| `pow` | math | `pow` | `fpow` | — |
| `sin` | math | `sin` | `fsin` | — |
| `cos` | math | `cos` | `fcos` | — |
| `exp` | math | `exp` | `fexp` | — |
| `log` | math | `ln` | `flog` | — |
| `random` | math | `rand` | gap (should) | — |
| `range` | list | `range` | gap (should) | — |
| `sum` | list | `sum` | gap (should) | — |
| `keys` | tome | `tome_keys` | gap (should) | — |
| `read_file` | io | `read_file` | `read_file` | — |
| `write_file` | io | `write_file` | `write_file` | — |
| `http_get` | net | `http_get` | `http_get` | — |
| `var_decl` | syntax | `forge` | `set` | `set` |
| `assign` | syntax | `be` | `set` | `set` |
| `if` | syntax | `either` | `if` | `if` |
| `else` | syntax | `otherwise` | `else` | `else` |
| `while` | syntax | `cycle` | `while` | `while` |
| `for_each` | syntax | `iterate` | gap (should) | — |
| `break` | syntax | `yeet` | gap (should) | gap (should) |
| `continue` | syntax | `skip` | gap (should) | gap (should) |
| `function` | syntax | `conjure` | `to` | `call` |
| `return` | syntax | `yield` | `return` | `return` |
| `params` | syntax | `conjure` | `with` | `call` |
| `recursion` | syntax | `conjure` | `to` | `call` |
| `lambda` | syntax | `ARROW` | gap (should) | — |
| `class` | oop | `essence` | gap (should) | — |
| `inherit` | oop | `extend` | gap (should) | — |
| `self` | oop | `self` | gap (should) | — |
| `super` | oop | `super` | gap (should) | — |
| `instantiate` | oop | `new` | gap (should) | — |
| `try_catch` | errors | `attempt` | gap (should) | — |
| `rescue` | errors | `rescue` | gap (should) | — |
| `throw` | errors | `throw` | gap (should) | — |
| `logic_and` | syntax | `also` | gap (should) | gap (should) |
| `logic_or` | syntax | `within` | gap (should) | gap (should) |
| `logic_not` | syntax | `nope` | `not` | `un` |
| `equality` | syntax | `equals` | `is` | `is` |
| `inequality` | syntax | `differs` | `not` | `isnot` |
| `bool_true` | types | `yep` | gap (should) | gap (should) |
| `bool_false` | types | `nope` | gap (should) | gap (should) |
| `nothing` | types | `void` | `none` | gap (should) |
| `list_literal` | types | `gather` | `mklist` | gap (should) |
| `tome_literal` | types | `tome_keys` | gap (should) | — |
| `import` | modules | `summon` | gap (should) | — |
| `float` | types | `num` | `i2f` | — |
| `string` | types | `str` | `str` | `str` |


### Repository map

#### `lang/bootstrap/` — JS bootstrap compiler + hand-written WebAssembly seed VM

- `lang/bootstrap/compile.mjs`
- `lang/bootstrap/seed.wat`

#### `lang/compiler/` — The self-hosted compiler, written in sdev

- `lang/compiler/codegen.sdev`
- `lang/compiler/compile-self.mjs`
- `lang/compiler/driver-artifact.mjs`
- `lang/compiler/lexer.sdev`
- `lang/compiler/parser.sdev`

#### `lang/native/` — x86-64 GAS backend, assembly runtime, linker driver

- `lang/native/README.md`
- `lang/native/codegen-x64.mjs`
- `lang/native/link.mjs`
- `lang/native/runtime.s`

#### `lang/runtime/` — v2 reference runtime (JS, legacy oracle)

- `lang/runtime/v2.js`

#### `lang/stdlib/` — Standard library written in sdev (ML, FFI, WebGPU, CUDA)

- `lang/stdlib/ffi.sdev`
- `lang/stdlib/ml/auto_evolve.sdev`
- `lang/stdlib/ml/autograd.sdev`
- `lang/stdlib/ml/cuda.sdev`
- `lang/stdlib/ml/data.sdev`
- `lang/stdlib/ml/nn.sdev`
- `lang/stdlib/ml/self_modify.sdev`
- `lang/stdlib/ml/tensor.sdev`
- `lang/stdlib/ml/train.sdev`
- `lang/stdlib/ml/transformer.sdev`
- `lang/stdlib/webgpu.sdev`

#### `lang/parity/` — Feature registry, parity agent, generated report

- `lang/parity/agent.sdev`
- `lang/parity/features.json`
- `lang/parity/report.json`

#### `src/lang/` — v1 TypeScript reference implementation

- `src/lang/advanced.ts`
- `src/lang/ast.ts`
- `src/lang/builtins.ts`
- `src/lang/bytecode.ts`
- `src/lang/compiler.ts`
- `src/lang/environment.ts`
- `src/lang/errors.ts`
- `src/lang/gist.ts`
- `src/lang/graphics.ts`
- `src/lang/hardware/board-db.ts`
- `src/lang/hardware/strip.ts`
- `src/lang/hardware/transpile.ts`
- `src/lang/hardware/web-serial.ts`
- `src/lang/index.ts`
- `src/lang/interpreter.ts`
- `src/lang/kernel.ts`
- `src/lang/lexer.ts`
- `src/lang/linker.ts`
- `src/lang/matrix.ts`
- `src/lang/parser.ts`
- `src/lang/tokens.ts`
- `src/lang/translator.ts`
- `src/lang/ui.ts`
- `src/lang/vm.ts`
- `src/lang/web.ts`

#### `src/lang-bridge/` — Runtime selection + WASM bridge for the browser IDE

- `src/lang-bridge/bridge.ts`
- `src/lang-bridge/compile-self.d.ts`
- `src/lang-bridge/v2.d.ts`
- `src/lang-bridge/wasm-runtime.ts`

#### `electron/` — Desktop IDE shell with native build/run IPC

- `electron/README.md`
- `electron/main.cjs`
- `electron/preload.cjs`

#### `scripts/` — Build drivers and the full test-gate suite

- `scripts/_compiler-entry.ts`
- `scripts/build-book-content.py`
- `scripts/build-book-pdf.py`
- `scripts/build-book.ts`
- `scripts/build-compiler.ts`
- `scripts/build-driver.mjs`
- `scripts/build-ultimate-docs.mjs`
- `scripts/probe-self-codegen.mjs`
- `scripts/probe-self-lexer.mjs`
- `scripts/sdev-native.mjs`
- `scripts/sdev-runtime-launcher.ts`
- `scripts/test-bg.ts`
- `scripts/test-driver-artifact.mjs`
- `scripts/test-ml-stdlib.ts`
- `scripts/test-native.mjs`
- `scripts/test-parity.ts`
- `scripts/test-self-codegen.mjs`
- `scripts/test-self-lexer.mjs`
- `scripts/test-self-parser.mjs`
- `scripts/test-self-toolchain.mjs`
- `scripts/test-shim-fixed-point.mjs`
- `scripts/test-translator.ts`
- `scripts/test-wasm-runtime.mjs`


### Toolchain and test gates

| Command | Purpose |
| --- | --- |
| `node scripts/_compiler-entry.ts` |  |
| `node scripts/build-book-content.py` | !/usr/bin/env python3 |
| `node scripts/build-book-pdf.py` | !/usr/bin/env python3 |
| `node scripts/build-book.ts` | Generates the giant sdev Book in English and Bulgarian. |
| `node scripts/build-compiler.ts` | Bundles the sdev compiler + VM + interpreter into a single Node.js CLI. |
| `node scripts/build-driver.mjs` | Milestone 5p — bake the self-hosted driver bytecode. |
| `node scripts/build-ultimate-docs.mjs` | Builds public/SDEV_ULTIMATE_DOCUMENTATION.md — the single, complete sdev |
| `node scripts/probe-self-codegen.mjs` | Probe: run the self-hosted codegen through the shim, but tap into what |
| `node scripts/probe-self-lexer.mjs` | Milestone 5m probe — compile lexer.sdev through the self-hosted shim |
| `node scripts/sdev-native.mjs` | SDEV native compiler CLI. |
| `node scripts/sdev-runtime-launcher.ts` |  |
| `node scripts/test-bg.ts` |  |
| `node scripts/test-driver-artifact.mjs` | Milestone 5p — the checked-in driver artifact must stay honest. |
| `node scripts/test-ml-stdlib.ts` | ---- Node host bindings consumed by src/lang/builtins.ts ---- |
| `node scripts/test-native.mjs` | Regression suite for the native x86-64 backend. |
| `node scripts/test-parity.ts` | The agent parses the registry line-by-line. Validate the same file with a |
| `node scripts/test-self-codegen.mjs` | Self-hosted codegen end-to-end test. |
| `node scripts/test-self-lexer.mjs` | Runs the self-hosted lexer (lang/compiler/lexer.sdev) through the seed |
| `node scripts/test-self-parser.mjs` | Runs the self-hosted expression parser through the seed WASM VM and |
| `node scripts/test-self-toolchain.mjs` | Milestone 5m gate — self-hosted toolchain round-trip. |
| `node scripts/test-shim-fixed-point.mjs` | Milestone 5l gate — shim fixed-point verification. |
| `node scripts/test-translator.ts` |  |
| `node scripts/test-wasm-runtime.mjs` | Standalone Node harness: compile + run via the seed WASM. No browser. |


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
