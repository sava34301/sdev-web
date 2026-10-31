// ============================================================
// sdev AST → Bytecode Compiler (v2 - OS-capable)
// ============================================================
import * as AST from './ast';
import { OpCode, Instruction, FunctionDef, Chunk, BYTECODE_VERSION, BYTECODE_MAGIC, ConstantPool, DebugInfo } from './bytecode';
import { SdevError } from './errors';

interface LoopContext {
  breakJumps: number[];        // jump indices to patch on loop exit
  continueJumps: number[];     // jump indices to patch to the loop's continue target
}

class FunctionCompiler {
  code: Instruction[] = [];
  functions: FunctionDef[] = [];
  name: string;
  params: string[];
  loopStack: LoopContext[] = [];

  constructor(name: string, params: string[]) {
    this.name = name;
    this.params = params;
  }

  emit(op: OpCode, operand: number | string | boolean | undefined, line: number): number {
    this.code.push({ op, operand, line });
    return this.code.length - 1;
  }

  emitJump(op: OpCode, line: number): number {
    return this.emit(op, -1, line);
  }

  patchJump(jumpIndex: number): void {
    this.code[jumpIndex].operand = this.code.length;
  }

  patchJumpTo(jumpIndex: number, target: number): void {
    this.code[jumpIndex].operand = target;
  }

  currentPos(): number {
    return this.code.length;
  }
}

export class Compiler {
  private constants: ConstantPool = { numbers: [], strings: [] };
  private fixedVariables: Set<string> = new Set();
  private debugInfo: DebugInfo = { sourceMap: [], localNames: [] };

  compile(program: AST.Program): Chunk {
    this.constants = { numbers: [], strings: [] };
    this.debugInfo = { sourceMap: [], localNames: [] };
    this.fixedVariables = new Set();
    const fn = new FunctionCompiler('', []);
    this.compileStatements(program.statements, fn);
    fn.emit(OpCode.HALT, undefined, 0);
    return {
      version: BYTECODE_VERSION,
      magic: BYTECODE_MAGIC,
      entry: { name: '', params: [], code: fn.code, functions: fn.functions },
      constants: this.constants,
      debug: this.debugInfo,
    };
  }

  private compileStatements(stmts: AST.ASTNode[], fn: FunctionCompiler): void {
    for (const stmt of stmts) {
      this.compileNode(stmt, fn);
    }
  }

