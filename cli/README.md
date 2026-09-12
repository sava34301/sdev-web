# The `sdev` command line

One binary with everything the web IDE can do.

```
npm run cli:build      # -> bin/sdev.mjs (+ sdev-seed.wasm, runtime.s)
node bin/sdev.mjs help
```

Install it on your PATH:

```
ln -s "$PWD/bin/sdev.mjs" /usr/local/bin/sdev
```

## What it shares with the IDE

The CLI imports the *same* modules the browser runs — dialects, extensions,
the library registry, the file signature, the v1 interpreter and the
self-hosted v2 toolchain. `cli/env.ts` supplies the browser pieces those
modules expect:

- `localStorage` backed by `~/.sdev/store.json` (override with `SDEV_HOME`),
  so dialects, enabled extensions, cached libraries and your login survive
  between runs and match what the IDE stores.
- Keys in the `sdev:file:` namespace map to **real files**, so `read_file` /
  `write_file` do actual disk I/O under Node.
- `fetch("/wasm/sdev-seed.wasm")` reads the seed VM from disk
  (`SDEV_SEED_WASM` overrides the location).

## Pipeline

Every command that touches source runs the same steps as the IDE:

```
file -> strip signature -> canonicalize through the active dialect
     -> apply enabled extensions -> resolve `use` modules and libraries
     -> v1 interpreter | v2 self-hosted compiler + seed VM
```

Runtime selection: `--runtime`, then a `#!sdev v2` shebang, then the file's
signature, then the stored default (`sdev runtime v2`).

## Commands

Running: `run`, `repl`, `watch`, `check`, `ast`, `fmt`
Building: `compile`, `run-bc`, `disasm`, `native`
Files: `info`, `sign show|stamp|verify|strip`
Dialects: `dialect list|new|set|use|show|validate|docs|words|canon|surface|xlate|prelude|extend|install|publish|export|import|remove`
Extensions: `ext list|enable|disable|add|sync|prelude`
Libraries: `lib list|add|remove|pins|export|import`
Cloud: `auth login|signup|code|token|reset|refresh|status|whoami|logout`, `cloud list|pull|push`
Settings: `runtime`, `languages`, `translate`, `home`, `version`

## Signing in

A terminal has no browser, so the CLI keeps its own session in
`~/.sdev/session.json` (owner-readable only) and refreshes it automatically
before every cloud command.

```
sdev auth login you@example.com          # password, typed masked
sdev auth login you@example.com --password "$PW"   # or $SDEV_PASSWORD
sdev auth code you@example.com           # emails a one-time code
sdev auth code you@example.com 123456    # …then verify it
sdev auth signup you@example.com
sdev auth reset you@example.com
sdev auth token <access> <refresh>       # paste a pair from the website
sdev auth status                         # who you are + where the session lives
```

Accounts created with Google have no password: use `sdev auth code`.

## The terminal editor

```
sdev edit hello.sdev        # alias: sdev ide hello.sdev
```

Syntax colouring, line numbers, and the status bar shows the runtime and the
active dialect. `Ctrl+S` save, `Ctrl+R` save and run through the full
pipeline, `Ctrl+F` find, `Ctrl+G` go to line, `Ctrl+K` cut line, `Ctrl+L`
format, `Ctrl+Q` quit (asks once when there are unsaved changes).
