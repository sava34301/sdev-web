/**
 * SDEV WASI 0.2 Component Model Exporter (`src/lang/wasi-component.ts`)
 *
 * Compiles SDEV programs (v1 and v2 Prism dialects) into:
 * 1. Canonical WIT (WebAssembly Interface Types) 0.2 definitions (`.wit`)
 * 2. Valid executable WebAssembly binary modules (`.wasm`) with embedded
 *    `component-type` custom sections and exported numeric/host functions
 * 3. Ready-to-use polyglot host bindings for Rust, Python, Node/TS, and Go
 */

import { Lexer } from './lexer';
import { Parser } from './parser';
import { understand } from './agent';
import * as AST from './ast';
import { createSdevModuleRunner, type SdevModuleRunner } from './sdev-module';
import SDEV_WASI_SRC from '../../lang/runtime/wasi.sdev?raw';

let wasiRunner: SdevModuleRunner | null = null;
function getWasiRunner(): SdevModuleRunner {
  if (!wasiRunner) wasiRunner = createSdevModuleRunner(SDEV_WASI_SRC);
  return wasiRunner;
}

export type WitType = 'f64' | 's32' | 'bool' | 'string' | 'list<f64>';

export interface ExportedFunctionSpec {
  name: string;
  witName: string;
  params: { name: string; type: WitType }[];
  returnType: WitType;
  bodyAst?: AST.ASTNode[];
  doc?: string;
}

export interface WasiComponentBundle {
  packageName: string;
  worldName: string;
  wit: string;
  wasmBytes: Uint8Array;
  exports: ExportedFunctionSpec[];
  bindings: {
    typescript: string;
    python: string;
    rust: string;
    go: string;
  };
}

function toKebabCase(identifier: string): string {
  return getWasiRunner().callStr('wasi_to_kebab', identifier);
}

function getFuncBodyStatements(fn: AST.FuncDeclaration): AST.ASTNode[] {
  const b = fn.body as unknown as AST.ASTNode[] | AST.BlockStatement | undefined;
  if (!b) return [];
  if (Array.isArray(b)) return b;
  if ('statements' in b && Array.isArray(b.statements)) return b.statements;
  return [];
}

function inferFunctionTypes(fn: AST.FuncDeclaration): {
  params: { name: string; type: WitType }[];
  returnType: WitType;
} {
  // Inspect body for string literals vs arithmetic to infer f64 vs string
  let returnsString = false;
  let returnsBool = false;

  function scan(node: AST.ASTNode | undefined): void {
    if (!node) return;
    if (node.type === 'ReturnStatement') {
      const val = node.value;
      if (val?.type === 'StringLiteral') {
        returnsString = true;
      } else if (val?.type === 'BooleanLiteral') {
        returnsBool = true;
      } else if (val?.type === 'BinaryExpr') {
        if (
          ['==', '!=', '<', '>', '<=', '>=', 'equals', 'differs'].includes(
            val.operator
          )
        ) {
          returnsBool = true;
        }
      }
    }
    const rec = node as unknown as Record<string, unknown>;
    for (const v of Object.values(rec)) {
      if (Array.isArray(v)) {
        v.forEach((item) => {
          if (item && typeof item === 'object' && 'type' in item) {
            scan(item as AST.ASTNode);
          }
        });
      } else if (v && typeof v === 'object' && 'type' in v) {
        scan(v as AST.ASTNode);
      }
    }
  }

  getFuncBodyStatements(fn).forEach(scan);

  const returnType: WitType = returnsString
    ? 'string'
    : returnsBool
    ? 'bool'
    : 'f64';

  const params = fn.params.map((p) => ({
    name: p,
    type: (returnsString && p.toLowerCase().includes('name') ? 'string' : 'f64') as WitType,
  }));

  return { params, returnType };
}

/**
 * Extract exported functions from SDEV source code.
 */
export function extractWasiExports(source: string): ExportedFunctionSpec[] {
  const understood = understand(source);
  const canonical = understood.changed ? understood.source : source;

  let ast: AST.Program;
  try {
    const tokens = new Lexer(canonical).tokenize();
    ast = new Parser(tokens).parse();
  } catch {
    return [];
  }

  const exports: ExportedFunctionSpec[] = [];
  for (const stmt of ast.statements) {
    if (stmt.type === 'FuncDeclaration') {
      const { params, returnType } = inferFunctionTypes(stmt);
      exports.push({
        name: stmt.name,
        witName: toKebabCase(stmt.name),
        params,
        returnType,
        bodyAst: getFuncBodyStatements(stmt),
      });
    }
  }

  return exports;
}

