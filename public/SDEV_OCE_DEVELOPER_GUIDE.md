# OCE Developer Guide — Building with the Causal Engine

This guide takes you from your first program to adding new features to the engine itself.
For the full list of functions, see **OCE — Causal Engine Library** on the Docs page.

---

## 1. What the engine does

The engine watches a small world one step ("tick") at a time and learns the **laws** that explain how it changes.

1. You describe the world as **entities**, each with **8 numbers** called properties.
2. Each tick, you pass the world to `oce_observe`.
3. The engine compares what happened with what it predicted. Every difference is a **surprise**.
4. For each surprise, it writes or fixes a law. When the surprises reach 0, it understands your world.

After that you can ask it to **predict** the next tick, or to **imagine** a "what if" without touching the real world.

There are no weights, no training data files and no AI model. Everything lives in one 64 KB block of memory.

---

## 2. Where it runs

| You write | Setup line | Runs on |
|---|---|---|
| SDEV v2 (`set … to`, `to f with …`) | `#!sdev v2`, then `use "lang/stdlib/v2/oce.sdev"` on its own line | website, `sdevhost` command-line tool, native Linux |
| Classic SDEV (`forge … be`) | none, it's built in | website, Python version |
| `!#ai` files | none, it's built in | website |

All three give exactly the same answers.

**Running a file:**
- **Website:** paste the full example into the IDE and press Run. Keep `#!sdev v2` as the first line of v2 examples so the IDE selects the right runtime.
- **Command line (v2):** `node bin/sdevhost.mjs my-world.sdev`
- **Python (classic):** `python3 public/sdev-interpreter.py my-world.sdev`
- **Native Linux program (v2):** `node scripts/sdev-native.mjs my-world.sdev -o my-world`, then `./my-world`

---

## 3. Your first world: a lamp

The lamp gets 5 brighter each tick, but only while its switch is on. The engine is never told this rule; it works it out by watching.

The file is `examples/oce/lamp.sdev` (classic version: `examples/oce/lamp-classic.sdev`).

```sdev
#!sdev v2
use "lang/stdlib/v2/oce.sdev"

set m to oce_create()
set names to ["switch", "brightness", "p2", "p3", "p4", "p5", "p6", "p7"]
set lamp to oce_entity(m)
set w to [[0, 0, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0]]

set _ to oce_observe(m, w)
set t to 0
while t < 8
  set row to w[1]
  if row[0] is 1
    set row[1] to row[1] + 5
  end
  if t is 4
    set row[0] to 0
    set _ to oce_intervene(m, lamp, 0, 0)
  end
  set surprises to oce_observe(m, w)
  say "tick " + str(t) + ": surprises " + str(surprises)
  set t to t + 1
end
say oce_describe(m, names)
say "predicted brightness next tick: " + str(oce_predicted(m, lamp, 1))
set _ to oce_imagine(m, lamp, 0, 1, 3)
say "if switched on for 3 ticks: " + str(oce_imagined(m, lamp, 1))
say "real brightness unchanged: " + str(oce_get(m, lamp, 1))
```

Output (the same in every runtime):

```
tick 0: surprises 1
tick 1: surprises 0
...
tick 5: surprises 1
tick 6: surprises 0
tick 7: surprises 0
law 1 [confidence 13]: if always then brightness += 5
  unless switch == 0 then brightness += 0

predicted brightness next tick: 25
if switched on for 3 ticks: 40
real brightness unchanged: 25
```

### What each part does

| Line | Meaning |
|---|---|
| `oce_create()` | A new, empty engine. |
| `names` | Names for the 8 properties, used only when describing laws. |
| `oce_entity(m)` | Adds an entity and returns its number. The first one you add is `1`. |
| `w` | The world: **one row per entity, starting with the medium** (row 0). Every row has exactly 8 numbers. |
| `oce_observe(m, w)` | One tick: check, learn, then predict the next tick. Returns the number of surprises. |
| `oce_intervene(m, lamp, 0, 0)` | Tells the engine **you** turned the switch off, so it won't try to explain that change with a law. |
| `oce_describe` | The learned laws, written in words. |
| `oce_imagine(m, e, p, v, ticks)` | "What if property `p` of `e` were `v`, for `ticks` steps?" It runs in a copy, so the real world doesn't change. |
| `oce_imagined(m, e, p)` | Reads the result of the last imagined run. |

