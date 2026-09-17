// ============================================================
// sdev Bytecode Virtual Machine (v2 - OS-capable)
// ============================================================
import { OpCode, Instruction, FunctionDef, Chunk } from './bytecode';
import { SdevError, ReturnException } from './errors';
import { createBuiltins, isTruthy, stringify, SdevFunction, OutputCallback } from './builtins';
import { Environment } from './environment';
import { createKernelBuiltins, Kernel } from './kernel';

interface CallFrame {
  def: FunctionDef;
  ip: number;
  env: Environment;
}

export class VM {
  private stack: unknown[] = [];
  private frames: CallFrame[] = [];
  private globals: Environment;
  private output: OutputCallback;
  private maxSteps = 5_000_000;
  private steps = 0;
  kernel: Kernel;

  constructor(output: OutputCallback) {
    this.output = output;
    this.globals = new Environment();

    // Standard builtins
    const builtins = createBuiltins(output);
    builtins.forEach((fn, name) => this.globals.define(name, fn));

    // OS kernel builtins
    const { builtins: kernelBuiltins, kernel } = createKernelBuiltins(output);
    this.kernel = kernel;
    kernelBuiltins.forEach((fn, name) => this.globals.define(name, fn));

    // Constants
    this.globals.define('PI', Math.PI);
    this.globals.define('TAU', Math.PI * 2);
    this.globals.define('E', Math.E);
    this.globals.define('INFINITY', Infinity);
    this.globals.define('NAN', NaN);
  }

  run(chunk: Chunk): unknown {
    this.stack = [];
    this.frames = [];
    this.steps = 0;
    this.pushFrame(chunk.entry, this.globals);
    return this.executeLoop();
  }

  private pushFrame(def: FunctionDef, env: Environment): void {
    this.frames.push({ def, ip: 0, env });
  }

  private executeLoop(): unknown {
    while (this.frames.length > 0) {
      const frame = this.frames[this.frames.length - 1];
      if (frame.ip >= frame.def.code.length) {
        this.frames.pop();
        continue;
      }

      const ins: Instruction = frame.def.code[frame.ip++];
      this.steps++;
      if (this.steps > this.maxSteps) {
        throw new SdevError('VM: maximum execution steps exceeded (infinite loop?)', ins.line);
      }

      this.execute(ins, frame);
    }
    return this.stack.length > 0 ? this.peek() : null;
  }

