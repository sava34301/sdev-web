import * as AST from './ast';
import { Environment } from './environment';
import { SdevError, ReturnException } from './errors';
import { createBuiltins, SdevFunction, isTruthy, stringify, OutputCallback } from './builtins';
import { createAdvancedBuiltins } from './advanced';
import { createMatrixBuiltins } from './matrix';

// Special signals for break/continue
class BreakSignal {
  constructor() {}
}

class ContinueSignal {
  constructor() {}
}

// OOP class representation
interface SdevClass {
  type: 'class';
  name: string;
  superClass?: SdevClass;
  methods: Map<string, SdevFunction>;
}

// OOP instance representation
interface SdevInstance {
  type: 'instance';
  klass: SdevClass;
  fields: Record<string, unknown>;
}

export class Interpreter {
  private globalEnv: Environment;
  private output: OutputCallback;

  constructor(output: OutputCallback) {
    this.output = output;
    this.globalEnv = new Environment();
    
    // Register built-in functions
    const builtins = createBuiltins(output);
    builtins.forEach((fn, name) => this.globalEnv.define(name, fn));

    const advanced = createAdvancedBuiltins(output);
    advanced.forEach((fn, name) => this.globalEnv.define(name, fn));

    const matrix = createMatrixBuiltins();
    matrix.forEach((fn, name) => this.globalEnv.define(name, fn));

    // Register constants as values (not functions)
    this.globalEnv.define('PI', Math.PI);
    this.globalEnv.define('TAU', Math.PI * 2);
    this.globalEnv.define('E', Math.E);
    this.globalEnv.define('INFINITY', Infinity);
  }

  getGlobalEnv(): Environment {
    return this.globalEnv;
  }

  interpret(program: AST.Program): unknown {
    let result: unknown = null;
    for (const stmt of program.statements) {
      result = this.execute(stmt, this.globalEnv);
    }
    return result;
  }

  private execute(node: AST.ASTNode, env: Environment): unknown {
    switch (node.type) {
      case 'Program':
        return this.executeProgram(node, env);
      case 'NumberLiteral':
        return node.value;
      case 'StringLiteral':
        return node.value;
      case 'BooleanLiteral':
        return node.value;
      case 'NullLiteral':
        return null;
      case 'Identifier':
        return this.executeIdentifier(node, env);
      case 'BinaryExpr':
        return this.executeBinary(node, env);
      case 'UnaryExpr':
        return this.executeUnary(node, env);
      case 'TernaryExpr':
        return this.executeTernary(node, env);
      case 'AwaitExpr':
        // In synchronous interpreter, await is a pass-through
        return this.execute(node.operand, env);
      case 'CallExpr':
        return this.executeCall(node, env);
      case 'NewExpr':
        return this.executeNew(node, env);
      case 'IndexExpr':
        return this.executeIndex(node, env);
      case 'MemberExpr':
        return this.executeMember(node, env);
      case 'ArrayLiteral':
        return node.elements.map((el) => this.execute(el, env));
      case 'DictLiteral':
        return this.executeDict(node, env);
      case 'LambdaExpr':
        return this.executeLambda(node, env);
      case 'LetStatement':
        return this.executeLet(node, env);
      case 'AssignStatement':
        return this.executeAssign(node, env);
      case 'IndexAssignStatement':
        return this.executeIndexAssign(node, env);
      case 'MemberAssignStatement':
        return this.executeMemberAssign(node, env);
      case 'IfStatement':
        return this.executeIf(node, env);
      case 'WhileStatement':
        return this.executeWhile(node, env);
      case 'ForEachStatement':
        return this.executeForEach(node, env);
      case 'ForInStatement':
        return this.executeForIn(node, env);
      case 'FuncDeclaration':
        return this.executeFuncDecl(node, env);
      case 'ClassDeclaration':
        return this.executeClassDecl(node, env);
      case 'ReturnStatement':
        return this.executeReturn(node, env);
      case 'BreakStatement':
        throw new BreakSignal();
      case 'ContinueStatement':
        throw new ContinueSignal();
      case 'TryStatement':
        return this.executeTry(node, env);
      case 'BlockStatement':
        return this.executeBlock(node, env);
      case 'ExpressionStatement':
        return this.execute(node.expression, env);
      default:
        throw new SdevError(`Unknown node type: ${(node as { type: string }).type}`, 0);
    }
  }

