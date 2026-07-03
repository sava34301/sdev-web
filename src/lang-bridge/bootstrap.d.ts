declare module '*/lang/bootstrap/compile.mjs' {
  export function compile(source: string): { bytecode: Uint8Array; stringPool: Uint8Array };
}
