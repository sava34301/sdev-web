// ============================================================
// sdev Bytecode / IR Definition
// ============================================================

export enum OpCode {
  // Stack
  PUSH_NUM    = 'PUSH_NUM',
  PUSH_STR    = 'PUSH_STR',
  PUSH_BOOL   = 'PUSH_BOOL',
  PUSH_NULL   = 'PUSH_NULL',
  POP         = 'POP',
  DUP         = 'DUP',
  SWAP        = 'SWAP',

  // Variables
  LOAD        = 'LOAD',
  STORE       = 'STORE',
  DEFINE      = 'DEFINE',

  // Arithmetic
  ADD         = 'ADD',
  SUB         = 'SUB',
  MUL         = 'MUL',
  DIV         = 'DIV',
  MOD         = 'MOD',
  POW         = 'POW',
  NEG         = 'NEG',

  // Bitwise
  BIT_AND     = 'BIT_AND',
  BIT_OR      = 'BIT_OR',
  BIT_XOR     = 'BIT_XOR',
  BIT_NOT     = 'BIT_NOT',
  BIT_SHL     = 'BIT_SHL',
  BIT_SHR     = 'BIT_SHR',

  // Comparison
  EQ          = 'EQ',
  NEQ         = 'NEQ',
  LT          = 'LT',
  GT          = 'GT',
  LTE         = 'LTE',
  GTE         = 'GTE',

  // Logical
  AND         = 'AND',
  OR          = 'OR',
  NOT         = 'NOT',

  // Control flow
  JUMP        = 'JUMP',
  JUMP_IF_FALSE = 'JUMP_IF_FALSE',
  JUMP_IF_TRUE  = 'JUMP_IF_TRUE',

  // Functions
  MAKE_FUNC   = 'MAKE_FUNC',
  CALL        = 'CALL',
  RETURN      = 'RETURN',

  // Collections
  MAKE_LIST   = 'MAKE_LIST',
  MAKE_DICT   = 'MAKE_DICT',
  INDEX_GET   = 'INDEX_GET',
  INDEX_SET   = 'INDEX_SET',
  MEMBER_GET  = 'MEMBER_GET',
  MEMBER_SET  = 'MEMBER_SET',

  // OS / System
  SYSCALL     = 'SYSCALL',    // operand = syscall name string
  ALLOC       = 'ALLOC',      // pop size, push heap address
  FREE        = 'FREE',       // pop address, free heap block
  HEAP_LOAD   = 'HEAP_LOAD',  // pop address, push value
  HEAP_STORE  = 'HEAP_STORE', // pop value, pop address, store
  INTERRUPT   = 'INTERRUPT',  // operand = interrupt number

  // Task / Process
  TASK_CREATE = 'TASK_CREATE', // pop function, create task, push task_id
  TASK_YIELD  = 'TASK_YIELD',  // yield current task
  TASK_KILL   = 'TASK_KILL',   // pop task_id, kill task

  // Misc
  PIPE        = 'PIPE',
  HALT        = 'HALT',
  NOP         = 'NOP',
  DEBUG_BREAK = 'DEBUG_BREAK',
}

export interface Instruction {
  op: OpCode;
  operand?: number | string | boolean;
  line: number;
}

/** A compiled function body (also used for the top-level program) */
export interface FunctionDef {
  name: string;
  params: string[];
  code: Instruction[];
  functions: FunctionDef[];
}

/** The root compilation unit */
export interface Chunk {
  version: number;
  magic?: number;      // Magic header: 0x53444556 ('SDEV')
  entry: FunctionDef;
  constants?: ConstantPool;
  debug?: DebugInfo;
}

/** Constants table for binary bytecode format */
export interface ConstantPool {
  numbers: number[];
  strings: string[];
}

/** Debug symbols */
export interface DebugInfo {
  sourceMap: { instruction: number; line: number; }[];
  localNames: { scope: string; names: string[]; }[];
}

export const BYTECODE_VERSION = 2;
export const BYTECODE_MAGIC = 0x53444556; // 'SDEV' in hex

// -------- Binary serialization --------
export function serializeChunk(chunk: Chunk): ArrayBuffer {
  const json = JSON.stringify(chunk);
  const encoder = new TextEncoder();
  const payload = encoder.encode(json);
  // Header: magic(4) + version(4) + payloadLen(4) + payload
  const buf = new ArrayBuffer(12 + payload.length);
  const view = new DataView(buf);
  view.setUint32(0, BYTECODE_MAGIC, true);
  view.setUint32(4, chunk.version, true);
  view.setUint32(8, payload.length, true);
  new Uint8Array(buf, 12).set(payload);
  return buf;
}

export function deserializeChunk(buffer: ArrayBuffer): Chunk {
  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  if (magic !== BYTECODE_MAGIC) throw new Error('Invalid SDEV bytecode: bad magic header');
  const version = view.getUint32(4, true);
  const payloadLen = view.getUint32(8, true);
  const decoder = new TextDecoder();
  const payload = decoder.decode(new Uint8Array(buffer, 12, payloadLen));
  const chunk = JSON.parse(payload) as Chunk;
  chunk.version = version;
  return chunk;
}

// -------- Pretty printer --------
export function disassemble(fn: FunctionDef, indent = ''): string {
  const lines: string[] = [];
  const label = fn.name ? `<func ${fn.name}(${fn.params.join(', ')})>` : '<main>';
  lines.push(`${indent}${label}:`);
  fn.code.forEach((ins, i) => {
    const op = ins.op.padEnd(18);
    const operand = ins.operand !== undefined ? String(ins.operand) : '';
    lines.push(`${indent}  ${String(i).padStart(4, '0')}  ${op} ${operand}`);
  });
  for (const nested of fn.functions) {
    lines.push('');
    lines.push(disassemble(nested, indent + '  '));
  }
  return lines.join('\n');
}