  private executeProgram(node: AST.Program, env: Environment): unknown {
    let result: unknown = null;
    for (const stmt of node.statements) {
      result = this.execute(stmt, env);
    }
    return result;
  }

  private executeIdentifier(node: AST.Identifier, env: Environment): unknown {
    // constants as direct identifiers
    if (node.name === 'PI') return Math.PI;
    if (node.name === 'TAU') return Math.PI * 2;
    if (node.name === 'E') return Math.E;
    if (node.name === 'INFINITY') return Infinity;
    
    const val = env.get(node.name, node.line);
    // If it's a 0-arg builtin constant function, call it
    if (val && typeof val === 'object' && 'type' in val) {
      const fn = val as SdevFunction;
      if (fn.type === 'builtin') {
        // Only auto-call if it looks like a constant (PI, TAU, E, etc.)
        // We don't auto-call all builtins
      }
    }
    return val;
  }

  private executeBinary(node: AST.BinaryExpr, env: Environment): unknown {
    // Short-circuit evaluation
    if (node.operator === 'also') {
      const left = this.execute(node.left, env);
      if (!isTruthy(left)) return false;
      return isTruthy(this.execute(node.right, env));
    }
    if (node.operator === 'either') {
      const left = this.execute(node.left, env);
      if (isTruthy(left)) return left;
      return this.execute(node.right, env);
    }

    const left = this.execute(node.left, env);
    const right = this.execute(node.right, env);

    switch (node.operator) {
      case '+':
        if (typeof left === 'number' && typeof right === 'number') return left + right;
        if (typeof left === 'string' || typeof right === 'string') return stringify(left) + stringify(right);
        if (Array.isArray(left) && Array.isArray(right)) return [...left, ...right];
        throw new SdevError("Cannot use '+' with these types", node.line);
      case '-':
        return this.requireNumbers(left, right, '-', node.line, (a, b) => a - b);
      case '*':
        if (typeof left === 'number' && typeof right === 'number') return left * right;
        if (typeof left === 'string' && typeof right === 'number') return left.repeat(Math.max(0, Math.floor(right as number)));
        if (typeof left === 'number' && typeof right === 'string') return (right as string).repeat(Math.max(0, Math.floor(left as number)));
        if (Array.isArray(left) && typeof right === 'number') {
          const result: unknown[] = [];
          for (let i = 0; i < Math.max(0, Math.floor(right as number)); i++) result.push(...(left as unknown[]));
          return result;
        }
        if (typeof left === 'number' && Array.isArray(right)) {
          const result: unknown[] = [];
          for (let i = 0; i < Math.max(0, Math.floor(left as number)); i++) result.push(...(right as unknown[]));
          return result;
        }
        throw new SdevError("Cannot use '*' with these types", node.line);
      case '/':
        return this.requireNumbers(left, right, '/', node.line, (a, b) => {
          if (b === 0) throw new SdevError('Division by zero', node.line);
          return a / b;
        });
      case '%':
        return this.requireNumbers(left, right, '%', node.line, (a, b) => a % b);
      case '^':
        return this.requireNumbers(left, right, '^', node.line, (a, b) => Math.pow(a, b));
      case '<':
        if (typeof left === 'number' && typeof right === 'number') return left < right;
        if (typeof left === 'string' && typeof right === 'string') return left < right;
        return this.requireNumbers(left, right, '<', node.line, (a, b) => a < b);
      case '>':
        if (typeof left === 'number' && typeof right === 'number') return left > right;
        if (typeof left === 'string' && typeof right === 'string') return left > right;
        return this.requireNumbers(left, right, '>', node.line, (a, b) => a > b);
      case '<=':
        if (typeof left === 'number' && typeof right === 'number') return left <= right;
        if (typeof left === 'string' && typeof right === 'string') return left <= right;
        return this.requireNumbers(left, right, '<=', node.line, (a, b) => a <= b);
      case '>=':
        if (typeof left === 'number' && typeof right === 'number') return left >= right;
        if (typeof left === 'string' && typeof right === 'string') return left >= right;
        return this.requireNumbers(left, right, '>=', node.line, (a, b) => a >= b);
      case 'equals':
        return this.isEqual(left, right);
      case 'differs':
      case '<>':
        return !this.isEqual(left, right);
      default:
        throw new SdevError(`Unknown operator: ${node.operator}`, node.line);
    }
  }

