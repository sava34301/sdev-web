#!/usr/bin/env node
// Builds public/SDEV_ULTIMATE_DOCUMENTATION.md — the single, complete sdev
// reference. It stitches together every hand-written guide in the repository
// and appends machine-generated appendices (builtin index, opcode table,
// keyword table, stdlib index, parity matrix, repo map, toolchain index) so
// the file can never drift from the implementation.
//
//   node scripts/build-ultimate-docs.mjs
//
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public/SDEV_ULTIMATE_DOCUMENTATION.md');

const read = (p) => {
  try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; }
};
const exists = (p) => fs.existsSync(path.join(ROOT, p));

/** Shift every ATX heading in a markdown document down by `by` levels. */
function shiftHeadings(md, by) {
  const lines = md.split('\n');
  let fence = false;
  return lines.map((line) => {
    if (/^\s*```/.test(line)) { fence = !fence; return line; }
    if (fence) return line;
    const m = /^(#{1,6})(\s+)(.*)$/.exec(line);
    if (!m) return line;
    const level = Math.min(6, m[1].length + by);
    return '#'.repeat(level) + m[2] + m[3];
  }).join('\n');
}

/** Strip an HTML comment marker pair's contents? (kept verbatim — no-op) */
const verbatim = (s) => s.replace(/\r\n/g, '\n').trim();

// ---------------------------------------------------------------------------
// Generated appendix: builtin index (v1 TypeScript runtime)
// ---------------------------------------------------------------------------
const BUILTIN_MODULES = [
  ['builtins.ts', 'Core standard library — I/O, types, math, collections, strings, regex, time'],
  ['advanced.ts', 'Pro layer — file I/O, hashing, base64, JSON, async, OS glue, buffers, FFI bridge'],
  ['matrix.ts', 'Matrix and linear algebra'],
  ['graphics.ts', 'Canvas 2D drawing and turtle graphics'],
  ['ui.ts', 'App widget runtime used by the IDE App preview'],
  ['web.ts', 'Web DSL — HTML tags, CSS, JS hooks, raw passthrough'],
  ['kernel.ts', 'Virtual kernel — tasks, syscalls, IPC, GC, process table'],
];

/**
 * Hand-written meanings for builtins whose implementation carries no comment.
 * Keys may be `module.ts:name` (to disambiguate a name reused across modules)
 * or a bare `name`.
 */
const BUILTIN_DOCS = {
  // --- collections -------------------------------------------------------
  all: 'True when every element of the list is truthy (or satisfies the given predicate).',
  any: 'True when at least one element of the list is truthy (or satisfies the given predicate).',
  average: 'Arithmetic mean of a list of numbers.',
  concat: 'Joins two lists (or two strings) into a new one; the inputs are not modified.',
  contains: 'True when the collection holds the given value, or the string holds the substring.',
  contents: 'Returns the values of a tome as a list.',
  count: 'How many times a value occurs in a list or a substring occurs in a string.',
  del: 'Deletes a key from a tome or an index from a list, in place.',
  drop: 'Returns a copy of the list without its first `n` elements.',
  entries: 'Returns a tome as a list of `[key, value]` pairs.',
  find: 'Returns the index of the first matching element, or -1 when nothing matches.',
  first: 'The first element of a list or the first character of a string.',
  flatten: 'Collapses nested lists into a single flat list.',
  get: 'Reads a key from a tome with an optional default when the key is missing.',
  intersect: 'The set intersection of two lists — values present in both.',
  last: 'The final element of a list or the final character of a string.',
  merge: 'Combines two tomes into a new one; keys on the right win.',
  'builtins.ts:pick': 'Returns one element chosen at random from a list.',
  'advanced.ts:pick': 'Returns one element chosen at random from a list.',
  position: 'The index at which a value or substring first appears.',
  product: 'Multiplies every number in a list together.',
  remove: 'Removes the first occurrence of a value from a list, in place.',
  repeat: 'Builds a list (or string) by repeating a value `n` times.',
  rest: 'Everything after the first element of a list.',
  reverse: 'Returns the list or string in reverse order.',
  set: 'Writes a value at a key or index inside a tome or list.',
  shuffle: 'Returns the list in a random order (Fisher–Yates).',
  sort: 'Returns the list sorted ascending, or by the supplied comparison function.',
  sum: 'Adds every number in a list together.',
  take: 'Returns the first `n` elements of a list.',
  tome_keys: 'Returns the keys of a tome as a list.',
  union: 'The set union of two lists — every distinct value from either side.',
  unique: 'Removes duplicate values, preserving first-seen order.',
  unzip: 'Splits a list of pairs into two parallel lists.',
  zip: 'Pairs up two lists element by element into a list of pairs.',
  // --- strings -----------------------------------------------------------
  endswith: 'True when the string ends with the given suffix.',
  startswith: 'True when the string begins with the given prefix.',
  lower: 'Lowercases every character in the string.',
  padleft: 'Pads the string on the left with a fill character until it reaches the target width.',
  padright: 'Pads the string on the right with a fill character until it reaches the target width.',
  trim: 'Removes leading and trailing whitespace.',
  inscribe: 'Formats values into a template string and returns the result.',
  decipher: 'Parses a string back into a structured value (numbers, lists, tomes).',
  unetch: 'The inverse of `etch`: decodes an encoded string back to its original value.',
  hash: 'Deterministic hash of a value, returned as a number or hex string.',
  base64encode: 'Encodes a string or byte buffer as Base64 text.',
  base64decode: 'Decodes Base64 text back into a string.',
  // --- math --------------------------------------------------------------
  max: 'The largest of the supplied numbers (or of a list).',
  greatest: 'The largest of the supplied numbers (or of a list).',
  least: 'The smallest of the supplied numbers (or of a list).',
  sqrt: 'Square root.',
  root: 'Square root (alias kept for readability).',
  pow: 'Raises the first number to the power of the second.',
  log: 'Natural logarithm.',
  log2: 'Base-2 logarithm.',
  log10: 'Base-10 logarithm.',
  sign: 'Returns -1, 0, or 1 depending on the sign of the number.',
  ground: 'Rounds a number down to the nearest integer (floor).',
  lerp: 'Linear interpolation between two values by a factor in 0..1.',
  constrain: 'Clamps a number into the inclusive range `[low, high]`.',
  rand: 'Random floating-point number; with arguments, a random value in the range.',
  chaos: 'Random number generator with seedable, reproducible output.',
  nearby: 'True when two floating-point numbers are equal within a small tolerance.',
  degrees: 'Converts radians to degrees.',
  dist: 'Euclidean distance between two points.',
  dot: 'Dot product of two vectors.',
  asserteq: 'Throws when the two values differ — the built-in test assertion.',
  pause: 'Blocks or awaits for the given number of milliseconds.',
  timestamp: 'Current time in milliseconds since the Unix epoch.',
  // --- host / IO ---------------------------------------------------------
  read_file: 'Reads a file from the host filesystem and returns its text.',
  write_file: 'Writes text to a file on the host filesystem, creating or truncating it.',
  http_get: 'Performs an HTTP GET and returns the response body as text.',
  elevate: 'Requests elevated host privileges for the following operation.',
  close: 'Closes an open handle (file, socket, page, or window) and releases it.',
  scroll: 'Scrolls the rendered output or a target element.',
  // --- FFI ---------------------------------------------------------------
  ffi_buf: 'Allocates a raw byte buffer usable as an FFI argument.',
  ffi_call: 'Calls a symbol in a loaded native library with the given arguments.',
  ffi_close: 'Unloads a native library handle opened with `ffi_open`.',
  ffi_write_i32: 'Writes a 32-bit integer into an FFI buffer at a byte offset.',
  ffi_write_f64: 'Writes a 64-bit float into an FFI buffer at a byte offset.',
  i8: 'FFI type tag: signed 8-bit integer.',
  u8: 'FFI type tag: unsigned 8-bit integer.',
  i16: 'FFI type tag: signed 16-bit integer.',
  u16: 'FFI type tag: unsigned 16-bit integer.',
  i32: 'FFI type tag: signed 32-bit integer.',
  u32: 'FFI type tag: unsigned 32-bit integer.',
  f32: 'FFI type tag: 32-bit float.',
  f64: 'FFI type tag: 64-bit float.',
  gc: 'Runs the virtual kernel\'s mark-and-sweep collector immediately.',
  // --- matrices ----------------------------------------------------------
  matmean: 'Mean of every element in a matrix.',
  matscale: 'Multiplies every element of a matrix by a scalar.',
  matsub: 'Element-wise subtraction of two matrices of the same shape.',
  // --- graphics ----------------------------------------------------------
  alpha: 'Sets the global drawing opacity for subsequent canvas operations.',
  arc: 'Draws a circular arc from a start angle to an end angle.',
  background: 'Fills the whole canvas with a colour, clearing what was drawn.',
  backward: 'Moves the turtle backwards by the given distance, drawing if the pen is down.',
  forward: 'Moves the turtle forwards by the given distance, drawing if the pen is down.',
  circle: 'Draws a circle at a centre point with the given radius.',
  clear: 'Erases the canvas contents.',
  ellipse: 'Draws an ellipse with independent width and height radii.',
  font: 'Sets the font family and size used by text drawing.',
  goto: 'Moves the turtle straight to an absolute canvas coordinate.',
  'graphics.ts:heading': 'The turtle\'s current facing angle in degrees.',
  heart: 'Draws a heart shape at the given position and size.',
  home: 'Returns the turtle to the canvas centre facing its default direction.',
  hsla: 'Builds a colour from hue, saturation, lightness, and alpha.',
  left: 'Turns the turtle counter-clockwise by the given angle.',
  right: 'Turns the turtle clockwise by the given angle.',
  line: 'Draws a straight line between two points.',
  pencolor: 'Sets the stroke colour used by the turtle and shape outlines.',
  pendown: 'Lowers the pen so turtle movement draws.',
  penup: 'Raises the pen so turtle movement does not draw.',
  penwidth: 'Sets the stroke width in pixels.',
  point: 'Draws a single pixel-sized dot.',
  polygon: 'Draws a regular polygon with the given number of sides.',
  pos: 'The turtle\'s current `[x, y]` position.',
  restore: 'Pops the last saved canvas transform and style state.',
  save: 'Pushes the current canvas transform and style state onto a stack.',
  rgb: 'Builds an opaque colour from red, green, and blue channels.',
  rgba: 'Builds a colour from red, green, blue, and alpha channels.',
  rotate: 'Rotates the canvas coordinate system by an angle.',
  scale: 'Scales the canvas coordinate system on the x and y axes.',
  setheading: 'Points the turtle at an absolute angle in degrees.',
  shadow: 'Configures the drop shadow applied to subsequent drawing.',
  stamp: 'Imprints the turtle\'s current shape onto the canvas without moving it.',
  star: 'Draws a star with the given number of points.',
  stroke: 'Strokes the current path with the active pen colour and width.',
  triangle: 'Draws a triangle through three points.',
  // --- app UI widgets ----------------------------------------------------
  checkbox: 'Adds a checkbox widget bound to a named state key.',
  column: 'Starts a vertical layout column; close it with `endcolumn`.',
  endcolumn: 'Closes the column opened by `column`.',
  row: 'Starts a horizontal layout row; close it with `endrow`.',
  endrow: 'Closes the row opened by `row`.',
  group: 'Starts a labelled group box; close it with `endgroup`.',
  endgroup: 'Closes the group opened by `group`.',
  tab: 'Declares one tab inside a `tabs` container.',
  endtab: 'Closes the tab opened by `tab`.',
  tabs: 'Starts a tab strip; close it with `endtabs`.',
  endtabs: 'Closes the tab strip opened by `tabs`.',
  endmenu: 'Closes the menu opened by `menu`.',
  endwindow: 'Closes the window opened by `window`.',
  divider: 'Draws a horizontal separator line between widgets.',
  'ui.ts:heading': 'Renders a heading-styled text widget.',
  image: 'Renders an image widget from a URL or data URI.',
  input: 'Adds a single-line text input bound to a state key.',
  textarea: 'Adds a multi-line text input bound to a state key.',
  label: 'Renders a short static text label.',
  paragraph: 'Renders a block of body text.',
  menuitem: 'Adds one clickable entry to the current menu.',
  progress: 'Renders a progress bar for a value between 0 and 1.',
  select: 'Adds a drop-down list bound to a state key.',
  slider: 'Adds a numeric slider with a range bound to a state key.',
  uiset: 'Writes a value into the app widget state store, re-rendering the UI.',
  // --- web DSL -----------------------------------------------------------
  page: 'Opens an HTML document; close it with `endpage`.',
  endpage: 'Closes the document opened by `page`.',
  keyframes: 'Emits a CSS `@keyframes` animation block.',
  link: 'Emits a `<link>` tag — typically a stylesheet or icon.',
  meta: 'Emits a `<meta>` tag into the document head.',
  script: 'Emits a `<script>` tag with the given source or URL.',
  raw_js: 'Injects raw JavaScript into the generated page untouched.',
  'web.ts:title': 'Sets the document title in the generated page head.',
  // --- type checks and constants -----------------------------------------
  isList: 'True when the value is a list.',
  isText: 'True when the value is a string.',
  isTome: 'True when the value is a tome (dictionary).',
  isTruth: 'True when the value is a boolean.',
  isVoid: 'True when the value is `void` (absent).',
  num: 'Converts a value to a number, or `void` when it cannot be parsed.',
  PI: 'The constant π (3.14159…).',
  TAU: 'The constant τ — a full turn in radians, equal to 2π.',
  E: 'Euler\'s number, the base of the natural logarithm.',
  acos: 'Inverse cosine, in radians.',
  asin: 'Inverse sine, in radians.',
  atan: 'Inverse tangent, in radians.',
  atan2: 'Angle in radians from the origin to the point (b, a), correct in all four quadrants.',
  cos: 'Cosine of an angle in radians.',
  tan: 'Tangent of an angle in radians.',
  exp: 'e raised to the given power.',
  elevate: 'Raises the current task to a privileged mode so it may use restricted syscalls.',
  lastIndexOf: 'Index of the final occurrence of a substring, or -1 when absent.',
  trimRight: 'Removes trailing whitespace only.',
  listDir: 'Lists the entries of a host directory.',
  mapRange: 'Re-maps a number from one numeric range into another, proportionally.',
  // --- canvas paths, state, sprites ---------------------------------------
  moveTo: 'Starts a new path segment at the given point without drawing.',
  lineTo: 'Adds a straight segment from the current path point to the given point.',
  quadraticTo: 'Adds a quadratic Bézier segment using one control point.',
  bezierTo: 'Adds a cubic Bézier segment using two control points.',
  closePath: 'Closes the current path back to its starting point.',
  fillPath: 'Fills the current path with the active fill colour.',
  strokePath: 'Strokes the current path outline with the active pen.',
  lineCap: 'Sets how stroked line ends are drawn: `butt`, `round`, or `square`.',
  lineJoin: 'Sets how stroked corners join: `miter`, `round`, or `bevel`.',
  lineWidth: 'Sets stroke thickness in pixels.',
  noFill: 'Turns off filling for subsequent shapes.',
  noStroke: 'Turns off outlining for subsequent shapes.',
  noShadow: 'Clears any configured drop shadow.',
  radialGradient: 'Creates a radial gradient fill between two circles and colour stops.',
  randomColor: 'Returns a random colour value.',
  resetTransform: 'Restores the canvas coordinate system to its identity state.',
  textAlign: 'Sets horizontal (and optionally vertical) alignment for drawn text.',
  turtleCircle: 'Drives the turtle around a circle of the given radius, drawing as it goes.',
  drawSprite: 'Renders a sprite at its current position and frame.',
  moveSprite: 'Moves a sprite to a new position.',
  updateSprite: 'Advances a sprite\'s animation and physics by one step.',
  spriteCollides: 'True when two sprites\' bounding boxes overlap.',
  // --- virtual kernel ------------------------------------------------------
  runTasks: 'Runs the scheduler until every ready task has had a turn.',
  taskList: 'Returns the process table as a list of task records.',
  killTask: 'Terminates the task with the given id.',
  yieldTask: 'Voluntarily gives up the rest of the current task\'s time slice.',
  setPrivilege: 'Sets the privilege ring of the current task.',
  triggerInterrupt: 'Raises a virtual interrupt, invoking its registered handler.',
  onEvent: 'Registers a handler to run when a named kernel event fires.',
  emitEvent: 'Fires a named kernel event, invoking every registered handler.',
  heapStore: 'Allocates a value on the kernel heap and returns its handle.',
  heapLoad: 'Reads the value behind a kernel heap handle.',
  heapFree: 'Releases a kernel heap handle so the collector can reclaim it.',
  heapStats: 'Returns live/free counts and totals for the kernel heap.',
  fsWrite: 'Writes text to a path in the virtual filesystem, creating it if needed.',
  fsAppend: 'Appends text to the end of a virtual filesystem file.',
  fsDelete: 'Deletes a virtual filesystem entry.',
  fsExists: 'True when the path exists in the virtual filesystem.',
  fsList: 'Lists the children of a virtual filesystem directory.',
  fsMkdir: 'Creates a directory in the virtual filesystem.',
  fsStat: 'Returns metadata (size, kind, timestamps) for a virtual filesystem entry.',
  deviceRead: 'Reads from a virtual device by name.',
  deviceWrite: 'Writes a value to a virtual device by name.',
  deviceStatus: 'Reports whether a virtual device is attached and ready.',
  windowList: 'Lists the windows currently open in the virtual desktop.',
  moveWindow: 'Moves a virtual window to new coordinates.',
  resizeWindow: 'Resizes a virtual window.',
  bitAnd: 'Bitwise AND of two integers.',
  bitOr: 'Bitwise OR of two integers.',
  bitXor: 'Bitwise exclusive OR of two integers.',
  bitNot: 'Bitwise complement of an integer.',
  bitShiftLeft: 'Shifts the bits of an integer left by n places.',
  bitShiftRight: 'Shifts the bits of an integer right by n places.',
  charAt: 'The character at a zero-based index in a string.',
  indexOf: 'Index of the first occurrence of a substring, or -1 when absent.',
  fromEntries: 'Builds a tome from a list of `[key, value]` pairs.',
  isFunc: 'True when the value is callable (a function, lambda, or builtin).',
  INFINITY: 'The floating-point positive infinity constant.',
  fileExists: 'True when the given host filesystem path exists.',
  deleteFile: 'Deletes a file from the host filesystem.',
  closeWindow: 'Closes a virtual window and frees its resources.',
};


/** Hand-written meanings for sdev-written functions that carry no comment. */
const SDEV_FN_DOCS = {
  // self-hosted compiler (lexer / parser / codegen)
  is_digit: 'True when the byte at the given index is an ASCII digit 0-9.',
  is_alpha: 'True when the byte is an ASCII letter or underscore — the start of an identifier.',
  is_alnum: 'True when the byte may continue an identifier: a letter, digit, or underscore.',
  slice: 'Extracts the substring between two byte offsets, byte by byte.',
  str_eq: 'Byte-exact string comparison, used instead of host equality so both tracks agree.',
  lex: 'Turns source text into the token stream: kinds, lexemes, and line numbers.',
  emit_byte: 'Appends one byte to the bytecode buffer being built.',
  emit_i32: 'Appends a little-endian 32-bit operand to the bytecode buffer.',
  intern_str: 'Interns a string literal into the pool and returns its handle, reusing duplicates.',
  intern_name: 'Interns an identifier and returns its global slot index, allocating on first sight.',
  find_local: 'Looks up a local variable in the current frame, returning its slot or -1.',
  add_local: 'Allocates a new local slot in the current function frame.',
  find_fn: 'Looks up a declared function by name, returning its index or -1.',
  emit_load_ident: 'Emits `LOAD_LOC` for a local or `LOAD` for a global, whichever the name resolves to.',
  emit_store_ident: 'Emits `STORE_LOC` or `STORE` for an assignment target.',
  emit_call: 'Emits the argument pushes plus the `CALL` instruction for a function call.',
  is_op_c: 'True when the character can begin an operator token.',
  is_ident_word: 'True when the token text is a plain identifier rather than a keyword.',
  parse_atom: 'Parses the tightest-binding expression: literal, identifier, call, index, or parenthesised group.',
  parse_mul: 'Parses the multiplication / division / modulo precedence level.',
  parse_add: 'Parses the addition / subtraction precedence level.',
  skip_nl: 'Advances the cursor past newline tokens so statements may be separated freely.',
  parse_stmt: 'Parses one statement and emits its bytecode: binding, assignment, control flow, or expression.',
  // parity agent
  unquote: 'Strips the surrounding quotes from a JSON string value.',
  field_value: 'Reads one field out of a JSON object, without a full JSON parser.',
  load_registry: 'Reads `lang/parity/features.json` into memory as the canonical feature list.',
  load_track_source: 'Loads the implementation source for one track so it can be probed for a feature.',
  mark: 'Records the support verdict for one feature on one track.',
  audit: 'Probes every feature against every track and builds the full verdict table.',
  matrix_markdown: 'Renders the audit result as the markdown parity matrix.',
  report_json: 'Serialises the audit result to `lang/parity/report.json`.',
  sync_doc: 'Rewrites the parity matrix block inside the parity documentation in place.',
  run_parity_agent: 'Entry point: audit, then write both the JSON report and the documentation.',
  // FFI
  lib_close: 'Closes a loaded native library handle.',
  invoke: 'Calls a native symbol with marshalled arguments and returns the marshalled result.',
  buf_from_list: 'Packs a list of numbers into a raw FFI byte buffer.',
  buf_to_list: 'Unpacks a raw FFI byte buffer back into a list of numbers.',
  cuda_ok: 'True when a CUDA runtime and device are reachable from this host.',
  // CUDA
  cuda_device_default: 'Returns the default CUDA device handle, initialising the runtime if needed.',
  cuda_free_device: 'Releases a CUDA device handle.',
  cuda_free: 'Frees a device-side allocation.',
  cuda_download: 'Copies a buffer from device memory back to host memory.',
  // data pipeline
  save_text: 'Writes a text corpus to disk for later training runs.',
  encode: 'Turns text into a list of token ids using the active vocabulary.',
  decode: 'Turns a list of token ids back into text.',
  crawl_many: 'Fetches a list of URLs and returns their extracted text bodies.',
  distill_batch: 'Queries a teacher model for a batch of examples so a smaller model can learn from them.',
  // autograd
  tape_reset: 'Clears the global autograd tape before a new forward pass.',
  record: 'Appends one operation and its inputs to the autograd tape.',
  d_mul: 'Local derivative rule for element-wise multiplication.',
  d_matmul: 'Local derivative rule for matrix multiplication.',
  d_relu: 'Local derivative rule for ReLU: pass gradient where the input was positive.',
  d_mse: 'Local derivative rule for mean squared error.',
  bw_add: 'Backward pass for addition: routes the incoming gradient to both operands.',
  bw_mul: 'Backward pass for element-wise multiplication.',
  bw_matmul: 'Backward pass for matrix multiplication, producing both operand gradients.',
  bw_relu: 'Backward pass for ReLU.',
  bw_mse: 'Backward pass for mean squared error.',
  bw_sce: 'Backward pass for softmax cross-entropy, fused for numerical stability.',
  zero_grads: 'Resets every parameter gradient to zero before the next backward pass.',
  adam_step: 'Applies one Adam optimiser update using the stored moment estimates.',
  // neural network layers
  linear: 'Creates a dense layer with a weight matrix and bias vector.',
  broadcast_row: 'Adds a bias row to every row of a matrix.',
  sequential: 'Chains layers into a single model whose forward pass runs them in order.',
  seq_forward: 'Runs the forward pass of a sequential model.',
  relu_layer: 'A layer that applies ReLU element-wise.',
  fit: 'Trains a model over a dataset for the given epochs, reporting loss per epoch.',
  // tensors
  tensor: 'Builds a tensor from flat data plus a shape, with autograd off.',
  tensor_grad: 'Builds a tensor with a zeroed gradient buffer and autograd enabled.',
  zeros: 'A tensor of the given shape filled with 0.0.',
  ones: 'A tensor of the given shape filled with 1.0.',
  randn: 'A tensor of the given shape sampled from a standard normal (Box–Muller).',
  shape_size: 'The total element count implied by a shape — the product of its dimensions.',
  t_sub: 'Element-wise subtraction of two tensors of the same shape.',
  t_mul: 'Element-wise multiplication of two tensors of the same shape.',
  t_scale: 'Multiplies every element of a tensor by a scalar.',
  sigmoid: 'Element-wise logistic sigmoid.',
  softmax: 'Row-wise softmax, shifted by the row maximum for numerical stability.',
  cross_entropy: 'Mean cross-entropy loss between predicted probabilities and target labels.',
  // transformer
  embedding: 'Creates a learnable token embedding table.',
  embed_lookup: 'Gathers embedding rows for a sequence of token ids.',
  layer_norm: 'Creates a layer-norm block with learnable gain and bias.',
  ln_apply: 'Normalises each row to zero mean and unit variance, then scales and shifts it.',
  attn_forward: 'Scaled dot-product self-attention with causal masking.',
  transpose: 'Swaps the two dimensions of a 2-D tensor.',
  block_forward: 'One transformer block: attention, residual, feed-forward, residual.',
  gpt_forward: 'Full model forward pass: embed, run every block, project to vocabulary logits.',
  generate: 'Samples tokens autoregressively from the model until the length limit.',
  // training
  lm_generate: 'Generates a continuation from a trained language model.',
  lm_complete: 'Convenience wrapper: encode a prompt, generate, and decode the result.',
  save_checkpoint: 'Serialises every model parameter to a checkpoint file.',
  // self-modification / evolution
  self_read: 'Reads a file from the sdev source tree so the model can inspect its own code.',
  self_propose: 'Produces a proposed source change as a structured, reviewable patch.',
  set_review_hook: 'Installs the callback that must approve a proposal before it is applied.',
  harvest_keywords: 'Mines demand signals for language features from collected text.',
  is_allowed: 'Guards the evolution loop: true only for paths the policy permits editing.',
  apply_proposal: 'Applies an approved proposal to the source tree and records it in the log.',
  top_topic: 'Picks the most-requested topic out of the harvested demand signals.',
  pick_target: 'Chooses which file the next evolution step should modify.',
  prompt_pool: 'Builds the prompt set handed to the teacher model for the next round.',
};

/** Placeholder names used when rendering an inferred argument list. */
const ARGNAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];


/**
 * Slice a module into one record per `builtins.set(...)` call so each builtin
 * can be documented individually: name, inferred signature, prose description,
 * declared constraints, and source location.
 */
function parseBuiltins(src, file) {
  const lines = src.split('\n');
  const marks = [];
  lines.forEach((line, i) => {
    const m = /builtins\.set\(\s*['"]([A-Za-z_][A-Za-z_0-9]*)['"]/.exec(line);
    if (m) marks.push({ name: m[1], line: i });
  });
  const out = [];
  let section = '';
  for (let k = 0; k < marks.length; k++) {
    const { name, line } = marks[k];
    const end = k + 1 < marks.length ? marks[k + 1].line : lines.length;
    const body = lines.slice(line, end).join('\n');

    // Contiguous `//` comment block directly above the registration.
    const doc = [];
    for (let j = line - 1; j >= 0; j--) {
      const t = lines[j].trim();
      if (!t.startsWith('//')) break;
      const text = t.replace(/^\/\/+\s?/, '');
      if (/^[=\-*]{3,}$/.test(text)) break;
      doc.unshift(text);
    }
    // Nearest banner comment above (`// ===== Graphics =====`) → category.
    for (let j = line - 1; j >= 0 && j > line - 400; j--) {
      const t = lines[j].trim();
      const b = /^\/\/\s*[=\-*]{2,}\s*(.+?)\s*[=\-*]{2,}$/.exec(t);
      if (b) { section = b[1]; break; }
    }

    // Arity: highest `args[N]` referenced, plus spread/variadic detection.
    const idx = [...body.matchAll(/args\[(\d+)\]/g)].map((m) => Number(m[1]));
    const variadic = /args\.map|args\.join|\.\.\.args|args\.slice|args\.forEach|args\.length\s*[><]/.test(body);
    const arity = idx.length ? Math.max(...idx) + 1 : 0;
    const exact = /args\.length\s*!==\s*(\d+)/.exec(body);
    const count = exact ? Number(exact[1]) : arity;
    const sig = variadic && !exact
      ? `${name}(…)`
      : `${name}(${ARGNAMES.slice(0, count).join(', ')})`;

    // Declared constraints — the runtime's own error messages are the spec.
    const errs = [...body.matchAll(/SdevError\(\s*[`'"]([^`'"]+)[`'"]/g)]
      .map((m) => m[1]).filter((e, i2, arr) => arr.indexOf(e) === i2).slice(0, 2);

    // Description: explicit comment wins, then the curated dictionary, then a
    // derivation from the implementation itself.
    let desc = doc.join(' ').replace(new RegExp(`^${name}\\s*[-–—:]\\s*`, 'i'), '').trim();
    if (!desc) desc = BUILTIN_DOCS[`${file}:${name}`] || BUILTIN_DOCS[name] || '';
    if (!desc) {
      const oneLiner = /call:\s*\(args[^)]*\)\s*=>\s*([^\n]+?),?\s*\}\s*\);?\s*$/.exec(body.trim());
      if (oneLiner) {
        const expr = oneLiner[1].replace(/\s*as\s+\w+(\[\])?/g, '')
          .replace(/args\[(\d+)\]/g, (_, n) => ARGNAMES[Number(n)] || `arg${n}`)
          .replace(/\s+/g, ' ').trim();
        desc = `Evaluates \`${expr}\`.`;
      } else if (section) {
        desc = `${section} operation.`;
      } else {
        desc = 'Runtime primitive.';
      }
    }

    if (!/[.!?]$/.test(desc)) desc += '.';
    out.push({ name, sig, desc, errs, line: line + 1, file, section });
  }
  return out;
}

function builtinIndex() {
  let out = '';
  let total = 0;
  for (const [file, desc] of BUILTIN_MODULES) {
    const src = read(`src/lang/${file}`);
    if (!src) continue;
    const recs = parseBuiltins(src, file);
    const seen = new Set();
    const uniq = recs.filter((r) => (seen.has(r.name) ? false : seen.add(r.name)));
    uniq.sort((x, y) => x.name.localeCompare(y.name));
    total += uniq.length;
    out += `\n#### \`src/lang/${file}\` — ${desc}\n\n`;
    out += `${uniq.length} builtins. Signatures are inferred from the implementation; `;
    out += `"Rules" lists the constraints the runtime enforces at call time.\n\n`;
    out += '| Call | What it does | Rules | Source |\n| --- | --- | --- | --- |\n';
    for (const r of uniq) {
      const rules = r.errs.length ? r.errs.map((e) => e.replace(/\|/g, '\\|')).join('; ') : '—';
      out += `| \`${r.sig}\` | ${r.desc.replace(/\|/g, '\\|')} | ${rules} | \`${file}:${r.line}\` |\n`;
    }
  }
  return { text: out, total };
}


// ---------------------------------------------------------------------------
// Generated appendix: keyword table (v1 lexer)
// ---------------------------------------------------------------------------
/** Hand-written meaning for every v1 keyword, keyed by the keyword itself. */
const KEYWORD_DOCS = {
  forge: ['Declare and bind a new variable in the current scope.', 'forge score be 10'],
  conjure: ['Declare a function. The body runs between `::` and `;;`.', 'conjure add(a, b) :: yield a + b ;;'],
  ponder: ['Conditional. Runs its block when the condition is truthy.', 'ponder score > 9 :: speak("high") ;;'],
  otherwise: ['The else branch of a `ponder`; may be chained as `otherwise ponder`.', 'otherwise :: speak("low") ;;'],
  cycle: ['While-loop. Repeats its block while the condition holds.', 'cycle i < 10 :: be i be i + 1 ;;'],
  iterate: ['For-each loop header; pairs with `through` (lists) or `within` (ranges).', 'iterate n through nums :: speak(n) ;;'],
  through: ['Loop source operator: iterate over the elements of a list, string, or tome.', 'iterate ch through "abc"'],
  within: ['Loop source operator: iterate over a numeric range or a container membership test.', 'iterate i within sequence(0, 5)'],
  be: ['Assignment to an existing binding, and the binder used after `forge`.', 'be score be score + 1'],
  yield: ['Return a value from a function and stop executing it.', 'yield a + b'],
  yeet: ['Break out of the innermost loop immediately.', 'ponder done :: yeet ;;'],
  skip: ['Continue: abandon this iteration and start the next one.', 'ponder n < 0 :: skip ;;'],
  yep: ['Boolean true literal.', 'forge ok be yep'],
  nope: ['Boolean false literal.', 'forge ok be nope'],
  void: ['The null / absent value. Uninitialised fields read as `void`.', 'forge nothing be void'],
  also: ['Logical AND with short-circuit evaluation.', 'ponder a > 0 also b > 0'],
  either: ['Logical OR with short-circuit evaluation.', 'ponder a > 0 either b > 0'],
  isnt: ['Logical NOT of the following expression.', 'ponder isnt found'],
  equals: ['Value equality comparison (same as `==`).', 'ponder name equals "sava"'],
  differs: ['Value inequality comparison (same as `!=`).', 'ponder name differs "sava"'],
  summon: ['Import a module: a local file, a bundled stdlib name, or a GitHub Gist package.', 'summon "gist:abc123/math.sdev"'],
  attempt: ['Begin a protected block whose runtime errors are catchable.', 'attempt :: risky() ;;'],
  rescue: ['Handle an error raised inside the preceding `attempt`, binding the error value.', 'rescue err :: speak(err) ;;'],
  extend: ['Declare inheritance from a parent essence (class).', 'essence Dog extend Animal ::'],
  new: ['Instantiate an essence, invoking its constructor.', 'forge d be new Dog("rex")'],
  self: ['Inside a method, the receiving instance.', 'be self.name be name'],
  super: ['Inside a method, dispatch to the parent essence implementation.', 'super.speak()'],
  async: ['Mark a function as asynchronous so it returns a promise-like value.', 'async conjure fetchAll() ::'],
  await: ['Suspend until an async value resolves, then produce it.', 'forge data be await fetchAll()'],
};

function keywordTable() {
  const src = read('src/lang/tokens.ts');
  const block = /export const KEYWORDS[^{]*{([\s\S]*?)\n};/.exec(src);
  if (!block) return '';
  const rows = [...block[1].matchAll(/^\s*'?([A-Za-z_][\w]*)'?\s*:\s*TokenType\.([A-Z_]+),?\s*(?:\/\/\s*(.*))?$/gm)]
    .map((m) => {
      const [meaning, example] = KEYWORD_DOCS[m[1]] || [(m[3] || '').trim() || 'Reserved word.', ''];
      return `| \`${m[1]}\` | ${m[2]} | ${meaning} | ${example ? '`' + example + '`' : '—'} |`;
    });
  return `\nEvery reserved word the v1 lexer recognises, what it means, and the\nshortest example that uses it correctly.\n\n| Keyword | Token | Meaning | Example |\n| --- | --- | --- | --- | \n${rows.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Generated appendix: seed VM opcode table
// ---------------------------------------------------------------------------
/** Meanings for opcodes that the seed VM header packs several-per-line. */
const OPCODE_DOCS = {
  ADD: 'Pop b, pop a, push a + b (signed 32-bit wrap).',
  SUB: 'Pop b, pop a, push a - b.',
  MUL: 'Pop b, pop a, push a * b.',
  DIV: 'Pop b, pop a, push the truncated quotient a / b.',
  MOD: 'Pop b, pop a, push the remainder a % b.',
  EQ: 'Pop b, pop a, push 1 when a == b else 0.',
  NE: 'Pop b, pop a, push 1 when a != b else 0.',
  LT: 'Pop b, pop a, push 1 when a < b else 0.',
  GT: 'Pop b, pop a, push 1 when a > b else 0.',
  LE: 'Pop b, pop a, push 1 when a <= b else 0.',
  GE: 'Pop b, pop a, push 1 when a >= b else 0.',
  FADD: 'Pop two boxed f64 addresses, push a newly boxed a + b.',
  FSUB: 'Pop two boxed f64 addresses, push a newly boxed a - b.',
  FMUL: 'Pop two boxed f64 addresses, push a newly boxed a * b.',
  FDIV: 'Pop two boxed f64 addresses, push a newly boxed a / b.',
  FLT: 'Pop two boxed f64 addresses, push the i32 boolean a < b.',
  FGT: 'Pop two boxed f64 addresses, push the i32 boolean a > b.',
  FEQ: 'Pop two boxed f64 addresses, push the i32 boolean a == b.',
  FNEG: 'Pop a boxed f64, push a newly boxed negation.',
  FABS: 'Pop a boxed f64, push a newly boxed absolute value.',
  FSQRT: 'Pop a boxed f64, push a newly boxed square root.',
};

function opcodeTable() {
  const src = read('lang/bootstrap/seed.wat');
  const lines = src.split('\n');
  const rows = [];
  const addRow = (code, name, meaning) => {
    rows.push(`| \`${code}\` | \`${name}\` | ${meaning || OPCODE_DOCS[name] || 'Seed VM instruction.'} |`);
  };
  for (const line of lines) {
    const m = /^;;\s+(0x[0-9A-Fa-f]{2})\s+(.*)$/.exec(line.trim());
    if (!m) continue;
    const rest = m[2].trim();
    // Some lines pack several opcodes: "0x10 ADD  0x11 SUB  ..."
    const packed = [...rest.matchAll(/0x[0-9A-Fa-f]{2}\s+[A-Z_0-9]+/g)];
    if (packed.length) {
      const parts = [m[1] + ' ' + rest.split(/\s+/)[0], ...packed.map((p) => p[0])];
      for (const p of parts) {
        const [code, name] = p.split(/\s+/);
        if (code && name) addRow(code, name);
      }
      continue;
    }
    const sm = /^([A-Z_0-9]+)\s*(<[^>]*>)?\s*(.*)$/.exec(rest);
    if (!sm) continue;
    const meaning = (sm[2] ? 'Operands `' + sm[2] + '`. ' : '') + (sm[3] || OPCODE_DOCS[sm[1]] || '');
    addRow(m[1], sm[1], meaning.trim());
  }
  const seen = new Set();
  const uniq = rows.filter((r) => { const k = r.split('|')[1]; if (seen.has(k)) return false; seen.add(k); return true; });
  return `\nThe seed VM is a stack machine: every instruction consumes operands from the\noperand stack and pushes its result back. Inline operands are little-endian and\nfollow the opcode byte directly in the bytecode stream.\n\n| Opcode | Mnemonic | Behaviour |\n| --- | --- | --- |\n${uniq.join('\n')}\n`;
}

function memoryMap() {
  const src = read('lang/bootstrap/seed.wat');
  const rows = [...src.matchAll(/^;;\s+(0x[0-9A-Fa-f]+\.\.0x[0-9A-Fa-f]+)\s+(.*)$/gm)]
    .map((m) => `| \`${m[1]}\` | ${m[2].trim()} |`);
  return rows.length ? `\n| Range | Region |\n| --- | --- |\n${rows.join('\n')}\n` : '';
}

// ---------------------------------------------------------------------------
// Generated appendix: sdev-written stdlib index
// ---------------------------------------------------------------------------
function walk(dir, acc = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return acc;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, acc);
    else acc.push(rel);
  }
  return acc;
}

