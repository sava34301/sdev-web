# SDEV v2 "Prism" — Language Guide

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

## Values

| Kind    | Example                     |
| ------- | --------------------------- |
| number  | `42`, `3.14`, `-7`          |
| text    | `"hello"` or `'hello'`      |
| truth   | `true`, `false`             |
| nothing | `nothing`                   |
| list    | `[1, 2, 3]`, `["a", "b"]`   |

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

## Strings

Text is a first-class value. Concatenate with `+` or `concat`:

```sdev
set name to "sdev"
say "hi " + name + "!"        # hi sdev!
say concat("hello, ", "world") # hello, world
say length("hello")            # 5
```

Byte-level primitives are available when you need to slice or build text
character by character:

| Builtin      | Meaning                                              |
| ------------ | ---------------------------------------------------- |
| `length(x)`  | length of a list **or** a string                     |
| `concat(a,b)`| concatenate two strings                              |
| `ord(s, i)`  | byte value of `s` at index `i` (e.g. `ord("A",0)` → 65) |
| `chr(n)`     | 1-character string from a byte value (`chr(65)` → `"A"`) |
| `str(n)`     | integer → decimal string (`str(-42)` → `"-42"`)       |

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

## Built-in functions

`say`, `print`, `length`, `concat`, `ord`, `chr`, `str`, `upper`, `lower`,
`number`, `text`, `round`, `floor`, `ceil`, `abs`, `max`, `min`, `sum`,
`range`, `keep`, `map`, `double`, `pi`, `tau`.

## Runtimes

SDEV v2 ships with **two independent backends** — pick the one that fits
where your program runs.

| Runtime         | Where it runs         | How it executes                          |
| --------------- | --------------------- | ---------------------------------------- |
| **WASM (web)**  | The browser IDE       | A hand-written WebAssembly stack VM (`lang/bootstrap/seed.wat` → `public/wasm/sdev-seed.wasm`) executes bytecode emitted by the bootstrap compiler. Zero TypeScript in the language core. |
| **Native ASM** (desktop) | Linux / macOS CLI + Electron | The same AST is emitted as x86-64 GAS assembly (`lang/native/codegen-x64.mjs`), then assembled with `as` and linked with `ld` into a standalone static ELF. No libc dependency. |

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

See `SDEV_HARDWARE_DOCUMENTATION.md` for the full board reference.

---

## v1 → v2 cheat sheet

| v1                          | v2                          |
| --------------------------- | --------------------------- |
| `forge x be 10`             | `set x to 10`               |
| `speak("hi")`               | `say "hi"`                  |
| `conjure add(a, b) :: … ;;` | `to add with a b … end`     |
| `ponder x > 0 :: … ;;`      | `if x > 0 … end`            |
| `iterate n through xs :: … ;;` | `for each n in xs … end`  |
| `cycle x < 10 :: … ;;`      | `while x < 10 … end`        |
| `yield x`                   | `return x`                  |
| `yep` / `nope` / `void`     | `true` / `false` / `nothing`|

To port a v1 file, either rewrite it or just add `#!sdev v1` on line 1 and
keep the old syntax working forever.

## Why v2 exists

The full "why we're rebuilding SDEV" — self-hosted compiler, WASM output,
zero TypeScript in the language core — lives in `.lovable/plan.md`.
This document only teaches the *language*.
