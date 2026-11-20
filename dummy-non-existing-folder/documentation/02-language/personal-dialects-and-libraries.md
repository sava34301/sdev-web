# Personal SDEV — Dialects, Extensions, File Signatures & Library Registry

Personal SDEV lets anyone write SDEV in their own words, script family, operators, and custom functions without modifying or forking the self-hosted compiler. **A dialect is data, not a compiler fork** — a reversible canonicalizer sits in front of `lexer.sdev` / `parser.sdev` / `codegen.sdev`.

```text
dialect source ──canonicalize──▶ canonical sdev v2 ──▶ lexer ▶ parser ▶ codegen ▶ seed VM / native
       ▲                                  │
       └──────────── dialectize ──────────┘   (lossless reverse)
```

---

## 1. Custom Dialects & Dialect Studio (`/dialects`)

- **Source Modules:** `src/lang/dialect/spec.ts`, `catalog.ts`, `canonicalize.ts`, `presets.ts`, `docs.ts`, and pure-SDEV engine `lang/dialect/dialect.sdev`.
- **Web UI:** Open `/dialects` (or the **Personal sdev** sidebar panel in `/ide`) to create, edit, validate, preview, and publish dialects.

A `DialectSpec` contains four parts:

| Part | Contents |
| --- | --- |
| `meta` | `slug`, `name`, `version`, `languages`, `visibility` (`private` \| `unlisted` \| `public`), optional `extends` inheritance |
| `names` / `synonyms` | Canonical word → your dialect's word(s) across any script (Latin, Cyrillic, Greek, CJK, Arabic, etc.) |
| `style` | Block style (`word` for `end`, or `braces` for `{` / `}`), comment marker (`#` or `//`), string quote, assignment style (`set-to`, `equals`, `arrow`) |
| `constructs` | Custom sdev helper functions (`preludeSource`) and infix operator mappings (`symbol` → `fn`) |

### Ready-Made Presets

- **`sdev-bg` ("Сдев"):** Built-in Bulgarian dialect preset (`src/lang/dialect/presets.ts`) mapping keywords word-for-word into Bulgarian (`задай ... на`, `кажи`, `ако`, `докато`, `за всяко ... в`, `върни`, `край`) along with a `сбор` prelude function and runnable Bulgarian sample.

### Validation & Lossless Round-Tripping

- `validateDialect(spec)` detects collisions, duplicate names, illegal operator symbols, and reserved-word clashes; `isPublishable` requires zero validation errors.
- `canonicalize(src, dialect)` masks string literals and comments, maps identifier-position words, desugars infix dialect operators (`a <sym> b` → `fn(a, b)` up to 8 chained passes), normalizes block/assignment styles, and prepends the dialect prelude.
- `dialectize(canonicalSrc, dialect)` runs the pipeline in reverse, and `translateDialect(src, from, to)` translates cleanly between any two dialects.

### Living Dialect Documentation

`src/lang/dialect/docs.ts` (`generateDialectDocs` / `getOrGenerateDocs`) renders per-dialect reference documentation straight from `CATALOG`, passes the sample program through `dialectize`, and appends the dialect's custom functions and operators. Cached rows in `dialect_docs` track `TEMPLATE_VERSION` and automatically regenerate when stale.

---

## 2. Invisible File Signatures (`#⟨sdev⟩`)

Implemented in `src/lang/dialect/signature.ts` (delegating hashing and parsing to `lang/dialect/dialect.sdev`):

```text
#⟨sdev⟩ <base64url JSON payload>
```

The leading marker line is treated as a standard comment by the lexer and hidden by the IDE editor. Its payload stores:

| Field | Meaning |
| --- | --- |
| `v` | Signature format version (`1`) |
| `rt` | Target runtime (`"v1"` or `"v2"`) |
| `dialect` | Dialect address (e.g. `"@sava/sdev-bg"`), or `null` for canonical SDEV |
| `dialectVersion` | Version string of the dialect used when written |
| `libs` | Pinned library references scraped from `use "@user/lib"` lines |
| `origin` | Original dialect slug if translated |
| `translated` | Cached canonical SDEV translation produced by the understander / human-language translator |
| `sum` | FNV-1a checksum of the file body (`isSignatureStale` / `repairSignature`) |
| `ts` | Last write timestamp (epoch ms) |

### Embedded Translation Persistence

- When a file is understood or translated in the IDE, `IdeFile.understood` and `FileSignature.translated` carry the canonical SDEV translation alongside the author's original file.
- Opening a signed `.sdev` file restores its cached translation automatically, enabling instant preview (**Eye** toggle), **Re-understand**, and downloading either the **User-written version (`.sdev`)** or the **Translated version (`.translated.sdev`)**.
- Inspect signature metadata in the IDE via **FileInfoPopover** or in the terminal via `sdev info <file>` and `sdev sign show|stamp|verify|strip <file>`.

---

## 3. Language Extensions (`/extensions`)

Implemented in `src/lang/dialect/extensions.ts` and `/extensions`:

- Extensions let authors define reusable SDEV functions (`kind: 'function'`) or custom infix operators (`kind: 'operator'`) without modifying core compiler files.
- Enabled extensions are cached in `localStorage` (and `~/.sdev/store.json` on the CLI) for offline execution and injected ahead of user code via `applyExtensions(source)`.
- Authors can submit extensions for inclusion in core SDEV via **Propose for core** (persisted in `core_requests` for review).

---

## 4. Library Registry (`/libraries`)

Implemented in `src/lang/dialect/registry.ts`, `address.ts`, and `/libraries`:

- Import community packages directly in SDEV v2 using `@username/slug` or pinned versions:

```sdev
#!sdev v2
use "@sava/matrixkit@1.2.0"
```

- `resolveLibraries(source)` parses `@user/slug[@version]` addresses, resolves owner handles via `usernames` and version bundles in `library_versions`, caches bundles locally for offline execution, and feeds them into the same module map used by local `use "..."` imports.
- Bundles can be exported and imported offline as `.bundle.json` files (`exportOfflineBundle` / `importOfflineBundle` in the UI, or `sdev lib export` / `sdev lib import` in the CLI).

---

## 5. Community Discovery & Management (`/explore`, `/my`, `/g/:slug`)

| Route | Purpose |
| --- | --- |
| `/explore` | Public shelf of shared dialects, extensions, and public programs (Gists) with search and one-click install/copy. |
| `/my` | Personal dashboard consolidating your dialects, extensions, cloud files, and shared programs. |
| `/g/:slug` | Shareable Gist viewer where anyone can read and run shared SDEV programs in the browser. |
| `/account` | Manage profile username (`@handle`), cloud files, gists, and run history. |
