import * as AST from './ast';
import { Environment } from './environment';
import { SdevError, ReturnException } from './errors';
import { createBuiltins, SdevFunction, isTruthy, stringify, OutputCallback, setObjectTextHook } from './builtins';
import { createAdvancedBuiltins } from './advanced';
import { createMatrixBuiltins } from './matrix';
import { createParityBuiltins, formatValue, setObjectReprHook } from './pyparity';
import {
  SdevRaise, SdevSet, keyOf, makeTuple, isTuple, makeGenerator, isGenerator,
  isFunction, SdevGenerator, PROTOCOL_SLOTS, REFLECTED_SLOTS, dunderAlias,
} from './runtime-values';

// Special signals for break/continue
class BreakSignal {}
class ContinueSignal {}

/** Value yielded out of a generator body while it is suspended. */
interface EmitSignal {
  __emit: true;
  value: unknown;
}

type Ev = Generator<EmitSignal, unknown, unknown>;

// OOP class representation
interface SdevClass {
  type: 'class';
  name: string;
  superClass?: SdevClass;
  bases: SdevClass[];
  mro: SdevClass[];
  methods: Map<string, SdevFunction>;
  props: Map<string, { get?: SdevFunction; set?: SdevFunction }>;
  statics: Map<string, SdevFunction>;
  attrs: Record<string, unknown>;
}

interface SdevInstance {
  type: 'instance';
  klass: SdevClass;
  fields: Record<string, unknown>;
}

/** A callable with rich parameter binding (defaults, *rest, **named). */
interface CallableMeta {
  paramSpecs?: AST.Param[];
  kind?: 'property' | 'static' | 'class' | 'normal';
  isGenerator?: boolean;
  isAsync?: boolean;
  name?: string;
}

type RichFunction = SdevFunction & { meta?: CallableMeta };

const MAX_ITERATIONS = 1_000_000;

export class Interpreter {
  private globalEnv: Environment;
  private output: OutputCallback;

