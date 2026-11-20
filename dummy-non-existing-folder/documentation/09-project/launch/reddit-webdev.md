# Reddit — r/webdev

**When:** T+2h (16:00 Sofia).

---

## Title

```
sdev launched today — a language where a full webpage is 6 lines and a Leaflet map is 4
```

## Body

Web angle for r/webdev: sdev has a built-in Web DSL that compiles to a real HTML document, and Leaflet interop that's basically zero-boilerplate.

**Full webpage:**

```
page
  h1 "My site"
  p "Welcome."
  style { body { background: #0F172A; color: white } }
  onclick { say "clicked!" }
end
```

That's a complete HTML document, rendered in the IDE's WEB preview panel and downloadable as a standalone `.html` file.

**Leaflet map of Sofia:**

```
map center [42.6977, 23.3219] zoom 12
marker at [42.6977, 23.3219] popup "Sofia"
```

That's it. The rest is Leaflet's normal API, callable from sdev.

**Why it might interest you**

- No build step. Write sdev, hit run, get HTML.
- Escape hatches: `raw_html`, `raw_css`, `raw_js` blocks let you drop in existing code.
- `js { ... }` block for full JavaScript interop when you need a specific browser API.
- Everything runs in the browser — no server, no toolchain.

Live IDE, no signup: https://web.sdev.codes

Also happy to hear "this should have used <existing framework> instead" arguments — I've heard most of them and I'll share why sdev exists anyway.