  private executeUnary(node: AST.UnaryExpr, env: Environment): unknown {
    const operand = this.execute(node.operand, env);

    switch (node.operator) {
      case '-':
        if (typeof operand !== 'number') {
          throw new SdevError("Cannot use '-' with non-number", node.line);
        }
        return -operand;
      case 'isnt':
        return !isTruthy(operand);
      default:
        throw new SdevError(`Unknown unary operator: ${node.operator}`, node.line);
    }
  }

  private executeTernary(node: AST.TernaryExpr, env: Environment): unknown {
    const condition = this.execute(node.condition, env);
    if (isTruthy(condition)) {
      return this.execute(node.thenExpr, env);
    } else {
      return this.execute(node.elseExpr, env);
    }
  }

  private executeCall(node: AST.CallExpr, env: Environment): unknown {
    const callee = this.execute(node.callee, env);
    const args = node.args.map((arg) => this.execute(arg, env));

    if (!callee || typeof callee !== 'object') {
      throw new SdevError(`Cannot call non-function: ${stringify(callee)}`, node.line);
    }

    const fn = callee as SdevFunction;
    if (fn.type !== 'builtin' && fn.type !== 'user' && fn.type !== 'lambda') {
      throw new SdevError('Cannot call non-function', node.line);
    }

    return fn.call(args, node.line);
  }

  private executeNew(node: AST.NewExpr, env: Environment): unknown {
    let className: string;
    if (node.className.type === 'Identifier') {
      className = node.className.name;
    } else {
      throw new SdevError('Expected class name', node.line);
    }

    const klass = env.get(className, node.line) as SdevClass;
    if (!klass || klass.type !== 'class') {
      throw new SdevError(`'${className}' is not a class`, node.line);
    }

    const instance: SdevInstance = {
      type: 'instance',
      klass,
      fields: {},
    };

    // Expose instance fields and bound methods via a proxy-like object
    const instanceProxy = this.createInstanceProxy(instance, env);

    // Call init if it exists
    const initMethod = this.findMethod(klass, 'init');
    if (initMethod) {
      const args = node.args.map((arg) => this.execute(arg, env));
      initMethod.call([instanceProxy, ...args], node.line);
    }

    return instanceProxy;
  }

  private createInstanceProxy(instance: SdevInstance, env: Environment): Record<string, unknown> {
    const proxy: Record<string, unknown> = instance.fields;

    // Bind methods to the instance
    const bindMethod = (methodName: string, method: SdevFunction): SdevFunction => {
      return {
        type: 'user',
        call: (args: unknown[], line: number) => {
          return method.call([proxy, ...args], line);
        },
      };
    };

    // Traverse class hierarchy for methods
    let klass: SdevClass | undefined = instance.klass;
    while (klass) {
      klass.methods.forEach((method, name) => {
        if (!(name in proxy)) {
          Object.defineProperty(proxy, name, {
            get: () => bindMethod(name, method),
            enumerable: true,
            configurable: true,
          });
        }
      });
      klass = klass.superClass;
    }

    return proxy;
  }