  private compileNode(node: AST.ASTNode, fn: FunctionCompiler): void {
    switch (node.type) {
      case 'Program':
        this.compileStatements(node.statements, fn);
        break;

      case 'NumberLiteral':
        fn.emit(OpCode.PUSH_NUM, node.value, node.line);
        break;

      case 'StringLiteral':
        fn.emit(OpCode.PUSH_STR, node.value, node.line);
        break;

      case 'BooleanLiteral':
        fn.emit(OpCode.PUSH_BOOL, node.value, node.line);
        break;

      case 'NullLiteral':
        fn.emit(OpCode.PUSH_NULL, undefined, node.line);
        break;

      case 'Identifier':
        fn.emit(OpCode.LOAD, node.name, node.line);
        break;

      case 'LetStatement':
        this.compileNode(node.value, fn);
        if (node.isFixed) this.fixedVariables.add(node.name);
        fn.emit(OpCode.DEFINE, node.name, node.line);
        break;

      case 'AssignStatement':
        if (this.fixedVariables.has(node.name)) {
          throw new SdevError(`Cannot reassign fixed variable '${node.name}'`, node.line);
        }
        this.compileNode(node.value, fn);
        fn.emit(OpCode.STORE, node.name, node.line);
        break;

      case 'IndexAssignStatement':
        this.compileNode(node.object, fn);
        this.compileNode(node.index, fn);
        this.compileNode(node.value, fn);
        fn.emit(OpCode.INDEX_SET, undefined, node.line);
        break;

      case 'MemberAssignStatement':
        this.compileNode(node.object, fn);
        this.compileNode(node.value, fn);
        fn.emit(OpCode.MEMBER_SET, node.property, node.line);
        break;

      case 'ExpressionStatement':
        this.compileNode(node.expression, fn);
        fn.emit(OpCode.POP, undefined, node.line);
        break;

      case 'BinaryExpr':
        this.compileBinary(node, fn);
        break;

      case 'UnaryExpr':
        this.compileNode(node.operand, fn);
        if (node.operator === '-') fn.emit(OpCode.NEG, undefined, node.line);
        else if (node.operator === 'isnt') fn.emit(OpCode.NOT, undefined, node.line);
        else throw new SdevError(`Unknown unary op: ${node.operator}`, node.line);
        break;

      case 'TernaryExpr': {
        this.compileNode(node.condition, fn);
        const jumpFalseT = fn.emitJump(OpCode.JUMP_IF_FALSE, node.line);
        this.compileNode(node.thenExpr, fn);
        const jumpEndT = fn.emitJump(OpCode.JUMP, node.line);
        fn.patchJump(jumpFalseT);
        this.compileNode(node.elseExpr, fn);
        fn.patchJump(jumpEndT);
        break;
      }

      case 'CallExpr':
        this.compileNode(node.callee, fn);
        for (const arg of node.args) this.compileNode(arg, fn);
        fn.emit(OpCode.CALL, node.args.length, node.line);
        break;

      case 'IndexExpr':
        this.compileNode(node.object, fn);
        this.compileNode(node.index, fn);
        fn.emit(OpCode.INDEX_GET, undefined, node.line);
        break;

      case 'MemberExpr':
        this.compileNode(node.object, fn);
        fn.emit(OpCode.MEMBER_GET, node.property, node.line);
        break;

      case 'ArrayLiteral':
        for (const el of node.elements) this.compileNode(el, fn);
        fn.emit(OpCode.MAKE_LIST, node.elements.length, node.line);
        break;

      case 'DictLiteral':
        for (const entry of node.entries) {
          this.compileNode(entry.key, fn);
          this.compileNode(entry.value, fn);
        }
        fn.emit(OpCode.MAKE_DICT, node.entries.length, node.line);
        break;

      case 'LambdaExpr': {
        const lambdaFn = new FunctionCompiler('<lambda>', node.params);
        if (node.body.type === 'BlockStatement') {
          this.compileStatements(node.body.statements, lambdaFn);
          lambdaFn.emit(OpCode.PUSH_NULL, undefined, node.line);
          lambdaFn.emit(OpCode.RETURN, undefined, node.line);
        } else {
          this.compileNode(node.body, lambdaFn);
          lambdaFn.emit(OpCode.RETURN, undefined, node.line);
        }
        const def: FunctionDef = { name: '<lambda>', params: node.params, code: lambdaFn.code, functions: lambdaFn.functions };
        const idx = fn.functions.length;
        fn.functions.push(def);
        fn.emit(OpCode.MAKE_FUNC, idx, node.line);
        break;
      }

      case 'FuncDeclaration': {
        const funcFn = new FunctionCompiler(node.name, node.params);
        this.compileStatements(node.body.statements, funcFn);
        funcFn.emit(OpCode.PUSH_NULL, undefined, node.line);
        funcFn.emit(OpCode.RETURN, undefined, node.line);
        const def: FunctionDef = { name: node.name, params: node.params, code: funcFn.code, functions: funcFn.functions };
        const idx = fn.functions.length;
        fn.functions.push(def);
        fn.emit(OpCode.MAKE_FUNC, idx, node.line);
        fn.emit(OpCode.DEFINE, node.name, node.line);
        break;
      }

      case 'ReturnStatement':
        if (node.value) this.compileNode(node.value, fn);
        else fn.emit(OpCode.PUSH_NULL, undefined, node.line);
        fn.emit(OpCode.RETURN, undefined, node.line);
        break;

      case 'BlockStatement':
        this.compileStatements(node.statements, fn);
        break;

      case 'IfStatement':
        this.compileIf(node, fn);
        break;

      case 'WhileStatement':
        this.compileWhile(node, fn);
        break;

      case 'ForEachStatement':
        this.compileForEach(node, fn);
        break;

      case 'ForInStatement':
        this.compileForIn(node, fn);
        break;

      case 'TryStatement':
        // Try-catch: compile try block, if error jump to catch
        // We implement this by wrapping in a special pattern
        // For now, compile both blocks sequentially with error handling via CALL
        this.compileTryCatch(node, fn);
        break;

      case 'BreakStatement': {
        const ctx = fn.loopStack[fn.loopStack.length - 1];
        if (!ctx) throw new SdevError("'break' used outside of a loop", node.line);
        ctx.breakJumps.push(fn.emitJump(OpCode.JUMP, node.line));
        break;
      }

      case 'ContinueStatement': {
        const ctx = fn.loopStack[fn.loopStack.length - 1];
        if (!ctx) throw new SdevError("'continue' used outside of a loop", node.line);
        ctx.continueJumps.push(fn.emitJump(OpCode.JUMP, node.line));
        break;
      }

      case 'ClassDeclaration':
        this.compileClass(node, fn);
        break;

      case 'NewExpr':
        this.compileNode(node.className, fn);
        for (const arg of node.args) this.compileNode(arg, fn);
        fn.emit(OpCode.CALL, node.args.length + 0, node.line);
        break;

      case 'AwaitExpr':
        // In synchronous VM, await just evaluates the expression
        this.compileNode(node.operand, fn);
        break;

      case 'FStringExpr': {
        if (node.parts.length === 0) {
          fn.emit(OpCode.PUSH_STR, '', node.line);
          break;
        }
        for (let i = 0; i < node.parts.length; i++) {
          const part = node.parts[i];
          if (part.kind === 'text') {
            fn.emit(OpCode.PUSH_STR, part.value, node.line);
          } else {
            fn.emit(OpCode.LOAD, 'str', node.line);
            this.compileNode(part.expr, fn);
            fn.emit(OpCode.CALL, 1, node.line);
          }
          if (i > 0) {
            fn.emit(OpCode.ADD, undefined, node.line);
          }
        }
        break;
      }

      case 'MatchStatement':
        this.compileMatch(node, fn);
        break;

      default:
        throw new SdevError(`Compiler: unknown node type ${(node as { type: string }).type}`, 0);
    }
  }

