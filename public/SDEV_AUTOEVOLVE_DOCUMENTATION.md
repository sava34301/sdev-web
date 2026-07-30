# SDEV Autonomous Evolution (Milestone 12)

The final piece of the ML stack: a loop that lets an sdev-trained
model read demand signals, patch sdev's own source, and fine-tune
itself on fresh teacher data — all written in sdev, all gated
behind a single review hook.

Lives in `lang/stdlib/ml/auto_evolve.sdev`.

## Safety model

Nothing writes to disk until you install a review hook:

```sdev
link "stdlib/ml/self_modify.sdev"
set_review_hook(conjure(path, body) ::
    yield confirm("Apply " + path + "?")
;;)
```

Without a hook, `apply_proposal(...)` silently returns `nope`.
Even with a hook, only files in `SDEV_SOURCE_FILES` are eligible —
`is_allowed(path)` rejects anything else before the hook ever sees it.

## API

| Function | Purpose |
| --- | --- |
| `is_allowed(path)` | Whitelist check. |
| `make_proposal(path, old, new_body, reason)` | Build a patch record; fields are `path`, `old`, `updated`, `reason`, `applied`. |
| `apply_proposal(p)` | Route through the review hook and write. |
| `draft_from_demand(model, demand, path)` | Ask the model to rewrite a file toward the top demand topic. |
| `evolve_weights(model, url, key, prompts, epochs, lr)` | Distill a teacher model and SGD-step on the pairs. |
| `evolve_tick(model, sources, url, key)` | One full loop: mine → draft → apply → train. |
| `evolve_forever(model, sources, url, key, ticks)` | Long-running driver. |

## Example

```sdev
link "stdlib/ml/auto_evolve.sdev"
link "stdlib/ml/transformer.sdev"

forge model be gpt(256, 64, 128, 2)
forge sources be [
    "https://api.github.com/repos/rust-lang/rust/issues",
    "https://www.reddit.com/r/programminglanguages/top.json"
]

set_review_hook(conjure(path, body) :: yield yep ;;)

evolve_forever(
    model, sources,
    "https://ai.gateway.lovable.dev/v1/chat",
    "$LOVABLE_API_KEY",
    24
)
```

## Routing rules

`pick_target` picks the file to patch based on top-topic keywords:

- `parse*` → `lang/compiler/parser.sdev`
- `lex*` → `lang/compiler/lexer.sdev`
- `doc*` → `public/SDEV_DOCUMENTATION.md`
- everything else → `lang/stdlib/ml/nn.sdev`

Extend `SDEV_SOURCE_FILES` and `pick_target` to widen or narrow
what the loop is allowed to touch.