At tick 5 there is 1 surprise: the brightness stopped growing. The engine doesn't delete the law. It adds an **exception** ("unless switch == 0").

---

## 4. Designing your own world

### 4.1 The world table
- **Row 0 is the medium:** air, the room, world constants. Set its values with `oce_medium(m, property, value)`.
- **Rows 1 and up** are your entities, in the order you created them.
- **Properties 0–7** are yours. Properties 8–15 are reserved for hidden causes the engine invents.
- **Values are whole numbers** from −32768 to 32767. Multiply by 10 or 100 to work with decimals (store 1.5 m as 150 cm).

### 4.2 The tick loop
Always use this order:

1. Change the world with your own rules (the "physics").
2. If **you** changed something by hand, also call `oce_intervene` for it.
3. Call `oce_observe(m, w)`.

Before the loop, call `oce_observe` once so the engine sees the starting state.

### 4.3 Checking it has learned
- **Surprises stay at 0** for several ticks.
- **`oce_describe`** reads like your rule.
- **`oce_predicted(m, e, p)`** matches what really happens on the next tick.

### 4.4 Rules it can learn

| Your world does | Learned law looks like |
|---|---|
| A constant change | `if always then x += 3` |
| One property drives another | `if always then pos += vel` |
| A change only in some cases | `if supported == 0 then vel += -10` |
| A comparison with the medium | `if density < medium.density then …` |
| An exception to a rule | `… unless switch == 0 then …` |
| A cause you can't see | a hidden property `latent_1`, set only on the entities it affects |

Each law has one condition, and exceptions go one level deep. If your rule needs two conditions, split it into two properties, or add a property that holds the combined condition.

---

## 5. Recipes

### Learn number patterns
Run this recipe and the ones below inside a v2 file with the two setup lines above.

```sdev
set rule to oce_sequence_rule([3, 7, 11, 15])
say rule[0]                                      # add
say oce_sequence_next([3, 7, 11, 15], rule)      # 19
```
It finds constant, add, multiply and Fibonacci patterns. If it finds none, `rule[0]` is `"none"`.

### Rediscover a cellular automaton rule
Give it rows of 0/1 cells, one row per generation:
```sdev
set n to oce_ca_rule(rows)        # e.g. 110
set next to oce_ca_step(rows[length(rows) - 1], n)
```

### Fold repeated text, without tokens
```sdev
set fold to oce_motifs("abcabcabcabc", 2)   # fold[0] = short sequence, fold[1] = rules
say oce_motif_expand(fold[1], fold[0][0])
```

### Keep facts outside the engine
For facts too big for the 64 KB block:
```sdev
set ext to oce_ext_create()
set _ to oce_ext_store(ext, 3, 74, 5555)          # sector 3, offset 74
say oce_ext_query(ext, 3, 74, 0)                  # 5555 (0 if missing)
set _ to oce_ext_load(m, ext, 3, 74, lamp, 2)     # copy it into lamp's property 2
```

### Measure the model
- `oce_mdl_bits(m)`: model size in bits (`floor_div(…, 8)` gives bytes).
- `oce_prune(m)`: frees laws whose confidence has dropped to 0.

---

## 6. Working with memory directly

The bits and memory helpers are useful on their own, for example for file formats, network packets or emulators.

```sdev
set buf to mem_arena(16)
set _ to mem_put_u16(buf, 0, 513)
say mem_get_u8(buf, 0)            # 1 (little-endian)
say mem_hex(buf, 0, 4)

set r to ring_create(3)           # keeps the newest 3 items
set _ to ring_push(r, 10)
say ring_len(r)
```

