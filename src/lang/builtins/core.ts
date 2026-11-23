import { SdevFunction, OutputCallback } from './utils';
import { registerIo } from './io';
import { registerMath } from './math';
import { registerDict } from './dict';
import { registerString } from './string';
import { registerJson } from './json';
import { registerList } from './list';
import { registerTypes } from './types';
import { registerTime } from './time';
import { registerMisc } from './misc';
import { registerFunctional } from './functional';
import { registerHost } from './host';
import { registerText } from './text';
import { registerSql } from './sql';
import { registerOce } from './oce';
import { registerFop, FopRegistry } from './fop';

/** Pure TypeScript builtins (no `.sdev` module runner dependencies). */
export function createCoreBuiltins(output: OutputCallback, fopRegistry?: FopRegistry): Map<string, SdevFunction> {
  const builtins = new Map<string, SdevFunction>();
  registerIo(builtins, output);
  registerMath(builtins);
  registerDict(builtins);
  registerString(builtins);
  registerJson(builtins);
  registerList(builtins);
  registerTypes(builtins);
  registerTime(builtins);
  registerMisc(builtins, output);
  registerFunctional(builtins);
  registerHost(builtins);
  registerText(builtins, output);
  registerSql(builtins);
  registerOce(builtins);
  registerFop(builtins, output, fopRegistry);
  return builtins;
}
