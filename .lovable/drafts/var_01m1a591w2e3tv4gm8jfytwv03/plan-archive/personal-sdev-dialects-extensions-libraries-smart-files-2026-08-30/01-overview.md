# Personal SDEV — dialects, extensions, libraries, smart files

Anyone can build their own version of SDEV: their own keywords (in any human language), their own style, their own added functions and operators — then share it, and open other people's versions straight from the IDE.

The trick that makes this affordable: **a dialect is data, not a compiler fork.** The self-hosted lexer/parser/codegen stay exactly as they are. A dialect is a spec file that renames and restyles the surface; a canonicalizer rewrites a dialect source into canonical sdev v2 before compiling. So every dialect gets the WebAssembly runtime, the native x86-64 backend and the ML stack for free, and any dialect file can be translated into any other dialect losslessly.

## What ships

1. **Dialect Studio** — a page to build a dialect two ways: *Manual* (a searchable table of every keyword, builtin and style token, each editable) and *Assisted* (describe the language you want — "Bulgarian keywords, Ruby-ish blocks, no `end`" — and AI drafts the full spec, which you then edit by hand).
2. **Three levels of customization**, opt-in per dialect:
   - **Names** — rename every keyword and builtin, any language or script, plus per-token synonyms.
   - **Style** — block enders (`end` / `}` / indentation), comment marker, string quotes, decimal and list separators, statement order for assignment (`set x to 1` / `x = 1` / `1 → x`).
   - **Constructs** — user-added functions and operators, written in sdev, registered into the dialect's prelude.
3. **Extensions** — new functions/operators authored in sdev, private or public per user's choice, with a one-click "propose for core SDEV" request that lands in a review queue.
4. **Library registry** — publish an sdev library, import it with `use "@sava/matrixkit@1.2.0"`, or download a bundle and use it offline.
5. **Smart file signature** — an invisible, IDE-recognized block in every file recording the runtime version, dialect id, library pins and a checksum. The IDE hides it, reads it, and can retranslate the file into the reader's own dialect on open.
6. **Living documentation** — one canonical template; every dialect gets its own generated docs in its own keywords and language, refreshed automatically when the canonical docs change.