  private compileBinary(node: AST.BinaryExpr, fn: FunctionCompiler): void {
    // Short-circuit for also (AND) and either (OR)
    if (node.operator === 'also') {
      this.compileNode(node.left, fn);
      fn.emit(OpCode.DUP, undefined, node.line);
      const jumpFalse = fn.emitJump(OpCode.JUMP_IF_FALSE, node.line);
      fn.emit(OpCode.POP, undefined, node.line);
      this.compileNode(node.right, fn);
      fn.patchJump(jumpFalse);
      return;
    }
    if (node.operator === 'either') {
      this.compileNode(node.left, fn);
      fn.emit(OpCode.DUP, undefined, node.line);
      const jumpTrue = fn.emitJump(OpCode.JUMP_IF_TRUE, node.line);
      fn.emit(OpCode.POP, undefined, node.line);
      this.compileNode(node.right, fn);
      fn.patchJump(jumpTrue);
      return;
    }

    // Pipe operator
    if (node.operator === '|>') {
      this.compileNode(node.left, fn);
      this.compileNode(node.right, fn);
      fn.emit(OpCode.SWAP, undefined, node.line);
      fn.emit(OpCode.CALL, 1, node.line);
      return;
    }

    this.compileNode(node.left, fn);
    this.compileNode(node.right, fn);

    const opMap: Record<string, OpCode> = {
      '+': OpCode.ADD, '-': OpCode.SUB, '*': OpCode.MUL,
      '/': OpCode.DIV, '%': OpCode.MOD, '^': OpCode.POW,
      'equals': OpCode.EQ, 'differs': OpCode.NEQ, '<>': OpCode.NEQ,
      '<': OpCode.LT, '>': OpCode.GT, '<=': OpCode.LTE, '>=': OpCode.GTE,
      '==': OpCode.EQ, '!=': OpCode.NEQ,
      '&': OpCode.BIT_AND, '|': OpCode.BIT_OR, '~': OpCode.BIT_XOR,
      '<<': OpCode.BIT_SHL, '>>': OpCode.BIT_SHR,
    };
    const op = opMap[node.operator];
    if (!op) throw new SdevError(`Unknown binary op: ${node.operator}`, node.line);
    fn.emit(op, undefined, node.line);
  }

  private compileIf(node: AST.IfStatement, fn: FunctionCompiler): void {
    this.compileNode(node.condition, fn);
    const jumpFalse = fn.emitJump(OpCode.JUMP_IF_FALSE, node.line);
    this.compileStatements(node.thenBranch.statements, fn);
    if (node.elseBranch) {
      const jumpEnd = fn.emitJump(OpCode.JUMP, node.line);
      fn.patchJump(jumpFalse);
      this.compileNode(node.elseBranch, fn);
      fn.patchJump(jumpEnd);
    } else {
      fn.patchJump(jumpFalse);
    }
  }