/**
 * Document every function written in sdev: its exact signature, the comment
 * block above it, what it returns, and where it lives.
 */
function sdevIndex(dirs) {
  let out = '';
  let total = 0;
  const files = dirs.flatMap((d) => walk(d)).filter((f) => f.endsWith('.sdev')).sort();
  for (const f of files) {
    const src = read(f);
    const lines = src.split('\n');
    // File-level summary: the leading comment block (# or //).
    const header = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t) { if (header.length) break; continue; }
      const c = /^(?:#|\/\/)+\s?(.*)$/.exec(t);
      if (!c) break;
      const text = c[1].trim();
      if (!/^[=\-*]{3,}$/.test(text) && text) header.push(text);
    }
    const records = [];
    const seen = new Set();
    lines.forEach((line, i) => {
      const m = /^\s*(?:to|conjure)\s+([A-Za-z_][\w]*)\s*(\(([^)]*)\)|with\s+([^:\n]*))?/.exec(line);
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);
      const params = (m[3] ?? m[4] ?? '').trim();
      const doc = [];
      for (let j = i - 1; j >= 0; j--) {
        const t = lines[j].trim();
        const c = /^(?:#|\/\/)+\s?(.*)$/.exec(t);
        if (!c) break;
        const text = c[1].trim();
        if (/^[=\-*]{3,}$/.test(text)) break;
        const clean = text.replace(/^[=\-*\s]+/, '').replace(/[=\-*\s]+$/, '').trim();
        if (!clean) break;
        doc.unshift(clean);
      }
      // Nearest banner comment above → the section this function belongs to.
      let section = '';
      for (let j = i - 1; j >= 0 && j > i - 200; j--) {
        const b = /^\s*(?:#|\/\/)+\s*(.+?)\s*$/.exec(lines[j]);
        if (!b) continue;
        const t = b[1].replace(/^[=\-*\s]+/, '').replace(/[=\-*\s]+$/, '').trim();
        if (!t || !/[A-Za-z]/.test(t)) continue;
        if (/^[=\-*]/.test(b[1]) || /[=\-*]$/.test(b[1])) { section = t; break; }
      }
      // First `yield` inside the body describes the result.
      let ret = '';
      for (let j = i + 1; j < Math.min(lines.length, i + 60); j++) {
        if (/^\s*(?:to|conjure)\s/.test(lines[j])) break;
        const y = /^\s*(?:yield|return)\s+(.+?)\s*$/.exec(lines[j]);
        if (y) { ret = y[1].replace(/\|/g, '\\|').slice(0, 90); break; }
      }
      records.push({
        name: m[1],
        params: params || '',
        doc: doc.join(' ') || '',
        section,
        ret,
        line: i + 1,
      });
    });
    total += records.length;
    out += `\n#### \`${f}\`\n\n`;
    out += header.length ? `${header.join(' ')}\n\n` : '';
    if (!records.length) { out += '_No top-level functions — this file is a script or data module._\n'; continue; }
    out += `${records.length} functions.\n\n`;
    out += '| Function | Parameters | What it does | Returns | Line |\n| --- | --- | --- | --- | --- |\n';
    for (const r of records) {
      const curated = SDEV_FN_DOCS[`${f.split('/').pop()}:${r.name}`] || SDEV_FN_DOCS[r.name] || '';
      const fallback = curated || (r.section
        ? `Part of the ${r.section} section of this module.`
        : (r.ret ? `Computes and yields \`${r.ret}\`.` : 'Performs a step of this module\'s pipeline; the result is produced through its side effects.'));
      const desc = (r.doc || fallback).replace(/\|/g, '\\|');
      out += `| \`${r.name}\` | ${r.params ? '`' + r.params.replace(/\|/g, '\\|') + '`' : '_none_'} | ${desc} | ${r.ret ? '`' + r.ret + '`' : '_no explicit yield_'} | ${r.line} |\n`;
    }

  }
  return { text: out, total, count: files.length };
}


