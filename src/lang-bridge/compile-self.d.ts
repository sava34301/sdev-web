declare module '*/lang/compiler/compile-self.mjs' {
  export function compile(source: string, modules?: Record<string, string> | null): Promise<{ bytecode: Uint8Array; stringPool: Uint8Array }>;
  export function setSeedLoader(fn: () => Promise<ArrayBuffer | Uint8Array>): void;
  export function driverProgram(codegenSrc: string): string;
}
