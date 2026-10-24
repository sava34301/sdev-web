// ============================================================================
// SDEV Canonical API & Diagnostic Registry
// ----------------------------------------------------------------------------
// Single source of truth for all SDEV language functions, stdlib primitives,
// graphics/turtle/UI/web/kernel/hardware APIs, target capability matrices,
// deprecation metadata, "Did you mean?" typo/alias resolution, and structured
// diagnostic codes (SDEV001–SDEV015).
// ============================================================================

import { createBuiltins } from '../builtins';
import { createAdvancedBuiltins } from '../advanced';
import { createMatrixBuiltins } from '../matrix';
import { createGraphicsBuiltins } from '../graphics';
import { createUiBuiltins } from '../ui';
import { createWebBuiltins } from '../web';
import { createKernelBuiltins } from '../kernel';
import { ARDUINO_FUNCTIONS } from '../hardware/arduino-api';
import { SDEV_BUILTINS } from '../../components/ide/languageData';

export type ApiModule =
  | 'core'
  | 'text'
  | 'list'
  | 'tome'
  | 'math'
  | 'matrix'
  | 'graphics'
  | 'turtle'
  | 'ui'
  | 'web'
  | 'leaflet'
  | 'kernel'
  | 'hardware'
  | 'ml'
  | 'ffi'
  | 'webgpu';

export type ApiTarget =
  | 'v1'
  | 'v2-wasm'
  | 'native-x64'
  | 'browser'
  | 'cli'
  | 'hardware';

export type ApiStatus = 'implemented' | 'partial' | 'planned';

export const API_MODULES: ApiModule[] = [
  'core',
  'text',
  'list',
  'tome',
  'math',
  'matrix',
  'graphics',
  'turtle',
  'ui',
  'web',
  'leaflet',
  'kernel',
  'hardware',
  'ml',
  'ffi',
  'webgpu',
];

export const API_TARGETS: ApiTarget[] = [
  'v1',
  'v2-wasm',
  'native-x64',
  'browser',
  'cli',
  'hardware',
];

export interface ApiParam {
  name: string;
  type: string;
  optional?: boolean;
  defaultValue?: string;
  description?: string;
}

export interface ApiDeprecation {
  since: string;
  replacement: string;
  reason: string;
}

export interface ApiEntry {
  name: string;
  aliases: string[];
  module: ApiModule;
  signature: string;
  params: ApiParam[];
  returns: string;
  description: string;
  example: string;
  sinceVersion: string;
  deprecated?: ApiDeprecation;
  targets: ApiTarget[];
  status: ApiStatus;
}

export interface DiagnosticCatalogueEntry {
  code: string;
  title: string;
  severity: 'error' | 'warning' | 'info';
  category: 'syntax' | 'semantic' | 'target' | 'style' | 'deprecation';
  explanation: string;
  badExample: string;
  goodExample: string;
  fixHint: string;
}

// ----------------------------------------------------------------------------
// Target capability presets
// ----------------------------------------------------------------------------

const UNIVERSAL_TARGETS: ApiTarget[] = ['v1', 'v2-wasm', 'native-x64', 'browser', 'cli'];
const V1_V2_TARGETS: ApiTarget[] = ['v1', 'v2-wasm', 'browser', 'cli'];
const V1_CORE_TARGETS: ApiTarget[] = ['v1', 'browser', 'cli'];
const BROWSER_ONLY_TARGETS: ApiTarget[] = ['v1', 'browser'];
const CLI_NATIVE_TARGETS: ApiTarget[] = ['v1', 'cli', 'native-x64'];
const HARDWARE_TARGETS: ApiTarget[] = ['hardware'];
const HARDWARE_AND_V1_TARGETS: ApiTarget[] = ['hardware', 'v1', 'browser', 'cli'];

// Native x86-64 supported builtin set (mirrors lang/native/codegen-x64.mjs)
const NATIVE_X64_BUILTINS = new Set<string>([
  'speak', 'say', 'print', 'println', 'whisper', 'shout',
  'measure', 'len', 'length', 'ord', 'chr', 'str', 'int', 'num', 'morph',
  'upper', 'lower', 'trim', 'replace', 'portion', 'shatter', 'split', 'weave', 'join',
  'contains', 'indexOf', 'has', 'keys', 'inscriptions', 'values', 'contents',
  'gather', 'push', 'pluck', 'pop', 'sequence', 'range', 'sum',
  'abs', 'magnitude', 'min', 'least', 'max', 'greatest',
  'sqrt', 'root', 'floor', 'ground', 'ceil', 'elevate', 'round', 'nearby',
  'sin', 'cos', 'tan', 'exp', 'log', 'ln', 'pow', 'random', 'chaos', 'rand',
  'read_file', 'write_file', 'fileExists', 'appendFile', 'input', 'now',
]);

// Self-hosted v2-wasm supported builtin set
const V2_WASM_BUILTINS = new Set<string>([
  ...NATIVE_X64_BUILTINS,
  'each', 'sift', 'fold', 'reverse', 'sort', 'clone',
  'etch', 'unetch', 'essence', 'gettype', 'typeof',
  'lines', 'unlines', 'words', 'char_at', 'code_at', 'find_from', 'find_last',
  'leading_space', 'is_letter', 'is_digit', 'is_space', 'is_name',
  'regex_test', 'regex_capture', 'regex_find_all', 'regex_replace',
  'evaluate', 'quote_text',
]);

// ----------------------------------------------------------------------------
// Curated API metadata overrides & stdlib/roadmap entries
// ----------------------------------------------------------------------------

type CuratedSeed = Partial<ApiEntry> & { name: string };

