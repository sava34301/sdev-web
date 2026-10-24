declare module '*/compile-self.mjs' {
  export function compile(source: string, modules?: Record<string, string> | null): Promise<{ bytecode: Uint8Array; stringPool: Uint8Array }>;
  export function compileWith(driver: { bytecode: Uint8Array; stringPool: Uint8Array }, source: string, modules?: Record<string, string> | null): Promise<{ bytecode: Uint8Array; stringPool: Uint8Array }>;
  export function bakedDriver(): { bytecode: Uint8Array; stringPool: Uint8Array };
  export function setSeedLoader(fn: () => Promise<ArrayBuffer | Uint8Array>): void;
}
