// Deep technical reference of the SDEV implementation.
// Injected into AI prompts so assistants can answer questions about
// the lexer, parser, interpreter, compiler, VM, kernel, builtins, etc.
//
// Keep this in sync with src/lang/* when the implementation changes.

export const SDEV_INTERNALS = `
## SDEV IMPLEMENTATION INTERNALS (deep reference)

SDEV's TypeScript implementation lives in \`src/lang/\`, organized into layered
subdirectories (\`core/\`, \`builtins/\`, \`runtime/\`, \`stdlib/\`, \`tools/\`,
\`agent/\`, \`dialect/\`, \`hardware/\`, \`registry/\`, \`collab/\`). It provides a
tree-walking interpreter, a stack-based bytecode compiler/VM, and a bridge
(\`src/lang-bridge/\`) to the self-hosted SDEV v2 WASM Seed VM and native x86-64
backends.

### Pipeline overview
Source text → \`core/lexer.ts\` (tokens) → \`core/parser.ts\` (AST) → either
\`runtime/interpreter.ts\` (tree-walk over \`runtime/interpreter-core.ts\`) or
\`runtime/compiler.ts\` (bytecode) → \`runtime/vm.ts\` (stack VM). Self-hosted v2
programs compile through \`lang/compiler/*.sdev\` onto the WebAssembly Seed VM
(\`src/lang-bridge/wasm-runtime.ts\`).

### Layered files (what each module does)
- \`core/tokens.ts\` & \`core/keywords.ts\` — Token kind enum and keyword table.
  Keywords include \`forge be conjure yield ponder otherwise cycle iterate through
  equals differs also either isnt yep nope void link as from\`.
  Block delimiters are \`::\` (open) and \`;;\` (close); \`{ }\` is for dict
  literals (and optional brace blocks in v2/hardware).
- \`core/lexer.ts\` — Hand-written scanner tracking line/column, comments,
  string escapes, f-strings, numeric literals, and block tokens.
- \`core/ast.ts\` — Discriminated union \`ASTNode\` for expressions, statements,
  classes, lambdas, destructuring, pattern matching, and FOP features.
- \`core/parser.ts\` — Recursive-descent Pratt-style parser.
- \`core/environment.ts\` — Lexically scoped variable environment with parent
  chain, \`define\`, \`get\`, \`set\`, \`assign\`, \`ownKeys\`, and \`ownEntries\`.
- \`core/runtime-values.ts\` & \`core/format.ts\` — Runtime value types
  (\`SdevSet\`, tuples, generators, protocol slots) and \`repr\`/\`formatValue\`.
- \`core/errors.ts\` — Shared \`SdevError\` and \`ReturnException\` with line/col.
- \`builtins/*\` — Standard library split by domain (\`io.ts\`, \`list.ts\`,
  \`dict.ts\`, \`math.ts\`, \`string.ts\`, \`text.ts\`, \`time.ts\`, \`types.ts\`,
  \`json.ts\`, \`misc.ts\`, \`functional.ts\`, \`fop.ts\`, \`host.ts\`, \`oce.ts\`,
  \`sql.ts\`, \`regex.ts\`, \`buffer.ts\`), assembled in \`builtins/core.ts\` and
  \`builtins/index.ts\`.
- \`runtime/interpreter-core.ts\` & \`runtime/interpreter.ts\` — Tree-walking AST
  evaluator with closures, generators, classes, FOP feature layers, and optional
  \`traceHook\` for time-travel debugging.
- \`runtime/sdev-module.ts\` — Compiles and caches pure \`.sdev\` stdlib/tool
  modules on \`InterpreterCore\`.
- \`runtime/bytecode.ts\`, \`runtime/compiler.ts\`, \`runtime/vm.ts\` — Bytecode
  opcodes, compiler, and stack-based virtual machine.
- \`runtime/executor.ts\` — Top-level \`execute\`, \`executeAsync\`, and
  \`executeV2\` entry points integrating the understanding agent and board
  stripper.
- \`stdlib/matrix.ts\`, \`stdlib/graphics.ts\`, \`stdlib/ui.ts\`, \`stdlib/web.ts\`,
  \`stdlib/pyparity.ts\`, \`stdlib/kernel.ts\` — Domain stdlib modules for linear
  algebra, 2D canvas + turtle graphics, UI widgets, full-stack Web DSL, Python
  parity builtins, and the virtual OS kernel.
- \`tools/linker.ts\`, \`tools/linter.ts\`, \`tools/formatter.ts\`,
  \`tools/translator.ts\`, \`tools/notebook.ts\`, \`tools/benchmark.ts\` — Module
  \`link\` resolver, static diagnostic linter (SDEV001–SDEV015), code formatter,
  26-language keyword translator, literate notebooks, and benchmarking.
- \`agent/*\` — The syntax-free SDEV code understander (\`lang/agent/*.sdev\` via
  \`agent/sdev-engine.ts\`, local WebGPU/server brain, and TypeScript fallback).
- \`dialect/*\` — Deterministic personal dialects (\`.sdev\` dialect definitions,
  \`resolve.ts\`, \`canonicalize.ts\`).
- \`hardware/*\` — Microcontroller \`board "<id>"\` transpiler and reader.
- \`registry/api-registry.ts\` & \`registry/builtin-docs.ts\` — Single source of
  truth for all SDEV APIs, target capability matrices, and hover documentation.

### Control-flow & semantics highlights
- Classic v1 blocks use \`::\` … \`;;\`; \`{ }\` is for dict literals.
- Classic assignment is \`be\` (\`forge name be expr\`); v2 uses \`set name to expr\` and \`to fn with a b ... end\`.
- \`yield\` returns from a \`conjure\`. Bare \`yield\` returns \`void\`.
- \`isnt\` is logical NOT; \`also\`/\`either\` are AND/OR (short-circuit).
- \`equals\`/\`differs\` are deep-equal for lists and tomes.
`;