const CURATED_SEEDS: CuratedSeed[] = [
  // ── Core I/O & Type Conversions ──────────────────────────────────────────
  {
    name: 'speak',
    aliases: ['say', 'print', 'println'],
    module: 'core',
    signature: 'speak(...values: any) -> void',
    params: [{ name: '...values', type: 'any', description: 'Values to format and print separated by spaces' }],
    returns: 'void',
    description: 'Print one or more values to standard output, separated by spaces.',
    example: 'forge greeting be "Hello, sdev!"\nspeak(greeting, 42)',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'say',
    aliases: ['speak'],
    module: 'core',
    signature: 'say(...values: any) -> void',
    params: [{ name: '...values', type: 'any', description: 'Values to print to output' }],
    returns: 'void',
    description: 'v2 plain-English alias for speak(). Outputs values separated by spaces.',
    example: 'say("Result:", 10 + 20)',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'whisper',
    aliases: [],
    module: 'core',
    signature: 'whisper(...values: any) -> void',
    params: [{ name: '...values', type: 'any', description: 'Values concatenated without spaces' }],
    returns: 'void',
    description: 'Output values concatenated directly with no separator.',
    example: 'whisper("a", "b", "c") // outputs "abc"',
    targets: V1_CORE_TARGETS,
  },
  {
    name: 'shout',
    aliases: [],
    module: 'core',
    signature: 'shout(...values: any) -> void',
    params: [{ name: '...values', type: 'any', description: 'Values printed in UPPERCASE' }],
    returns: 'void',
    description: 'Print values to standard output converted to uppercase.',
    example: 'shout("warning: system hot")',
    targets: V1_CORE_TARGETS,
  },
  {
    name: 'input',
    aliases: [],
    module: 'core',
    signature: 'input(prompt?: text) -> text',
    params: [{ name: 'prompt', type: 'text', optional: true, defaultValue: '""', description: 'Prompt shown to the user' }],
    returns: 'text',
    description: 'Prompt the user and read a line of text input.',
    example: 'forge name be input("What is your name? ")\nspeak("Welcome,", name)',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'measure',
    aliases: ['len'],
    module: 'core',
    signature: 'measure(collection: text | list | tome) -> number',
    params: [{ name: 'collection', type: 'text | list | tome', description: 'String, list, or tome to measure' }],
    returns: 'number',
    description: 'Return the character count of a string, item count of a list, or key count of a tome.',
    example: 'speak(measure([10, 20, 30])) // 3',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'morph',
    aliases: ['str', 'int', 'num'],
    module: 'core',
    signature: 'morph(value: any, targetType: "number" | "text" | "truth") -> any',
    params: [
      { name: 'value', type: 'any', description: 'Value to convert' },
      { name: 'targetType', type: '"number" | "text" | "truth"', description: 'Target type name' },
    ],
    returns: 'number | text | truth',
    description: 'Explicitly convert a value between number, text, and truth (boolean).',
    example: 'forge n be morph("42", "number")\nspeak(n + 8) // 50',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'essence',
    aliases: ['gettype', 'typeof', 'type'],
    module: 'core',
    signature: 'essence(value: any) -> text',
    params: [{ name: 'value', type: 'any', description: 'Value to inspect' }],
    returns: 'text',
    description: 'Return the canonical SDEV type name of a value ("number", "text", "truth", "list", "tome", "conjuration", "void").',
    example: 'speak(essence([1, 2, 3])) // "list"',
    targets: V1_V2_TARGETS,
  },
  {
    name: 'sequence',
    aliases: ['range'],
    module: 'list',
    signature: 'sequence(startOrEnd: number, end?: number, step?: number) -> list<number>',
    params: [
      { name: 'startOrEnd', type: 'number', description: 'Stop value (if 1 arg) or start value (if 2-3 args)' },
      { name: 'end', type: 'number', optional: true, description: 'Exclusive stop value' },
      { name: 'step', type: 'number', optional: true, defaultValue: '1', description: 'Increment step (non-zero)' },
    ],
    returns: 'list<number>',
    description: 'Generate a list of numbers in an arithmetic progression.',
    example: 'iterate i through sequence(1, 5) ::\n  speak(i)\n;;',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'each',
    aliases: [],
    module: 'list',
    signature: 'each(items: list, transform: (item, index?) -> any) -> list',
    params: [
      { name: 'items', type: 'list', description: 'Input list' },
      { name: 'transform', type: 'conjuration', description: 'Mapping function applied to each element' },
    ],
    returns: 'list',
    description: 'Transform every element of a list with a function and return the new list.',
    example: 'forge doubled be each([1, 2, 3], x -> x * 2)\nspeak(doubled)',
    targets: V1_V2_TARGETS,
  },
  {
    name: 'sift',
    aliases: [],
    module: 'list',
    signature: 'sift(items: list, predicate: (item) -> truth) -> list',
    params: [
      { name: 'items', type: 'list', description: 'Input list' },
      { name: 'predicate', type: 'conjuration', description: 'Filter predicate returning yep/nope' },
    ],
    returns: 'list',
    description: 'Keep only the elements of a list for which predicate(item) returns truthy.',
    example: 'forge evens be sift([1, 2, 3, 4], x -> x % 2 equals 0)\nspeak(evens)',
    targets: V1_V2_TARGETS,
  },
  {
    name: 'fold',
    aliases: [],
    module: 'list',
    signature: 'fold(items: list, initial: any, reducer: (acc, item) -> any) -> any',
    params: [
      { name: 'items', type: 'list', description: 'Input list' },
      { name: 'initial', type: 'any', description: 'Initial accumulator value' },
      { name: 'reducer', type: 'conjuration', description: 'Accumulator function (acc, item) -> nextAcc' },
    ],
    returns: 'any',
    description: 'Reduce a list to a single value by successively applying reducer(acc, item).',
    example: 'forge total be fold([1, 2, 3, 4], 0, (acc, x) -> acc + x)\nspeak(total) // 10',
    targets: V1_V2_TARGETS,
  },
  {
    name: 'gather',
    aliases: ['push'],
    module: 'list',
    signature: 'gather(items?: list, value?: any) -> list',
    params: [
      { name: 'items', type: 'list', optional: true, description: 'Target list to append to (omit to create empty list)' },
      { name: 'value', type: 'any', optional: true, description: 'Element to append' },
    ],
    returns: 'list',
    description: 'Append an item to a list (or return a new empty list when called with 0 arguments).',
    example: 'forge xs be [1, 2]\ngather(xs, 3)\nspeak(xs) // [1, 2, 3]',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'pluck',
    aliases: ['pop'],
    module: 'list',
    signature: 'pluck(items: list, valueToAppend?: any) -> any',
    params: [
      { name: 'items', type: 'list', description: 'Target list' },
      { name: 'valueToAppend', type: 'any', optional: true, description: 'Optional value to push in ML dialect mode' },
    ],
    returns: 'any',
    description: 'Remove and return the last element of a list (or append when given 2 arguments in stdlib mode).',
    example: 'forge xs be [10, 20, 30]\nforge lastItem be pluck(xs)\nspeak(lastItem, xs)',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'portion',
    aliases: ['snatch'],
    module: 'list',
    signature: 'portion(seq: list | text, start: number, end?: number) -> list | text',
    params: [
      { name: 'seq', type: 'list | text', description: 'List or string to slice' },
      { name: 'start', type: 'number', description: 'Start index (0-based)' },
      { name: 'end', type: 'number', optional: true, description: 'Optional exclusive end index' },
    ],
    returns: 'list | text',
    description: 'Extract a slice of a list or substring of text from start to end.',
    example: 'speak(portion("sdev-lang", 0, 4)) // "sdev"',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'weave',
    aliases: ['join'],
    module: 'text',
    signature: 'weave(items: list, separator: text) -> text',
    params: [
      { name: 'items', type: 'list', description: 'List of values to join' },
      { name: 'separator', type: 'text', description: 'Delimiter inserted between elements' },
    ],
    returns: 'text',
    description: 'Join all elements of a list into a single string separated by separator.',
    example: 'speak(weave(["a", "b", "c"], "-")) // "a-b-c"',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'shatter',
    aliases: ['split'],
    module: 'text',
    signature: 'shatter(str: text, separator: text) -> list<text>',
    params: [
      { name: 'str', type: 'text', description: 'Input string' },
      { name: 'separator', type: 'text', description: 'Delimiter to split on' },
    ],
    returns: 'list<text>',
    description: 'Split a string by separator into a list of substrings.',
    example: 'speak(shatter("one,two,three", ","))',
    targets: UNIVERSAL_TARGETS,
  },

  // ── Math ──────────────────────────────────────────────────────────────────
  {
    name: 'magnitude',
    aliases: ['abs'],
    module: 'math',
    signature: 'magnitude(n: number) -> number',
    params: [{ name: 'n', type: 'number', description: 'Numeric value' }],
    returns: 'number',
    description: 'Return the absolute value |n| of a number.',
    example: 'speak(magnitude(-42)) // 42',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'least',
    aliases: ['min'],
    module: 'math',
    signature: 'least(...values: number[]) -> number',
    params: [{ name: '...values', type: 'number | list<number>', description: 'Numbers or a single list of numbers' }],
    returns: 'number',
    description: 'Return the smallest number among the arguments or list.',
    example: 'speak(least(4, 1, 9, -2)) // -2',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'greatest',
    aliases: ['max'],
    module: 'math',
    signature: 'greatest(...values: number[]) -> number',
    params: [{ name: '...values', type: 'number | list<number>', description: 'Numbers or a single list of numbers' }],
    returns: 'number',
    description: 'Return the largest number among the arguments or list.',
    example: 'speak(greatest(4, 1, 9, -2)) // 9',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'root',
    aliases: ['sqrt'],
    module: 'math',
    signature: 'root(n: number) -> number',
    params: [{ name: 'n', type: 'number', description: 'Non-negative number' }],
    returns: 'number',
    description: 'Compute the principal square root of n.',
    example: 'speak(root(81)) // 9',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'ground',
    aliases: ['floor'],
    module: 'math',
    signature: 'ground(n: number) -> number',
    params: [{ name: 'n', type: 'number', description: 'Number to floor' }],
    returns: 'number',
    description: 'Round a number down toward negative infinity.',
    example: 'speak(ground(3.9)) // 3',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'elevate',
    aliases: ['ceil'],
    module: 'math',
    signature: 'elevate(n: number) -> number',
    params: [{ name: 'n', type: 'number', description: 'Number to ceiling' }],
    returns: 'number',
    description: 'Round a number up toward positive infinity.',
    example: 'speak(elevate(3.1)) // 4',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'nearby',
    aliases: ['round'],
    module: 'math',
    signature: 'nearby(n: number) -> number',
    params: [{ name: 'n', type: 'number', description: 'Number to round' }],
    returns: 'number',
    description: 'Round a number to the nearest integer.',
    example: 'speak(nearby(3.6)) // 4',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'chaos',
    aliases: ['random', 'rand'],
    module: 'math',
    signature: 'chaos() -> number',
    params: [],
    returns: 'number',
    description: 'Generate a pseudo-random floating-point number in [0, 1).',
    example: 'speak(chaos())',
    targets: UNIVERSAL_TARGETS,
  },

  // ── Tome (Dict) & JSON ───────────────────────────────────────────────────
  {
    name: 'inscriptions',
    aliases: ['keys', 'tome_keys'],
    module: 'tome',
    signature: 'inscriptions(t: tome) -> list<text>',
    params: [{ name: 't', type: 'tome', description: 'Dictionary/tome to inspect' }],
    returns: 'list<text>',
    description: 'Return a list of all keys in a tome.',
    example: 'forge user be { name: "Ada", role: "admin" }\nspeak(inscriptions(user))',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'contents',
    aliases: ['values'],
    module: 'tome',
    signature: 'contents(t: tome) -> list<any>',
    params: [{ name: 't', type: 'tome', description: 'Dictionary/tome to inspect' }],
    returns: 'list<any>',
    description: 'Return a list of all values stored in a tome.',
    example: 'forge user be { name: "Ada", role: "admin" }\nspeak(contents(user))',
    targets: UNIVERSAL_TARGETS,
  },
  {
    name: 'etch',
    aliases: [],
    module: 'tome',
    signature: 'etch(value: any) -> text',
    params: [{ name: 'value', type: 'any', description: 'Value to serialize' }],
    returns: 'text',
    description: 'Serialize an SDEV value into a JSON string.',
    example: 'speak(etch({ score: 100, active: yep }))',
    targets: V1_V2_TARGETS,
  },
  {
    name: 'unetch',
    aliases: [],
    module: 'tome',
    signature: 'unetch(json: text) -> any',
    params: [{ name: 'json', type: 'text', description: 'Valid JSON string' }],
    returns: 'any',
    description: 'Parse a JSON string into an SDEV value (tome, list, number, text, truth, void).',
    example: 'forge data be unetch("{\\"x\\": 10}")\nspeak(data["x"])',
    targets: V1_V2_TARGETS,
  },

  // ── Deprecated Legacy Aliases (for linter SDEV008 checks) ────────────────
  {
    name: 'print',
    aliases: [],
    module: 'core',
    signature: 'print(...values: any) -> void',
    params: [{ name: '...values', type: 'any', description: 'Values to print' }],
    returns: 'void',
    description: 'Legacy alias for speak(). Prefer canonical speak() or v2 say().',
    example: 'speak("Prefer speak() over print()")',
    targets: UNIVERSAL_TARGETS,
    deprecated: {
      since: '1.2.0',
      replacement: 'speak',
      reason: 'Use canonical `speak(...)` or `say(...)` for cross-dialect consistency.',
    },
  },
  {
    name: 'println',
    aliases: [],
    module: 'core',
    signature: 'println(...values: any) -> void',
    params: [{ name: '...values', type: 'any', description: 'Values to print' }],
    returns: 'void',
    description: 'Legacy alias for speak(). Prefer canonical speak() or v2 say().',
    example: 'speak("Hello, world!")',
    targets: UNIVERSAL_TARGETS,
    deprecated: {
      since: '1.2.0',
      replacement: 'speak',
      reason: 'speak() already appends a newline; use `speak(...)` instead of `println(...)`.',
    },
  },
  {
    name: 'typeof',
    aliases: [],
    module: 'core',
    signature: 'typeof(value: any) -> text',
    params: [{ name: 'value', type: 'any', description: 'Value to inspect' }],
    returns: 'text',
    description: 'JavaScript-style alias for essence() / gettype().',
    example: 'speak(essence(42))',
    targets: V1_V2_TARGETS,
    deprecated: {
      since: '1.2.0',
      replacement: 'essence',
      reason: 'Use `essence(val)` or `gettype(val)` in canonical SDEV.',
    },
  },

  // ── Graphics & Canvas ────────────────────────────────────────────────────
  {
    name: 'canvas',
    aliases: [],
    module: 'graphics',
    signature: 'canvas(width: number, height: number) -> void',
    params: [
      { name: 'width', type: 'number', description: 'Canvas width in pixels' },
      { name: 'height', type: 'number', description: 'Canvas height in pixels' },
    ],
    returns: 'void',
    description: 'Initialize the 2D drawing canvas with the specified pixel dimensions.',
    example: 'canvas(400, 400)\nclear("#0d0d15")',
    targets: BROWSER_ONLY_TARGETS,
  },
  {
    name: 'rect',
    aliases: [],
    module: 'graphics',
    signature: 'rect(x: number, y: number, width: number, height: number, radius?: number) -> void',
    params: [
      { name: 'x', type: 'number', description: 'Top-left X coordinate' },
      { name: 'y', type: 'number', description: 'Top-left Y coordinate' },
      { name: 'width', type: 'number', description: 'Rectangle width' },
      { name: 'height', type: 'number', description: 'Rectangle height' },
      { name: 'radius', type: 'number', optional: true, defaultValue: '0', description: 'Optional corner radius' },
    ],
    returns: 'void',
    description: 'Draw a filled and/or stroked rectangle on the canvas.',
    example: 'canvas(400, 400)\nfill("#00ff88")\nrect(50, 50, 120, 80, 8)',
    targets: BROWSER_ONLY_TARGETS,
  },
  {
    name: 'circle',
    aliases: [],
    module: 'graphics',
    signature: 'circle(x: number, y: number, radius: number) -> void',
    params: [
      { name: 'x', type: 'number', description: 'Center X coordinate' },
      { name: 'y', type: 'number', description: 'Center Y coordinate' },
      { name: 'radius', type: 'number', description: 'Circle radius in pixels' },
    ],
    returns: 'void',
    description: 'Draw a circle centered at (x, y) with the given radius.',
    example: 'canvas(400, 400)\nfill("#38bdf8")\ncircle(200, 200, 60)',
    targets: BROWSER_ONLY_TARGETS,
  },

  // ── UI Toolkit ───────────────────────────────────────────────────────────
  {
    name: 'window',
    aliases: [],
    module: 'ui',
    signature: 'window(title?: text, width?: number, height?: number) -> void',
    params: [
      { name: 'title', type: 'text', optional: true, defaultValue: '"sdev App"', description: 'Window title' },
      { name: 'width', type: 'number', optional: true, defaultValue: '480', description: 'Window width' },
      { name: 'height', type: 'number', optional: true, defaultValue: '600', description: 'Window height' },
    ],
    returns: 'void',
    description: 'Create a declarative UI window rendered in the App Preview panel.',
    example: 'window("Counter App")\nheading("Hello UI")\nbutton("Click me", () -> speak("Clicked!"))\nendwindow()',
    targets: BROWSER_ONLY_TARGETS,
  },

  // ── ML Stdlib (lang/stdlib/ml/*.sdev) ────────────────────────────────────
  {
    name: 'tensor',
    aliases: [],
    module: 'ml',
    signature: 'tensor(data: list<number>, shape: list<number>) -> tome',
    params: [
      { name: 'data', type: 'list<number>', description: 'Flat f64 element list' },
      { name: 'shape', type: 'list<number>', description: 'Dimension sizes, e.g. [rows, cols]' },
    ],
    returns: 'tome',
    description: 'Construct an N-dimensional tensor tome for the SDEV ML stdlib.',
    example: 'forge w be tensor([1.0, 2.0, 3.0, 4.0], [2, 2])\nspeak(w.shape)',
    targets: ['v1', 'v2-wasm', 'native-x64', 'browser', 'cli'],
    status: 'implemented',
  },
  {
    name: 'tensor_grad',
    aliases: [],
    module: 'ml',
    signature: 'tensor_grad(data: list<number>, shape: list<number>) -> tome',
    params: [
      { name: 'data', type: 'list<number>', description: 'Flat f64 element list' },
      { name: 'shape', type: 'list<number>', description: 'Dimension sizes' },
    ],
    returns: 'tome',
    description: 'Construct a differentiable tensor with zero-initialized gradient buffer (`requires_grad: yep`).',
    example: 'forge x be tensor_grad([0.5, -1.2], [2, 1])',
    targets: ['v1', 'v2-wasm', 'native-x64', 'browser', 'cli'],
    status: 'implemented',
  },
  {
    name: 'zeros',
    aliases: [],
    module: 'ml',
    signature: 'zeros(shape: list<number>) -> tome',
    params: [{ name: 'shape', type: 'list<number>', description: 'Tensor shape dimensions' }],
    returns: 'tome',
    description: 'Create a tensor filled with 0.0 of the specified shape.',
    example: 'forge z be zeros([3, 3])',
    targets: ['v1', 'v2-wasm', 'native-x64', 'browser', 'cli'],
    status: 'implemented',
  },
  {
    name: 'ones',
    aliases: [],
    module: 'ml',
    signature: 'ones(shape: list<number>) -> tome',
    params: [{ name: 'shape', type: 'list<number>', description: 'Tensor shape dimensions' }],
    returns: 'tome',
    description: 'Create a tensor filled with 1.0 of the specified shape.',
    example: 'forge o be ones([2, 4])',
    targets: ['v1', 'v2-wasm', 'native-x64', 'browser', 'cli'],
    status: 'implemented',
  },
  {
    name: 'randn',
    aliases: [],
    module: 'ml',
    signature: 'randn(shape: list<number>) -> tome',
    params: [{ name: 'shape', type: 'list<number>', description: 'Tensor shape dimensions' }],
    returns: 'tome',
    description: 'Create a tensor sampled from a standard normal distribution N(0, 1) via Box-Muller transform.',
    example: 'forge weights be randn([4, 4])',
    targets: ['v1', 'v2-wasm', 'native-x64', 'browser', 'cli'],
    status: 'implemented',
  },

  {
    name: 'determinant',
    aliases: ['det'],
    module: 'matrix',
    signature: 'determinant(m: list<list<number>>) -> number',
    params: [{ name: 'm', type: 'list<list<number>>', description: 'Square 2D matrix' }],
    returns: 'number',
    description: 'Compute the determinant of a square matrix.',
    example: 'forge d be determinant([[1, 2], [3, 4]])',
    targets: ['v1', 'browser', 'cli'],
    status: 'implemented',
  },
  {
    name: 'nn_dense',
    aliases: ['linear_layer'],
    module: 'ml',
    signature: 'nn_dense(in_features: number, out_features: number) -> tome',
    params: [
      { name: 'in_features', type: 'number', description: 'Input feature dimension' },
      { name: 'out_features', type: 'number', description: 'Output feature dimension' },
    ],
    returns: 'tome',
    description: 'Create a trainable dense (fully-connected) neural network layer with weights and bias tensors.',
    example: 'forge layer be nn_dense(4, 8)',
    targets: ['v1', 'v2-wasm', 'native-x64', 'browser', 'cli'],
    status: 'implemented',
  },

  // ── WebGPU Stdlib (lang/stdlib/webgpu.sdev) ──────────────────────────────
  {
    name: 'wgpu_init',
    aliases: ['gpu_init', '__wgpu_request_device'],
    module: 'webgpu',
    signature: 'wgpu_init() -> number',
    params: [],
    returns: 'number',
    description: 'Request a WebGPU adapter/device handle in the browser (returns 0 when falling back to CPU).',
    example: 'forge dev be wgpu_init()',
    targets: ['v1', 'v2-wasm', 'browser'],
    status: 'partial',
  },
  {
    name: 'wgpu_matmul',
    aliases: ['gpu_matmul'],
    module: 'webgpu',
    signature: 'wgpu_matmul(a: tome, b: tome) -> tome',
    params: [
      { name: 'a', type: 'tome', description: 'Left 2D tensor' },
      { name: 'b', type: 'tome', description: 'Right 2D tensor' },
    ],
    returns: 'tome',
    description: 'Execute WGSL compute-shader matrix multiplication on WebGPU, with automatic CPU fallback.',
    example: 'forge c be wgpu_matmul(a, b)',
    targets: ['v1', 'v2-wasm', 'browser'],
    status: 'partial',
  },

  // ── Leaflet / Geo Visualization (Planned / Partial Roadmap) ──────────────
  {
    name: 'leaflet_map',
    aliases: ['map_view', 'geoMap'],
    module: 'leaflet',
    signature: 'leaflet_map(lat: number, lng: number, zoom?: number) -> tome',
    params: [
      { name: 'lat', type: 'number', description: 'Initial latitude' },
      { name: 'lng', type: 'number', description: 'Initial longitude' },
      { name: 'zoom', type: 'number', optional: true, defaultValue: '12', description: 'Initial zoom level' },
    ],
    returns: 'tome',
    description: 'Create an interactive Leaflet map widget inside the Web/App preview panel.',
    example: 'forge m be leaflet_map(42.6977, 23.3219, 13)',
    targets: ['browser'],
    status: 'planned',
  },
  {
    name: 'leaflet_marker',
    aliases: ['geoMarker'],
    module: 'leaflet',
    signature: 'leaflet_marker(map: tome, lat: number, lng: number, label?: text) -> void',
    params: [
      { name: 'map', type: 'tome', description: 'Map handle from leaflet_map()' },
      { name: 'lat', type: 'number', description: 'Marker latitude' },
      { name: 'lng', type: 'number', description: 'Marker longitude' },
      { name: 'label', type: 'text', optional: true, description: 'Popup label text' },
    ],
    returns: 'void',
    description: 'Place a geographic pin marker on a Leaflet map instance.',
    example: 'leaflet_marker(m, 42.6977, 23.3219, "Sofia")',
    targets: ['browser'],
    status: 'planned',
  },
];

