import { SdevFunction, OutputCallback } from './utils';
import { createCoreBuiltins } from './core';
import { registerRegex } from './regex';
import { registerBuffer } from './buffer';
import { FopRegistry } from './fop';

export * from './utils';
export { createCoreBuiltins } from './core';
export { FopRegistry } from './fop';

export function createBuiltins(output: OutputCallback, fopRegistry?: FopRegistry): Map<string, SdevFunction> {
  const builtins = createCoreBuiltins(output, fopRegistry);
  registerRegex(builtins);
  registerBuffer(builtins);
  return builtins;
}