  constructor(output: OutputCallback) {
    this.output = output;
    this.globalEnv = new Environment();

    const builtins = createBuiltins(output);
    builtins.forEach((fn, name) => this.globalEnv.define(name, fn));

    const advanced = createAdvancedBuiltins(output);
    advanced.forEach((fn, name) => this.globalEnv.define(name, fn));

    const matrix = createMatrixBuiltins();
    matrix.forEach((fn, name) => this.globalEnv.define(name, fn));

    const parity = createParityBuiltins(output, {
      call: (fn, args, line) => this.callValue(fn, args, line),
      iterate: (v, line) => this.iterableOf(v, line),
      truthy: (v) => this.truthy(v),
      equal: (a, b) => this.isEqual(a, b),
    });
    // Backward compatibility: existing v1 builtins win. Where a name already
    // exists, the Python-parity variant stays reachable as `py_<name>`.
    parity.forEach((fn, name) => {
      if (this.globalEnv.hasOwn(name)) {
        this.globalEnv.define(`py_${name}`, fn);
      } else {
        this.globalEnv.define(name, fn);
      }
    });

    this.globalEnv.define('PI', Math.PI);
    this.globalEnv.define('TAU', Math.PI * 2);
    this.globalEnv.define('E', Math.E);
    this.globalEnv.define('INFINITY', Infinity);
    this.globalEnv.define('NAN', NaN);
    this.globalEnv.define('Ellipsis', '...');

    // Objects with `on_text` / `__str__` (and `on_repr` / `__repr__`)
    // render through their own protocol methods everywhere.
    setObjectTextHook((value) => {
      const m = this.protocolMethod(value, 'on_text');
      return m ? stringify(m.call([], 0)) : undefined;
    });
    setObjectReprHook((value) => {
      const m = this.protocolMethod(value, 'on_repr') ?? this.protocolMethod(value, 'on_text');
      return m ? stringify(m.call([], 0)) : undefined;
    });
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

  // ==========================================================
  // Driver: runs the generator-based evaluator to completion.
  // A stray `emit` outside a generator body is a hard error.
  // ==========================================================
  private execute(node: AST.ASTNode, env: Environment): unknown {
    const it = this.ev(node, env);
    let step = it.next();
    while (!step.done) {
      throw new SdevError("'emit' is only valid inside a generator function", node.line);
    }
    return step.value;
  }

  // ==========================================================
  // Evaluator
  // ==========================================================
  private *ev(node: AST.ASTNode, env: Environment): Ev {
    switch (node.type) {
      case 'Program': {
        let result: unknown = null;
        for (const stmt of node.statements) result = yield* this.ev(stmt, env);
        return result;
      }
      case 'NumberLiteral': return node.value;
      case 'StringLiteral': return node.value;
      case 'BooleanLiteral': return node.value;
      case 'NullLiteral': return null;
      case 'EllipsisLiteral': return '...';
      case 'BytesLiteral': {
        const bytes = new Uint8Array(node.value.length);
        for (let i = 0; i < node.value.length; i++) bytes[i] = node.value.charCodeAt(i) & 0xff;
        return bytes;
      }
      case 'Identifier': return this.executeIdentifier(node, env);
      case 'FStringExpr': return yield* this.evFString(node, env);
      case 'BinaryExpr': return yield* this.evBinary(node, env);
      case 'UnaryExpr': return yield* this.evUnary(node, env);
      case 'TernaryExpr':
        return this.truthy(yield* this.ev(node.condition, env))
          ? yield* this.ev(node.thenExpr, env)
          : yield* this.ev(node.elseExpr, env);
      case 'WalrusExpr': {
        const value = yield* this.ev(node.value, env);
        env.define(node.name, value);
        return value;
      }
      case 'AwaitExpr': {
        const v = yield* this.ev(node.operand, env);
        return this.awaitValue(v, node.line);
      }
      case 'EmitExpr': {
        if (node.delegate) {
          const source = yield* this.ev(node.value!, env);
          let last: unknown = null;
          for (const item of this.iterableOf(source, node.line)) {
            last = yield { __emit: true, value: item };
          }
          return last;
        }
        const value = node.value ? yield* this.ev(node.value, env) : null;
        const sent = yield { __emit: true, value };
        return sent === undefined ? null : sent;
      }
      case 'CallExpr': return yield* this.evCall(node, env);
      case 'NewExpr': return yield* this.evNew(node, env);
      case 'IndexExpr': return yield* this.evIndex(node, env);
      case 'SliceExpr': return yield* this.evSlice(node, env);
      case 'MemberExpr': return yield* this.evMember(node, env);
      case 'ArrayLiteral': return yield* this.evSequence(node.elements, env);
      case 'TupleLiteral': return makeTuple(yield* this.evSequence(node.elements, env));
      case 'SetLiteral': return new SdevSet(yield* this.evSequence(node.elements, env));
      case 'DictLiteral': return yield* this.evDict(node, env);
      case 'ComprehensionExpr': return yield* this.evComprehension(node, env);
      case 'StarExpr': return yield* this.ev(node.operand, env);
      case 'KeywordArg': return yield* this.ev(node.value, env);
      case 'LambdaExpr': return this.makeLambda(node, env);
      case 'LetStatement': return yield* this.evLet(node, env);
      case 'AssignStatement': {
        const value = yield* this.ev(node.value, env);
        env.set(node.name, value, node.line);
        return value;
      }
      case 'AugAssignStatement': return yield* this.evAugAssign(node, env);
      case 'IndexAssignStatement': return yield* this.evIndexAssign(node, env);
      case 'MemberAssignStatement': return yield* this.evMemberAssign(node, env);
      case 'IfStatement': {
        if (this.truthy(yield* this.ev(node.condition, env))) return yield* this.ev(node.thenBranch, env);
        if (node.elseBranch) return yield* this.ev(node.elseBranch, env);
        return null;
      }
      case 'WhileStatement': return yield* this.evWhile(node, env);
      case 'ForEachStatement': return yield* this.evForEach(node, env);
      case 'ForInStatement':
        return yield* this.evForEach(
          { type: 'ForEachStatement', variable: node.variable, iterable: node.iterable, body: node.body, line: node.line },
          env
        );
      case 'MatchStatement': return yield* this.evMatch(node, env);
      case 'WithStatement': return yield* this.evWith(node, env);
      case 'FuncDeclaration': return yield* this.evFuncDecl(node, env);
      case 'ClassDeclaration': return yield* this.evClassDecl(node, env);
      case 'ReturnStatement': {
        const value = node.value ? yield* this.ev(node.value, env) : null;
        throw new ReturnException(value);
      }
      case 'RaiseStatement': {
        if (!node.error) throw new SdevRaise('re-raise outside of a rescue block');
        const err = yield* this.ev(node.error, env);
        const cause = node.cause ? yield* this.ev(node.cause, env) : undefined;
        throw new SdevRaise(err, cause);
      }
      case 'AssertStatement': {
        const ok = this.truthy(yield* this.ev(node.condition, env));
        if (!ok) {
          const msg = node.message ? stringify(yield* this.ev(node.message, env)) : 'assertion failed';
          throw new SdevRaise(this.makeError('AssertionError', msg));
        }
        return null;
      }
      case 'DelStatement': return yield* this.evDel(node, env);
      case 'ScopeStatement': return null; // scope hints; resolution is dynamic
      case 'PassStatement': return null;
      case 'ImportStatement': return this.evImport(node, env);
      case 'BreakStatement': throw new BreakSignal();
      case 'ContinueStatement': throw new ContinueSignal();
      case 'TryStatement': return yield* this.evTry(node, env);
      case 'BlockStatement': {
        const blockEnv = new Environment(env);
        let result: unknown = null;
        for (const stmt of node.statements) result = yield* this.ev(stmt, blockEnv);
        return result;
      }
      case 'ExpressionStatement': return yield* this.ev(node.expression, env);
      default:
        throw new SdevError(`Unknown node type: ${(node as { type: string }).type}`, 0);
    }
  }

  private *evSequence(nodes: AST.ASTNode[], env: Environment): Generator<EmitSignal, unknown[], unknown> {
    const out: unknown[] = [];
    for (const n of nodes) {
      if (n.type === 'StarExpr' && !n.double) {
        const spread = yield* this.ev(n.operand, env);
        for (const item of this.iterableOf(spread, n.line)) out.push(item);
        continue;
      }
      out.push(yield* this.ev(n, env));
    }
    return out;
  }

  private executeIdentifier(node: AST.Identifier, env: Environment): unknown {
    if (node.name === 'PI') return Math.PI;
    if (node.name === 'TAU') return Math.PI * 2;
    if (node.name === 'E') return Math.E;
    if (node.name === 'INFINITY') return Infinity;
    return env.get(node.name, node.line);
  }

  private *evFString(node: AST.FStringExpr, env: Environment): Ev {
    let out = '';
    for (const part of node.parts) {
      if (part.kind === 'text') { out += part.value; continue; }
      const value = yield* this.ev(part.expr, env);
      const text = formatValue(value, part.spec, part.conv);
      out += part.debug ? `${part.debug}=${text}` : text;
    }
    return out;
  }

  // ----------------------------------------------------------
  // Operators
  // ----------------------------------------------------------

  private *evBinary(node: AST.BinaryExpr, env: Environment): Ev {
    if (node.operator === 'also') {
      const left = yield* this.ev(node.left, env);
      if (!this.truthy(left)) return left;
      return yield* this.ev(node.right, env);
    }
    if (node.operator === 'either') {
      const left = yield* this.ev(node.left, env);
      if (this.truthy(left)) return left;
      return yield* this.ev(node.right, env);
    }

    const left = yield* this.ev(node.left, env);
    const right = yield* this.ev(node.right, env);
    return this.applyBinary(node.operator, left, right, node.line);
  }

  applyBinary(operator: string, left: unknown, right: unknown, line: number): unknown {
    // Protocol dispatch on user objects
    const slot = PROTOCOL_SLOTS[operator];
    if (slot) {
      const lm = this.protocolMethod(left, slot);
      if (lm) return lm.call([right], line);
      const rslot = REFLECTED_SLOTS[operator];
      if (rslot) {
        const rm = this.protocolMethod(right, rslot);
        if (rm) return rm.call([left], line);
      }
    }

    switch (operator) {
      case 'is': return left === right;
      case 'is not': return left !== right;
      case 'in': return this.contains(right, left, line);
      case 'not in': return !this.contains(right, left, line);
      case '+':
        if (typeof left === 'number' && typeof right === 'number') return left + right;
        if (typeof left === 'string' || typeof right === 'string') return stringify(left) + stringify(right);
        if (Array.isArray(left) && Array.isArray(right)) {
          const merged = [...left, ...right];
          return isTuple(left) ? makeTuple(merged) : merged;
        }
        if (left instanceof SdevSet && right instanceof SdevSet) return new SdevSet([...left.values(), ...right.values()]);
        throw new SdevError("Cannot use '+' with these types", line);
      case '-':
        if (left instanceof SdevSet && right instanceof SdevSet) {
          return new SdevSet(left.values().filter((v) => !right.has(v)));
        }
        return this.requireNumbers(left, right, '-', line, (a, b) => a - b);
      case '*':
        if (typeof left === 'number' && typeof right === 'number') return left * right;
        if (typeof left === 'string' && typeof right === 'number') return left.repeat(Math.max(0, Math.floor(right)));
        if (typeof left === 'number' && typeof right === 'string') return right.repeat(Math.max(0, Math.floor(left)));
        if (Array.isArray(left) && typeof right === 'number') {
          const result: unknown[] = [];
          for (let i = 0; i < Math.max(0, Math.floor(right)); i++) result.push(...left);
          return result;
        }
        if (typeof left === 'number' && Array.isArray(right)) {
          const result: unknown[] = [];
          for (let i = 0; i < Math.max(0, Math.floor(left)); i++) result.push(...right);
          return result;
        }
        throw new SdevError("Cannot use '*' with these types", line);
      case '/':
        return this.requireNumbers(left, right, '/', line, (a, b) => {
          if (b === 0) throw new SdevRaise(this.makeError('ZeroDivisionError', 'division by zero'));
          return a / b;
        });
      case '\\': // floor division
        return this.requireNumbers(left, right, '\\', line, (a, b) => {
          if (b === 0) throw new SdevRaise(this.makeError('ZeroDivisionError', 'division by zero'));
          return Math.floor(a / b);
        });
      case '@': // matrix multiply hook
        throw new SdevError("Operator '@' requires objects implementing 'on_matmul'", line);
      case '%':
        if (typeof left === 'string') return this.percentFormat(left, right);
        return this.requireNumbers(left, right, '%', line, (a, b) => {
          if (b === 0) throw new SdevRaise(this.makeError('ZeroDivisionError', 'modulo by zero'));
          return ((a % b) + b) % b;
        });
      case '^': return this.requireNumbers(left, right, '^', line, (a, b) => Math.pow(a, b));
      case '&':
        if (left instanceof SdevSet && right instanceof SdevSet) return new SdevSet(left.values().filter((v) => right.has(v)));
        return this.requireNumbers(left, right, '&', line, (a, b) => a & b);
      case '|':
        if (left instanceof SdevSet && right instanceof SdevSet) return new SdevSet([...left.values(), ...right.values()]);
        return this.requireNumbers(left, right, '|', line, (a, b) => a | b);
      case '<<': return this.requireNumbers(left, right, '<<', line, (a, b) => a << b);
      case '>>': return this.requireNumbers(left, right, '>>', line, (a, b) => a >> b);
      case '<': case '>': case '<=': case '>=': {
        if (typeof left === 'string' && typeof right === 'string') {
          return operator === '<' ? left < right : operator === '>' ? left > right :
            operator === '<=' ? left <= right : left >= right;
        }
        return this.requireNumbers(left, right, operator, line, (a, b) =>
          operator === '<' ? a < b : operator === '>' ? a > b : operator === '<=' ? a <= b : a >= b);
      }
      case 'equals': return this.isEqual(left, right);
      case 'differs': case '<>': return !this.isEqual(left, right);
      default:
        throw new SdevError(`Unknown operator: ${operator}`, line);
    }
  }

  /** Python's printf-style `"%s" % value`. */
  private percentFormat(template: string, value: unknown): string {
    const args = Array.isArray(value) ? [...value] : [value];
    let i = 0;
    return template.replace(/%(\.\d+)?[sdifr%]/g, (m) => {
      if (m === '%%') return '%';
      const v = args[i++];
      const prec = /\.(\d+)/.exec(m);
      if (m.endsWith('d') || m.endsWith('i')) return String(Math.trunc(Number(v)));
      if (m.endsWith('f')) return Number(v).toFixed(prec ? Number(prec[1]) : 6);
      return stringify(v);
    });
  }

  private *evUnary(node: AST.UnaryExpr, env: Environment): Ev {
    const operand = yield* this.ev(node.operand, env);
    switch (node.operator) {
      case '-': {
        const m = this.protocolMethod(operand, 'on_neg');
        if (m) return m.call([], node.line);
        if (typeof operand === 'number') return -operand;
        if (typeof operand === 'string' && operand.trim() !== '' && !isNaN(Number(operand))) return -Number(operand);
        throw new SdevError("Cannot use '-' with non-number", node.line);
      }
      case 'isnt': return !this.truthy(operand);
      default:
        throw new SdevError(`Unknown unary operator: ${node.operator}`, node.line);
    }
  }

  // ----------------------------------------------------------
  // Calls
  // ----------------------------------------------------------

  private *evArgs(nodes: AST.ASTNode[], env: Environment): Generator<EmitSignal, { args: unknown[]; kwargs: Record<string, unknown> }, unknown> {
    const args: unknown[] = [];
    const kwargs: Record<string, unknown> = {};
    for (const n of nodes) {
      if (n.type === 'StarExpr') {
        const v = yield* this.ev(n.operand, env);
        if (n.double) {
          if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(kwargs, v as Record<string, unknown>);
        } else {
          for (const item of this.iterableOf(v, n.line)) args.push(item);
        }
        continue;
      }
      if (n.type === 'KeywordArg') {
        kwargs[n.name] = yield* this.ev(n.value, env);
        continue;
      }
      args.push(yield* this.ev(n, env));
    }
    return { args, kwargs };
  }

  private *evCall(node: AST.CallExpr, env: Environment): Ev {
    const callee = yield* this.ev(node.callee, env);
    const { args, kwargs } = yield* this.evArgs(node.args, env);
    return this.callValue(callee, args, node.line, kwargs);
  }

  /** Calls any callable sdev value: function, class, or object with `on_call`. */
  callValue(callee: unknown, args: unknown[], line: number, kwargs?: Record<string, unknown>): unknown {
    if (callee && typeof callee === 'object' && (callee as { type?: string }).type === 'class') {
      return this.instantiate(callee as SdevClass, args, line, kwargs);
    }
    if (isFunction(callee)) {
      const rich = callee as RichFunction;
      if (kwargs && Object.keys(kwargs).length > 0) {
        return rich.call([...args, { __kwargs: true, ...kwargs }], line);
      }
      return rich.call(args, line);
    }
    const m = this.protocolMethod(callee, 'on_call');
    if (m) return m.call(args, line);
    throw new SdevError(`Cannot call non-function: ${stringify(callee)}`, line);
  }

  // ----------------------------------------------------------
  // Indexing / members
  // ----------------------------------------------------------

  private *evIndex(node: AST.IndexExpr, env: Environment): Ev {
    const obj = yield* this.ev(node.object, env);
    const index = yield* this.ev(node.index, env);
    return this.getIndex(obj, index, node.line);
  }

  getIndex(obj: unknown, index: unknown, line: number): unknown {
    const m = this.protocolMethod(obj, 'on_get');
    if (m) return m.call([index], line);

    if (Array.isArray(obj)) {
      if (typeof index !== 'number') throw new SdevError('List index must be a number', line);
      const idx = index < 0 ? obj.length + index : index;
      if (idx < 0 || idx >= obj.length) {
        throw new SdevRaise(this.makeError('IndexError', `list index out of range: ${index}`));
      }
      return obj[idx];
    }
    if (typeof obj === 'string') {
      if (typeof index !== 'number') throw new SdevError('String index must be a number', line);
      const idx = index < 0 ? obj.length + index : index;
      if (idx < 0 || idx >= obj.length) {
        throw new SdevRaise(this.makeError('IndexError', 'string index out of range'));
      }
      return obj[idx];
    }
    if (obj instanceof Uint8Array) {
      const idx = (index as number) < 0 ? obj.length + (index as number) : (index as number);
      return obj[idx];
    }
    if (obj instanceof SdevSet) throw new SdevError('Sets are not indexable', line);
    if (obj && typeof obj === 'object') {
      const key = stringify(index);
      const val = (obj as Record<string, unknown>)[key];
      return val === undefined ? null : val;
    }
    throw new SdevError('Cannot index this type', line);
  }

  private *evSlice(node: AST.SliceExpr, env: Environment): Ev {
    const obj = yield* this.ev(node.object, env);
    const start = node.start ? (yield* this.ev(node.start, env)) as number | null : null;
    const stop = node.stop ? (yield* this.ev(node.stop, env)) as number | null : null;
    const step = node.step ? (yield* this.ev(node.step, env)) as number | null : null;
    return this.sliceValue(obj, start, stop, step, node.line);
  }

  sliceValue(obj: unknown, start: number | null, stop: number | null, step: number | null, line: number): unknown {
    const items: unknown[] = Array.isArray(obj)
      ? obj
      : typeof obj === 'string'
        ? obj.split('')
        : (() => { throw new SdevError('Cannot slice this type', line); })();

    const n = items.length;
    const s = step === null || step === undefined ? 1 : step;
    if (s === 0) throw new SdevError('Slice step cannot be zero', line);

    const norm = (v: number | null, def: number): number => {
      if (v === null || v === undefined) return def;
      return v < 0 ? Math.max(0, n + v) : Math.min(v, n);
    };

    const out: unknown[] = [];
    if (s > 0) {
      const from = norm(start, 0);
      const to = norm(stop, n);
      for (let i = from; i < to; i += s) out.push(items[i]);
    } else {
      const from = start === null || start === undefined ? n - 1 : (start < 0 ? n + start : Math.min(start, n - 1));
      const to = stop === null || stop === undefined ? -1 : (stop < 0 ? n + stop : stop);
      for (let i = from; i > to; i += s) out.push(items[i]);
    }
    return typeof obj === 'string' ? out.join('') : out;
  }

  private *evMember(node: AST.MemberExpr, env: Environment): Ev {
    const obj = yield* this.ev(node.object, env);
    return this.getMember(obj, node.property, node.line);
  }

  getMember(obj: unknown, property: string, line: number): unknown {
    if (typeof obj === 'string') {
      if (property === 'length') return obj.length;
      const bound = this.boundBuiltin(obj, property);
      if (bound) return bound;
    }
    if (Array.isArray(obj) && property === 'length') return obj.length;
    if (obj instanceof SdevSet && property === 'length') return obj.size;
    if (Array.isArray(obj) || obj instanceof SdevSet) {
      const bound = this.boundBuiltin(obj, property);
      if (bound) return bound;
    }
    if (obj && typeof obj === 'object') {
      const klass = (obj as { __class__?: SdevClass }).__class__;
      if (klass) {
        const prop = this.findProperty(klass, property);
        if (prop?.get) return prop.get.call([obj], line);
      }
      const val = (obj as Record<string, unknown>)[property];
      if (val !== undefined) return val;
      const getattr = this.protocolMethod(obj, 'on_getattr');
      if (getattr) return getattr.call([property], line);
      if (!klass) {
        // Python method syntax on plain values: `d.items()`, `s.upper()`,
        // `xs.append(v)` — bind the receiver to the same-named builtin.
        const bound = this.boundBuiltin(obj, property);
        if (bound) return bound;
      }
      return null;
    }
    if (typeof obj === 'number') {
      const bound = this.boundBuiltin(obj, property);
      if (bound) return bound;
    }
    throw new SdevError(`Cannot access property '${property}' on this type`, line);
  }

  /**
   * Method-call sugar: `value.name(args)` resolves to the global builtin
   * `name(value, args)` when no attribute of that name exists.
   */
  private boundBuiltin(receiver: unknown, name: string): SdevFunction | undefined {
    if (!this.globalEnv.hasOwn(name) && !this.globalEnv.hasOwn(`py_${name}`)) return undefined;
    const candidate = this.globalEnv.hasOwn(`py_${name}`)
      ? this.globalEnv.get(`py_${name}`, 0)
      : this.globalEnv.get(name, 0);
    if (!isFunction(candidate)) return undefined;
    const target = candidate as SdevFunction;
    return {
      type: 'builtin',
      call: (args: unknown[], line: number) => target.call([receiver, ...args], line),
    } as SdevFunction;
  }

  // ----------------------------------------------------------
  // Literals
  // ----------------------------------------------------------

  private *evDict(node: AST.DictLiteral, env: Environment): Ev {
    const result: Record<string, unknown> = {};
    for (const entry of node.entries) {
      if (entry.key.type === 'StarExpr' && entry.key.double) {
        const spread = yield* this.ev(entry.key.operand, env);
        if (spread && typeof spread === 'object') Object.assign(result, spread as Record<string, unknown>);
        continue;
      }
      const key = stringify(yield* this.ev(entry.key, env));
      result[key] = yield* this.ev(entry.value, env);
    }
    return result;
  }

  private *evComprehension(node: AST.ComprehensionExpr, env: Environment): Ev {
    if (node.form === 'gen') {
      const self = this;
      const iter = (function* (): Generator<unknown, unknown, unknown> {
        yield* self.comprehensionWalk(node, env, 0, (value) => value);
        return null;

      })();
      return makeGenerator(iter as Iterator<unknown, unknown, unknown>);
    }

    const collected: unknown[] = [];
    const pairs: { key: string; value: unknown }[] = [];
    for (const produced of this.comprehensionWalk(node, env, 0, (v) => v)) {
      if (node.form === 'dict') {
        const p = produced as { key: string; value: unknown };
        pairs.push(p);
      } else {
        collected.push(produced);
      }
    }
    if (node.form === 'list') return collected;
    if (node.form === 'set') return new SdevSet(collected);
    const dict: Record<string, unknown> = {};
    for (const { key, value } of pairs) dict[key] = value;
    return dict;
  }

  /** Lazily walks comprehension clauses, producing one value per match. */
  private *comprehensionWalk(
    node: AST.ComprehensionExpr,
    env: Environment,
    clauseIndex: number,
    emit: (v: unknown) => unknown
  ): Generator<unknown, void, unknown> {
    if (clauseIndex >= node.clauses.length) {
      if (node.form === 'dict') {
        const key = stringify(this.execute(node.element, env));
        yield emit({ key, value: this.execute(node.valueExpr!, env) });
      } else {
        yield emit(this.execute(node.element, env));
      }
      return;
    }
    const clause = node.clauses[clauseIndex];
    const source = this.execute(clause.iterable, env);
    for (const item of this.iterableOf(source, node.line)) {
      const scope = new Environment(env);
      this.bindTarget(clause.variable, item, scope, node.line);
      let ok = true;
      for (const cond of clause.conditions) {
        if (!this.truthy(this.execute(cond, scope))) { ok = false; break; }
      }
      if (!ok) continue;
      yield* this.comprehensionWalk(node, scope, clauseIndex + 1, emit);
    }
  }

  private bindTarget(target: string | string[], value: unknown, env: Environment, line: number): void {
    if (typeof target === 'string') { env.define(target, value); return; }
    const items = [...this.iterableOf(value, line)];
    target.forEach((name, i) => env.define(name, items[i] === undefined ? null : items[i]));
  }

  // ----------------------------------------------------------
  // Assignment
  // ----------------------------------------------------------

  private *evLet(node: AST.LetStatement, env: Environment): Ev {
    const value = yield* this.ev(node.value, env);
    if (node.targets && node.targets.length > 1) {
      const items = [...this.iterableOf(value, node.line)];
      const star = node.starIndex;
      if (star === undefined) {
        node.targets.forEach((name, i) => env.define(name, items[i] === undefined ? null : items[i]));
      } else {
        const after = node.targets.length - star - 1;
        node.targets.forEach((name, i) => {
          if (i < star) env.define(name, items[i] === undefined ? null : items[i]);
          else if (i === star) env.define(name, items.slice(star, items.length - after));
          else env.define(name, items[items.length - (node.targets!.length - i)] ?? null);
        });
      }
      return value;
    }
    env.define(node.name, value);
    return value;
  }

  private *evAugAssign(node: AST.AugAssignStatement, env: Environment): Ev {
    const current = yield* this.ev(node.target, env);
    const operand = yield* this.ev(node.value, env);
    const updated = this.applyBinary(node.operator, current, operand, node.line);

    if (node.target.type === 'Identifier') {
      env.set(node.target.name, updated, node.line);
    } else if (node.target.type === 'IndexExpr') {
      const obj = yield* this.ev(node.target.object, env);
      const index = yield* this.ev(node.target.index, env);
      this.setIndex(obj, index, updated, node.line);
    } else if (node.target.type === 'MemberExpr') {
      const obj = yield* this.ev(node.target.object, env);
      this.setMember(obj, node.target.property, updated, node.line);
    } else {
      throw new SdevError('Invalid augmented assignment target', node.line);
    }
    return updated;
  }

  private *evIndexAssign(node: AST.IndexAssignStatement, env: Environment): Ev {
    const obj = yield* this.ev(node.object, env);
    const index = yield* this.ev(node.index, env);
    const value = yield* this.ev(node.value, env);
    return this.setIndex(obj, index, value, node.line);
  }

  setIndex(obj: unknown, index: unknown, value: unknown, line: number): unknown {
    const m = this.protocolMethod(obj, 'on_set');
    if (m) return m.call([index, value], line);

    if (Array.isArray(obj)) {
      if (typeof index !== 'number') throw new SdevError('List index must be a number', line);
      const idx = index < 0 ? obj.length + index : index;
      if (idx < 0) throw new SdevRaise(this.makeError('IndexError', 'list index out of range'));
      obj[idx] = value;
      return value;
    }
    if (obj && typeof obj === 'object') {
      (obj as Record<string, unknown>)[stringify(index)] = value;
      return value;
    }
    throw new SdevError('Cannot assign to index of this type', line);
  }

  private *evMemberAssign(node: AST.MemberAssignStatement, env: Environment): Ev {
    const obj = yield* this.ev(node.object, env);
    const value = yield* this.ev(node.value, env);
    return this.setMember(obj, node.property, value, node.line);
  }

  setMember(obj: unknown, property: string, value: unknown, line: number): unknown {
    if (!obj || typeof obj !== 'object') throw new SdevError('Cannot assign property on non-object', line);
    const klass = (obj as { __class__?: SdevClass }).__class__;
    if (klass) {
      const prop = this.findProperty(klass, property);
      if (prop?.set) { prop.set.call([obj, value], line); return value; }
      if (prop?.get && !prop.set) throw new SdevError(`Property '${property}' is read-only`, line);
    }
    (obj as Record<string, unknown>)[property] = value;
    return value;
  }

  private *evDel(node: AST.DelStatement, env: Environment): Ev {
    for (const target of node.targets) {
      if (target.type === 'Identifier') {
        env.define(target.name, null);
      } else if (target.type === 'IndexExpr') {
        const obj = yield* this.ev(target.object, env);
        const index = yield* this.ev(target.index, env);
        if (Array.isArray(obj)) {
          const i = index as number;
          obj.splice(i < 0 ? obj.length + i : i, 1);
        } else if (obj instanceof SdevSet) {
          obj.delete(index);
        } else if (obj && typeof obj === 'object') {
          delete (obj as Record<string, unknown>)[stringify(index)];
        }
      } else if (target.type === 'MemberExpr') {
        const obj = yield* this.ev(target.object, env);
        if (obj && typeof obj === 'object') delete (obj as Record<string, unknown>)[target.property];
      }
    }
    return null;
  }

  // ----------------------------------------------------------
  // Loops
  // ----------------------------------------------------------

  private *evWhile(node: AST.WhileStatement, env: Environment): Ev {
    let result: unknown = null;
    let iterations = 0;
    let broke = false;

    while (this.truthy(yield* this.ev(node.condition, env))) {
      try {
        result = yield* this.ev(node.body, env);
      } catch (e) {
        if (e instanceof BreakSignal) { broke = true; break; }
        if (!(e instanceof ContinueSignal)) throw e;
      }
      if (++iterations > MAX_ITERATIONS) {
        throw new SdevError('Maximum loop iterations exceeded (possible infinite loop)', node.line);
      }
    }
    if (!broke && node.elseBlock) yield* this.ev(node.elseBlock, env);
    return result;
  }

  private *evForEach(node: AST.ForEachStatement, env: Environment): Ev {
    const iterable = yield* this.ev(node.iterable, env);
    const targets: string | string[] = node.variables ?? node.variable;

    let result: unknown = null;
    let iterations = 0;
    let broke = false;

    for (const item of this.iterableOf(iterable, node.line)) {
      const loopEnv = new Environment(env);
      this.bindTarget(targets, item, loopEnv, node.line);
      try {
        result = yield* this.ev(node.body, loopEnv);
      } catch (e) {
        if (e instanceof BreakSignal) { broke = true; break; }
        if (!(e instanceof ContinueSignal)) throw e;
      }
      if (++iterations > MAX_ITERATIONS) {
        throw new SdevError('Maximum loop iterations exceeded', node.line);
      }
    }
    if (!broke && node.elseBlock) yield* this.ev(node.elseBlock, env);
    return result;
  }

  /** Universal iteration protocol: lists, strings, sets, tomes, generators, `on_iter`. */
  iterableOf(value: unknown, line: number): Iterable<unknown> {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split('');
    if (value instanceof SdevSet) return value.values();
    if (value instanceof Uint8Array) return Array.from(value);
    if (isGenerator(value)) return value as unknown as Iterable<unknown>;
    if (value && typeof value === 'object') {
      const iterMethod = this.protocolMethod(value, 'on_iter');
      if (iterMethod) {
        const produced = iterMethod.call([], line);
        if (produced !== value) return this.iterableOf(produced, line);
      }
      const nextMethod = this.protocolMethod(value, 'on_next');
      if (nextMethod) {
        return {
          [Symbol.iterator]: () => ({
            next: () => {
              try {
                const v = nextMethod.call([], line);
                return { value: v, done: false };
              } catch (e) {
                if (e instanceof SdevRaise && this.errorName(e.value) === 'StopIteration') {
                  return { value: undefined, done: true };
                }
                throw e;
              }
            },
          }),
        };
      }
      if ((value as { type?: string }).type === 'class') {
        throw new SdevError('Cannot iterate a class', line);
      }
      return Object.keys(value as Record<string, unknown>);
    }
    throw new SdevError('This value is not iterable', line);
  }

  private contains(container: unknown, item: unknown, line: number): boolean {
    if (container instanceof SdevSet) return container.has(item);
    if (typeof container === 'string') return container.includes(stringify(item));
    if (Array.isArray(container)) return container.some((v) => this.isEqual(v, item));
    if (container && typeof container === 'object' && !isGenerator(container)) {
      return Object.prototype.hasOwnProperty.call(container, stringify(item));
    }
    for (const v of this.iterableOf(container, line)) if (this.isEqual(v, item)) return true;
    return false;
  }

  // ----------------------------------------------------------
  // Pattern matching
  // ----------------------------------------------------------

  private *evMatch(node: AST.MatchStatement, env: Environment): Ev {
    const subject = yield* this.ev(node.subject, env);
    for (const kase of node.cases) {
      const scope = new Environment(env);
      if (!this.matchPattern(kase.pattern, subject, scope, node.line)) continue;
      if (kase.guard && !this.truthy(this.execute(kase.guard, scope))) continue;
      return yield* this.ev(kase.body, scope);
    }
    return null;
  }

  private matchPattern(pattern: AST.PatternNode, value: unknown, env: Environment, line: number): boolean {
    switch (pattern.type) {
      case 'PatWildcard': return true;
      case 'PatCapture': {
        if (pattern.pattern && !this.matchPattern(pattern.pattern, value, env, line)) return false;
        env.define(pattern.name, value);
        return true;
      }
      case 'PatLiteral': return this.isEqual(this.execute(pattern.value, env), value);
      case 'PatValue': return this.isEqual(this.execute(pattern.expr, env), value);
      case 'PatOr': return pattern.options.some((p) => this.matchPattern(p, value, env, line));
      case 'PatSequence': {
        if (!Array.isArray(value)) return false;
        const fixed = pattern.elements.length;
        if (pattern.restName === undefined && value.length !== fixed) return false;
        if (pattern.restName !== undefined && value.length < fixed) return false;
        const at = pattern.restIndex ?? fixed;
        for (let i = 0; i < at; i++) {
          if (!this.matchPattern(pattern.elements[i], value[i], env, line)) return false;
        }
        const tailCount = fixed - at;
        for (let i = 0; i < tailCount; i++) {
          if (!this.matchPattern(pattern.elements[at + i], value[value.length - tailCount + i], env, line)) return false;
        }
        if (pattern.restName) env.define(pattern.restName, value.slice(at, value.length - tailCount));
        return true;
      }
      case 'PatMapping': {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const obj = value as Record<string, unknown>;
        const used = new Set<string>();
        for (const { key, pattern: sub } of pattern.entries) {
          const k = stringify(this.execute(key, env));
          if (!(k in obj)) return false;
          if (!this.matchPattern(sub, obj[k], env, line)) return false;
          used.add(k);
        }
        if (pattern.restName) {
          const rest: Record<string, unknown> = {};
          for (const k of Object.keys(obj)) if (!used.has(k)) rest[k] = obj[k];
          env.define(pattern.restName, rest);
        }
        return true;
      }
      case 'PatClass': {
        const klass = env.get(pattern.className, line) as SdevClass | undefined;
        if (!klass || klass.type !== 'class') return false;
        if (!this.isInstanceOf(value, klass)) return false;
        const obj = value as Record<string, unknown>;
        const order = (klass.attrs['match_fields'] as unknown[] | undefined) ?? Object.keys(obj);
        for (let i = 0; i < pattern.positional.length; i++) {
          const field = stringify(order[i]);
          if (!this.matchPattern(pattern.positional[i], obj[field], env, line)) return false;
        }
        for (const { name, pattern: sub } of pattern.keywords) {
          if (!this.matchPattern(sub, obj[name], env, line)) return false;
        }
        return true;
      }
      default: return false;
    }
  }

  private isInstanceOf(value: unknown, klass: SdevClass): boolean {
    if (!value || typeof value !== 'object') return false;
    const own = (value as { __class__?: SdevClass }).__class__;
    if (!own) return false;
    return own.mro.includes(klass);
  }

  // ----------------------------------------------------------
  // Context managers
  // ----------------------------------------------------------

  private *evWith(node: AST.WithStatement, env: Environment): Ev {
    const scope = new Environment(env);
    const opened: unknown[] = [];
    try {
      for (const item of node.items) {
        const manager = yield* this.ev(item.expr, scope);
        const enter = this.protocolMethod(manager, 'on_enter');
        const bound = enter ? enter.call([], node.line) : manager;
        opened.push(manager);
        if (item.alias) scope.define(item.alias, bound);
      }
      return yield* this.ev(node.body, scope);
    } catch (e) {
      for (const manager of opened.reverse()) {
        const exit = this.protocolMethod(manager, 'on_exit');
        if (exit) {
          const suppressed = exit.call([e instanceof SdevRaise ? e.value : stringify(e)], node.line);
          if (this.truthy(suppressed)) return null;
        }
      }
      opened.length = 0;
      throw e;
    } finally {
      for (const manager of opened.reverse()) {
        const exit = this.protocolMethod(manager, 'on_exit');
        if (exit) exit.call([null], node.line);
      }
    }
  }

  // ----------------------------------------------------------
  // Functions
  // ----------------------------------------------------------

  private *evFuncDecl(node: AST.FuncDeclaration, env: Environment): Ev {
    let fn: unknown = this.makeFunction(node, env);
    if (node.decorators?.length) {
      for (const dec of [...node.decorators].reverse()) {
        const decorator = yield* this.ev(dec, env);
        fn = this.callValue(decorator, [fn], node.line);
      }
    }
    env.define(node.name, fn);
    return null;
  }

  private makeFunction(node: AST.FuncDeclaration, env: Environment, boundName?: string): RichFunction {
    const self = this;
    const specs = node.paramSpecs ?? node.params.map((name) => ({ name, kind: 'normal' as const }));

    const fn: RichFunction = {
      type: 'user',
      call: (args: unknown[], callLine: number) => {
        const funcEnv = new Environment(env);
        self.bindParams(specs, args, funcEnv, callLine, node.name);

        if (node.isGenerator) {
          const iter = self.generatorBody(node.body, funcEnv);
          return makeGenerator(iter);
        }

        try {
          self.execute(node.body, funcEnv);
          return null;
        } catch (e) {
          if (e instanceof ReturnException) return e.value;
          throw e;
        }
      },
      meta: {
        paramSpecs: specs,
        isGenerator: node.isGenerator,
        isAsync: node.isAsync,
        name: boundName ?? node.name,
      },
    };
    return fn;
  }

  /** Drives a generator function body, surfacing `emit` values to the host. */
  private *generatorBody(body: AST.ASTNode, env: Environment): Generator<unknown, unknown, unknown> {
    const it = this.ev(body, env);
    let sent: unknown = undefined;
    try {
      for (;;) {
        const step = it.next(sent);
        if (step.done) return step.value ?? null;
        sent = yield (step.value as EmitSignal).value;
      }
    } catch (e) {
      if (e instanceof ReturnException) return e.value;
      throw e;
    }
  }

  private makeLambda(node: AST.LambdaExpr, env: Environment): RichFunction {
    const self = this;
    const specs = node.paramSpecs ?? node.params.map((name) => ({ name, kind: 'normal' as const }));
    return {
      type: 'lambda',
      call: (args: unknown[], callLine: number) => {
        const lambdaEnv = new Environment(env);
        self.bindParams(specs, args, lambdaEnv, callLine, '<lambda>');
        try {
          return self.execute(node.body, lambdaEnv);
        } catch (e) {
          if (e instanceof ReturnException) return e.value;
          throw e;
        }
      },
      meta: { paramSpecs: specs, name: '<lambda>' },
    };
  }

  /**
   * Binds positional args, keyword args, defaults, `*rest` and `**named`
   * following Python's rules.
   */
  private bindParams(specs: AST.Param[], rawArgs: unknown[], env: Environment, line: number, fnName: string): void {
    let kwargs: Record<string, unknown> = {};
    const args = [...rawArgs];
    const last = args[args.length - 1];
    if (last && typeof last === 'object' && (last as { __kwargs?: boolean }).__kwargs) {
      const { __kwargs, ...rest } = last as Record<string, unknown>;
      void __kwargs;
      kwargs = rest;
      args.pop();
    }

    let pos = 0;
    for (const spec of specs) {
      if (spec.kind === 'rest') {
        env.define(spec.name, makeTuple(args.slice(pos)));
        pos = args.length;
        continue;
      }
      if (spec.kind === 'named') {
        env.define(spec.name, { ...kwargs });
        kwargs = {};
        continue;
      }
      if (spec.kind === 'kwonly') {
        if (spec.name in kwargs) {
          env.define(spec.name, kwargs[spec.name]);
          delete kwargs[spec.name];
        } else if (spec.default) {
          env.define(spec.name, this.execute(spec.default, env));
        } else {
          throw new SdevError(`Function '${fnName}' is missing keyword argument '${spec.name}'`, line);
        }
        continue;
      }
      if (pos < args.length) {
        env.define(spec.name, args[pos++]);
      } else if (spec.kind !== 'posonly' && spec.name in kwargs) {
        env.define(spec.name, kwargs[spec.name]);
        delete kwargs[spec.name];
      } else if (spec.default) {
        env.define(spec.name, this.execute(spec.default, env));
      } else {
        env.define(spec.name, null);
      }
    }

    // Leftover keyword args are silently ignored unless a **named param exists,
    // which already consumed them above.
  }

  private awaitValue(value: unknown, line: number): unknown {
    if (isGenerator(value)) {
      let last: unknown = null;
      for (;;) {
        const step = value.next();
        if (step.done) return step.value ?? last;
        last = step.value;
      }
    }
    if (value && typeof value === 'object' && '__await' in (value as object)) {
      return (value as { __await: unknown }).__await;
    }
    void line;
    return value;
  }

  // ----------------------------------------------------------
  // Classes
  // ----------------------------------------------------------

  private *evClassDecl(node: AST.ClassDeclaration, env: Environment): Ev {
    const baseNames = node.superClasses?.length ? node.superClasses : (node.superClass ? [node.superClass] : []);
    const bases: SdevClass[] = [];
    for (const name of baseNames) {
      const base = env.get(name, node.line);
      if (!base || (base as SdevClass).type !== 'class') {
        throw new SdevError(`'${name}' is not a class`, node.line);
      }
      bases.push(base as SdevClass);
    }

    const klass: SdevClass = {
      type: 'class',
      name: node.name,
      superClass: bases[0],
      bases,
      mro: [],
      methods: new Map(),
      props: new Map(),
      statics: new Map(),
      attrs: {},
    };
    klass.mro = this.linearize(klass);

    // Class-level attributes
    for (const field of node.fields ?? []) {
      klass.attrs[field.name] = this.execute(field.value, env);
    }

    // Methods, with decorator handling
    const classEnv = new Environment(env);
    classEnv.define(node.name, klass);

    for (const method of node.methods) {
      const raw = this.makeFunction(method, classEnv, `${node.name}.${method.name}`);
      const decorators = (method.decorators ?? []).map((d) => this.describeDecorator(d));

      if (decorators.includes('property')) {
        const entry = klass.props.get(method.name) ?? {};
        entry.get = raw;
        klass.props.set(method.name, entry);
        continue;
      }
      const setterOf = decorators.find((d) => d.endsWith('.setter'));
      if (setterOf) {
        const target = setterOf.slice(0, -'.setter'.length);
        const entry = klass.props.get(target) ?? {};
        entry.set = raw;
        klass.props.set(target, entry);
        continue;
      }
      if (decorators.includes('staticmethod')) {
        klass.statics.set(method.name, raw);
        continue;
      }

      let fn: unknown = raw;
      for (const dec of [...(method.decorators ?? [])].reverse()) {
        const name = this.describeDecorator(dec);
        if (name === 'property' || name === 'staticmethod' || name.endsWith('.setter')) continue;
        const decorator = this.execute(dec, classEnv);
        fn = this.callValue(decorator, [fn], method.line);
      }
      klass.methods.set(method.name, fn as SdevFunction);
      // Python dunder spellings alias onto sdev's `on_*` protocol slots
      // (and vice-versa), so both styles dispatch identically.
      const alias = dunderAlias(method.name);
      if (alias && !klass.methods.has(alias)) klass.methods.set(alias, fn as SdevFunction);
    }

    // `essence` is also a value, so metaclasses / decorators can transform it
    let value: unknown = klass;
    for (const dec of [...(node.decorators ?? [])].reverse()) {
      const decorator = yield* this.ev(dec, env);
      value = this.callValue(decorator, [value], node.line);
    }
    env.define(node.name, value);
    return null;
  }

  /** Renders a decorator expression to a name for the built-in decorators. */
  private describeDecorator(node: AST.ASTNode): string {
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'MemberExpr' && node.object.type === 'Identifier') {
      return `${node.object.name}.${node.property}`;
    }
    if (node.type === 'CallExpr') return this.describeDecorator(node.callee);
    return '';
  }