// ----------------------------------------------------------------------------
// Common cross-language & typo aliases for "Did you mean?" suggestions
// ----------------------------------------------------------------------------

export const COMMON_API_ALIASES: Record<string, string> = {
  // Graphics aliases
  fillrect: 'rect',
  fill_rect: 'rect',
  drawrect: 'rect',
  draw_rect: 'rect',
  strokerect: 'rect',
  rectangle: 'rect',
  box: 'rect',
  fillcircle: 'circle',
  drawcircle: 'circle',
  drawline: 'line',
  drawtext: 'text',
  filltext: 'text',
  clearrect: 'clear',
  cls: 'clear',
  bgcolor: 'background',
  strokeweight: 'lineWidth',
  strokewidth: 'lineWidth',

  // Output / Console aliases
  println: 'speak',
  printf: 'speak',
  puts: 'speak',
  echo: 'speak',
  'console.log': 'speak',
  console_log: 'speak',
  writeline: 'speak',
  log_line: 'speak',

  // Collection / String aliases
  len: 'measure',
  length: 'measure',
  size: 'measure',
  count_items: 'measure',
  push: 'gather',
  append: 'gather',
  add: 'gather',
  pop: 'pluck',
  shift: 'pluck',
  filter: 'sift',
  where: 'sift',
  select_if: 'sift',
  reduce: 'fold',
  inject: 'fold',
  accumulate: 'fold',
  map: 'each',
  foreach: 'each',
  slice: 'portion',
  substr: 'portion',
  substring: 'portion',
  split: 'shatter',
  explode: 'shatter',
  join: 'weave',
  implode: 'weave',

  // Math aliases
  sqrt: 'root',
  abs: 'magnitude',
  floor: 'ground',
  ceil: 'elevate',
  round: 'nearby',
  rand: 'chaos',
  min: 'least',
  max: 'greatest',

  // Type & Dict aliases
  typeof: 'essence',
  type_of: 'essence',
  type: 'essence',
  cast: 'morph',
  convert: 'morph',
  stringify: 'etch',
  to_json: 'etch',
  json_stringify: 'etch',
  parse_json: 'unetch',
  from_json: 'unetch',
  json_parse: 'unetch',
  dict_keys: 'inscriptions',
  dict_values: 'contents',

  // Host / Network
  fetch: 'invoke',
  http_request: 'invoke',
  readfile: 'read_file',
  readfilesync: 'read_file',
  writefile: 'write_file',
  writefilesync: 'write_file',
};

