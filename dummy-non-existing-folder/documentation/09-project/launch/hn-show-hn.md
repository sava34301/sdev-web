# Hacker News — Show HN post

**When:** July 12, 2026, ~14:05 Europe/Sofia (07:05 ET). Sunday afternoon is soft; post anyway — the launch date is fixed.
**Where:** https://news.ycombinator.com/submit
**Type:** Show HN
**URL field:** https://web.sdev.codes

---

## Title (80 char limit)

```
Show HN: sdev – a programming language whose compiler compiles itself in WASM
```

Backup title if the first gets flagged:

```
Show HN: sdev – new language, self-hosted WASM compiler, browser IDE
```

---

## Text (first comment, posted immediately after the submission)

Hi HN,

sdev is a programming language I've been building. It launched today at web.sdev.codes.

**What's different**

- Radically new surface syntax — keywords like `say`, `set … to`, `for each … in … end`, deliberately unlike Python/JS/Go so beginners don't confuse "the concept" with "how Python spells it."
- Dual runtime from day one: a JavaScript interpreter (browser IDE, Leaflet integration) and a Python interpreter (desktop/pro use), tested for feature parity.
- **Self-hosted compiler.** The v2 compiler is written in sdev itself, bootstrapped through a hand-written WebAssembly seed VM. `lexer.sdev` and `parser.sdev` already compile byte-identically to the JS reference compiler through the self-hosted pipeline; `codegen.sdev` is one memory-widening away.
- Built-in Web DSL (`page`, `h1`, `style`, `onclick`) and Leaflet/GIS interop, so "hello world" and "a live map of Sofia" are both one screen of code.
- 26-language keyword translator — write sdev in Bulgarian, Japanese, Portuguese, or English; they're all the same program.

**What's real today**

- Browser IDE with file tree, terminal, debugger, live canvas + web preview.
- Bytecode VM + virtual kernel, mark-and-sweep GC, decentralized package system (`summon` a Gist as a library).
- Docs and a full-length book in English and Bulgarian.
- VS Code extension.

**What's coming**

Milestone 5n: widen the seed VM so `codegen.sdev` round-trips too, then delete the JS bootstrap. After that: native x64 codegen (already scaffolded), hardware DSL for Arduino/ESP32, and a pro tier.

Try it in the browser — no install, no sign-up needed to run code: https://web.sdev.codes

Happy to answer anything about the compiler pipeline, the WASM seed VM design, or why the syntax looks the way it does.

---

## Response templates for common HN comments

**"Why not just use Python/JS?"**
> Fair question. sdev isn't trying to replace them — it's aimed at people who find their syntax noisy or intimidating. The reason `say` and `set … to` exist is that in usability tests with non-programmers, `print(x)` reads as "print, open paren, x, close paren" while `say x` reads as English. The dual runtime means once you know sdev you can drop into Python or JS interop when you outgrow it.

**"Isn't a self-hosted compiler premature?"**
> Yes, but it's the fastest way to prove the language can express its own tooling. `codegen.sdev` is ~600 lines; if it can't be written in sdev, that's the signal that the surface is too weak.

**"How does the WASM seed VM work?"**
> `lang/bootstrap/seed.wat` is hand-written WebAssembly with a fixed-layout linear memory (string pool at 0x0000, code region above `code_base()`). The JS bootstrap in `lang/bootstrap/compile.mjs` compiles sdev source to bytecode, loads it into the seed's memory, and calls `run`. Two host imports (`host_say_i32`, `host_say_str`) provide the only I/O. Once codegen.sdev compiles itself byte-identically, the JS bootstrap gets deleted.

**"Show me the syntax."**
> ```
> set greeting to "hello, world"
> say greeting
>
> for each n in [1, 2, 3]
>   say n * 10
> end
>
> to greet with name
>   say "hi, " + name
> end
> greet("HN")
> ```

**"Any benchmarks?"**
> Not yet — v2's whole point this launch is correctness (50/50 semantic tests, 43/43 byte-identical compiles). Perf work starts once native codegen lands.