  /** C3 linearisation across multiple bases. */
  private linearize(klass: SdevClass): SdevClass[] {
    const merge = (seqs: SdevClass[][]): SdevClass[] => {
      const result: SdevClass[] = [];
      const lists = seqs.map((s) => [...s]).filter((s) => s.length);
      while (lists.length) {
        let head: SdevClass | undefined;
        for (const list of lists) {
          const candidate = list[0];
          if (!lists.some((other) => other.slice(1).includes(candidate))) { head = candidate; break; }
        }
        if (!head) { // inconsistent hierarchy — fall back to depth-first
          return seqs.flat().filter((c, i, a) => a.indexOf(c) === i);
        }
        result.push(head);
        for (const list of lists) if (list[0] === head) list.shift();
        for (let i = lists.length - 1; i >= 0; i--) if (!lists[i].length) lists.splice(i, 1);
      }
      return result;
    };
    return [klass, ...merge([...klass.bases.map((b) => b.mro), klass.bases])];
  }

  private findMethod(klass: SdevClass, name: string): SdevFunction | undefined {
    for (const c of klass.mro) {
      const m = c.methods.get(name);
      if (m) return m;
    }
    return undefined;
  }

  private findProperty(klass: SdevClass, name: string): { get?: SdevFunction; set?: SdevFunction } | undefined {
    for (const c of klass.mro) {
      const p = c.props.get(name);
      if (p) return p;
    }
    return undefined;
  }