// ----------------------------------------------------------------------------
// Dynamic Harvesting + Classification
// ----------------------------------------------------------------------------

function parseSignatureParams(signature: string): ApiParam[] {
  const open = signature.indexOf('(');
  const close = signature.lastIndexOf(')');
  if (open < 0 || close <= open) return [];
  const rawInside = signature.slice(open + 1, close).trim();
  if (!rawInside) return [];
  return rawInside.split(',').map((part) => {
    const clean = part.trim().replace(/^\[|\]$/g, '');
    const optional = clean.includes('?') || part.includes('[');
    const [namePart, typePart] = clean.split(':').map((s) => s.trim());
    const name = namePart.replace(/\?$/, '');
    return {
      name: name || 'arg',
      type: typePart || (name.startsWith('...') ? 'any[]' : 'any'),
      optional,
    };
  });
}

function classifyCoreBuiltinModule(name: string): ApiModule {
  if (name.startsWith('ffi_')) return 'ffi';
  if (
    [
      'upper', 'lower', 'trim', 'trimLeft', 'trimRight', 'replace',
      'startswith', 'endswith', 'starts', 'ends', 'repeat', 'padleft',
      'padright', 'padLeft', 'padRight', 'charAt', 'indexOf', 'lastIndexOf',
      'capitalize', 'title', 'center', 'isUpper', 'isLower', 'isDigit',
      'isAlpha', 'isAlphaNum', 'isSpace', 'chr', 'ord', 'base64encode',
      'base64decode', 'locate', 'chars', 'format', 'shatter', 'weave',
      'lines', 'unlines', 'words', 'char_at', 'code_at', 'find_from',
      'find_last', 'leading_space', 'is_letter', 'is_digit', 'is_space',
      'is_name', 'regex_test', 'regex_capture', 'regex_find_all',
      'regex_replace', 'quote_text', 'match', 'matchAll', 'replaceRegex',
      'test', 'len',
    ].includes(name)
  ) {
    return 'text';
  }
  if (
    [
      'sequence', 'range', 'each', 'sift', 'fold', 'gather', 'pluck',
      'portion', 'snatch', 'insert', 'remove', 'concat', 'flatten',
      'zip', 'unzip', 'first', 'last', 'rest', 'take', 'drop', 'sum',
      'product', 'average', 'mean', 'sort', 'sortDesc', 'unique', 'count',
      'all', 'any', 'find', 'seek', 'every', 'some', 'enumerate',
      'difference', 'union', 'intersect', 'position', 'chunk', 'groupBy',
      'clone', 'reverse', 'push', 'pop',
    ].includes(name)
  ) {
    return 'list';
  }
  if (
    [
      'inscriptions', 'contents', 'has', 'get', 'set', 'del', 'merge',
      'entries', 'fromEntries', 'keys', 'values', 'tome_keys', 'etch',
      'unetch', 'erase', 'freeze', 'isFrozen', 'Map', 'Set', 'Queue',
      'Stack', 'LinkedList',
    ].includes(name)
  ) {
    return 'tome';
  }
  if (
    [
      'magnitude', 'least', 'greatest', 'root', 'ground', 'elevate',
      'nearby', 'chaos', 'random', 'rand', 'randint', 'pick', 'shuffle',
      'clamp', 'constrain', 'lerp', 'mapRange', 'sign', 'pow', 'sin',
      'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh',
      'tanh', 'log', 'ln', 'log10', 'log2', 'exp', 'PI', 'TAU', 'E',
      'INFINITY', 'hex', 'oct', 'bin', 'parseNum', 'toFixed', 'toPrecision',
      'isNaN', 'isFinite', 'isInteger', 'bitAnd', 'bitOr', 'bitXor',
      'bitNot', 'bitShiftLeft', 'bitShiftRight', 'dist', 'radians',
      'degrees', 'abs', 'min', 'max', 'floor', 'ceil', 'round', 'sqrt',
      'Vec2', 'evaluate',
    ].includes(name)
  ) {
    return 'math';
  }
  return 'core';
}

