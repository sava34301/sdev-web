# SDEV / Python Absolute Parity

Goal: SDEV gains an equivalent for every feature of modern Python (3.13-era), with SDEV-native syntax, dual naming (v1 mystical alias + v2 plain word), full spec documentation with Python-vs-SDEV side-by-side examples, and parity tracking per runtime track.

Approach agreed: spec and implementation together in this pass, then leftover gaps become follow-up milestones.

## Naming convention

Every new feature ships two spellings that parse identically:

- v1 flavour: `forge`, `conjure`, `ponder`, `summon`, `etch`, `weave`, `bind`, `guard`
- v2 flavour: `let`, `fn`, `if`, `import`, `concat`, `with`, `as`, `assert`

The lexer keeps one canonical token per feature and a synonym table maps both spellings to it, so old code keeps running and new code can use either. New keywords are only recognised in keyword position, so existing identifiers never break.

## Feature catalogue (what gets designed and documented)

Grouped exactly as the documentation will be:

1. Lexical and literals - f-strings/interpolation, raw/byte strings, triple-quoted text, numeric separators, complex numbers, ellipsis, walrus binding.
2. Core statements - assignment forms, augmented assignment, chained comparison, conditional expression, `del`, `global`/`nonlocal`, `pass`, `assert`.
3. Functions - defaults, keyword-only and positional-only params, `*args`/`**kwargs` (SDEV: `rest` / `named`), unpacking at call sites, closures, recursion, lambdas.
4. Decorators - function decorators, decorators with arguments, class decorators, stacking, `functools.wraps` equivalent.
5. Generators and iterators - `yield`, `yield from`, generator expressions, the iterator protocol, `next`/`send`/`throw`/`close`, infinite streams.
6. Comprehensions - list, dict, set, nested, conditional, generator form.
7. Pattern matching - `match`/`case` with literal, sequence, mapping, class, capture, guard, or-patterns and wildcard.
8. Context managers - `with`, multiple managers, `enter`/`exit` protocol, async context managers, contextlib-style helpers.
9. Object model - classes, inheritance, multiple inheritance and MRO, `super`, properties/setters, class and static methods, slots, metaclasses, abstract base classes, dataclass equivalent, enums.
10. Dunder/protocol methods - the complete set (construction, representation, comparison, arithmetic and reflected/in-place arithmetic, container, attribute access, callable, iteration, context, copy, pickling, numeric coercion, hashing, buffer). Each mapped to an SDEV protocol slot name.
11. Errors - exception hierarchy, `try/except/else/finally`, custom exceptions, chaining (`raise from`), exception groups and `except*`, tracebacks, warnings.
12. Concurrency - `async def`/`await`, event loop, tasks and gather, async iterators and generators, threads, processes, locks/queues, `asyncio` equivalents.
13. Typing - annotations, generics, unions, optionals, protocols, type aliases, `TypeVar`, literal and final types, runtime introspection.
14. Modules and packages - import forms, aliasing, relative imports, `__init__` equivalent, namespace packages, dynamic import, module attributes.
15. Built-in functions - the full builtins list mapped one-to-one.
16. Built-in types and their methods - str, bytes, list, tuple, dict, set, frozenset, int, float, complex, bool, range, slice, memoryview - every method.
17. Standard library surface - the module map (os, sys, io, pathlib, json, re, math, random, datetime, itertools, functools, collections, dataclasses, typing, subprocess, socket, http, sqlite3, csv, hashlib, statistics, and the rest), each with SDEV module name and function mapping.
18. Runtime and tooling - REPL semantics, `__main__`, argv, exit codes, garbage collection, introspection (`dir`, `id`, `vars`), eval/exec equivalents.

## Documentation deliverable

New file `public/SDEV_PYTHON_PARITY_DOCUMENTATION.md`, structured as:

- Overview, design rules, dual-naming table.
- One section per category above.
- Per feature: name, SDEV syntax rule, notes/edge cases, and a Python vs SDEV side-by-side block.
- Coverage index at the end listing every Python feature and its SDEV equivalent with implementation status per track.

It is registered in `src/pages/Docs.tsx`, added to `scripts/build-ultimate-docs.mjs` so the Ultimate doc includes it, and linked from `public/llms.txt` and the sitemap.

## Parity tracking

Every catalogued feature is added to `lang/parity/features.json` with `v1`/`v2`/`native` status and per-track names. The parity agent then reports the real gap list, which becomes the milestone backlog for the refinement pass.

## Implementation in this pass

Implementation is prioritised so the language is actually usable, not just specified:

- Tier 1 (implemented now, v1 TypeScript interpreter): f-strings, walrus, augmented assignment, chained comparison, `*args`/`**kwargs` and call unpacking, keyword args and defaults, decorators, lambdas, comprehensions (all four), `with`/context protocol, `match`/`case`, generators and `yield from`, full exception model incl. `raise from`, properties, class/static methods, multiple inheritance with MRO, dataclass and enum sugar, the dunder protocol table, `async`/`await` with an event loop, dynamic imports, and the builtins/type-method surface.
- Tier 2 (implemented now, v2 self-hosted track where the seed VM already supports the primitives): decorators, comprehensions, `with`, `match`, `rest`/`named` params, generators via CPS lowering. Anything requiring new opcodes is scoped and listed rather than half-built.
- Tier 3 (deferred to milestones): native x86-64 backend support for the new features, plus any v2 items needing seed-VM opcode work; the standard-library module surface beyond the core set.

Each tier keeps the existing regression guarantees green: the 87/87 byte-identical fixed-point cases, the native ELF suite, and the v1 interpreter tests.

## Technical notes

- Synonym table lives beside `src/lang/tokens.ts` and the v2 `lang/compiler/lexer.sdev`, generated from one shared list so both tracks stay in sync.
- New syntax is additive only: `::`/`;;` blocks, `be` assignment, and `{ }` as dict-literal-only all stay untouched.
- Dunder methods become named protocol slots on kinds (for example `on_add`, `on_str`, `on_index`), with the Python `__name__` spelling accepted as an alias.
- Generators and async are lowered on top of the existing closure and task machinery rather than new VM concepts where possible.
- Documentation stays the source of truth per project rule; the parity agent verifies the doc's coverage index against `features.json`.

## Scale expectation

This is a multi-turn build. The plan's completion criterion is: the Master Documentation is complete and exhaustive, `features.json` covers every catalogued feature, Tier 1 and Tier 2 are implemented and tested, and the remaining gaps are written up as ordered milestones.
