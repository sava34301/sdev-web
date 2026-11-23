declare module '*/seed-vm.mjs' {
  export function applyFmath(op: number, a: number, b: number): number;
  export function writeBlobToMemory(mem: WebAssembly.Memory, allocStr: (len: number) => number, bytes: Uint8Array): number;
  export function readSliceFromMemory(mem: WebAssembly.Memory, ptr: number, len: number): Uint8Array;
}