  private findMethod(klass: SdevClass, name: string): SdevFunction | undefined {
    let current: SdevClass | undefined = klass;
    while (current) {
      if (current.methods.has(name)) return current.methods.get(name);
      current = current.superClass;
    }
    return undefined;
  }

  private executeIndex(node: AST.IndexExpr, env: Environment): unknown {
    const obj = this.execute(node.object, env);
    const index = this.execute(node.index, env);

    if (Array.isArray(obj)) {
      if (typeof index !== 'number') {
        throw new SdevError('List index must be a number', node.line);
      }
      const idx = index < 0 ? obj.length + index : index;
      if (idx < 0 || idx >= obj.length) {
        throw new SdevError(`List index out of bounds: ${index}`, node.line);
      }
      return obj[idx];
    }

    if (typeof obj === 'string') {
      if (typeof index !== 'number') {
        throw new SdevError('String index must be a number', node.line);
      }
      const idx = index < 0 ? obj.length + index : index;
      if (idx < 0 || idx >= obj.length) {
        throw new SdevError('String index out of bounds', node.line);
      }
      return obj[idx];
    }

    if (obj && typeof obj === 'object') {
      const key = stringify(index);
      const val = (obj as Record<string, unknown>)[key];
      // Missing tome keys read as `void` so `tome[k] equals void` works.
      return val === undefined ? null : val;
    }


    throw new SdevError('Cannot index this type', node.line);
  }

  private executeMember(node: AST.MemberExpr, env: Environment): unknown {
    const obj = this.execute(node.object, env);
    
    if (obj && typeof obj === 'object') {
      const val = (obj as Record<string, unknown>)[node.property];
      return val !== undefined ? val : null;
    }

    if (typeof obj === 'string') {
      // String property: length
      if (node.property === 'length') return obj.length;
    }

    throw new SdevError(`Cannot access property '${node.property}' on this type`, node.line);
  }

