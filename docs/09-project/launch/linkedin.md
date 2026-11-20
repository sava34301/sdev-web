# LinkedIn — launch post

**When:** T+5m (14:05 Sofia).

---

Today I'm launching sdev — a new programming language, live at web.sdev.codes.

I've spent the last few years building it. The premise is simple: every popular language today was designed for people who already program. sdev is designed for people who don't — while still being real enough to power the compiler that compiles it.

What's inside, launching today:

• A radically new surface syntax — `say`, `set … to`, `for each … in … end`. Not another Python-with-a-hat.

• A browser-based IDE with editor, file tree, terminal, debugger, live canvas, and live web preview. No install.

• Dual runtime: JavaScript for the browser and web, Python for the desktop and pro use — feature parity.

• A self-hosted compiler. sdev's compiler is written in sdev, bootstrapped through a hand-written WebAssembly seed VM. The lexer and parser already round-trip byte-identically through the self-hosted pipeline.

• Built-in Web DSL — a full HTML page in six lines.

• Leaflet/GIS interop — a real map in two lines.

• 26-language keyword translator. A child in Sofia writes their first program in Bulgarian; a child in Osaka writes theirs in Japanese; the AST is the same.

• A decentralized package system built on GitHub Gists.

• A VS Code extension.

• A full-length book in English and Bulgarian.

Why bother? Because the people who most need a first programming language are the ones most alienated by the syntax we've decided is standard. I don't think that has to be the trade-off.

Play with sdev in your browser — no signup needed to run code:

→ https://web.sdev.codes

If you build something with it, I'd love to see it. And if you want to argue about the syntax choices, my DMs are open.