  private *evNew(node: AST.NewExpr, env: Environment): Ev {
    const klassValue = yield* this.ev(node.className, env);
    const { args, kwargs } = yield* this.evArgs(node.args, env);
    if (!klassValue || (klassValue as SdevClass).type !== 'class') {
      throw new SdevError('Expected a class after "new"', node.line);
    }
    return this.instantiate(klassValue as SdevClass, args, node.line, kwargs);
  }

  private instantiate(klass: SdevClass, args: unknown[], line: number, kwargs?: Record<string, unknown>): unknown {
    const instance: SdevInstance = { type: 'instance', klass, fields: {} };
    const proxy = this.createInstanceProxy(instance);

    const init = this.findMethod(klass, 'init') ?? this.findMethod(klass, 'on_init');
    if (init) {
      const callArgs = kwargs && Object.keys(kwargs).length
        ? [proxy, ...args, { __kwargs: true, ...kwargs }]
        : [proxy, ...args];
      init.call(callArgs, line);
    } else {
      // Dataclass-style positional field binding when no init is declared
      const fields = Object.keys(klass.attrs);
      args.forEach((v, i) => { if (fields[i]) (proxy as Record<string, unknown>)[fields[i]] = v; });
      if (kwargs) Object.assign(proxy, kwargs);
    }
    return proxy;
  }

