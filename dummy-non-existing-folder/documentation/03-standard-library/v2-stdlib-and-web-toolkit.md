# Self-Hosted v2 Standard Library & Website Building Toolkit

SDEV's modular v2 standard library (`lang/stdlib/v2/`) and website building toolkit (`lang/web/`) are authored **100% in pure SDEV** and compile directly through the self-hosted compiler onto the WebAssembly Seed VM and native x86-64 backend.

---

## 1. Using Libraries Anywhere (CLI, Native & Browser Website)

Import any shipped library with `use`:

```sdev
#!sdev v2
use "lang/stdlib/v2/list.sdev"
use "lang/stdlib/v2/oce.sdev"
```

- **Browser IDE (`src/lang-bridge/wasm-runtime.ts`):** `withStdlib()` lazily bundles every `lang/stdlib/**/*.sdev` file via Vite `import.meta.glob` and resolves transitive `use` dependencies on demand, so `use "lang/stdlib/v2/..."` works identically on the website and the CLI.
- **Zero-Host VM (`bin/sdev-vm`) & Native Driver (`bin/sdev-driver`):** Resolves `use` paths directly from disk.

---

## 2. Standard Library Modules (`lang/stdlib/v2/`) — 21 Modules

| Module | Purpose & Key Functions |
| --- | --- |
| `bits.sdev` | Bitwise logic & wrapping (`bits_and`, `bits_or`, `bits_xor`, `bits_not_n`, `bits_shl`, `bits_shr`, `bits_test`, `bits_popcount`, `bits_to_hex`, `bits_from_hex`, `floor_div`, `floor_mod`, `wrap_u8`, `wrap_u16`, `wrap_i16`). |
| `buffer.sdev` | Byte buffers, binary encoding, and low-level memory helpers. |
| `func.sdev` | Functional combinators: `take`, `drop`, `compose`, higher-order helpers. |
| `graphics.sdev` | Self-hosted 2D canvas command recorder & SVG emitter (`canvas_create`, `gfx_background`, `gfx_fill`, `gfx_stroke`, `gfx_rect`, `gfx_circle`, `gfx_line`, `gfx_text`, `gfx_to_svg`). |
| `json.sdev` | JSON serialization, string escaping, and parsing helpers. |
| `list.sdev` | Core list operations: `list_append`, `list_concat_two`, `list_map`, `list_filter`, `list_fold`, `list_sort`, slicing, searching. |
| `math.sdev` | Integer/float math utilities, `gcd`/`lcm`, primality checks, statistics, `clamp`. |
| `matrix.sdev` | 2D matrix algebra (`mat_from_flat`, `mat_eye`, `mat_mul`, `mat_transpose`, `mat_det`, `mat_trace`, `mat_dot`, `mat_get`). |
| `mem.sdev` | Byte arenas & ring buffers (`mem_arena`, `mem_put_u8/u16/i16`, `mem_get_u8/u16/i16`, `mem_copy`, `mem_fill`, `mem_equal`, `mem_clone`, `mem_hex`, `ring_create/push/get/len/pop_oldest`). |
| `oce.sdev` | Ontological Causal Engine (64 KB arena weightless learner — see [OCE Library Reference](../04-ai-and-causal-engine/oce-library-reference.md)). |
| `pyparity.sdev` | Pure-SDEV Python-parity collection & string algorithms (`py_*`). |
| `random.sdev` | Deterministic Linear Congruential PRNG helpers. |
| `regex.sdev` | Pure-SDEV regex & glob matcher (`re_test`, `re_search`, `glob_match`). |
| `sql.sdev` | Declarative relational engine over record lists (`sql_select`, `sql_where`, `sql_order_by`, `sql_limit`, `sql_distinct`, `sql_join`, `sql_group_by`, `sql_count/sum/avg/min/max`). |
| `text.sdev` | String operations, `str_eq`, padding, reversal, splitting, case folding, `text_starts_with`. |
| `time.sdev` | Calendar math, leap years, and duration formatting. |
| `tome.sdev` | Key-value tome (dictionary) helpers. |
| `turtle.sdev` | Self-hosted turtle vector graphics & SVG path emitter (`turtle_create`, `turtle_forward`, `turtle_right`, `turtle_to_svg`). |
| `types.sdev` | Runtime type checks, coercions, and null-coalescing (`types_coalesce`, `types_is_empty`). |
| `ui.sdev` | Declarative UI & reactive window tree builder (`ui_window`, `ui_column`, `ui_card`, `ui_input`, `ui_slider`, `ui_checkbox`, `ui_button`, `ui_get`, `ui_set`, `ui_to_html`). |
| `web.sdev` | Entry point importing the full Website Building Toolkit (`lang/web/*`). |

