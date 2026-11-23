// Shared WASM Seed VM host primitives (float math and linear-memory string/blob marshaling).

export const FMATH_OPS = [
  Math.sin,
  Math.cos,
  Math.tan,
  Math.exp,
  Math.log,
  (a, b) => Math.pow(a, b),
];

export function applyFmath(op, a, b) {
  const fn = FMATH_OPS[op];
  return fn ? fn(a, b) : NaN;
}

export function writeBlobToMemory(mem, allocStr, bytes) {
  const dst = allocStr(bytes.length);
  new Uint8Array(mem.buffer, dst + 4, bytes.length).set(bytes);
  return dst;
}

export function readSliceFromMemory(mem, ptr, len) {
  return new Uint8Array(mem.buffer, ptr, len);
}