  private executeDict(node: AST.DictLiteral, env: Environment): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const entry of node.entries) {
      const key = stringify(this.execute(entry.key, env));
      const value = this.execute(entry.value, env);
      result[key] = value;
    }
    return result;
  }

  private executeLambda(node: AST.LambdaExpr, env: Environment): SdevFunction {
    return {
      type: 'lambda' as const,
      call: (args: unknown[], callLine: number) => {
        const lambdaEnv = new Environment(env);
        // Allow variadic: if params shorter than args, just bind what we can
        for (let i = 0; i < node.params.length; i++) {
          lambdaEnv.define(node.params[i], args[i] !== undefined ? args[i] : null);
        }

        try {
          const result = this.execute(node.body, lambdaEnv);
          return result;
        } catch (e) {
          if (e instanceof ReturnException) return e.value;
          throw e;
        }
      },
    };
  }

  private executeLet(node: AST.LetStatement, env: Environment): void {
    const value = this.execute(node.value, env);
    env.define(node.name, value);
  }

  private executeAssign(node: AST.AssignStatement, env: Environment): unknown {
    const value = this.execute(node.value, env);
    env.set(node.name, value, node.line);
    return value;
  }

  private executeIndexAssign(node: AST.IndexAssignStatement, env: Environment): unknown {
    const obj = this.execute(node.object, env);
    const index = this.execute(node.index, env);
    const value = this.execute(node.value, env);

    if (Array.isArray(obj)) {
      if (typeof index !== 'number') {
        throw new SdevError('List index must be a number', node.line);
      }
      const idx = index < 0 ? obj.length + index : index;
      if (idx < 0 || idx >= obj.length) {
        throw new SdevError('List index out of bounds', node.line);
      }
      obj[idx] = value;
      return value;
    }

    if (obj && typeof obj === 'object') {
      const key = stringify(index);
      (obj as Record<string, unknown>)[key] = value;
      return value;
    }

    throw new SdevError('Cannot assign to index of this type', node.line);
  }

  private executeMemberAssign(node: AST.MemberAssignStatement, env: Environment): unknown {
    const obj = this.execute(node.object, env);
    const value = this.execute(node.value, env);

    if (!obj || typeof obj !== 'object') {
      throw new SdevError(`Cannot assign property on non-object`, node.line);
    }
    (obj as Record<string, unknown>)[node.property] = value;
    return value;
  }

  private executeIf(node: AST.IfStatement, env: Environment): unknown {
    const condition = this.execute(node.condition, env);
    
    if (isTruthy(condition)) {
      return this.execute(node.thenBranch, env);
    } else if (node.elseBranch) {
      return this.execute(node.elseBranch, env);
    }
    
    return null;
  }

  private executeWhile(node: AST.WhileStatement, env: Environment): unknown {
    let result: unknown = null;
    let iterations = 0;
    const maxIterations = 100000;
    
    while (isTruthy(this.execute(node.condition, env))) {
      try {
        result = this.execute(node.body, env);
      } catch (e) {
        if (e instanceof BreakSignal) break;
        if (e instanceof ContinueSignal) {
          iterations++;
          if (iterations > maxIterations) {
            throw new SdevError('Maximum loop iterations exceeded (possible infinite loop)', node.line);
          }
          continue;
        }
        throw e;
      }
      iterations++;
      if (iterations > maxIterations) {
        throw new SdevError('Maximum loop iterations exceeded (possible infinite loop)', node.line);
      }
    }
    
    return result;
  }

  private executeForEach(node: AST.ForEachStatement, env: Environment): unknown {
    const iterable = this.execute(node.iterable, env);
    
    if (!Array.isArray(iterable) && typeof iterable !== 'string') {
      throw new SdevError('Can only iterate through lists or strings', node.line);
    }

    let result: unknown = null;
    const items = Array.isArray(iterable) ? iterable : iterable.split('');
    let iterations = 0;
    const maxIterations = 100000;

    for (const item of items) {
      const loopEnv = new Environment(env);
      loopEnv.define(node.variable, item);
      try {
        result = this.execute(node.body, loopEnv);
      } catch (e) {
        if (e instanceof BreakSignal) break;
        if (e instanceof ContinueSignal) {
          iterations++;
          if (iterations > maxIterations) throw new SdevError('Maximum loop iterations exceeded', node.line);
          continue;
        }
        throw e;
      }
      iterations++;
      if (iterations > maxIterations) {
        throw new SdevError('Maximum loop iterations exceeded', node.line);
      }
    }

    return result;
  }

  private executeForIn(node: AST.ForInStatement, env: Environment): unknown {
    const iterable = this.execute(node.iterable, env);
    
    if (!Array.isArray(iterable) && typeof iterable !== 'string') {
      throw new SdevError('Can only iterate through lists or strings with within', node.line);
    }

    let result: unknown = null;
    const items = Array.isArray(iterable) ? iterable : iterable.split('');
    let iterations = 0;
    const maxIterations = 100000;

    for (const item of items) {
      const loopEnv = new Environment(env);
      loopEnv.define(node.variable, item);
      try {
        result = this.execute(node.body, loopEnv);
      } catch (e) {
        if (e instanceof BreakSignal) break;
        if (e instanceof ContinueSignal) {
          iterations++;
          if (iterations > maxIterations) throw new SdevError('Maximum loop iterations exceeded', node.line);
          continue;
        }
        throw e;
      }
      iterations++;
      if (iterations > maxIterations) {
        throw new SdevError('Maximum loop iterations exceeded', node.line);
      }
    }

    return result;
  }

  private executeFuncDecl(node: AST.FuncDeclaration, env: Environment): void {
    const func: SdevFunction = {
      type: 'user',
      call: (args: unknown[], callLine: number) => {
        const funcEnv = new Environment(env);
        for (let i = 0; i < node.params.length; i++) {
          funcEnv.define(node.params[i], args[i] !== undefined ? args[i] : null);
        }

        try {
          this.execute(node.body, funcEnv);
          return null;
        } catch (e) {
          if (e instanceof ReturnException) {
            return e.value;
          }
          throw e;
        }
      },
    };

    env.define(node.name, func);
  }

  private executeClassDecl(node: AST.ClassDeclaration, env: Environment): void {
    let superClass: SdevClass | undefined;
    if (node.superClass) {
      const sc = env.get(node.superClass, node.line);
      if (!sc || (sc as SdevClass).type !== 'class') {
        throw new SdevError(`'${node.superClass}' is not a class`, node.line);
      }
      superClass = sc as SdevClass;
    }

    const methods = new Map<string, SdevFunction>();

    for (const method of node.methods) {
      const func: SdevFunction = {
        type: 'user',
        call: (args: unknown[], callLine: number) => {
          const methodEnv = new Environment(env);
          // args[0] is 'self'
          for (let i = 0; i < method.params.length; i++) {
            methodEnv.define(method.params[i], args[i] !== undefined ? args[i] : null);
          }
          // Bind 'super' if there's a superClass
          if (superClass) {
            const superProxy: Record<string, unknown> = {};
            superClass.methods.forEach((superMethod, name) => {
              superProxy[name] = {
                type: 'user',
                call: (superArgs: unknown[], line: number) => {
                  return superMethod.call([args[0], ...superArgs], line);
                },
              } as SdevFunction;
            });
            methodEnv.define('super', superProxy);
          }

          try {
            this.execute(method.body, methodEnv);
            return null;
          } catch (e) {
            if (e instanceof ReturnException) return e.value;
            throw e;
          }
        },
      };
      methods.set(method.name, func);
    }

    const klass: SdevClass = {
      type: 'class',
      name: node.name,
      superClass,
      methods,
    };

    env.define(node.name, klass);
  }

  private executeReturn(node: AST.ReturnStatement, env: Environment): never {
    const value = node.value ? this.execute(node.value, env) : null;
    throw new ReturnException(value);
  }

  private executeTry(node: AST.TryStatement, env: Environment): unknown {
    try {
      return this.execute(node.tryBlock, env);
    } catch (e) {
      if (e instanceof ReturnException || e instanceof BreakSignal || e instanceof ContinueSignal) {
        throw e; // re-throw control flow signals
      }
      const catchEnv = new Environment(env);
      let errorMsg: string;
      if (e instanceof SdevError) {
        errorMsg = e.message;
      } else if (e instanceof Error) {
        errorMsg = e.message;
      } else {
        errorMsg = String(e);
      }
      catchEnv.define(node.errorVar, errorMsg);
      return this.execute(node.catchBlock, catchEnv);
    }
  }

  private executeBlock(node: AST.BlockStatement, env: Environment): unknown {
    const blockEnv = new Environment(env);
    let result: unknown = null;
    
    for (const stmt of node.statements) {
      result = this.execute(stmt, blockEnv);
    }
    
    return result;
  }

  private requireNumbers<T>(
    left: unknown,
    right: unknown,
    op: string,
    line: number,
    fn: (a: number, b: number) => T
  ): T {
    // Auto-coerce numeric strings (helps with input() which returns strings)
    const coerce = (v: unknown): unknown => {
      if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
      return v;
    };
    const l = coerce(left);
    const r = coerce(right);
    if (typeof l !== 'number' || typeof r !== 'number') {
      const label = (v: unknown): string => {
        if (v === null || v === undefined) return 'nothing';
        if (Array.isArray(v)) return 'list';
        if (typeof v === 'object') {
          const o = v as { type?: string };
          if (o.type === 'instance') return 'instance';
          if (o.type === 'class') return 'class';
          if (o.type === 'user' || o.type === 'builtin' || o.type === 'lambda') return 'function';
          return 'object';
        }
        return typeof v;
      };
      throw new SdevError(`Cannot use '${op}' with non-numbers (got ${label(left)} and ${label(right)})`, line);
    }
    return fn(l, r);
  }

  private isEqual(a: unknown, b: unknown): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => this.isEqual(v, b[i]));
    }
    return a === b;
  }
}
