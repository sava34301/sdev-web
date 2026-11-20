# Reddit — r/programming

**When:** T+30m (14:30 Sofia). Post after HN so you can link the HN thread in the first comment.

---

## Title

```
I built a new programming language whose compiler compiles itself — it's live today
```

## Body

sdev launched today at web.sdev.codes. It runs entirely in the browser (no install), and the compiler is written in sdev itself, bootstrapped through a hand-written WebAssembly seed.

Quick tour of the syntax:

```
set greeting to "hello, world"
say greeting

for each n in [1, 2, 3]
  say n * 10
end

to greet with name
  say "hi, " + name
end
greet("world")
```

That's not a shell over Python — it compiles to bytecode that runs on a stack-based VM shipped inside the browser tab.

**Why it exists.** Every mainstream language's syntax was designed for people who already program. sdev's is designed for people who don't. `say` beats `print(...)` in every usability test I've done with non-programmers.

**What ships today**

- Full browser IDE (editor, files, terminal, debugger, live canvas, live web preview).
- Dual runtime (JS in the browser, Python on desktop) with feature parity.
- Built-in Leaflet/GIS interop — a real map in ~4 lines.
- Web DSL — a full HTML page from ~6 lines of sdev.
- 26-language keyword translator (write your code in Bulgarian, Japanese, Portuguese — same program).
- Package system via GitHub Gists (`summon "gist-url"`).
- VS Code extension.
- Book in English + Bulgarian, full docs.

**The compiler-compiles-itself part.** `lexer.sdev` and `parser.sdev` already round-trip byte-identically through the self-hosted compiler. `codegen.sdev` is one seed-VM-memory-widening away. Once that lands, the original JS bootstrap gets deleted.

**Try it, no signup:** https://web.sdev.codes

HN thread if you want the deeper technical writeup: <paste HN url here after posting>
