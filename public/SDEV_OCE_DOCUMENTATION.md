# OCE — Ontological Causal Engine in SDEV

A weightless, token-free learner written entirely in SDEV (`lang/stdlib/v2/oce.sdev`).
It has no weights, no gradients and no tokens. It watches a world, notices when its
predictions are wrong, and writes itself small causal laws to fix them.

The whole engine is **one 64 KB block of bytes**, laid out like the OCE paper:

| Address | Size | Contents |
|---|---|---|
| 0x0000–0x3FFF | 16 KB | header, fired-law table, I/O ring buffer |
| 0x4000–0xBFFF | 32 KB | up to 2,730 laws as packed 12-byte nodes |
| 0xC000–0xDFFF | 8 KB | world state: entities × 16 properties (int16) |
| 0xE000–0xF7FF | 6 KB | six 1 KB "imagination" sandboxes |
| 0xF800–0xFFFF | 2 KB | memory of the last 32 surprises |

## Quick start

```sdev
use "lang/stdlib/v2/list.sdev"
use "lang/stdlib/v2/bits.sdev"
use "lang/stdlib/v2/mem.sdev"
use "lang/stdlib/v2/oce.sdev"

set m to oce_create()
set _ to oce_medium(m, 3, 12)          # air density = 12
set stone to oce_entity(m)
set _ to oce_observe(m, rows)          # rows: one list of 8 numbers per entity
set _ to oce_intervene(m, stone, 0, 0) # do(stone.supported = 0)
# ...keep calling oce_observe each tick...
say oce_describe(m, names)
```

A full runnable example is `examples/oce/gravity.sdev`. It runs on the SDEV virtual
machine and as a native Linux program (`node scripts/sdev-native.mjs examples/oce/gravity.sdev -o gravity`),
and both print the same thing:

```
law 2 [confidence 20]: if supported == 0 then vel_z += -10
law 4 [confidence 30]: if always then pos_z += vel_z
model size: 60 bytes
```

## How it learns

1. **Predict.** Every law whose conditions hold is applied to a copy of the world (the sandbox).
2. **Compare.** Each observed property that differs from the prediction is a surprise.
3. **Repair**, choosing the smallest fix first:
   - **Operator 3 (new law):** nothing explained the change, so fit one. A link to another
     property (`pos_z += vel_z`) is preferred over a constant. If the law would be wrong for some
     entities, a condition is found that separates them (`if supported == 0`).
   - **Operator 1 (exception):** a law fired and was wrong. Instead of deleting it, an
     `unless` branch is added (`unless density < medium.density then vel_z += 4`).
   - **Operator 2 (hidden cause):** nothing visible tells the entities apart, so the engine invents
     a hidden property (`latent_1`) and marks which entities have it — this is how it discovers
     something like magnetism.
4. **Consolidate and prune.** Laws that predict correctly gain confidence (up to 255); laws at 0 are freed.

## Node format (12 bytes, little-endian)

`node_id u16 · opcode u8 · confidence u8 · source_a u16 · source_b u16 · target_out u16 · delta i16`

All 16 opcodes of the paper are named (`oce_op_name`). Laws are a `CAUSAL_IMPLIES` head pointing to
guard nodes (`PROP_EQ/GT/LT`, also `BIT_AND`, `LOGIC_XOR`) and one `MUTATE_ADD` node. SDEV's one
extension: `MUTATE_ADD` may add a second property (`source_b`), so one node can express kinematics.
`EXCEPTION_UNLESS`, `SPAWN_LATENT` and `EXT_QUERY_PTR` nodes are stored as the paper describes.

## Functions

| Function | What it does |
|---|---|
| `oce_create()` | new 64 KB engine |
| `oce_entity(m)` | add an entity, returns its id (max 32; id 0 is the medium) |
| `oce_medium(m, p, v)` | set a property of the medium (air, world constants) |
| `oce_observe(m, rows)` | one tick: compare, repair, consolidate, predict next; returns surprises |
| `oce_intervene(m, e, p, v)` | outside action do(e.p = v), never learned |
| `oce_imagine(m, e, p, v, ticks)` / `oce_imagined(m, e, p)` | "what if" in a sandbox, reality untouched |
| `oce_get(m, e, p)` / `oce_predicted(m, e, p)` | current and predicted values |
| `oce_describe(m, names)` | the learned laws in words |
| `oce_mdl_bits(m)` | model size in bits (live nodes × 96) |
| `oce_prune(m)` | free laws with confidence 0 |
| `oce_ext_create/store/query/load` | facts kept outside the arena (EXT_QUERY_PTR) |
| `oce_motifs(text, threshold)` / `oce_motif_expand(rules, sym)` | token-free byte-pattern folding |
| `oce_sequence_rule(xs)` / `oce_sequence_next(xs, rule)` | finds const / add / mul / Fibonacci generators |
| `oce_ca_rule(rows)` / `oce_ca_step(row, rule)` | rediscovers cellular automaton rules (e.g. Rule 110) |

## Supporting libraries

- **bits** — `bits_and`, `bits_or`, `bits_xor`, `bits_not_n`, `floor_div`, `floor_mod`, `wrap_u8`, `wrap_u16`, `wrap_i16`
- **mem** — `mem_arena`, `mem_put_u8/u16/i16`, `mem_get_u8/u16/i16`, `mem_copy`, `mem_fill`, `mem_equal`, `mem_clone`, `mem_hex`, `ring_create`, `ring_push`, `ring_get`, `ring_len`, `ring_pop_oldest`

## Limits (honest)

- Integer world only (int16 properties); up to 32 entities and 8 invented hidden properties.
- One condition per law and one level of exceptions.
- It is a working learner for small rule-based worlds, not the paper's claimed nanosecond speeds; those were not measured.
- These libraries are for SDEV v2 files (`to … with …`, `set … to …`). The v1 / `sdev:ai` runtimes cannot load them yet.

Tests: `node bin/sdevhost.mjs scripts/test-oce.sdev` (35 checks: memory layout, learning gravity,
buoyancy, a hidden magnetic property, counterfactuals, motifs, sequences, Rule 110).