function classifyGraphicsModule(name: string): ApiModule {
  if (
    [
      'turtle', 'forward', 'backward', 'left', 'right', 'penup',
      'pendown', 'pencolor', 'penwidth', 'goto', 'home', 'setheading',
      'heading', 'pos', 'turtleCircle', 'dot', 'stamp',
    ].includes(name)
  ) {
    return 'turtle';
  }
  return 'graphics';
}

function computeTargetsFor(name: string, module: ApiModule): ApiTarget[] {
  if (module === 'graphics' || module === 'turtle' || module === 'ui' || module === 'web') {
    return BROWSER_ONLY_TARGETS;
  }
  if (module === 'leaflet') {
    return ['browser'];
  }
  if (module === 'hardware') {
    return HARDWARE_TARGETS;
  }
  if (module === 'ffi') {
    return CLI_NATIVE_TARGETS;
  }
  if (module === 'webgpu') {
    return ['v1', 'v2-wasm', 'browser'];
  }
  const targets = new Set<ApiTarget>(['v1', 'browser', 'cli']);
  if (V2_WASM_BUILTINS.has(name)) targets.add('v2-wasm');
  if (NATIVE_X64_BUILTINS.has(name)) targets.add('native-x64');
  return Array.from(targets);
}

function buildRegistry(): ApiEntry[] {
  const byName = new Map<string, ApiEntry>();

  // Index languageData docs for quick enrichment
  const langDocMap = new Map<string, (typeof SDEV_BUILTINS)[number]>();
  for (const b of SDEV_BUILTINS) {
    langDocMap.set(b.name, b);
  }

  // Index curated seeds
  const curatedMap = new Map<string, CuratedSeed>();
  for (const seed of CURATED_SEEDS) {
    curatedMap.set(seed.name, seed);
  }

  const upsert = (
    name: string,
    module: ApiModule,
    defaults: Partial<ApiEntry> = {}
  ) => {
    const curated = curatedMap.get(name);
    const langDoc = langDocMap.get(name);
    const existing = byName.get(name);

    const finalModule = curated?.module ?? existing?.module ?? module;
    const signature =
      curated?.signature ??
      defaults.signature ??
      existing?.signature ??
      langDoc?.signature ??
      `${name}(...args)`;
    const description =
      curated?.description ??
      defaults.description ??
      existing?.description ??
      langDoc?.doc ??
      `Built-in ${finalModule} function \`${name}()\`.`;
    const params =
      curated?.params ??
      defaults.params ??
      existing?.params ??
      parseSignatureParams(signature);
    const returns =
      curated?.returns ??
      defaults.returns ??
      existing?.returns ??
      (signature.includes('->') ? signature.split('->').pop()!.trim() : 'any');
    const targets =
      curated?.targets ??
      defaults.targets ??
      existing?.targets ??
      computeTargetsFor(name, finalModule);
    const status: ApiStatus =
      curated?.status ?? defaults.status ?? existing?.status ?? 'implemented';
    const aliases = Array.from(
      new Set([...(existing?.aliases ?? []), ...(defaults.aliases ?? []), ...(curated?.aliases ?? [])])
    );
    const example =
      curated?.example ??
      defaults.example ??
      existing?.example ??
      `${name}()`;

    byName.set(name, {
      name,
      aliases,
      module: finalModule,
      signature,
      params,
      returns,
      description,
      example,
      sinceVersion: curated?.sinceVersion ?? defaults.sinceVersion ?? existing?.sinceVersion ?? '1.0.0',
      ...(curated?.deprecated || defaults.deprecated || existing?.deprecated
        ? { deprecated: curated?.deprecated ?? defaults.deprecated ?? existing?.deprecated }
        : {}),
      targets,
      status,
    });
  };

  // 1. Harvest core builtins (createBuiltins)
  const coreBuiltins = createBuiltins(() => {});
  for (const name of coreBuiltins.keys()) {
    upsert(name, classifyCoreBuiltinModule(name));
  }

  // 2. Harvest advanced builtins (createAdvancedBuiltins)
  const advBuiltins = createAdvancedBuiltins(() => {});
  for (const name of advBuiltins.keys()) {
    upsert(name, classifyCoreBuiltinModule(name));
  }

  // 3. Harvest matrix builtins (createMatrixBuiltins)
  const matrixBuiltins = createMatrixBuiltins();
  for (const name of matrixBuiltins.keys()) {
    upsert(name, 'matrix', {
      targets: V1_CORE_TARGETS,
      description: `Matrix linear algebra operation \`${name}()\`.`,
    });
  }

  // 4. Harvest graphics & turtle builtins (createGraphicsBuiltins)
  const nopTurtle = { x: 0, y: 0, angle: 0, penDown: true, color: '#fff', width: 1 };
  const gfxBuiltins = createGraphicsBuiltins(
    () => {},
    () => nopTurtle,
    () => {}
  );
  for (const name of gfxBuiltins.keys()) {
    if (byName.has(name) && ['math', 'core'].includes(byName.get(name)!.module)) {
      continue;
    }
    const mod = classifyGraphicsModule(name);
    upsert(name, mod, {
      targets: BROWSER_ONLY_TARGETS,
      returns: 'void',
    });
  }

  // 5. Harvest UI toolkit builtins (createUiBuiltins)
  const uiBuiltins = createUiBuiltins(
    () => {},
    () => 0
  );
  for (const name of uiBuiltins.keys()) {
    if (name === 'input') {
      // `input` is already a core builtin (and overloaded in UI mode)
      const existing = byName.get('input');
      if (existing && !existing.targets.includes('browser')) {
        existing.targets.push('browser');
      }
      continue;
    }
    upsert(name, 'ui', {
      targets: BROWSER_ONLY_TARGETS,
      returns: name === 'uiget' ? 'any' : 'void',
    });
  }

  // 6. Harvest Web DSL builtins (createWebBuiltins)
  const webBuiltins = createWebBuiltins(() => {});
  for (const name of webBuiltins.keys()) {
    // Skip every generated open_<tag> / end_<tag> / html_<tag> except representative ones
    // so the registry stays clean while still registering all primary web tags and html_div/html_input/html_button.
    if (
      (name.startsWith('open_') || name.startsWith('end_') || name.startsWith('html_')) &&
      !['html_div', 'html_input', 'html_button', 'open_div', 'end_div', 'open_form', 'end_form'].includes(name)
    ) {
      continue;
    }
    if (byName.has(name)) continue;
    upsert(name, 'web', {
      targets: BROWSER_ONLY_TARGETS,
      signature: `${name}(textOrAttrs?, attrs?) -> void`,
      returns: 'void',
      description: `Emit or manage HTML/CSS/JS in the SDEV Web Preview panel via \`${name}()\`.`,
    });
  }

  // 7. Harvest Kernel builtins (createKernelBuiltins)
  const { builtins: kernelBuiltins } = createKernelBuiltins(() => {});
  for (const name of kernelBuiltins.keys()) {
    if (byName.has(name)) continue;
    upsert(name, 'kernel', {
      targets: V1_CORE_TARGETS,
      description: `SDEV OS virtual kernel primitive \`${name}()\`.`,
    });
  }

  // 8. Harvest IDE languageData builtins (SDEV_BUILTINS)
  for (const b of SDEV_BUILTINS) {
    const modMap: Record<typeof b.category, ApiModule> = {
      io: 'core',
      math: 'math',
      string: 'text',
      list: 'list',
      graphics: 'graphics',
      turtle: 'turtle',
      ui: 'ui',
      oop: 'tome',
      sys: 'core',
      type: 'core',
      web: 'web',
    };
    upsert(b.name, modMap[b.category] ?? 'core', {
      signature: b.signature,
      description: b.doc,
    });
  }

  // 9. Harvest Arduino Hardware API (ARDUINO_FUNCTIONS)
  for (const fn of ARDUINO_FUNCTIONS) {
    if (byName.has(fn.name)) {
      const existing = byName.get(fn.name)!;
      if (!existing.targets.includes('hardware')) {
        existing.targets = [...existing.targets, 'hardware'];
      }
      continue;
    }
    upsert(fn.name, 'hardware', {
      signature: `${fn.signature} -> ${fn.returns}`,
      returns: fn.returns,
      description: fn.summary,
      example: fn.sdev ?? fn.signature,
      targets: HARDWARE_AND_V1_TARGETS.filter((t) => t === 'hardware'),
      status: 'implemented',
    });
  }

  // 10. Apply curated seeds that aren't in runtime maps (e.g. ML, WebGPU, Leaflet roadmap items)
  for (const seed of CURATED_SEEDS) {
    upsert(seed.name, seed.module ?? 'core', seed);
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export const API_REGISTRY: ApiEntry[] = buildRegistry();

// Fast lookup index (lowercase name/alias -> ApiEntry)
const EXACT_INDEX = new Map<string, ApiEntry>();
const LOWER_INDEX = new Map<string, ApiEntry>();

for (const entry of API_REGISTRY) {
  EXACT_INDEX.set(entry.name, entry);
  LOWER_INDEX.set(entry.name.toLowerCase(), entry);
  for (const alias of entry.aliases) {
    if (!EXACT_INDEX.has(alias)) EXACT_INDEX.set(alias, entry);
    if (!LOWER_INDEX.has(alias.toLowerCase())) LOWER_INDEX.set(alias.toLowerCase(), entry);
  }
}

// ----------------------------------------------------------------------------
// Lookup, Search & "Did you mean?" Helpers
// ----------------------------------------------------------------------------

export function getApiRegistry(): ApiEntry[] {
  return API_REGISTRY;
}

export function findApi(name: string): ApiEntry | undefined {
  if (!name) return undefined;
  return EXACT_INDEX.get(name) ?? LOWER_INDEX.get(name.toLowerCase());
}

export interface SearchApiFilters {
  module?: ApiModule | 'all';
  target?: ApiTarget | 'all';
  status?: ApiStatus | 'all';
  includeDeprecated?: boolean;
}

export function searchApis(query: string = '', filters: SearchApiFilters = {}): ApiEntry[] {
  const q = query.trim().toLowerCase();
  const { module = 'all', target = 'all', status = 'all', includeDeprecated = true } = filters;

  return API_REGISTRY.filter((entry) => {
    if (!includeDeprecated && entry.deprecated) return false;
    if (module !== 'all' && entry.module !== module) return false;
    if (target !== 'all' && !entry.targets.includes(target)) return false;
    if (status !== 'all' && entry.status !== status) return false;
    if (!q) return true;

    const haystacks = [
      entry.name.toLowerCase(),
      ...entry.aliases.map((a) => a.toLowerCase()),
      entry.module.toLowerCase(),
      entry.signature.toLowerCase(),
      entry.description.toLowerCase(),
    ];
    return haystacks.some((h) => h.includes(q));
  }).sort((a, b) => {
    if (!q) return a.name.localeCompare(b.name);
    const aExact = a.name.toLowerCase() === q ? 0 : a.name.toLowerCase().startsWith(q) ? 1 : 2;
    const bExact = b.name.toLowerCase() === q ? 0 : b.name.toLowerCase().startsWith(q) ? 1 : 2;
    if (aExact !== bExact) return aExact - bExact;
    return a.name.localeCompare(b.name);
  });
}

export function levenshteinDistance(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  const dp: number[][] = Array.from({ length: s.length + 1 }, () =>
    new Array<number>(t.length + 1).fill(0)
  );
  for (let i = 0; i <= s.length; i++) dp[i][0] = i;
  for (let j = 0; j <= t.length; j++) dp[0][j] = j;

  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
      // Damerau transposition
      if (
        i > 1 &&
        j > 1 &&
        s[i - 1] === t[j - 2] &&
        s[i - 2] === t[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[s.length][t.length];
}

export interface ApiSuggestion {
  entry: ApiEntry;
  matchedName: string;
  distance: number;
  reason: 'alias' | 'typo' | 'prefix';
}

export function suggestNearestApis(
  unknownName: string,
  maxDistance: number = 3
): ApiSuggestion[] {
  const raw = unknownName.trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();

  const suggestions: ApiSuggestion[] = [];
  const seenEntries = new Set<string>();

  // 1. Direct common alias check (e.g. fillrect -> rect, println -> speak, console.log -> speak)
  const mappedTarget = COMMON_API_ALIASES[raw] ?? COMMON_API_ALIASES[lower];
  if (mappedTarget) {
    const targetEntry = findApi(mappedTarget);
    if (targetEntry) {
      suggestions.push({
        entry: targetEntry,
        matchedName: targetEntry.name,
        distance: 0,
        reason: 'alias',
      });
      seenEntries.add(targetEntry.name);
    }
  }

  // 2. Check common alias keys by Levenshtein distance (e.g. `pushe` -> `push` -> `gather` or `push`)
  for (const [aliasKey, canonicalTarget] of Object.entries(COMMON_API_ALIASES)) {
    const d = levenshteinDistance(lower, aliasKey);
    if (d <= Math.min(2, maxDistance)) {
      const directEntry = findApi(aliasKey);
      if (directEntry && !seenEntries.has(directEntry.name)) {
        suggestions.push({
          entry: directEntry,
          matchedName: directEntry.name,
          distance: d,
          reason: d === 0 ? 'alias' : 'typo',
        });
        seenEntries.add(directEntry.name);
      }
      const canonicalEntry = findApi(canonicalTarget);
      if (canonicalEntry && !seenEntries.has(canonicalEntry.name)) {
        suggestions.push({
          entry: canonicalEntry,
          matchedName: canonicalEntry.name,
          distance: d,
          reason: 'alias',
        });
        seenEntries.add(canonicalEntry.name);
      }
    }
  }

  // 3. Levenshtein & prefix scan across all registered entries and their aliases
  for (const entry of API_REGISTRY) {
    if (seenEntries.has(entry.name)) continue;
    const candidates = [entry.name, ...entry.aliases];
    let bestDist = Infinity;
    let bestMatch = entry.name;

    for (const c of candidates) {
      const d = levenshteinDistance(lower, c.toLowerCase());
      if (d < bestDist) {
        bestDist = d;
        bestMatch = c;
      }
    }

    if (bestDist <= maxDistance) {
      suggestions.push({
        entry,
        matchedName: entry.name,
        distance: bestDist,
        reason: bestDist === 0 ? 'alias' : 'typo',
      });
      seenEntries.add(entry.name);
    } else if (
      lower.length >= 3 &&
      (entry.name.toLowerCase().startsWith(lower) || lower.startsWith(entry.name.toLowerCase()))
    ) {
      suggestions.push({
        entry,
        matchedName: entry.name,
        distance: Math.abs(entry.name.length - lower.length),
        reason: 'prefix',
      });
      seenEntries.add(entry.name);
    }
  }

  return suggestions
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.reason !== b.reason) {
        const order = { alias: 0, typo: 1, prefix: 2 };
        return order[a.reason] - order[b.reason];
      }
      return a.entry.name.localeCompare(b.entry.name);
    })
    .slice(0, 5);
}

export function getApisForTarget(target: ApiTarget): ApiEntry[] {
  return API_REGISTRY.filter((entry) => entry.targets.includes(target));
}

export function exportApiManifest() {
  const byModule: Record<string, number> = {};
  const byTarget: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const entry of API_REGISTRY) {
    byModule[entry.module] = (byModule[entry.module] ?? 0) + 1;
    byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
    for (const t of entry.targets) {
      byTarget[t] = (byTarget[t] ?? 0) + 1;
    }
  }

  return {
    version: '1.3.0',
    generatedAt: new Date().toISOString(),
    totalApis: API_REGISTRY.length,
    byModule,
    byTarget,
    byStatus,
    entries: API_REGISTRY,
    diagnostics: DIAGNOSTIC_LIST,
  };
}

