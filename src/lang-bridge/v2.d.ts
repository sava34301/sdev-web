declare module '*/lang/runtime/v2.js' {
  export interface V2Options { onOutput?: (line: string) => void }
  export interface V2Result { success: boolean; output: string[]; error: string | null }
  export function run(source: string, options?: V2Options): V2Result;
  export const VERSION: string;
}
