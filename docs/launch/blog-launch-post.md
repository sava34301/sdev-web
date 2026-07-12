# Blog post — "sdev is here" (~800 words)

**Where:** New route `/blog/launch` (or `/docs/launch`) — build tomorrow morning.
**When:** Publish at T-1h (13:00 Sofia) so the URL is warm before HN lands.

---

# sdev is here.

Today, July 12, 2026, sdev goes live.

If you've never heard of it: sdev is a new programming language. It runs in your browser, in a full IDE, without an install. It has a syntax nothing like Python or JavaScript. It ships with a bytecode virtual machine, a virtual kernel, a Web DSL, Leaflet integration, a package system, a 26-language keyword translator, a VS Code extension, and a full-length book in two languages. And its compiler is written in itself.

Here's how it got here, and what you can do with it.

## Why sdev exists

Every popular programming language today was designed for people who already program. The people they were designed for don't need `print(x)` to be more readable, because they've long since stopped reading it as "print, open paren, x, close paren" — they read it as one word. But for someone opening a code editor for the first time, that punctuation isn't invisible. It's a wall.

sdev's premise is that the wall is optional. Not every language has to be built for the people who have already scaled it.

So the syntax reads out loud:

```sdev
set greeting to "hello, world"
say greeting

for each n in [1, 2, 3]
  say n * 10
end
```

`say` beats `print(...)` every time I run this test with a non-programmer. `set … to` beats `=` and `let`. `for each … in … end` beats `for (;;)` and `for … :`. None of these choices are arbitrary; they're all the result of watching real people fail to guess what mainstream syntax means.

But a beginner-friendly language that can't do real work isn't a language. It's a toy. So sdev also had to be real.

## What "real" means, on day one

- **A bytecode VM.** Not a tree-walking interpreter — a proper stack-based virtual machine, with a `.sdevc` binary format and a documented opcode set.

- **A virtual kernel.** Tasks, syscalls, a mark-and-sweep garbage collector.

- **A browser IDE.** File tree, terminal, debugger, live canvas preview, live web preview, autocomplete, syntax highlighting, minimap, find/replace, go-to-line, problems panel, command palette.

- **A Web DSL.** `page`, `h1`, `p`, `style { … }`, `onclick { … }`, plus `raw_html` / `raw_css` / `raw_js` escape hatches. A complete HTML document, in six lines of sdev.

- **Leaflet interop.** A live map with markers, popups, polygons, and layers, in two lines.

- **A decentralized package system.** `summon "gist-url"` pulls a library straight from GitHub Gists. No central registry, no lock file, no npm.

- **A 26-language keyword translator.** Write sdev in Bulgarian, Japanese, Portuguese, Arabic — the AST is the same. A child in Sofia and a child in Osaka can write the same program in their own languages.

- **A self-hosted compiler.** Which brings us to the part I'm most proud of.

## The compiler compiles itself

sdev's v2 compiler is written in sdev.

The bootstrap chain runs like this:

1. **Stage 0** — a hand-written WebAssembly seed VM (`lang/bootstrap/seed.wat`, about four kilobytes of `.wat`) with a fixed linear-memory layout and two host imports for output.

2. **Stage 1** — a JavaScript "reference compiler" (`lang/bootstrap/compile.mjs`) that lowers sdev source to seed bytecode. Its only job is to be replaced.

3. **Stage 2** — `lang/compiler/lexer.sdev`, `parser.sdev`, and `codegen.sdev`. The real compiler, written in sdev, loaded through the seed VM.

4. **Stage 3** — `lang/compiler/compile-self.mjs`, a thin shim that exposes the self-hosted pipeline as a drop-in replacement for the JS reference.

As of today, `lexer.sdev` and `parser.sdev` compile **byte-identically** through the self-hosted pipeline versus the JS reference. Same bytecode. Same string pool. Down to the last byte. `codegen.sdev` itself is one memory-widening away.

Once that widening lands (next milestone), the JS bootstrap gets deleted. sdev will compile itself, from source, entirely through sdev-authored code running on a hand-written WebAssembly seed.

I don't know of another beginner-first language that has done this.

## What's next

- **Milestone 5n** — widen the seed VM so `codegen.sdev` round-trips.
- **Milestone 5o** — delete the JS bootstrap.
- **Native x64 codegen** — already scaffolded in `lang/native/`.
- **Hardware DSL** — sdev programs that lower to Arduino/ESP32 C++, for the maker crowd.
- **Pro tier** — desktop app, cloud sync, private Gists.

## Try it now

Open the IDE. Type `say "hello, world"`. Hit run. You'll see it work. Then poke around at the example Gists, or read the book, or write your own program.

→ [https://web.sdev.codes](https://web.sdev.codes)

No signup needed to run code. Signup is only for saving files and publishing Gists.

## One more thing

For the next 48 hours, there's a launch contest. Publish anything you build with sdev as a public Gist, tag it `sdev-launch-2026`, and the best submission gets named in the README plus a lifetime pro tier once we ship one.

If you build with sdev — or if you have opinions about the syntax, the compiler pipeline, or the whole premise — I want to hear about it. Twitter, LinkedIn, Instagram, or the IDE's built-in AI assistant. My DMs are open.

Thanks for being here on day one.

— Sava Milanov