  private compileWhile(node: AST.WhileStatement, fn: FunctionCompiler): void {
    const ctx: LoopContext = { breakJumps: [], continueJumps: [] };
    fn.loopStack.push(ctx);

    const loopStart = fn.currentPos();
    this.compileNode(node.condition, fn);
    const exitJump = fn.emitJump(OpCode.JUMP_IF_FALSE, node.line);
    this.compileStatements(node.body.statements, fn);

    // continue target = loop top
    for (const j of ctx.continueJumps) fn.patchJumpTo(j, loopStart);

    fn.emit(OpCode.JUMP, loopStart, node.line);
    fn.patchJump(exitJump);
    for (const j of ctx.breakJumps) fn.patchJump(j);
    fn.loopStack.pop();
  }

  private compileForEach(node: AST.ForEachStatement, fn: FunctionCompiler): void {
    this.compileIndexedForLoop(node.variable, node.iterable, node.body, node.line, fn);
  }

  private compileForIn(node: AST.ForInStatement, fn: FunctionCompiler): void {
    this.compileIndexedForLoop(node.variable, node.iterable, node.body, node.line, fn);
  }

  private compileIndexedForLoop(
    variable: string,
    iterable: AST.ASTNode,
    body: AST.BlockStatement,
    line: number,
    fn: FunctionCompiler
  ): void {
    const iterVar = `__iter_${line}_${fn.currentPos()}`;
    const idxVar = `__idx_${line}_${fn.currentPos()}`;
    const ctx: LoopContext = { breakJumps: [], continueJumps: [] };
    fn.loopStack.push(ctx);

    this.compileNode(iterable, fn);
    fn.emit(OpCode.DEFINE, iterVar, line);

    fn.emit(OpCode.PUSH_NUM, 0, line);
    fn.emit(OpCode.DEFINE, idxVar, line);

    const loopStart = fn.currentPos();
    fn.emit(OpCode.LOAD, 'len', line);
    fn.emit(OpCode.LOAD, iterVar, line);
    fn.emit(OpCode.CALL, 1, line);
    fn.emit(OpCode.LOAD, idxVar, line);
    fn.emit(OpCode.GT, undefined, line);
    const exitJump = fn.emitJump(OpCode.JUMP_IF_FALSE, line);

    fn.emit(OpCode.LOAD, iterVar, line);
    fn.emit(OpCode.LOAD, idxVar, line);
    fn.emit(OpCode.INDEX_GET, undefined, line);
    fn.emit(OpCode.DEFINE, variable, line);

    this.compileStatements(body.statements, fn);

    // continue target = increment step
    const incrPos = fn.currentPos();
    for (const j of ctx.continueJumps) fn.patchJumpTo(j, incrPos);

    fn.emit(OpCode.LOAD, idxVar, line);
    fn.emit(OpCode.PUSH_NUM, 1, line);
    fn.emit(OpCode.ADD, undefined, line);
    fn.emit(OpCode.STORE, idxVar, line);

    fn.emit(OpCode.JUMP, loopStart, line);
    fn.patchJump(exitJump);
    for (const j of ctx.breakJumps) fn.patchJump(j);
    fn.loopStack.pop();
  }


  private compileMatch(node: AST.MatchStatement, fn: FunctionCompiler): void {
    this.compileNode(node.subject, fn);
    const tempVar = `__match_${fn.code.length}_${node.line}`;
    fn.emit(OpCode.DEFINE, tempVar, node.line);

    const endJumps: number[] = [];

    for (const c of node.cases) {
      this.compileMatchPattern(c.pattern, tempVar, fn, node.line);

      if (c.guard) {
        this.compileNode(c.guard, fn);
        fn.emit(OpCode.AND, undefined, node.line);
      }

      const skipCaseJump = fn.emitJump(OpCode.JUMP_IF_FALSE, node.line);
      this.compileStatements(c.body.statements, fn);
      endJumps.push(fn.emitJump(OpCode.JUMP, node.line));
      fn.patchJump(skipCaseJump);
    }

    for (const jump of endJumps) {
      fn.patchJump(jump);
    }
  }