  private execute(ins: Instruction, frame: CallFrame): void {
    switch (ins.op) {
      case OpCode.PUSH_NUM:
        this.push(ins.operand as number);
        break;
      case OpCode.PUSH_STR:
        this.push(ins.operand as string);
        break;
      case OpCode.PUSH_BOOL:
        this.push(ins.operand as boolean);
        break;
      case OpCode.PUSH_NULL:
        this.push(null);
        break;

      case OpCode.POP:
        this.pop();
        break;
      case OpCode.DUP:
        this.push(this.peek());
        break;
      case OpCode.SWAP: {
        const a = this.pop();
        const b = this.pop();
        this.push(a);
        this.push(b);
        break;
      }

      case OpCode.LOAD: {
        const name = ins.operand as string;
        this.push(frame.env.get(name, ins.line));
        break;
      }
      case OpCode.DEFINE: {
        const val = this.pop();
        frame.env.define(ins.operand as string, val);
        break;
      }
      case OpCode.STORE: {
        const val = this.pop();
        frame.env.set(ins.operand as string, val, ins.line);
        break;
      }

      // Arithmetic
      case OpCode.ADD: {
        const r = this.pop(); const l = this.pop();
        if (typeof l === 'number' && typeof r === 'number') { this.push(l + r); break; }
        if (typeof l === 'string' || typeof r === 'string') { this.push(stringify(l) + stringify(r)); break; }
        if (Array.isArray(l) && Array.isArray(r)) { this.push([...l, ...r]); break; }
        throw new SdevError("Cannot use '+' with these types", ins.line);
      }
      case OpCode.SUB: { const r = this.pop(); const l = this.pop(); this.push((l as number) - (r as number)); break; }
      case OpCode.MUL: {
        const r = this.pop(); const l = this.pop();
        if (typeof l === 'number' && typeof r === 'number') { this.push(l * r); break; }
        if (typeof l === 'string' && typeof r === 'number') { this.push((l as string).repeat(r as number)); break; }
        throw new SdevError("Cannot use '*' with these types", ins.line);
      }
      case OpCode.DIV: {
        const r = this.pop(); const l = this.pop();
        if ((r as number) === 0) throw new SdevError('Division by zero', ins.line);
        this.push((l as number) / (r as number)); break;
      }
      case OpCode.MOD: { const r = this.pop(); const l = this.pop(); this.push((l as number) % (r as number)); break; }
      case OpCode.POW: { const r = this.pop(); const l = this.pop(); this.push(Math.pow(l as number, r as number)); break; }
      case OpCode.NEG: { this.push(-(this.pop() as number)); break; }

      // Bitwise
      case OpCode.BIT_AND: { const r = this.pop(); const l = this.pop(); this.push((l as number) & (r as number)); break; }
      case OpCode.BIT_OR: { const r = this.pop(); const l = this.pop(); this.push((l as number) | (r as number)); break; }
      case OpCode.BIT_XOR: { const r = this.pop(); const l = this.pop(); this.push((l as number) ^ (r as number)); break; }
      case OpCode.BIT_NOT: { this.push(~(this.pop() as number)); break; }
      case OpCode.BIT_SHL: { const r = this.pop(); const l = this.pop(); this.push((l as number) << (r as number)); break; }
      case OpCode.BIT_SHR: { const r = this.pop(); const l = this.pop(); this.push((l as number) >> (r as number)); break; }

      // Comparison
      case OpCode.EQ:  { const r = this.pop(); const l = this.pop(); this.push(this.isEqual(l, r)); break; }
      case OpCode.NEQ: { const r = this.pop(); const l = this.pop(); this.push(!this.isEqual(l, r)); break; }
      case OpCode.LT:  { const r = this.pop(); const l = this.pop(); this.push((l as number) < (r as number)); break; }
      case OpCode.GT:  { const r = this.pop(); const l = this.pop(); this.push((l as number) > (r as number)); break; }
      case OpCode.LTE: { const r = this.pop(); const l = this.pop(); this.push((l as number) <= (r as number)); break; }
      case OpCode.GTE: { const r = this.pop(); const l = this.pop(); this.push((l as number) >= (r as number)); break; }

      // Logical
      case OpCode.NOT: { this.push(!isTruthy(this.pop())); break; }
      case OpCode.AND: { const r = this.pop(); const l = this.pop(); this.push(isTruthy(l) ? r : l); break; }
      case OpCode.OR:  { const r = this.pop(); const l = this.pop(); this.push(isTruthy(l) ? l : r); break; }

      // Control flow
      case OpCode.JUMP:
        frame.ip = ins.operand as number;
        break;
      case OpCode.JUMP_IF_FALSE: {
        const cond = this.pop();
        if (!isTruthy(cond)) frame.ip = ins.operand as number;
        break;
      }
      case OpCode.JUMP_IF_TRUE: {
        const cond = this.pop();
        if (isTruthy(cond)) frame.ip = ins.operand as number;
        break;
      }

      // Collections
      case OpCode.MAKE_LIST: {
        const count = ins.operand as number;
        const items = this.stack.splice(this.stack.length - count, count);
        this.push(items);
        break;
      }
      case OpCode.MAKE_DICT: {
        const count = ins.operand as number;
        const pairs = this.stack.splice(this.stack.length - count * 2, count * 2);
        const dict: Record<string, unknown> = {};
        for (let i = 0; i < pairs.length; i += 2) {
          dict[stringify(pairs[i])] = pairs[i + 1];
        }
        this.push(dict);
        break;
      }
      case OpCode.INDEX_GET: {
        const idx = this.pop();
        const obj = this.pop();
        if (Array.isArray(obj)) {
          const i = idx as number;
          const ri = i < 0 ? obj.length + i : i;
          this.push(obj[ri]);
        } else if (typeof obj === 'string') {
          this.push((obj as string)[idx as number]);
        } else if (obj && typeof obj === 'object') {
          this.push((obj as Record<string, unknown>)[stringify(idx)]);
        } else {
          throw new SdevError('Cannot index this type', ins.line);
        }
        break;
      }
      case OpCode.INDEX_SET: {
        const val = this.pop();
        const idx = this.pop();
        const obj = this.pop();
        if (Array.isArray(obj)) {
          (obj as unknown[])[idx as number] = val;
        } else if (obj && typeof obj === 'object') {
          (obj as Record<string, unknown>)[stringify(idx)] = val;
        } else {
          throw new SdevError('Cannot set index on this type', ins.line);
        }
        break;
      }
      case OpCode.MEMBER_GET: {
        const obj = this.pop();
        const prop = ins.operand as string;
        if (obj && typeof obj === 'object') {
          this.push((obj as Record<string, unknown>)[prop]);
        } else {
          throw new SdevError(`Cannot access property '${prop}'`, ins.line);
        }
        break;
      }
      case OpCode.MEMBER_SET: {
        const val = this.pop();
        const obj = this.pop();
        const prop = ins.operand as string;
        if (obj && typeof obj === 'object') {
          (obj as Record<string, unknown>)[prop] = val;
        } else {
          throw new SdevError(`Cannot set property '${prop}'`, ins.line);
        }
        break;
      }

      // Functions
      case OpCode.MAKE_FUNC: {
        const def = frame.def.functions[ins.operand as number];
        const capturedEnv = frame.env;
        const fn: SdevFunction = {
          type: 'user',
          call: (args: unknown[], callLine: number) => {
            if (args.length !== def.params.length) {
              throw new SdevError(
                `Function '${def.name}' expects ${def.params.length} args, got ${args.length}`,
                callLine
              );
            }
            return this.callFunction(def, args, capturedEnv, callLine);
          },
        };
        this.push(fn);
        break;
      }

      case OpCode.CALL: {
        const argCount = ins.operand as number;
        const args = this.stack.splice(this.stack.length - argCount, argCount);
        const callee = this.pop();
        if (!callee || typeof callee !== 'object' || !('type' in (callee as object))) {
          throw new SdevError('Cannot call non-function', ins.line);
        }
        const fn = callee as SdevFunction;
        const result = fn.call(args, ins.line);
        this.push(result ?? null);
        break;
      }

      case OpCode.RETURN: {
        const retVal = this.pop();
        this.frames.pop();
        this.push(retVal);
        break;
      }

      // OS opcodes
      case OpCode.SYSCALL: {
        const name = ins.operand as string;
        const argCount = this.pop() as number;
        const args = this.stack.splice(this.stack.length - argCount, argCount);
        const result = this.kernel.syscalls.call(name, args, ins.line, this.kernel.getPrivilege());
        this.push(result ?? null);
        break;
      }

      case OpCode.ALLOC: {
        const size = this.pop() as number;
        const addr = this.kernel.heap.alloc(size, ins.line);
        this.push(addr);
        break;
      }

      case OpCode.FREE: {
        const addr = this.pop() as number;
        this.kernel.heap.free(addr, ins.line);
        break;
      }

      case OpCode.HEAP_LOAD: {
        const addr = this.pop() as number;
        this.push(this.kernel.heap.load(addr, ins.line));
        break;
      }

      case OpCode.HEAP_STORE: {
        const val = this.pop();
        const addr = this.pop() as number;
        this.kernel.heap.store(addr, val, ins.line);
        break;
      }

      case OpCode.INTERRUPT: {
        const num = ins.operand as number;
        this.kernel.hal.triggerInterrupt(num);
        this.kernel.hal.processPendingInterrupts(ins.line);
        break;
      }

      case OpCode.TASK_CREATE: {
        const fn = this.pop() as SdevFunction;
        const id = this.kernel.scheduler.createTask(fn);
        this.push(id);
        break;
      }

      case OpCode.TASK_YIELD: {
        this.kernel.scheduler.yieldCurrent();
        break;
      }

      case OpCode.TASK_KILL: {
        const id = this.pop() as number;
        this.push(this.kernel.scheduler.killTask(id));
        break;
      }

      case OpCode.NOP:
        break;

      case OpCode.DEBUG_BREAK:
        this.output(`[DEBUG] IP=${frame.ip} Stack=[${this.stack.map(v => stringify(v)).join(', ')}]`);
        break;

      case OpCode.HALT:
        this.frames.length = 0;
        break;

      default:
        throw new SdevError(`VM: unknown opcode ${ins.op}`, ins.line);
    }
  }

