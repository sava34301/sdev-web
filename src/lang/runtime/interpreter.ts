import { InterpreterCore, type InterpreterTraceHook } from './interpreter-core';
import type { OutputCallback } from '../builtins/utils';
import { createBuiltins } from '../builtins';
import { createMatrixBuiltins } from '../stdlib/matrix';
import { createParityBuiltins } from '../stdlib/pyparity';
import { createWebBuiltins, bindWebBuiltinsToEnv, renderWebDocument, type WebState } from '../stdlib/web';

export { SdevRaise, SdevSet, keyOf, makeTuple, isTuple, isGenerator } from '../core/runtime-values';
export type { SdevGenerator } from '../core/runtime-values';
export type { InterpreterTraceHook } from './interpreter-core';

export class Interpreter extends InterpreterCore {
  private webState: WebState | null = null;

  constructor(output: OutputCallback, options?: { bindWeb?: boolean; traceHook?: InterpreterTraceHook }) {
    super(output, { traceHook: options?.traceHook });

    const builtins = createBuiltins(output, this.fopRegistry);
    builtins.forEach((fn, name) => this.globalEnv.define(name, fn));

    const matrix = createMatrixBuiltins();
    matrix.forEach((fn, name) => this.globalEnv.define(name, fn));

    const parity = createParityBuiltins(output, {
      call: (fn, args, line) => this.callValue(fn, args, line),
      iterate: (v, line) => this.iterableOf(v, line),
      truthy: (v) => this.truthy(v),
      equal: (a, b) => this.isEqual(a, b),
    });
    // Existing v1 builtins win; Python-parity variant stays reachable as `py_<name>`.
    parity.forEach((fn, name) => {
      if (this.globalEnv.hasOwn(name)) {
        this.globalEnv.define(`py_${name}`, fn);
      } else {
        this.globalEnv.define(name, fn);
      }
    });

    if (options?.bindWeb !== false) {
      const web = createWebBuiltins((s) => {
        this.webState = s;
      });
      bindWebBuiltinsToEnv(this.globalEnv, web);
    }

    this.globalEnv.define('PI', Math.PI);
    this.globalEnv.define('TAU', Math.PI * 2);
    this.globalEnv.define('E', Math.E);
    this.globalEnv.define('INFINITY', Infinity);
    this.globalEnv.define('NAN', NaN);
    this.globalEnv.define('Ellipsis', '...');
  }

  getWebState(): WebState | null {
    return this.webState && this.webState.produced ? this.webState : null;
  }

  getWebHtml(): string | null {
    return this.webState && this.webState.produced ? renderWebDocument(this.webState) : null;
  }
}
