# Reddit — r/ProgrammingLanguages

**When:** T+5m (14:05 Sofia).
**Flair:** Discussion (they're strict about "Show" — check current rules).

---

## Title

```
sdev: a beginner-first language with a self-hosted WASM compiler (launched today)
```

## Body

I've spent the last few years building sdev, and it's live today at web.sdev.codes. Posting here because this sub is the one place where the compiler-internals angle matters more than the marketing.

**Design premises**

1. **Surface syntax should not look like an existing language.** Every keyword is a deliberate re-choice: `say` not `print`, `set … to` not `=` or `let`, `for each … in … end` not `for … :` and not `for (…)`. The hypothesis is that beginners conflate "the concept" with "how their first language spells it," and the only way to break that is to make the spelling foreign to everyone equally.

2. **Bilingual reachable from day one.** Keywords have translations in 26 languages; the same AST underlies all of them. A Bulgarian teenager writes `кажи "здравей"` and it's the same bytecode as `say "hello"`.

3. **Beginner front-end, real back-end.** The bytecode VM, mark-and-sweep GC, virtual kernel, and pipeline operators are all under the hood. You don't need them for `say "hi"`, but they're there when you outgrow toy programs.

**Compiler pipeline (the interesting part)**

- Stage 0: a hand-written WebAssembly seed VM (`seed.wat`, ~4 KiB) with fixed memory layout — string pool at 0x0000, bytecode above `code_base()`, two host imports for `say`.
- Stage 1: a JS "bootstrap compiler" (`lang/bootstrap/compile.mjs`) that lowers sdev source to seed bytecode. Its only job is to be replaced.
- Stage 2: `lang/compiler/{lexer,parser,codegen}.sdev` — the real compiler, written in sdev itself. Loaded through the seed VM.
- Stage 3: `lang/compiler/compile-self.mjs` — a shim that exposes the self-hosted pipeline as a drop-in for the JS bootstrap.

Current status: `lexer.sdev` (746-byte bytecode, 41-byte string pool) and `parser.sdev` (380/38) compile byte-identically through the shim vs the JS reference. `codegen.sdev` is blocked by an 8 KiB string-pool ceiling in the seed VM — the driver embeds user source as a compile-time literal, so >8 KiB sources overflow. Next milestone widens that (either bumping the pool to 64 KiB or injecting source into memory outside the pool region).

**What's shipping today**

- Browser IDE (Monaco-style editor, file tree, terminal, debugger, canvas + web preview).
- Bytecode VM + virtual kernel + task scheduler.
- Decentralized packages via `summon "gist-url"`.
- Built-in Web DSL (`page`, `h1`, `style`, `onclick`) — full HTML doc from ~6 lines.
- Leaflet/GIS interop.
- 26-language keyword translator.
- VS Code extension.
- English + Bulgarian book, full language docs.

**What's on the wall**

- Milestone 5n: widen seed VM memory.
- Milestone 5o: delete JS bootstrap.
- Native x64 codegen (scaffolded in `lang/native/`).
- Hardware DSL that lowers to Arduino/ESP32 C++.

**Try it**

Playground and IDE, no signup needed to run code: https://web.sdev.codes
Repo/book/docs linked from there.

Happy to go deep on the WASM seed VM, the 26-language translator table (~500 mapping rules, cached), or the "byte-identical self-compile" gate strategy. Roast the syntax — that's what this sub is for.