  private callFunction(def: FunctionDef, args: unknown[], closureEnv: Environment, callLine: number): unknown {
    const savedStack = [...this.stack];
    const savedFrames = [...this.frames];
    this.stack = [];
    this.frames = [];

    const funcEnv = new Environment(closureEnv);
    for (let i = 0; i < def.params.length; i++) {
      funcEnv.define(def.params[i], args[i]);
    }
    this.pushFrame(def, funcEnv);

    try {
      this.executeLoop();
    } catch (e) {
      if (e instanceof ReturnException) {
        this.stack = savedStack;
        this.frames = savedFrames;
        return e.value;
      }
      throw e;
    }

    const retVal = this.stack.length > 0 ? this.stack.pop() : null;
    this.stack = savedStack;
    this.frames = savedFrames;
    return retVal;
  }

  private push(val: unknown): void {
    this.stack.push(val);
  }

  private pop(): unknown {
    if (this.stack.length === 0) throw new SdevError('VM: stack underflow', 0);
    return this.stack.pop()!;
  }

  private peek(): unknown {
    return this.stack[this.stack.length - 1];
  }

  private isEqual(a: unknown, b: unknown): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => this.isEqual(v, (b as unknown[])[i]));
    }
    return a === b;
  }

  // Debug: inspect VM state
  inspectStack(): string[] {
    return this.stack.map(v => stringify(v));
  }

  inspectFrames(): string[] {
    return this.frames.map(f => `${f.def.name || '<main>'} @${f.ip}`);
  }
}