  private compileMatchPattern(pat: AST.PatternNode, tempVar: string, fn: FunctionCompiler, line: number): void {
    switch (pat.type) {
      case 'PatWildcard':
        fn.emit(OpCode.PUSH_BOOL, true, line);
        break;
      case 'PatLiteral':
        fn.emit(OpCode.LOAD, tempVar, line);
        this.compileNode(pat.value, fn);
        fn.emit(OpCode.EQ, undefined, line);
        break;
      case 'PatValue':
        fn.emit(OpCode.LOAD, tempVar, line);
        this.compileNode(pat.expr, fn);
        fn.emit(OpCode.EQ, undefined, line);
        break;
      case 'PatCapture':
        if (pat.pattern) {
          this.compileMatchPattern(pat.pattern, tempVar, fn, line);
        } else {
          fn.emit(OpCode.PUSH_BOOL, true, line);
        }
        fn.emit(OpCode.LOAD, tempVar, line);
        fn.emit(OpCode.DEFINE, pat.name, line);
        break;
      case 'PatOr': {
        for (let i = 0; i < pat.options.length; i++) {
          this.compileMatchPattern(pat.options[i], tempVar, fn, line);
          if (i > 0) fn.emit(OpCode.OR, undefined, line);
        }
        break;
      }
      default:
        fn.emit(OpCode.PUSH_BOOL, true, line);
        break;
    }
  }

    private compileTryCatch(node: AST.TryStatement, fn: FunctionCompiler): void {
    // Compile try block as a function, call it, catch errors
    const tryFn = new FunctionCompiler('<try>', []);
    this.compileStatements(node.tryBlock.statements, tryFn);
    tryFn.emit(OpCode.PUSH_NULL, undefined, node.line);
    tryFn.emit(OpCode.RETURN, undefined, node.line);
    const tryDef: FunctionDef = { name: '<try>', params: [], code: tryFn.code, functions: tryFn.functions };
    const tryIdx = fn.functions.length;
    fn.functions.push(tryDef);

    const catchFn = new FunctionCompiler('<catch>', [node.errorVar]);
    this.compileStatements(node.catchBlock.statements, catchFn);
    catchFn.emit(OpCode.PUSH_NULL, undefined, node.line);
    catchFn.emit(OpCode.RETURN, undefined, node.line);
    const catchDef: FunctionDef = { name: '<catch>', params: [node.errorVar], code: catchFn.code, functions: catchFn.functions };
    const catchIdx = fn.functions.length;
    fn.functions.push(catchDef);

    // Load __tryCatch builtin, push tryFn, catchFn, call
    fn.emit(OpCode.LOAD, '__tryCatch', node.line);
    fn.emit(OpCode.MAKE_FUNC, tryIdx, node.line);
    fn.emit(OpCode.MAKE_FUNC, catchIdx, node.line);
    fn.emit(OpCode.CALL, 2, node.line);
    fn.emit(OpCode.POP, undefined, node.line);
  }

  private compileClass(node: AST.ClassDeclaration, fn: FunctionCompiler): void {
    // Compile class as a constructor function that returns an object with methods
    const ctorFn = new FunctionCompiler(node.name, []);

    // Find init method
    const initMethod = node.methods.find(m => m.name === 'init');
    const otherMethods = node.methods.filter(m => m.name !== 'init');

    // If there's an init, use its params for the constructor
    if (initMethod) {
      ctorFn.params = initMethod.params.filter(p => p !== 'self');
    }

    // Create 'self' object
    ctorFn.emit(OpCode.MAKE_DICT, 0, node.line);
    ctorFn.emit(OpCode.DEFINE, 'self', node.line);

    // Compile init body if present
    if (initMethod) {
      for (const stmt of initMethod.body.statements) {
        this.compileNode(stmt, ctorFn);
      }
    }

    // Add other methods to self
    for (const method of otherMethods) {
      const methodFn = new FunctionCompiler(method.name, method.params);
      this.compileStatements(method.body.statements, methodFn);
      methodFn.emit(OpCode.PUSH_NULL, undefined, node.line);
      methodFn.emit(OpCode.RETURN, undefined, node.line);
      const methodDef: FunctionDef = { name: method.name, params: method.params, code: methodFn.code, functions: methodFn.functions };
      const methodIdx = ctorFn.functions.length;
      ctorFn.functions.push(methodDef);

      ctorFn.emit(OpCode.LOAD, 'self', node.line);
      ctorFn.emit(OpCode.MAKE_FUNC, methodIdx, node.line);
      ctorFn.emit(OpCode.MEMBER_SET, method.name, node.line);
    }

    // Return self
    ctorFn.emit(OpCode.LOAD, 'self', node.line);
    ctorFn.emit(OpCode.RETURN, undefined, node.line);

    const def: FunctionDef = { name: node.name, params: ctorFn.params, code: ctorFn.code, functions: ctorFn.functions };
    const idx = fn.functions.length;
    fn.functions.push(def);
    fn.emit(OpCode.MAKE_FUNC, idx, node.line);
    fn.emit(OpCode.DEFINE, node.name, node.line);
  }
}
