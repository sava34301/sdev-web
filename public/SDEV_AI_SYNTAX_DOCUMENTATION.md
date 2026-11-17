# sdev:ai — The AI Syntax Reference

The AI syntax is a compact way to write sdev, designed for how AI models generate code: every statement says what it is in its first token, blocks always use `{ … }`, and the operators are the familiar `== != && || !`. Fewer tokens means faster, cheaper generation — and it is just as easy for people to read.

A file that uses it starts with `!#ai` as its first code line. Before the program runs, it is translated to canonical sdev, so everything normal sdev can do works here too. The reverse direction also exists: any canonical program can be shown in the AI form with **Edit → Open as sdev:ai** in the IDE.

## The two rules

1. **The first code line is `!#ai`.** This tells sdev to read the file in the AI syntax.
2. **One statement per line, blocks in `{ }`.** There are no indentation rules and no guessed closings — every block opens with `{` and closes with `}`.

Comments use `//`, exactly like canonical sdev, and blank lines are kept as they are.

## Statements

| AI form | Becomes | What it does |
| --- | --- | --- |
| `v x = 5` | `forge x be 5` | Create a variable |
| `k MAX = 3` | `fixed MAX be 3` | Create a constant that cannot change |
| `x = x + 1` | `x be x + 1` | Change a variable, list slot, or field |
| `x += 2` | `x be x + (2)` | Add to a variable (`-=`, `*=`, `/=` work too) |
| `p(x)` | `speak(x)` | Print a value |
| `f add(a, b) {` | `conjure add(a, b) ::` | Start a function |
| `r a + b` | `yield a + b` | Return a value (`r` alone returns nothing) |
| `? x > 3 {` | `ponder x > 3 ::` | If |
| `} :? x > 1 {` | `;; otherwise ponder x > 1 ::` | Else if |
| `} : {` | `;; otherwise ::` | Else |
| `w i < 3 {` | `cycle i < 3 ::` | While loop |
| `each n in xs {` | `iterate n through xs ::` | Loop over a list |
| `brk` | `yeet` | Leave the loop |
| `next` | `skip` | Jump to the next loop round |
| `c Dog {` | `essence Dog ::` | Start a class |
| `c Dog : Animal {` | `essence Dog extend Animal ::` | A class that builds on another class |
| `throw "message"` | `hurl "message"` | Raise an error |
| `try {` | `attempt ::` | Start a protected block |
| `} catch e {` | `;; rescue e ::` | Handle an error |
| `} finally {` | `;; ensure ::` | Always run this, error or not |
| `}` | `;;` | Close any block |

Anything that is not one of these forms — a call to a built-in command, for example — is passed through as normal sdev, so the whole standard library is available.

## Operators and values

The AI syntax uses the operators AI models already know. They are translated to the canonical words before the program runs:

| AI form | Becomes |
| --- | --- |
| `==` | `equals` |
| `!=` | `differs` |
| `&&` | `also` |
| `\|\|` | `either` |
| `!` | `isnt` |
| `true` / `false` | `yep` / `nope` |
| `null` | `void` |

Text inside quotes is never touched, so `p("a == b")` prints exactly `a == b`.

## A complete example

```sdev
!#ai
k MAX = 3
v total = 0

f add(a, b) {
  r a + b
}

each n in [1, 2, 3] {
  total = add(total, n)
}

? total > MAX {
  p("big: " + total)
} : {
  p("small")
}
```

This prints `big: 6`. Save it as a `.sdev` file and run it — the first line does all the work.

## Error handling example

```sdev
!#ai
f divide(a, b) {
  ? b == 0 {
    throw "cannot divide by zero"
  }
  r a / b
}

try {
  p(divide(10, 0))
} catch e {
  p("caught: " + e)
} finally {
  p("done")
}
```

This prints `caught: cannot divide by zero` and then `done`.

## Common mistakes

- **Forgetting `!#ai`.** Without the first line the file is read as canonical sdev, and `v x = 5` will not mean anything.
- **Indentation-only blocks.** The AI syntax always needs `{ }` — a line like `? x > 3` with an indented line under it is not a block.
- **Splitting a statement across lines.** Each statement lives on one line; only blocks span lines.
- **Using canonical words inside conditions.** Write `x == 3 && y != 4`, not `x equals 3 also y differs 4` — the translator adds the canonical words for you.