Plus `lang/stdlib/testkit.sdev` for pure-SDEV test suites (`check`, `str_same`, `first_diff`, `shell`, `tk_report`).

---

## 3. Self-Hosted Website Building Toolkit (`lang/web/`)

SDEV includes a complete web framework written in pure SDEV v2, capable of rendering the official SDEV website itself (`lang/web/sdev-website.sdev`) directly on the Seed VM:

| File | Role |
| --- | --- |
| `lang/web/html.sdev` | HTML5 & SVG document builder (`page`, `endpage`, `web_meta`, `open_header`/`end_header`, `open_main`/`end_main`, `open_section`/`end_section`, `h1`..`h6`, `p`, `div`, `span`, `a_html`, `ul_list`, `web_el`, `web_tag_emmet` Emmet syntax like `section.hero#intro`, `raw()`, safe HTML escaping). |
| `lang/web/css.sdev` | CSS3 engine supporting CSS custom properties (`css_vars`, `css_var`), camelCase-to-kebab-case property conversion, automatic `px` unit insertion, nested selectors (`style_nested(..., "&:hover", ...)`), responsive `@media` queries (`media_style`), and `@keyframes`. |
| `lang/web/components.sdev` | High-level interactive components & motion: `navbar`, `hero_section`, `stat_band`, `bento_grid`, `feature_card_html`, `code_card`, `markdown` renderer, `tabs_component`, `accordion`, `data_table`, `modal_dialog`, `route_view`, `compiler_scene_3d`, `sdev_playground`, `scroll_driver`, `scroll_reveal`, and `pointer_spotlight`. |
| `lang/web/icons.sdev` | Built-in vector SVG icon library (`inline_icon`, `web_icon_svg`). |
| `lang/web/themes.sdev` | Theme stylesheets (`theme("sdev-dark")`) and `$sdev` reactive client state helpers (`web_state_init`). |
| `lang/web/transpiler.sdev` | SDEV-to-JavaScript client transpiler (`client_fn`) compiling SDEV handlers (`forge`, `ponder`/`otherwise`, `state_get`/`state_set`, `dom_text`) into browser JavaScript embedded in the generated HTML document. |
| `lang/web/sdev-website.sdev` | Full official SDEV landing page authored 100% in SDEV and verified in CI (`npm run test:website`). |

### Example

```sdev
#!sdev v2
use "lang/stdlib/v2/web.sdev"

set _ to page("Hello Web")
set _ to theme("sdev-dark")
set _ to style(".hero", { backgroundColor: "#0f172a", padding: "32", borderRadius: "12" })
set _ to open_main({ id: "main" })
set _ to web_emit(web_tag_emmet("section.hero#intro", "Built in pure SDEV", {}))
set _ to markdown("## Features\n- **Self-hosted**\n- Zero external bundler")
set _ to end_main()
set html to endpage()
say html
```

### Verification

```bash
npm run test:self-stdlib    # All v2 stdlib modules on Seed VM
npm run test:self-web       # Self-hosted web toolkit suite (11 checks)
npm run test:website        # Renders lang/web/sdev-website.sdev on Seed VM
npm run test:web            # Web toolkit TS & Python parity suite (51 cases)
```
