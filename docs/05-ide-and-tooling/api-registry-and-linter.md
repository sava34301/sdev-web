# Canonical API Registry, Static Linter & Formatter

SDEV provides a single machine-checked catalogue of every built-in function, target compatibility matrix, static diagnostic rule, quick-fix suggestion, and formal code formatter across the Web IDE and CLI.

---

## 1. Canonical API Registry (`src/lang/registry/api-registry.ts`, `lang/registry/registry.sdev`)

- **Coverage:** **881 canonical API entries** across **16 modules** (`core`, `text`, `list`, `tome`, `math`, `matrix`, `graphics`, `turtle`, `ui`, `web`, `leaflet`, `kernel`, `hardware`, `ml`, `ffi`, `webgpu`).
- **Execution Targets (`ApiTarget`):** `v1`, `v2-wasm`, `native-x64`, `browser`, `cli`, `hardware`.
- **Metadata per Entry:** `name`, `aliases`, `module`, `signature`, `params`, `returns`, `description`, `example`, `sinceVersion`, optional `deprecated`, `targets`, and `status` (`implemented` | `partial` | `planned`).
- **Typo & Alias Suggestions:** `suggestNearestApis()` uses Damerau-Levenshtein distance (powered by `lang/registry/registry.sdev` and `lang/linter/linter.sdev`) plus `COMMON_API_ALIASES` so foreign idioms like `println`, `console.log`, `len`, `filter`, `reduce`, or `fillrect` immediately suggest `speak`, `measure`, `sift`, `fold`, or `rect`.

### Where to Access It

- **Web IDE:** Open **Runtime & API Explorer** from the Activity Bar, or press **`F1`** on any identifier under the cursor to jump directly to its documentation and target matrix.
- **CLI:**
  ```bash
  sdev api filter --module list --target v1
  sdev explain SDEV006
  ```

---

## 2. Target-Aware Static Linter (`src/lang/linter.ts`, `lang/linter/linter.sdev`)

Runs live in the IDE **Problems** panel and via `sdev lint <file> --target <target>` without executing user code. It strips `board "<id>"` blocks using `stripBoardBlocks` (so firmware blocks are never misparsed as SDEV), handles `!#ai` files via `aiToSdev`, and verifies block balance via `sdevCheckBlocks`.

### Complete Diagnostic Catalogue (`SDEV001`–`SDEV015`)

| Code | Title | What It Catches |
| --- | --- | --- |
| `SDEV001` | Unbalanced or unclosed block delimiter | Missing `;;`, `end`, or `}` delimiters. |
| `SDEV002` | Syntax or parser error | Lexer or parser syntax failures with line/column locations. |
| `SDEV003` | Division or modulo by zero | Constant `/ 0` or `% 0` expressions. |
| `SDEV004` | Unreachable code after terminator | Statements following `yield`/`return`, `yeet`/`break`, `skip`/`continue`, or `hurl`/`throw`. |
| `SDEV005` | Unused variable declaration | Declared `forge`/`let`/`set` bindings never referenced in scope. |
| `SDEV006` | Unknown function or builtin call | Calls not matching any declared function or registry API, paired with `"Did you mean '...'?"` + one-click `LintQuickFix`. |
| `SDEV007` | Target capability mismatch | Calling target-restricted APIs (e.g. `window()` or `canvas()` when targeting `native-x64`). |
| `SDEV008` | Deprecated builtin or legacy alias | Legacy aliases (e.g. `println`) with replacement suggestions. |
| `SDEV009` | Assignment syntax mismatch | Writing `forge x = 10` instead of `forge x be 10` in classic v1 mode. |
| `SDEV010` | Foreign declaration keyword | Accidental JavaScript/TypeScript `function`, `const`, or `var` declarations. |
| `SDEV011` | Builtin argument count (arity) mismatch | Calling core builtins (such as `sqrt`, `measure`, `rect`, `fold`) with too few or too many arguments. |
| `SDEV012` | Declaration shadows a core builtin | Redefining protected builtins like `speak`, `say`, `measure`, `gather`, `sift`, `each`, `fold`. |
| `SDEV013` | Constant condition in conditional or loop | Always-true/always-false conditions such as `ponder yep` or `cycle false`. |
| `SDEV014` | Self-assignment, immutability or tautology | Reassigning `fixed` bindings, self-assignments (`a be a`), or tautological comparisons (`x equals x`). |
| `SDEV015` | Planned or experimental API call | Calling an API marked `planned` (such as `map_view`) so authors know its current implementation status. |

---

## 3. Formal Code Formatter (`lang/formatter/formatter.sdev`, `src/components/ide/formatSdev.ts`)

- Supports configurable indentation (2 or 4 spaces; 2/4/8 in IDE settings).
- Handles both v1 (`::` / `;;`) and v2 (`to`, `if`, `else`, `while`, `for each`, `kind`, `match`, `end`) block delimiters while leaving colons inside string literals and comments untouched.
- Guaranteed idempotent across formatting passes.
- Available in IDE (**Edit → Format Document**), CLI (`sdev fmt <file> -w`), and verified by `npm run test:formatter` and `npm run test:formatter-ts`.

### Verification

```bash
npm run test:registry      # Verifies 881 APIs, Damerau-Levenshtein suggestions, SDEV001..SDEV015, quick-fixes, Studio (93 checks)
npm run test:formatter     # Pure-SDEV formal formatter test suite (8 cases)
npm run test:formatter-ts  # TypeScript formatter test suite
```
