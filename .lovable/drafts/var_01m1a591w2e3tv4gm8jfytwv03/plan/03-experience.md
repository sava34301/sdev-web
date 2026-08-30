## The dialect spec

A dialect is one versioned JSON document with four parts:

- `names` — for every canonical token and builtin, the dialect's word plus optional synonyms. Seeded from the existing central keyword table, so nothing is hand-listed twice. Mixed languages are fine: keep `if` English, make loops Bulgarian.
- `style` — block terminator, comment marker, string quotes, assignment form, argument separator, casing rule.
- `constructs` — user-added functions and operators. An operator declares its symbol, precedence and the sdev function it desugars to; the function bodies are ordinary sdev source bundled with the dialect.
- `meta` — display name, language tags, base dialect it extends, version, visibility.

Validation runs on save and blocks collisions: two tokens with the same word, a word that collides with a style token, an operator symbol that overlaps an existing one, or a construct whose sdev body fails to compile against the canonical toolchain. A dialect that fails validation can be saved as a draft but not published.

Dialects can extend another dialect, so a community base ("SDEV in Spanish") can be forked and personalized without recopying 200 keywords.

## Building it: manual and assisted

**Manual** — a full-width table of every command grouped as declarations, control flow, errors, objects, modules, builtins. Each row shows the canonical word, its description, and an editable field for your word. Live preview pane rewrites a sample program as you type. Style options sit in a side panel with the same live preview.

**Assisted** — a chat panel backed by an edge function on the Lovable AI gateway. You describe the language you want; the model returns a complete spec as strict structured output, which is validated and then loaded into the same editable table. You can also ask for narrower help: "give me Japanese words for the error keywords", "suggest a terser block style". The AI never writes to the dialect directly — it proposes, you accept.

## Sharing and identity

Each account reserves a unique **username**. A dialect is addressable three ways: `@sava/bulgarski` (human), a random 8-character code (paste-friendly), and its internal id. Libraries and extensions use the same `@user/name` scheme with semantic versions.

In the IDE, a "Dialect" control in the status bar lets you pick your own dialect, a recently used one, or paste a code to fetch someone else's. Opening a file written in a dialect you don't have offers: install it, or read it translated into your current dialect.

## Extensions and libraries

An **extension** is a function or operator you add to the language itself, written in sdev. Private by default; publishing makes it importable by anyone; a "propose for core" button files a request with your code, rationale and tests into a review queue visible in your account.

A **library** is a versioned bundle of sdev modules plus a manifest. Published libraries resolve through `use "@user/lib@1.2.0"`, are cached locally, and can be exported as a single offline bundle that the native CLI and desktop IDE resolve from disk.

## Living documentation

The Ultimate Documentation becomes the canonical template: prose with token placeholders instead of hardcoded keywords. Rendering a dialect's docs substitutes that dialect's words and style, then an AI pass rewrites examples and prose into the dialect's language and tone — cached, not regenerated per view. Every generated doc records the template version it came from; when the canonical docs change, affected dialect docs are marked stale and regenerated in the background, with a visible "updated from core vN" note.