Bit helpers: `bits_and`, `bits_or`, `bits_xor`, `bits_not_n`, `bits_shl`, `bits_shr`, `bits_test`, `bits_popcount`, plus `wrap_u8`, `wrap_u16` and `wrap_i16` to keep numbers in range.

---

## 7. Developing the engine itself

### Where the code lives
| File | Role |
|---|---|
| `lang/stdlib/v2/oce.sdev` | **The engine**, written in SDEV v2. Start here. |
| `lang/stdlib/v2/bits.sdev`, `mem.sdev`, `list.sdev` | Helpers it is built on. |
| `src/lang/builtins/oce.ts` | Line-for-line copy for classic SDEV on the website. |
| `public/sdev-interpreter.py` | The same copy for the Python version. Keep `extension/interpreter/sdev-interpreter.py` identical. |
| `scripts/test-oce.sdev` | The engine's 35 checks (v2). |
| `scripts/test-oce-classic.sdev` | The same checks in classic syntax. |
| `scripts/test-oce-parity.ts` | Runs the checks everywhere and requires identical output. |

### The golden rule
Any change to the engine must be made in **all three places** (`oce.sdev`, `oce.ts`, the Python file), and the three must stay identical in behaviour. The parity test will fail if they differ.

### Memory map (where things are stored)
| Address | Contents |
|---|---|
| 0x0000–0x3FFF | header, fired-law table, input/output ring |
| 0x4000–0xBFFF | laws: up to 2,730 nodes of 12 bytes |
| 0xC000–0xDFFF | world: entities × 16 properties (int16) |
| 0xE000–0xF7FF | six 1 KB "imagination" copies |
| 0xF800–0xFFFF | the last 32 surprises |

Node layout: `id u16 · opcode u8 · confidence u8 · a u16 · b u16 · out u16 · delta i16`.
To look at nodes, use `oce_node_count(m)`, `oce_n_op/conf/a/b/out/delta(m, i)` and `oce_op_name(op)`.

### Adding a feature: step by step
1. **Write a failing check** in `scripts/test-oce.sdev` (for example: "learns `x += y - 1`").
2. **Implement it** in `lang/stdlib/v2/oce.sdev`. Use `list_append` / `list_concat_two`; v2 lists don't grow with `+` on variables.
3. **Run it:** `npm run test:oce`.
4. **Port it** to `src/lang/builtins/oce.ts` and `public/sdev-interpreter.py`, line for line, and copy the Python file to `extension/interpreter/`.
5. **Add the same check** to `scripts/test-oce-classic.sdev`.
6. **Run everything:**
   ```
   npm run test:oce
   npm run test:oce-parity
   npm run test:v2-diagnostics
   npm test
   ```
7. **Update** the function table in `SDEV_OCE_DOCUMENTATION.md`.

### Good first features to build
- Laws with **two conditions** (a chain of guard nodes; the format already supports it).
- **Multiplying** mutations (`vel *= 2`), using a new opcode.
- Saving and loading a trained engine to a file (`mem_hex` gives you a start).
- More than 32 entities (needs larger imagination slots).

---

## 8. Common mistakes

| Problem | Fix |
|---|---|
| `unknown function: oce_create` (v2) | Add `use "lang/stdlib/v2/oce.sdev"` at the top. |
| Surprises never reach 0 | Your rule needs two conditions or uses decimals. Split it, or scale the values to whole numbers. |
| It learned your hand-made change as a law | Call `oce_intervene` whenever **you** change something. |
| Wrong entity numbers | Row 0 is the medium. The first `oce_entity` returns 1. |
| A row has fewer than 8 numbers | Always give 8. Fill unused properties with 0. |
| `!#ai` file fails in Python | The Python version doesn't read `!#ai` yet. Use classic syntax there. |

---

## 9. Limits

- Whole numbers only (int16), up to 32 entities and 8 invented hidden properties.
- One condition per law and one level of exceptions.
- This is a working learner for small rule-based worlds. The research paper's speed claims have not been measured.