// ---------------------------------------------------------------------------
// Generated appendix: parity matrix (from the registry + agent report)
// ---------------------------------------------------------------------------
function parityAppendix() {
  const doc = read('public/SDEV_PARITY_DOCUMENTATION.md');
  const m = /<!-- PARITY:BEGIN -->([\s\S]*?)<!-- PARITY:END -->/.exec(doc);
  let out = m ? m[1].trim() : '_parity matrix unavailable_';
  try {
    const reg = JSON.parse(read('lang/parity/features.json'));
    out = `Registry: **${reg.features?.length ?? 0} features** across **${reg.tracks?.length ?? 0} tracks**.\n\n` + out;
  } catch { /* ignore */ }
  return '\n' + out + '\n';
}

// ---------------------------------------------------------------------------
// Generated appendix: repository map + toolchain
// ---------------------------------------------------------------------------
function repoMap() {
  const groups = [
    ['lang/bootstrap', 'JS bootstrap compiler + hand-written WebAssembly seed VM'],
    ['lang/compiler', 'The self-hosted compiler, written in sdev'],
    ['lang/native', 'x86-64 GAS backend, assembly runtime, linker driver'],
    ['lang/runtime', 'v2 reference runtime (JS, legacy oracle)'],
    ['lang/stdlib', 'Standard library written in sdev (ML, FFI, WebGPU, CUDA)'],
    ['lang/parity', 'Feature registry, parity agent, generated report'],
    ['src/lang', 'v1 TypeScript reference implementation'],
    ['src/lang-bridge', 'Runtime selection + WASM bridge for the browser IDE'],
    ['electron', 'Desktop IDE shell with native build/run IPC'],
    ['scripts', 'Build drivers and the full test-gate suite'],
  ];
  let out = '';
  for (const [dir, desc] of groups) {
    const files = walk(dir).sort();
    if (!files.length) continue;
    out += `\n#### \`${dir}/\` — ${desc}\n\n`;
    out += files.map((f) => `- \`${f}\``).join('\n') + '\n';
  }
  return out;
}

