import { SdevFunction, OutputCallback } from './builtins/utils';
import { registerIo } from './builtins/io';
import { registerMath } from './builtins/math';
import { registerDict } from './builtins/dict';
import { registerString } from './builtins/string';
import { registerJson } from './builtins/json';
import { registerList } from './builtins/list';
import { registerTypes } from './builtins/types';
import { registerTime } from './builtins/time';
import { registerMisc } from './builtins/misc';
import { registerRegex } from './builtins/regex';
import { registerFunctional } from './builtins/functional';
import { registerBuffer } from './builtins/buffer';
import { registerHost } from './builtins/host';

export * from './builtins/utils';

export function createBuiltins(output: OutputCallback): Map<string, SdevFunction> {
    const builtins = new Map<string, SdevFunction>();
    registerIo(builtins, output);
    registerMath(builtins, output);
    registerDict(builtins, output);
    registerString(builtins, output);
    registerJson(builtins, output);
    registerList(builtins, output);
    registerTypes(builtins, output);
    registerTime(builtins, output);
    registerMisc(builtins, output);
    registerRegex(builtins, output);
    registerFunctional(builtins, output);
    registerBuffer(builtins, output);
    registerHost(builtins, output);
    return builtins;
}
