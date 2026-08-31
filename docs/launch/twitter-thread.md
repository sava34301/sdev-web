# Twitter/X — launch thread

**When:** T+5m (14:05 Sofia). Schedule via Typefully/Buffer if possible.

---

## Tweet 1 (hook)

sdev is live.

A new programming language. Written from scratch. Compiler compiles itself. Runs in the browser, no install.

Try it: web.sdev.codes

🧵 what's inside 👇

---

## Tweet 2 (syntax)

The syntax is deliberately unlike Python/JS/Go:

```
set greeting to "hello, world"
say greeting

for each n in [1, 2, 3]
  say n * 10
end
```

Because "print(x)" reads as noise. "say x" reads as English.

---

## Tweet 3 (web DSL)

A full webpage in 6 lines:

```
page
  h1 "My site"
  p "Welcome."
  style { body { background: #0F172A } }
  onclick { say "clicked!" }
end
```

That's a real HTML document. Render, download, ship.

---

## Tweet 4 (leaflet)

A Leaflet map of Sofia in 2 lines:

```
map center [42.6977, 23.3219] zoom 12
marker at [42.6977, 23.3219] popup "Sofia"
```

GIS built in. No CDN wiring, no boilerplate.

---

## Tweet 5 (the flex)

The sdev compiler is written in sdev.

`lexer.sdev` and `parser.sdev` compile byte-identically through the self-hosted pipeline vs the JS reference.

Bootstrapped through a hand-written WebAssembly seed VM (~4 KiB of .wat).

The JS bootstrap gets deleted next month.

---

## Tweet 6 (26 languages)

Write sdev in Bulgarian:

```
кажи "здравей"
```

Or Japanese, Portuguese, Arabic, or 22 more. Same AST, same bytecode. Kids in every country get a first language in their first language.

---

## Tweet 7 (what's shipping)

Live today at web.sdev.codes:

• Full browser IDE
• Bytecode VM + kernel
• Dual runtime (JS + Python)
• Web DSL + Leaflet
• 26-language keyword translator
• Gist-based package system
• VS Code extension
• Book (EN + BG)

---

## Tweet 8 (CTA)

Play with it in your browser right now. No signup needed to run code.

→ web.sdev.codes

If you build something with it in the next 48h, tag #sdev — I'll boost the coolest ones.