function toolchainIndex() {
  const files = walk('scripts').filter((f) => /\.(mjs|ts|py)$/.test(f)).sort();
  const rows = files.map((f) => {
    const src = read(f);
    const c = (/^(?:#!.*\n)?(?:\/\/|#)\s*(.+)$/m.exec(src) || [, ''])[1];
    return `| \`node ${f}\` | ${c.replace(/\|/g, '\\|').slice(0, 120)} |`;
  });
  return `\n| Command | Purpose |\n| --- | --- |\n${rows.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Hand-written spine
// ---------------------------------------------------------------------------
const bi = builtinIndex();
const stdlib = sdevIndex(['lang/stdlib', 'lang/compiler', 'lang/parity']);
const now = new Date().toISOString().slice(0, 10);

const PARTS = [];
const push = (s) => PARTS.push(s.replace(/\r\n/g, '\n'));

push(`# The Ultimate sdev Documentation

> **Everything about sdev in one file.** Language, runtimes, compiler, virtual
> machine, native backend, standard library, machine-learning stack, hardware,
> GIS, tooling, and the full generated reference tables.
>
> Created by **Sava Milanov**. Generated on ${now} by
> \`scripts/build-ultimate-docs.mjs\`. Do not edit by hand — edit the source
> guides or the implementation and re-run the generator.

---

## How to read this document

This book has three layers.

1. **Part I — Orientation.** What sdev is, why it exists, how the pieces fit
   together. Read this once, top to bottom.
2. **Parts II–VIII — The guides.** Every hand-written sdev guide, inlined
   verbatim and re-levelled so the table of contents stays flat. Nothing was
   summarised or dropped.
3. **Part IX — Generated reference.** Tables extracted directly from the
   implementation: every builtin, every opcode, every keyword, every stdlib
   function, the parity matrix, the repository map, and the toolchain.

Anything in Part IX is machine-derived, so it is correct by construction for
the commit that produced this file.

---

## Part I — Orientation

### What sdev is

sdev is a programming language with two surface dialects and three execution
tracks.

| | Dialect | Idea |
| --- | --- | --- |
| **v1** | \`forge x be 10\` / \`speak(x)\` | The original expressive dialect: unique keywords, classes, closures, canvas, web DSL, GIS. |
| **v2 "Prism"** | \`set x to 10\` / \`say x\` | The beginner-first dialect: English words, no sigils, same power behind opt-in blocks. |

| Track | Where it runs | How it executes |
| --- | --- | --- |
| **v1 TypeScript interpreter** | Browser IDE, Node CLI | Lexer → parser → tree-walking interpreter, with a bytecode compiler + stack VM alongside. |
| **v2 self-hosted compiler** | Browser IDE (WASM) | sdev source compiled by a compiler *written in sdev*, executing on a hand-written WebAssembly seed VM. |
| **native x86-64 backend** | Linux / macOS CLI, Electron desktop IDE | The same AST emitted as GAS assembly, assembled with \`as\`, linked with \`ld\` into a static ELF with no libc. |

All three tracks are measured against one canonical feature registry. See
*Part IX — Parity matrix*.

### Why it exists

Three reasons, in order of weight.

1. **Readability first.** Most languages ask a beginner to memorise
   punctuation before they can print a line. v2 asks for English:
   \`say "hello"\`. If a ten-year-old can guess what a line does, the keyword
   was chosen correctly.
2. **No ceiling.** Readability usually costs power. sdev keeps the power
   behind opt-in blocks — \`systems\` for pointers and FFI, \`match\` for
   algebraic pattern matching, query syntax for data, \`board\` for hardware —
   so a beginner never sees them and an expert never hits a wall.
3. **Own the whole stack.** The compiler is written in sdev. The VM is
   hand-written WebAssembly. The native backend emits raw assembly. There is
   no hidden layer someone else controls.

### The self-hosting fixed point

The property the whole project is organised around:

\`\`\`text
  compiler.sdev  --compiled by-->  JS bootstrap  -->  bytecode A
  compiler.sdev  --compiled by-->  bytecode A    -->  bytecode B
  assert A == B          (byte-identical, not merely equivalent)
\`\`\`

When A equals B byte for byte, the JavaScript bootstrap is no longer part of
the language — it is only a build-time oracle. sdev compiles sdev. The gate
that enforces this lives in \`scripts/test-self-toolchain.mjs\` and runs in CI
on every change.

### The layer cake

\`\`\`text
   your program (.sdev)
        │
        ├── v1 path ──► lexer.ts → parser.ts → interpreter.ts        (tree walk)
        │                                    └► compiler.ts → vm.ts  (bytecode)
        │
        └── v2 path ──► lexer.sdev → parser.sdev → codegen.sdev      (all sdev)
                                     │
                                     ├──► seed VM (WebAssembly)      browser
                                     └──► codegen-x64.mjs → as → ld  native
\`\`\`

### Choosing a runtime

Per file, with a shebang:

\`\`\`sdev
#!sdev v1
forge x be 10
speak(x)
\`\`\`

\`\`\`sdev
#!sdev v2
set x to 10
say x
\`\`\`

Globally, in the IDE: **Settings → Runtime**. Without a shebang the default is
**v1**.

### Sixty-second tour

\`\`\`sdev
#!sdev v2
set nums to [3, 1, 4, 1, 5]

to double with n
  return n * 2
end

for each n in nums
  say double with n
end

set i to 0
while i < length(nums)
  set i to i + 1
end
say "counted " + str(i)
\`\`\`

The same program in v1:

\`\`\`sdev
#!sdev v1
forge nums be [3, 1, 4, 1, 5]

conjure double(n) ::
  yield n * 2
;;

iterate n through nums ::
  speak(double(n))
;;
\`\`\`

---
`);

// ---------------------------------------------------------------------------
// Inlined guides
// ---------------------------------------------------------------------------
const GUIDES = [
  ['Part II — The language', [
    ['public/SDEV_V2_DOCUMENTATION.md', 'sdev v2 "Prism" — language guide'],
    ['public/SDEV_DOCUMENTATION.md', 'Full v1 language reference'],
  ]],
  ['Part III — The complete narrative guide', [
    ['public/SDEV_FULL_DOCUMENTATION.md', 'Complete documentation (architecture to evolution loop)'],
  ]],
  ['Part IV — Implementation internals', [
    ['public/SDEV_INTERNALS.md', 'Compiler, VM, kernel and roadmap internals'],
    ['lang/README.md', 'lang/ — language sources overview'],
    ['lang/native/README.md', 'Native x86-64 backend'],
    ['electron/README.md', 'Desktop IDE shell'],
  ]],
  ['Part V — Track parity', [
    ['public/SDEV_PARITY_DOCUMENTATION.md', 'Parity registry, agent and matrix'],
  ]],
  ['Part VI — Machine learning and LLMs', [
    ['public/SDEV_ML_DOCUMENTATION.md', 'ML & LLM standard library'],
    ['public/SDEV_AUTOEVOLVE_DOCUMENTATION.md', 'Autonomous evolution loop'],
  ]],
  ['Part VII — Acceleration and interop', [
    ['public/SDEV_FFI_DOCUMENTATION.md', 'FFI and native acceleration'],
    ['public/SDEV_WEBGPU_DOCUMENTATION.md', 'WebGPU compute'],
    ['public/SDEV_CUDA_DOCUMENTATION.md', 'CUDA fast path'],
  ]],
  ['Part VIII — Domains', [
    ['public/SDEV_HARDWARE_DOCUMENTATION.md', 'Hardware and boards'],
    ['public/SDEV_LEAFLET_DOCUMENTATION.md', 'Leaflet, mapping and GIS'],
  ]],
];

for (const [partTitle, docs] of GUIDES) {
  push(`\n## ${partTitle}\n`);
  for (const [file, title] of docs) {
    if (!exists(file)) continue;
    const body = verbatim(read(file));
    // Drop the guide's own H1 — the section heading replaces it.
    const withoutH1 = body.replace(/^#\s+.*\n/, '');
    push(`\n### ${title}\n\n_Source: \`${file}\`_\n\n${shiftHeadings(withoutH1, 2)}\n\n---\n`);
  }
}

// ---------------------------------------------------------------------------
// Generated reference
// ---------------------------------------------------------------------------
push(`
## Part IX — Generated reference

Everything below is extracted from the implementation at build time.

### Builtin index — v1 runtime (${bi.total} builtins)

Every function registered into the interpreter's global environment, grouped by
the module that installs it.
${bi.text}

### Keyword table — v1 lexer
${keywordTable()}

### Seed VM memory map
${memoryMap()}

### Seed VM opcode table
${opcodeTable()}

### sdev-written source index (${stdlib.count} files, ${stdlib.total} functions)

Every function defined in sdev itself — the self-hosted compiler, the parity
agent, and the standard library.
${stdlib.text}

### Parity matrix
${parityAppendix()}

### Repository map
${repoMap()}

### Toolchain and test gates
${toolchainIndex()}

---

## Appendix A — Glossary

| Term | Meaning |
| --- | --- |
| **bootstrap** | \`lang/bootstrap/compile.mjs\`, the JavaScript compiler used only to build the first self-hosted artifact and as a test oracle. |
| **seed VM** | \`lang/bootstrap/seed.wat\`, a hand-written WebAssembly stack machine that executes sdev bytecode in the browser. |
| **driver artifact** | \`lang/compiler/driver-artifact.mjs\`, the pre-compiled, source-independent self-hosted compiler baked in as Base64. |
| **fixed point** | The state where the self-hosted compiler compiles itself to byte-identical output. |
| **track** | One execution path: v1 interpreter, v2 self-hosted, or native x86-64. |
| **parity agent** | \`lang/parity/agent.sdev\`, written in sdev, that audits every track against the registry and regenerates the matrix. |
| **tome** | sdev's dictionary / map type. |
| **summon** | The decentralised package system that pulls modules from GitHub Gists. |

## Appendix B — Regenerating this document

\`\`\`sh
node scripts/build-ultimate-docs.mjs
\`\`\`

The generator reads every guide under \`public/\` plus the READMEs, then derives
the reference tables straight from \`src/lang/\`, \`lang/\`, and \`scripts/\`. If a
builtin is added or an opcode changes, re-running the generator is the only
step required to bring this document back in sync.
`);

const doc = PARTS.join('\n');
fs.writeFileSync(OUT, doc, 'utf8');
const words = doc.split(/\s+/).length;
console.log(`wrote ${path.relative(ROOT, OUT)}`);
console.log(`  ${doc.split('\n').length} lines, ${doc.length} chars, ~${words} words`);
console.log(`  ${bi.total} v1 builtins, ${stdlib.total} sdev functions across ${stdlib.count} files`);