/**
 * Generate a WASI 0.2 WIT specification file from extracted SDEV exports.
 */
export function generateWitSpec(
  exports: ExportedFunctionSpec[],
  moduleName = 'sdev-module'
): string {
  const cleanName = moduleName.replace(/\.sdev$/i, '') || 'sdev-module';
  const specs = exports.map((fn) => [
    fn.name,
    fn.params.map((p) => [p.name, p.type]),
    fn.returnType,
  ]);
  return getWasiRunner().callStr('wasi_generate_wit', cleanName, specs);
}

// ============================================================
// Minimal Binary WebAssembly (.wasm) Encoder with f64 Codegen
// ============================================================

function encodeUleb128(value: number): number[] {
  return getWasiRunner().call('wasi_encode_uleb128', value >>> 0) as number[];
}

function encodeF64(value: number): number[] {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, value, true);
  return Array.from(new Uint8Array(buf));
}

function encodeString(str: string): number[] {
  const utf8 = Array.from(new TextEncoder().encode(str));
  return [...encodeUleb128(utf8.length), ...utf8];
}

function encodeSection(sectionId: number, payload: number[]): number[] {
  return [sectionId, ...encodeUleb128(payload.length), ...payload];
}

/**
 * Compile an AST expression inside an exported function into f64 WASM bytecode.
 */
function compileExprToWasmF64(
  node: AST.ASTNode | undefined,
  paramIndexMap: Map<string, number>
): number[] {
  if (!node) {
    return [0x44, ...encodeF64(0)]; // f64.const 0
  }

  switch (node.type) {
    case 'NumberLiteral':
      return [0x44, ...encodeF64(node.value)];
    case 'BooleanLiteral':
      return [0x44, ...encodeF64(node.value ? 1 : 0)];
    case 'Identifier': {
      const idx = paramIndexMap.get(node.name);
      if (idx !== undefined) {
        return [0x20, ...encodeUleb128(idx)]; // local.get $idx
      }
      return [0x44, ...encodeF64(0)];
    }
    case 'UnaryExpr': {
      if (node.operator === '-') {
        return [...compileExprToWasmF64(node.operand, paramIndexMap), 0x9a]; // f64.neg
      }
      return compileExprToWasmF64(node.operand, paramIndexMap);
    }
    case 'BinaryExpr': {
      const left = compileExprToWasmF64(node.left, paramIndexMap);
      const right = compileExprToWasmF64(node.right, paramIndexMap);
      switch (node.operator) {
        case '+':
          return [...left, ...right, 0xa0]; // f64.add
        case '-':
          return [...left, ...right, 0xa1]; // f64.sub
        case '*':
          return [...left, ...right, 0xa2]; // f64.mul
        case '/':
          return [...left, ...right, 0xa3]; // f64.div
        case '==':
        case 'equals':
          return [...left, ...right, 0x61, 0xb7]; // f64.eq -> f64.convert_i32_s
        case '<':
          return [...left, ...right, 0x63, 0xb7]; // f64.lt -> f64.convert_i32_s
        case '>':
          return [...left, ...right, 0x64, 0xb7]; // f64.gt -> f64.convert_i32_s
        default:
          return [...left, ...right, 0xa0];
      }
    }
    default:
      return [0x44, ...encodeF64(1)];
  }
}

function compileFunctionBodyToWasm(fn: ExportedFunctionSpec): number[] {
  const paramMap = new Map<string, number>();
  fn.params.forEach((p, idx) => paramMap.set(p.name, idx));

  // Locate ReturnStatement or last expression in function body
  let returnExpr: AST.ASTNode | undefined;
  for (const stmt of fn.bodyAst ?? []) {
    if (stmt.type === 'ReturnStatement' && stmt.value) {
      returnExpr = stmt.value;
      break;
    }
    if (stmt.type === 'ExpressionStatement') {
      returnExpr = stmt.expression;
    }
  }

  const instrs = compileExprToWasmF64(returnExpr, paramMap);
  const bodyBytes = [
    0x00, // 0 local declarations
    ...instrs,
    0x0b, // end
  ];
  return [...encodeUleb128(bodyBytes.length), ...bodyBytes];
}