  private createInstanceProxy(instance: SdevInstance): Record<string, unknown> {
    const proxy: Record<string, unknown> = instance.fields;

    Object.defineProperty(proxy, '__class__', {
      value: instance.klass, enumerable: false, configurable: true,
    });
    Object.defineProperty(proxy, '__name__', {
      value: instance.klass.name, enumerable: false, configurable: true,
    });

    // Inherited class attributes become instance defaults
    for (let i = instance.klass.mro.length - 1; i >= 0; i--) {
      Object.assign(proxy, instance.klass.mro[i].attrs);
    }

    const bindMethod = (method: SdevFunction): SdevFunction => ({
      type: 'user',
      call: (args: unknown[], line: number) => method.call([proxy, ...args], line),
    });

    const seen = new Set<string>();
    for (const klass of instance.klass.mro) {
      klass.methods.forEach((method, name) => {
        if (seen.has(name) || name in proxy) return;
        seen.add(name);
        Object.defineProperty(proxy, name, {
          get: () => bindMethod(method),
          enumerable: true,
          configurable: true,
        });
      });
      klass.statics.forEach((method, name) => {
        if (seen.has(name)) return;
        seen.add(name);
        Object.defineProperty(proxy, name, { value: method, enumerable: true, configurable: true });
      });
    }

    // `super` proxy: methods resolved starting after the owning class
    if (instance.klass.mro.length > 1) {
      const superProxy: Record<string, unknown> = {};
      for (const klass of instance.klass.mro.slice(1)) {
        klass.methods.forEach((method, name) => {
          if (name in superProxy) return;
          superProxy[name] = {
            type: 'user',
            call: (args: unknown[], line: number) => method.call([proxy, ...args], line),
          } as SdevFunction;
        });
      }
      Object.defineProperty(proxy, 'super', { value: superProxy, enumerable: false, configurable: true });
    }

    return proxy;
  }