// ----------------------------------------------------------------------------
// Diagnostic Catalogue (SDEV001 through SDEV015)
// ----------------------------------------------------------------------------

export const DIAGNOSTIC_CATALOGUE: Record<string, DiagnosticCatalogueEntry> = {
  SDEV001: {
    code: 'SDEV001',
    title: 'Unbalanced or unclosed block delimiter',
    severity: 'error',
    category: 'syntax',
    explanation:
      'Every block opened with `::` (or `{` in sdev:ai / board blocks) must be closed with a matching `;;` (or `}`). Check indentation or missing `;;` at the end of a function, loop, or conditional.',
    badExample: 'ponder score > 10 ::\n  speak("High score!")\n// missing ;;',
    goodExample: 'ponder score > 10 ::\n  speak("High score!")\n;;',
    fixHint: 'Add the matching `;;` block closer or remove the extra `;;`.',
  },
  SDEV002: {
    code: 'SDEV002',
    title: 'Syntax or parser error',
    severity: 'error',
    category: 'syntax',
    explanation:
      'The SDEV lexer or parser encountered an unexpected token, malformed expression, or unterminated string literal.',
    badExample: 'forge msg be "unterminated string\nspeak(msg)',
    goodExample: 'forge msg be "terminated string"\nspeak(msg)',
    fixHint: 'Check matching quotes, parentheses `()`, brackets `[]`, and statement keywords on the reported line.',
  },
  SDEV003: {
    code: 'SDEV003',
    title: 'Division or modulo by zero',
    severity: 'error',
    category: 'semantic',
    explanation:
      'Dividing or taking the remainder by literal `0` (`/ 0` or `% 0`) causes a runtime arithmetic error or undefined result.',
    badExample: 'forge ratio be total / 0',
    goodExample: 'ponder divisor differs 0 ::\n  forge ratio be total / divisor\n;;',
    fixHint: 'Guard the denominator with `ponder divisor differs 0` before dividing.',
  },
  SDEV004: {
    code: 'SDEV004',
    title: 'Unreachable code after control-flow terminator',
    severity: 'warning',
    category: 'semantic',
    explanation:
      'Statements placed immediately after `yield` (`return`), `yeet` (`break`), `skip` (`continue`), or `hurl` (`raise`) inside the same block will never execute.',
    badExample: 'conjure calc(x) ::\n  yield x * 2\n  speak("never reached")\n;;',
    goodExample: 'conjure calc(x) ::\n  speak("computing...")\n  yield x * 2\n;;',
    fixHint: 'Move the unreachable statements before `yield`/`yeet`/`skip` or remove them.',
  },
  SDEV005: {
    code: 'SDEV005',
    title: 'Unused variable declaration',
    severity: 'warning',
    category: 'semantic',
    explanation:
      'A variable was declared with `forge` / `let` / `set` but its value is never read anywhere in the program. Prefix intentional throwaway variables with `_`.',
    badExample: 'forge unusedTemp be 99\nspeak("hello")',
    goodExample: 'forge _unusedTemp be 99\nspeak("hello")',
    fixHint: 'Remove the unused variable, reference it, or prefix its name with `_`.',
  },
  SDEV006: {
    code: 'SDEV006',
    title: 'Unknown function or builtin call',
    severity: 'error',
    category: 'semantic',
    explanation:
      'The called function is not defined in the current file or in the canonical SDEV API registry. It may be a typo or a foreign-language function name (e.g. `fillrect` instead of `rect`, `println` instead of `speak`).',
    badExample: 'fillrect(10, 10, 100, 50)\nprintln("done")',
    goodExample: 'rect(10, 10, 100, 50)\nspeak("done")',
    fixHint: 'Replace the unknown call with the suggested SDEV builtin or declare it with `conjure`.',
  },
  SDEV007: {
    code: 'SDEV007',
    title: 'Target capability mismatch',
    severity: 'error',
    category: 'target',
    explanation:
      'The called builtin belongs to a module not supported on the selected compilation/execution target (for example, calling browser-only `canvas()` or `window()` when targeting `native-x64` or `cli`).',
    badExample: '// Target: native-x64\ncanvas(400, 400)\nrect(0, 0, 100, 100)',
    goodExample: '// Target: browser\ncanvas(400, 400)\nrect(0, 0, 100, 100)',
    fixHint: 'Switch the target runtime to `browser` / `v1`, or guard target-specific calls.',
  },
  SDEV008: {
    code: 'SDEV008',
    title: 'Deprecated builtin or legacy keyword alias',
    severity: 'warning',
    category: 'deprecation',
    explanation:
      'This function or keyword spelling is deprecated or a legacy compatibility alias. Prefer the canonical SDEV builtin for forward compatibility across v1, v2-wasm, and native-x64.',
    badExample: 'println("hello")\nforge t be typeof(42)',
    goodExample: 'speak("hello")\nforge t be essence(42)',
    fixHint: 'Replace the deprecated call with its canonical replacement shown in the diagnostic.',
  },
  SDEV009: {
    code: 'SDEV009',
    title: 'Assignment syntax mismatch (`=` instead of `be`)',
    severity: 'warning',
    category: 'style',
    explanation:
      'In canonical SDEV, variable declarations and assignments use `be` (`forge x be 10`, `x be 20`) rather than `=`. (`=` is only standard inside `!#ai` dialect files).',
    badExample: 'forge x = 10\nx = 20',
    goodExample: 'forge x be 10\nx be 20',
    fixHint: 'Replace `=` with `be` (or add `!#ai` at the top of the file to use the AI dialect).',
  },
  SDEV010: {
    code: 'SDEV010',
    title: 'Foreign declaration keyword (`function` / `const` / `var`)',
    severity: 'warning',
    category: 'style',
    explanation:
      'JavaScript/Python declaration keywords like `function`, `const`, or `var` are not canonical SDEV. Use `conjure` (or `to`) for functions and `forge` (or `let`) for variables.',
    badExample: 'function add(a, b) ::\n  yield a + b\n;;',
    goodExample: 'conjure add(a, b) ::\n  yield a + b\n;;',
    fixHint: 'Use `conjure name(params) :: ... ;;` for functions and `forge name be value` for variables.',
  },
  SDEV011: {
    code: 'SDEV011',
    title: 'Builtin argument count (arity) mismatch',
    severity: 'error',
    category: 'semantic',
    explanation:
      'A canonical SDEV builtin was called with fewer or more arguments than its signature allows.',
    badExample: 'forge n be measure()\ncircle(100, 100)',
    goodExample: 'forge n be measure([1, 2, 3])\ncircle(100, 100, 50)',
    fixHint: 'Check the function signature in `sdev explain <name>` or the Runtime Explorer panel.',
  },
  SDEV012: {
    code: 'SDEV012',
    title: 'Declaration shadows a core SDEV builtin',
    severity: 'warning',
    category: 'semantic',
    explanation:
      'Declaring a variable or function with the same name as a core SDEV builtin (such as `speak`, `measure`, `gather`, `sift`) shadows the builtin in that scope and can break subsequent calls.',
    badExample: 'forge measure be 10\nspeak(measure([1, 2])) // fails!',
    goodExample: 'forge totalMeasure be 10\nspeak(measure([1, 2]))',
    fixHint: 'Rename the variable so it does not shadow a built-in function.',
  },
  SDEV013: {
    code: 'SDEV013',
    title: 'Constant condition in conditional or loop',
    severity: 'warning',
    category: 'semantic',
    explanation:
      'A `ponder` (`if`) or `cycle` (`while`) condition is a constant literal (`yep`, `nope`, `true`, `false`), making a branch either unconditionally taken, dead, or an infinite loop.',
    badExample: 'ponder nope ::\n  speak("never runs")\n;;',
    goodExample: 'ponder isReady ::\n  speak("ready!")\n;;',
    fixHint: 'Replace the constant literal with a dynamic condition or remove the dead branch.',
  },
  SDEV014: {
    code: 'SDEV014',
    title: 'Self-assignment or tautological comparison',
    severity: 'warning',
    category: 'semantic',
    explanation:
      'Assigning a variable to itself (`x be x`) has no effect, and comparing a variable to itself (`x equals x` or `x differs x`) always evaluates to a constant boolean.',
    badExample: 'x be x\nponder x equals x ::\n  speak("always true")\n;;',
    goodExample: 'x be x + 1\nponder x equals target ::\n  speak("matched")\n;;',
    fixHint: 'Intended another variable or expression on the right-hand side?',
  },
  SDEV015: {
    code: 'SDEV015',
    title: 'Planned or experimental API call',
    severity: 'info',
    category: 'target',
    explanation:
      'The called function is registered in the SDEV roadmap with status `planned` and is not yet fully implemented in the runtime.',
    badExample: 'forge m be leaflet_map(42.69, 23.32)',
    goodExample: '// Check status in Runtime Explorer or `sdev api leaflet`',
    fixHint: 'Use an `implemented` API from `sdev api` for production programs.',
  },
};

export const DIAGNOSTIC_LIST: DiagnosticCatalogueEntry[] = Object.values(DIAGNOSTIC_CATALOGUE);

export function findDiagnostic(code: string): DiagnosticCatalogueEntry | undefined {
  if (!code) return undefined;
  return DIAGNOSTIC_CATALOGUE[code.trim().toUpperCase()];
}