/**
 * Emit a valid, instantiable WebAssembly binary (.wasm) containing all exported
 * functions and a custom `component-type` section with the WIT specification.
 */
export function emitWasiComponentWasm(
  exports: ExportedFunctionSpec[],
  witSpec: string
): Uint8Array {
  const effectiveExports: ExportedFunctionSpec[] =
    exports.length > 0
      ? exports
      : [
          {
            name: 'run',
            witName: 'run',
            params: [],
            returnType: 'f64',
            bodyAst: [],
          },
        ];

  // WASM header: \0asm + version 1
  const header = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];

  // 1. Type section (0x01)
  const typeEntries: number[][] = effectiveExports.map((fn) => [
    0x60, // func type
    ...encodeUleb128(fn.params.length),
    ...fn.params.map(() => 0x7c), // f64 params
    0x01, // 1 result
    0x7c, // f64 result
  ]);
  const typePayload = [
    ...encodeUleb128(typeEntries.length),
    ...typeEntries.flat(),
  ];
  const typeSection = encodeSection(0x01, typePayload);

  // 2. Function section (0x03)
  const funcPayload = [
    ...encodeUleb128(effectiveExports.length),
    ...effectiveExports.map((_, i) => encodeUleb128(i)).flat(),
  ];
  const funcSection = encodeSection(0x03, funcPayload);

  // 3. Memory section (0x05) — 1 page (64KB)
  const memorySection = encodeSection(0x05, [0x01, 0x00, 0x01]);

  // 4. Export section (0x07) — export "memory" + each function
  const exportEntries: number[][] = [
    [...encodeString('memory'), 0x02, 0x00], // memory index 0
    ...effectiveExports.map((fn, idx) => [
      ...encodeString(fn.name),
      0x00, // func export
      ...encodeUleb128(idx),
    ]),
  ];
  const exportPayload = [
    ...encodeUleb128(exportEntries.length),
    ...exportEntries.flat(),
  ];
  const exportSection = encodeSection(0x07, exportPayload);

  // 5. Code section (0x0a)
  const codeBodies = effectiveExports.map(compileFunctionBodyToWasm);
  const codePayload = [
    ...encodeUleb128(codeBodies.length),
    ...codeBodies.flat(),
  ];
  const codeSection = encodeSection(0x0a, codePayload);

  // 6. Custom Section (0x00) — "component-type:sdev-wit"
  const customContent = [
    ...encodeString('component-type:sdev-wit'),
    ...encodeString(witSpec),
  ];
  const customSection = encodeSection(0x00, customContent);

  return new Uint8Array([
    ...header,
    ...typeSection,
    ...funcSection,
    ...memorySection,
    ...exportSection,
    ...codeSection,
    ...customSection,
  ]);
}

/**
 * Build a complete WASI 0.2 Component bundle with `.wit`, `.wasm`, and host bindings.
 */
export function buildWasiComponentBundle(
  source: string,
  fileName = 'module.sdev'
): WasiComponentBundle {
  const worldName = toKebabCase(fileName.replace(/\.sdev$/i, '')) || 'sdev-module';
  const packageName = `sdev:${worldName}@0.2.0`;
  const exports = extractWasiExports(source);
  const wit = generateWitSpec(exports, worldName);
  const wasmBytes = emitWasiComponentWasm(exports, wit);

  const sampleFn = exports[0]?.name ?? 'run';
  const sampleArgs = (exports[0]?.params ?? []).map((_, i) => String((i + 1) * 5)).join(', ');
  const tsSigs = (exports.length ? exports : [{ name: 'run', params: [], returnType: 'f64' }])
    .map((f) => `    ${f.name}: (${f.params.map((p) => `${p.name}: number`).join(', ')}) => number;`)
    .join('\n');
  const rustParamTypes = (exports[0]?.params ?? []).map(() => 'f64').join(', ');

  const runner = getWasiRunner();
  const typescript = runner.callStr('wasi_binding_ts', worldName, sampleFn, sampleArgs, tsSigs);
  const python = runner.callStr('wasi_binding_py', worldName, sampleFn, sampleArgs);
  const rust = runner.callStr('wasi_binding_rust', sampleFn, sampleArgs, rustParamTypes);
  const go = runner.callStr('wasi_binding_go', worldName, sampleFn, sampleArgs);

  return {
    packageName,
    worldName,
    wit,
    wasmBytes,
    exports,
    bindings: {
      typescript,
      python,
      rust,
      go,
    },
  };
}
