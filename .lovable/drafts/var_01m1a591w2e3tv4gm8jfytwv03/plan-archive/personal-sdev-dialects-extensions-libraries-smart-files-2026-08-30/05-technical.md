## Technical notes

**Signature block.** A single leading line in a distinct sigil form the IDE recognizes and the lexer treats as a comment — carrying runtime version, dialect id + version, library pins, translation origin and a checksum, compactly encoded so it reads as opaque. The editor hides it with a CodeMirror decoration and strips it from copy, so users never edit it; it is written on save and repaired if damaged. It travels with the file through export, paste and git; the cloud file row mirrors the same fields for search and sharing. Files without a signature are treated as canonical sdev v2, exactly as today.

**Canonicalizer.** A token-level rewriter placed in front of the existing pipeline, driven entirely by the dialect spec: names map word→canonical token, style rules normalize block ends/comments/assignment order, constructs are prepended as prelude modules and operator symbols are desugared to calls. Run in reverse it renders canonical source into any dialect — that is the same code path used for "open this file in my dialect", so translation stays lossless by construction. Comments and string contents are never rewritten. It runs in the browser IDE, in the native CLI, and in the VS Code extension from the same spec JSON.

**Compiler untouched.** `lang/compiler/lexer.sdev`, `parser.sdev`, `codegen.sdev` and the byte-identity fixed-point suite are not modified. New golden tests assert `canonicalize(dialect_source) == canonical_source` and round-trip identity for a set of sample dialects.

**Data.** New tables for usernames, dialects (+versions), extensions, libraries (+versions), core-inclusion requests, and generated doc renderings — all owner-scoped with public-read where visibility allows, plus grants. These are staged as an additive migration and take effect when this draft is accepted; the UI is built against them in the meantime.

**AI.** Two edge functions on the Lovable AI gateway: dialect drafting (strict structured output, validated before it reaches the editor) and documentation personalization (streamed, cached per dialect version). Published specs are data only — no user-supplied executable host code — so opening someone else's dialect stays safe.

## Rollout

1. Spec format, validator, canonicalizer + reverse, golden tests.
2. Signature block: write, hide, read, repair; IDE dialect switcher and retranslate-on-open.
3. Dialect Studio manual editor with live preview; usernames and share codes.
4. AI-assisted dialect drafting.
5. Extensions: authoring, visibility, prelude wiring, propose-for-core queue.
6. Library registry: publish, resolve, version pin, offline bundle export.
7. Documentation templating and per-dialect generation with staleness refresh.
