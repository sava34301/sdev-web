# SDEV — New Features (November 2026)

This page covers everything added in the latest update: the causal engine in every SDEV style, the new compiler checks, the list and naming rules, and the bug fixes. Each section says what is **built and tested** and what is **still planned**.

---

## 1. The causal engine (OCE) works everywhere

The Ontological Causal Engine learns cause-and-effect rules ("laws") from what it observes. It now runs in every SDEV style and every runtime, and gives exactly the same answers in all of them.

| Where | How you get it |
|---|---|
| SDEV v2 (Prism) | `use "lang/stdlib/v2/oce.sdev"` |
| Classic SDEV (`forge`, `be`, …) | Built in, no import needed |
| `!#ai` files | Built in, no import needed |
| Python interpreter | Built in, no import needed |
| Native Linux programs | Same `use` line, compiled with the native backend |

### Example (classic SDEV)

See `examples/oce/gravity-classic.sdev`. The engine watches a ball sitting on a table. When the table is taken away, it learns gravity:

```
surprises while learning: 2
law 2 [confidence 20]: if supported == 0 then vel_z += -10
law 4 [confidence 30]: if always then pos_z += vel_z
if the table lost support, after 3 ticks vel_z = -30
model size: 60 bytes
```

The same program also exists as SDEV v2 (`examples/oce/gravity.sdev`) and `!#ai` (`examples/oce/gravity-ai.sdev`), and all three print this output.

### Function groups

- **Engine:** create a model, observe states, learn and repair laws, predict, ask "what if" (counterfactuals), describe laws.
- **Bits:** pack and unpack small numbers inside one integer (used for the 12-byte causal nodes).
- **Memory:** a fixed memory block with `mem_fill`, `mem_copy` and byte/word reads and writes.
- **Ring buffer:** fixed-size history that keeps the newest entries.

The full list of functions is in **OCE — Causal Engine Library** on this Docs page.

---

## 2. Website programs can load libraries

Before, `use "lang/stdlib/v2/…"` lines only worked in the command-line tool. Now the website loads every standard library file that a program uses, including the files those libraries use themselves. Files load only when a program asks for them, so pages stay fast.

---

## 3. Clear errors instead of silent wrong results

The SDEV v2 compiler now checks each program before it runs, in both the website and `sdevhost`. These mistakes now stop the program with a clear message:

| Mistake | Message |
|---|---|
| Calling a function that doesn't exist | `unknown function: name` |
| Wrong number of inputs | `g: expected 2 args, got 1` |
| `list + list` without the list library | Tells you to add `use "lang/stdlib/v2/list.sdev"` |

Before this update, these programs ran anyway and gave wrong results without any warning.

---

## 4. Language rules

### Joining lists with `+`
```
use "lang/stdlib/v2/list.sdev"
xs = [1, 2]
ys = xs + [3]        # [1, 2, 3]
```
`+` joins lists when either side is written as a list in square brackets (`[...]`). To join two list variables, use `list_concat_two(a, b)`. To add one item, use `list_append(xs, item)`.

### `kind` is a normal name again
Only a line that **starts** with `kind Name` declares a class. Elsewhere, `kind` can be used as a variable or field name (`kind = "ball"`).

### Python interpreter
It now understands `==`, `!=` and `str()` in all the places the browser version does.

---

## 5. Bug fixes

- **Database helpers:** filtering rows with your own test function now works.
- **Database lists:** building lists of rows no longer gives `0`.
- **Functional helpers:** helpers that take a function now call that function correctly.
- **Native programs:**
  - no longer crash when a function changes a shared list
  - compare text correctly when the text is stored in a list
  - `2 and 3` now gives `1`, as in every other runtime

---

## 6. How it is tested

| Test | Command | Result |
|---|---|---|
| Engine gives the same answer in every runtime | `npm run test:oce-parity` | 8/8 |
| New compiler checks | `npm run test:v2-diagnostics` | 7/7 |
| Engine library (SDEV v2) | `npm run test:oce` | 35 checks |
| Native backend | `npm run test:native` | 81/81 |
| All self-hosted suites | `npm test` | 18/18 suites |
| Every documented example | `npm run test:understander-docs` | 0 broken |

The gravity example and the wrong-input error were also checked in a real browser on the website.

---

## 7. Still planned

- The Python interpreter cannot read `!#ai` files yet. Classic files work.
- `+` on two list **variables** (not written as `[...]`) still needs `list_concat_two`.
- The downloadable command-line tool and editor extension get these changes at the next release.
- The engine's speed claims from the original research paper have not been measured independently.