  /** Looks up a protocol (dunder) method bound to `value`, if present. */
  private protocolMethod(value: unknown, slot: string): SdevFunction | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const klass = (value as { __class__?: SdevClass }).__class__;
    if (!klass) {
      const direct = (value as Record<string, unknown>)[slot];
      return isFunction(direct) ? direct : undefined;
    }
    const method = this.findMethod(klass, slot);
    if (!method) return undefined;
    return { type: 'user', call: (args: unknown[], line: number) => method.call([value, ...args], line) };
  }

  // ----------------------------------------------------------
  // Errors
  // ----------------------------------------------------------

  makeError(name: string, message: string): Record<string, unknown> {
    return { __error__: true, name, message, args: [message] };
  }

  private errorName(value: unknown): string {
    if (value && typeof value === 'object') {
      const o = value as Record<string, unknown>;
      if (typeof o.name === 'string') return o.name;
      const klass = (value as { __class__?: SdevClass }).__class__;
      if (klass) return klass.name;
    }
    return 'Error';
  }

  private errorMessage(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const o = value as Record<string, unknown>;
      if (typeof o.message === 'string') return o.message;
    }
    return stringify(value);
  }

  private *evTry(node: AST.TryStatement, env: Environment): Ev {
    const handlers = node.handlers ?? [{ types: [], alias: node.errorVar, body: node.catchBlock }];
    let result: unknown = null;
    try {
      try {
        result = yield* this.ev(node.tryBlock, env);
        if (node.elseBlock) result = yield* this.ev(node.elseBlock, env);
      } catch (e) {
        if (e instanceof ReturnException || e instanceof BreakSignal || e instanceof ContinueSignal) throw e;

        const raised: unknown = e instanceof SdevRaise
          ? e.value
          : this.makeError(e instanceof SdevError ? 'RuntimeError' : 'Error', e instanceof Error ? e.message : String(e));

        for (const handler of handlers) {
          if (!this.handlerMatches(handler, raised, env, node.line)) continue;
          const catchEnv = new Environment(env);
          if (handler.alias) {
            // Legacy handlers bound the message string; typed handlers bind the
            // error object itself but keep `.message` readable.
            catchEnv.define(handler.alias, node.handlers ? raised : this.errorMessage(raised));
          }
          catchEnv.define('__error__', raised);
          return yield* this.ev(handler.body, catchEnv);
        }
        throw e;
      }
    } finally {
      if (node.finallyBlock) yield* this.ev(node.finallyBlock, env);
    }
    return result;
  }

  private handlerMatches(handler: AST.ExceptHandler, raised: unknown, env: Environment, line: number): boolean {
    if (!handler.types || handler.types.length === 0) return true;
    const name = this.errorName(raised);
    for (const typeNode of handler.types) {
      if (typeNode.type === 'Identifier') {
        const wanted = typeNode.name;
        if (wanted === 'Error' || wanted === 'Exception' || wanted === 'BaseException') return true;
        if (wanted === name) return true;
        const klass = env.has?.(wanted) ? (env.get(wanted, line) as SdevClass) : undefined;
        if (klass && klass.type === 'class' && this.isInstanceOf(raised, klass)) return true;
        continue;
      }
      const value = this.execute(typeNode, env);
      if (value && (value as SdevClass).type === 'class' && this.isInstanceOf(raised, value as SdevClass)) return true;
    }
    return false;
  }

  // ----------------------------------------------------------
  // Modules
  // ----------------------------------------------------------

  private evImport(node: AST.ImportStatement, env: Environment): unknown {
    // Module resolution happens in the linker before execution. At runtime an
    // import binds names that the linker already inlined; unresolved modules
    // become empty tomes so partial programs still run.
    const existing = env.has?.(node.module) ? env.get(node.module, node.line) : undefined;
    const moduleValue = existing ?? {};
    if (node.isFrom && node.names) {
      for (const { name, alias } of node.names) {
        const value = env.has?.(name) ? env.get(name, node.line) : (moduleValue as Record<string, unknown>)[name] ?? null;
        env.define(alias ?? name, value);
      }
      return null;
    }
    env.define(node.alias ?? node.module.split('.').pop()!, moduleValue);
    return null;
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  truthy(value: unknown): boolean {
    const m = this.protocolMethod(value, 'on_truth');
    if (m) return isTruthy(m.call([], 0));
    if (value instanceof SdevSet) return value.size > 0;
    const len = this.protocolMethod(value, 'on_len');
    if (len) return Number(len.call([], 0)) !== 0;
    return isTruthy(value);
  }

  private requireNumbers<T>(
    left: unknown, right: unknown, op: string, line: number, fn: (a: number, b: number) => T
  ): T {
    const coerce = (v: unknown): unknown => {
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
      return v;
    };
    const l = coerce(left);
    const r = coerce(right);
    if (typeof l !== 'number' || typeof r !== 'number') {
      const label = (v: unknown): string => {
        if (v === null || v === undefined) return 'nothing';
        if (Array.isArray(v)) return isTuple(v) ? 'tuple' : 'list';
        if (v instanceof SdevSet) return 'set';
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

  isEqual(a: unknown, b: unknown): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    const m = this.protocolMethod(a, 'on_eq');
    if (m) return isTruthy(m.call([b], 0));
    if (a instanceof SdevSet && b instanceof SdevSet) {
      return a.size === b.size && a.values().every((v) => b.has(v));
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => this.isEqual(v, b[i]));
    }
    if (typeof a === 'object' && typeof b === 'object') {
      const ao = a as Record<string, unknown>;
      const bo = b as Record<string, unknown>;
      const ak = Object.keys(ao);
      const bk = Object.keys(bo);
      if (ak.length !== bk.length) return false;
      return ak.every((k) => this.isEqual(ao[k], bo[k]));
    }
    if (typeof a !== typeof b) return false;
    return a === b;
  }
}

export { SdevRaise, SdevSet, keyOf, makeTuple, isTuple, isGenerator };
export type { SdevGenerator };
