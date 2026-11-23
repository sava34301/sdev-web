// ============================================================
// sdev AST → Bytecode Compiler (v2 - OS-capable)
// ============================================================
import * as AST from '../core/ast';
import { OpCode, Instruction, FunctionDef, Chunk, BYTECODE_VERSION, BYTECODE_MAGIC, ConstantPool, DebugInfo } from './bytecode';
import { SdevError } from '../core/errors';

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
  multiClauseFuncs: Set<string> = new Set();

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
  private classNodes = new Map<string, AST.ClassDeclaration>();

  compile(program: AST.Program): Chunk {
    this.constants = { numbers: [], strings: [] };
    this.debugInfo = { sourceMap: [], localNames: [] };
    this.fixedVariables = new Set();
    this.classNodes.clear();
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
        const hasPatterns = Boolean(node.patternParams?.some((p) => p !== null));
        const hasClauseSpec = hasPatterns || Boolean(node.guard);
        const alreadyMulti = fn.multiClauseFuncs.has(node.name);
        if (hasClauseSpec || alreadyMulti) {
          const isFirst = !alreadyMulti;
          fn.multiClauseFuncs.add(node.name);

          const matchFn = new FunctionCompiler('<match>', node.params);
          matchFn.emit(OpCode.PUSH_BOOL, true, node.line);
          if (node.patternParams) {
            for (let i = 0; i < node.patternParams.length; i++) {
              const pat = node.patternParams[i];
              if (!pat) continue;
              this.compileMatchPattern(pat, node.params[i], matchFn, node.line);
              matchFn.emit(OpCode.AND, undefined, node.line);
            }
          }
          if (node.guard) {
            this.compileNode(node.guard, matchFn);
            matchFn.emit(OpCode.AND, undefined, node.line);
          }
          matchFn.emit(OpCode.RETURN, undefined, node.line);
          const matchDef: FunctionDef = {
            name: '<match>',
            params: node.params,
            code: matchFn.code,
            functions: matchFn.functions,
          };
          const matchIdx = fn.functions.length;
          fn.functions.push(matchDef);

          const bodyFn = new FunctionCompiler(node.name, node.params);
          if (node.patternParams) {
            for (let i = 0; i < node.patternParams.length; i++) {
              const pat = node.patternParams[i];
              if (!pat) continue;
              this.compileMatchPattern(pat, node.params[i], bodyFn, node.line);
              bodyFn.emit(OpCode.POP, undefined, node.line);
            }
          }
          this.compileStatements(node.body.statements, bodyFn);
          bodyFn.emit(OpCode.PUSH_NULL, undefined, node.line);
          bodyFn.emit(OpCode.RETURN, undefined, node.line);
          const bodyDef: FunctionDef = {
            name: node.name,
            params: node.params,
            code: bodyFn.code,
            functions: bodyFn.functions,
          };
          const bodyIdx = fn.functions.length;
          fn.functions.push(bodyDef);

          fn.emit(OpCode.LOAD, '__register_clause', node.line);
          if (isFirst) fn.emit(OpCode.PUSH_NULL, undefined, node.line);
          else fn.emit(OpCode.LOAD, node.name, node.line);
          fn.emit(OpCode.MAKE_FUNC, matchIdx, node.line);
          fn.emit(OpCode.MAKE_FUNC, bodyIdx, node.line);
          fn.emit(OpCode.CALL, 3, node.line);
          fn.emit(OpCode.DEFINE, node.name, node.line);
          break;
        }

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

      case 'FeatureDeclaration':
        this.compileFeature(node, fn);
        break;

      case 'RefineDeclaration':
        this.compileRefine(node, fn);
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

      case 'PassStatement':
        // No-op statement
        break;

      case 'AugAssignStatement':
        this.compileAugAssign(node, fn);
        break;

      case 'AssertStatement': {
        this.compileNode(node.condition, fn);
        const passJump = fn.emitJump(OpCode.JUMP_IF_TRUE, node.line);
        if (node.message) {
          this.compileNode(node.message, fn);
        } else {
          fn.emit(OpCode.PUSH_STR, 'AssertionError: condition failed', node.line);
        }
        fn.emit(OpCode.LOAD, 'panic', node.line);
        fn.emit(OpCode.SWAP, undefined, node.line);
        fn.emit(OpCode.CALL, 1, node.line);
        fn.emit(OpCode.POP, undefined, node.line);
        fn.patchJump(passJump);
        break;
      }

      case 'TupleLiteral':
      case 'SetLiteral':
        for (const el of node.elements) {
          this.compileNode(el, fn);
        }
        fn.emit(OpCode.MAKE_LIST, node.elements.length, node.line);
        break;

      case 'BytesLiteral':
        fn.emit(OpCode.PUSH_STR, node.value, node.line);
        break;

      case 'WalrusExpr':
        this.compileNode(node.value, fn);
        fn.emit(OpCode.DUP, undefined, node.line);
        fn.emit(OpCode.DEFINE, node.name, node.line);
        break;

      case 'SliceExpr': {
        fn.emit(OpCode.LOAD, 'portion', node.line);
        this.compileNode(node.object, fn);
        if (node.start) {
          this.compileNode(node.start, fn);
        } else {
          fn.emit(OpCode.PUSH_NUM, 0, node.line);
        }
        if (node.stop) {
          this.compileNode(node.stop, fn);
        } else {
          fn.emit(OpCode.LOAD, 'len', node.line);
          this.compileNode(node.object, fn);
          fn.emit(OpCode.CALL, 1, node.line);
        }
        fn.emit(OpCode.CALL, 3, node.line);
        break;
      }

      case 'ComprehensionExpr':
        this.compileComprehension(node, fn);
        break;

      case 'WithStatement':
        this.compileWith(node, fn);
        break;

      case 'EmitExpr':
        this.compileNode(node.value, fn);
        break;

      case 'DelStatement': {
        for (const target of node.targets) {
          if (target.type === 'IndexExpr') {
            fn.emit(OpCode.LOAD, 'pluck', target.line);
            this.compileNode(target.object, fn);
            this.compileNode(target.index, fn);
            fn.emit(OpCode.CALL, 2, target.line);
            fn.emit(OpCode.POP, undefined, target.line);
          } else if (target.type === 'Identifier') {
            fn.emit(OpCode.PUSH_NULL, undefined, target.line);
            fn.emit(OpCode.STORE, target.name, target.line);
          }
        }
        break;
      }

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
      case 'PatSequence': {
        fn.emit(OpCode.LOAD, 'len', line);
        fn.emit(OpCode.LOAD, tempVar, line);
        fn.emit(OpCode.CALL, 1, line);
        fn.emit(OpCode.PUSH_NUM, pat.elements.length, line);
        fn.emit(pat.restName ? OpCode.GTE : OpCode.EQ, undefined, line);
        const failJumps: number[] = [fn.emitJump(OpCode.JUMP_IF_FALSE, line)];
        const at = pat.restIndex ?? pat.elements.length;
        for (let i = 0; i < at; i++) {
          const elVar = `__seq_${fn.code.length}_${i}_${line}`;
          fn.emit(OpCode.LOAD, tempVar, line);
          fn.emit(OpCode.PUSH_NUM, i, line);
          fn.emit(OpCode.INDEX_GET, undefined, line);
          fn.emit(OpCode.DEFINE, elVar, line);
          this.compileMatchPattern(pat.elements[i], elVar, fn, line);
          failJumps.push(fn.emitJump(OpCode.JUMP_IF_FALSE, line));
        }
        if (pat.restName) {
          fn.emit(OpCode.LOAD, 'portion', line);
          fn.emit(OpCode.LOAD, tempVar, line);
          fn.emit(OpCode.PUSH_NUM, at, line);
          fn.emit(OpCode.CALL, 2, line);
          fn.emit(OpCode.DEFINE, pat.restName, line);
        }
        fn.emit(OpCode.PUSH_BOOL, true, line);
        const okJump = fn.emitJump(OpCode.JUMP, line);
        for (const fj of failJumps) fn.patchJump(fj);
        fn.emit(OpCode.PUSH_BOOL, false, line);
        fn.patchJump(okJump);
        break;
      }
      default:
        fn.emit(OpCode.PUSH_BOOL, true, line);
        break;
    }
  }

  private compileAugAssign(node: AST.AugAssignStatement, fn: FunctionCompiler): void {
    const op = node.operator;
    const opMap: Record<string, OpCode> = {
      '+': OpCode.ADD, '-': OpCode.SUB, '*': OpCode.MUL, '/': OpCode.DIV,
      '%': OpCode.MOD, '**': OpCode.POW,
      '&': OpCode.BIT_AND, '|': OpCode.BIT_OR, '^': OpCode.BIT_XOR,
      '<<': OpCode.BIT_SHL, '>>': OpCode.BIT_SHR,
    };
    const binOp = opMap[op] ?? OpCode.ADD;
    if (node.target.type === 'Identifier') {
      const varName = node.target.name;
      if (this.fixedVariables.has(varName)) {
        throw new SdevError(`Cannot reassign fixed variable '${varName}'`, node.line);
      }
      fn.emit(OpCode.LOAD, varName, node.line);
      this.compileNode(node.value, fn);
      fn.emit(binOp, undefined, node.line);
      fn.emit(OpCode.STORE, varName, node.line);
    } else if (node.target.type === 'IndexExpr') {
      const targetTemp = `__aug_obj_${fn.code.length}_${node.line}`;
      const indexTemp = `__aug_idx_${fn.code.length}_${node.line}`;
      const valTemp = `__aug_val_${fn.code.length}_${node.line}`;
      this.compileNode(node.target.object, fn);
      fn.emit(OpCode.STORE, targetTemp, node.line);
      this.compileNode(node.target.index, fn);
      fn.emit(OpCode.STORE, indexTemp, node.line);

      fn.emit(OpCode.LOAD, targetTemp, node.line);
      fn.emit(OpCode.LOAD, indexTemp, node.line);
      fn.emit(OpCode.INDEX_GET, undefined, node.line);

      this.compileNode(node.value, fn);
      fn.emit(binOp, undefined, node.line);
      fn.emit(OpCode.STORE, valTemp, node.line);

      fn.emit(OpCode.LOAD, targetTemp, node.line);
      fn.emit(OpCode.LOAD, indexTemp, node.line);
      fn.emit(OpCode.LOAD, valTemp, node.line);
      fn.emit(OpCode.INDEX_SET, undefined, node.line);
    }
  }

  private compileComprehension(node: AST.ComprehensionExpr, fn: FunctionCompiler): void {
    const accVar = `__comp_acc_${fn.code.length}_${node.line}`;
    if (node.form === 'dict') {
      fn.emit(OpCode.MAKE_DICT, 0, node.line);
    } else {
      fn.emit(OpCode.MAKE_LIST, 0, node.line);
    }
    fn.emit(OpCode.DEFINE, accVar, node.line);

    const loopExits: number[] = [];
    for (let cIdx = 0; cIdx < node.clauses.length; cIdx++) {
      const clause = node.clauses[cIdx];
      const iterVar = `__comp_iter_${fn.code.length}_${node.line}`;
      const idxVar = `__comp_i_${fn.code.length}_${node.line}`;
      const lenVar = `__comp_len_${fn.code.length}_${node.line}`;

      this.compileNode(clause.iterable, fn);
      fn.emit(OpCode.DEFINE, iterVar, node.line);
      fn.emit(OpCode.PUSH_NUM, 0, node.line);
      fn.emit(OpCode.DEFINE, idxVar, node.line);

      fn.emit(OpCode.LOAD, 'len', node.line);
      fn.emit(OpCode.LOAD, iterVar, node.line);
      fn.emit(OpCode.CALL, 1, node.line);
      fn.emit(OpCode.DEFINE, lenVar, node.line);

      const loopStart = fn.currentPos();
      fn.emit(OpCode.LOAD, idxVar, node.line);
      fn.emit(OpCode.LOAD, lenVar, node.line);
      fn.emit(OpCode.LT, undefined, node.line);
      const exitJump = fn.emitJump(OpCode.JUMP_IF_FALSE, node.line);
      loopExits.push(exitJump);

      fn.emit(OpCode.LOAD, iterVar, node.line);
      fn.emit(OpCode.LOAD, idxVar, node.line);
      fn.emit(OpCode.INDEX_GET, undefined, node.line);
      const targetVar = Array.isArray(clause.variable) ? clause.variable[0] : clause.variable;
      fn.emit(OpCode.DEFINE, targetVar, node.line);

      const skipJumps: number[] = [];
      for (const cond of clause.conditions) {
        this.compileNode(cond, fn);
        skipJumps.push(fn.emitJump(OpCode.JUMP_IF_FALSE, node.line));
      }

      if (cIdx === node.clauses.length - 1) {
        if (node.form === 'dict' && node.valueExpr) {
          fn.emit(OpCode.LOAD, accVar, node.line);
          this.compileNode(node.element, fn);
          this.compileNode(node.valueExpr, fn);
          fn.emit(OpCode.INDEX_SET, undefined, node.line);
        } else {
          fn.emit(OpCode.LOAD, 'gather', node.line);
          fn.emit(OpCode.LOAD, accVar, node.line);
          this.compileNode(node.element, fn);
          fn.emit(OpCode.CALL, 2, node.line);
          fn.emit(OpCode.STORE, accVar, node.line);
        }
      }

      for (const sj of skipJumps) fn.patchJump(sj);

      fn.emit(OpCode.LOAD, idxVar, node.line);
      fn.emit(OpCode.PUSH_NUM, 1, node.line);
      fn.emit(OpCode.ADD, undefined, node.line);
      fn.emit(OpCode.STORE, idxVar, node.line);
      fn.emit(OpCode.JUMP, loopStart, node.line);
    }

    for (const ej of loopExits.reverse()) fn.patchJump(ej);

    fn.emit(OpCode.LOAD, accVar, node.line);
  }

  private compileWith(node: AST.WithStatement, fn: FunctionCompiler): void {
    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i];
      const ctxVar = `__with_ctx_${i}_${fn.code.length}_${node.line}`;
      this.compileNode(item.expr, fn);
      fn.emit(OpCode.DEFINE, ctxVar, node.line);
      if (item.alias) {
        fn.emit(OpCode.LOAD, ctxVar, node.line);
        fn.emit(OpCode.DEFINE, item.alias, node.line);
      }
    }
    for (const stmt of node.body.statements) {
      this.compileNode(stmt, fn);
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

  private collectSuperMethods(node: AST.ClassDeclaration, seen = new Set<string>()): AST.FuncDeclaration[] {
    const bases = node.superClasses?.length ? node.superClasses : (node.superClass ? [node.superClass] : []);
    const out: AST.FuncDeclaration[] = [];
    for (const baseName of bases) {
      if (seen.has(baseName)) continue;
      seen.add(baseName);
      const baseNode = this.classNodes.get(baseName);
      if (!baseNode) continue;
      out.push(...baseNode.methods, ...this.collectSuperMethods(baseNode, seen));
    }
    return out;
  }

  private compileMethodClosure(method: AST.FuncDeclaration, ctorFn: FunctionCompiler, line: number): number {
    const params = method.params.filter(p => p !== 'self');
    const methodFn = new FunctionCompiler(method.name, params);
    this.compileStatements(method.body.statements, methodFn);
    methodFn.emit(OpCode.PUSH_NULL, undefined, line);
    methodFn.emit(OpCode.RETURN, undefined, line);
    const methodDef: FunctionDef = { name: method.name, params, code: methodFn.code, functions: methodFn.functions };
    const methodIdx = ctorFn.functions.length;
    ctorFn.functions.push(methodDef);
    return methodIdx;
  }

  private compileClass(node: AST.ClassDeclaration, fn: FunctionCompiler): void {
    this.classNodes.set(node.name, node);
    // Compile class as a constructor function that returns an object with methods
    const ctorFn = new FunctionCompiler(node.name, []);

    const superMethods = this.collectSuperMethods(node);
    const initMethod = node.methods.find(m => m.name === 'init') ?? superMethods.find(m => m.name === 'init');
    const otherMethods = node.methods.filter(m => m.name !== 'init');

    // If there's an init, use its params for the constructor
    if (initMethod) {
      ctorFn.params = initMethod.params.filter(p => p !== 'self');
    }

    // Create 'self' object
    ctorFn.emit(OpCode.MAKE_DICT, 0, node.line);
    ctorFn.emit(OpCode.DEFINE, 'self', node.line);

    // Bind inherited methods to `super` and (for non-init) to `self`
    if (superMethods.length > 0) {
      ctorFn.emit(OpCode.MAKE_DICT, 0, node.line);
      ctorFn.emit(OpCode.DEFINE, 'super', node.line);
      const boundSuper = new Set<string>();
      for (const sm of superMethods) {
        if (boundSuper.has(sm.name)) continue;
        boundSuper.add(sm.name);
        const methodIdx = this.compileMethodClosure(sm, ctorFn, node.line);
        ctorFn.emit(OpCode.LOAD, 'super', node.line);
        ctorFn.emit(OpCode.MAKE_FUNC, methodIdx, node.line);
        ctorFn.emit(OpCode.MEMBER_SET, sm.name, node.line);
        if (sm.name !== 'init') {
          ctorFn.emit(OpCode.LOAD, 'self', node.line);
          ctorFn.emit(OpCode.MAKE_FUNC, methodIdx, node.line);
          ctorFn.emit(OpCode.MEMBER_SET, sm.name, node.line);
        }
      }
    }

    // Add own methods to self before init runs so init can call self methods
    for (const method of otherMethods) {
      const methodIdx = this.compileMethodClosure(method, ctorFn, node.line);
      ctorFn.emit(OpCode.LOAD, 'self', node.line);
      ctorFn.emit(OpCode.MAKE_FUNC, methodIdx, node.line);
      ctorFn.emit(OpCode.MEMBER_SET, method.name, node.line);
    }

    // Compile init body if present
    if (initMethod) {
      for (const stmt of initMethod.body.statements) {
        this.compileNode(stmt, ctorFn);
      }
    }

    ctorFn.emit(OpCode.LOAD, 'self', node.line);
    ctorFn.emit(OpCode.RETURN, undefined, node.line);

    const def: FunctionDef = { name: node.name, params: ctorFn.params, code: ctorFn.code, functions: ctorFn.functions };
    const idx = fn.functions.length;
    fn.functions.push(def);
    fn.emit(OpCode.MAKE_FUNC, idx, node.line);
    fn.emit(OpCode.DEFINE, node.name, node.line);
  }

  private compileFeature(node: AST.FeatureDeclaration, fn: FunctionCompiler): void {
    fn.emit(OpCode.LOAD, '__fop_register_feature', node.line);

    fn.emit(OpCode.PUSH_STR, 'name', node.line);
    fn.emit(OpCode.PUSH_STR, node.name, node.line);

    fn.emit(OpCode.PUSH_STR, 'requires', node.line);
    const reqs = node.requires ?? [];
    for (const r of reqs) fn.emit(OpCode.PUSH_STR, r, node.line);
    fn.emit(OpCode.MAKE_LIST, reqs.length, node.line);

    fn.emit(OpCode.PUSH_STR, 'excludes', node.line);
    const excls = node.excludes ?? [];
    for (const e of excls) fn.emit(OpCode.PUSH_STR, e, node.line);
    fn.emit(OpCode.MAKE_LIST, excls.length, node.line);

    fn.emit(OpCode.PUSH_STR, 'fields', node.line);
    for (const f of node.fields) {
      fn.emit(OpCode.PUSH_STR, f.name, f.line);
      this.compileNode(f.value, fn);
    }
    fn.emit(OpCode.MAKE_DICT, node.fields.length, node.line);

    fn.emit(OpCode.PUSH_STR, 'methods', node.line);
    for (const m of node.methods) {
      fn.emit(OpCode.PUSH_STR, m.name, m.line);
      const mFn = new FunctionCompiler(m.name, m.params);
      this.compileStatements(m.body.statements, mFn);
      mFn.emit(OpCode.PUSH_NULL, undefined, m.line);
      mFn.emit(OpCode.RETURN, undefined, m.line);
      const mDef: FunctionDef = { name: m.name, params: mFn.params, code: mFn.code, functions: mFn.functions };
      const mIdx = fn.functions.length;
      fn.functions.push(mDef);
      fn.emit(OpCode.MAKE_FUNC, mIdx, m.line);
    }
    fn.emit(OpCode.MAKE_DICT, node.methods.length, node.line);

    fn.emit(OpCode.PUSH_STR, 'refinements', node.line);
    for (const r of node.refinements) {
      fn.emit(OpCode.PUSH_STR, 'targetName', r.line);
      fn.emit(OpCode.PUSH_STR, r.targetName, r.line);
      fn.emit(OpCode.PUSH_STR, 'isFunctionRefine', r.line);
      fn.emit(OpCode.PUSH_BOOL, Boolean(r.isFunctionRefine), r.line);
      fn.emit(OpCode.PUSH_STR, 'fields', r.line);
      for (const rf of r.fields) {
        fn.emit(OpCode.PUSH_STR, rf.name, rf.line);
        this.compileNode(rf.value, fn);
      }
      fn.emit(OpCode.MAKE_DICT, r.fields.length, r.line);
      fn.emit(OpCode.PUSH_STR, 'methods', r.line);
      for (const rm of r.methods) {
        fn.emit(OpCode.PUSH_STR, rm.name, rm.line);
        const rmIdx = this.compileMethodClosure(rm, fn, rm.line);
        fn.emit(OpCode.MAKE_FUNC, rmIdx, rm.line);
      }
      fn.emit(OpCode.MAKE_DICT, r.methods.length, r.line);
      fn.emit(OpCode.PUSH_STR, 'fnWrapper', r.line);
      if (r.isFunctionRefine && r.body) {
        const wFn = new FunctionCompiler(`${r.targetName}#refine`, r.params ?? []);
        this.compileStatements(r.body.statements, wFn);
        wFn.emit(OpCode.PUSH_NULL, undefined, r.line);
        wFn.emit(OpCode.RETURN, undefined, r.line);
        const wDef: FunctionDef = { name: wFn.name, params: wFn.params, code: wFn.code, functions: wFn.functions };
        const wIdx = fn.functions.length;
        fn.functions.push(wDef);
        fn.emit(OpCode.MAKE_FUNC, wIdx, r.line);
      } else {
        fn.emit(OpCode.PUSH_NULL, undefined, r.line);
      }
      fn.emit(OpCode.MAKE_DICT, 5, r.line);
    }
    fn.emit(OpCode.MAKE_LIST, node.refinements.length, node.line);

    fn.emit(OpCode.MAKE_DICT, 6, node.line);
    fn.emit(OpCode.CALL, 1, node.line);
    fn.emit(OpCode.DEFINE, node.name, node.line);
    this.compileStatements(node.statements, fn);
    for (const r of node.refinements) {
      this.compileRefine(r, fn, node.name);
    }
  }

  private compileRefine(node: AST.RefineDeclaration, fn: FunctionCompiler, ownerFeatureName?: string): void {
    if (node.isFunctionRefine) {
      fn.emit(OpCode.LOAD, '__fop_refine_func', node.line);
      fn.emit(OpCode.LOAD, node.targetName, node.line);
      const rFn = new FunctionCompiler(`${node.targetName}#refine`, node.params ?? []);
      if (node.body) {
        this.compileStatements(node.body.statements, rFn);
      }
      rFn.emit(OpCode.PUSH_NULL, undefined, node.line);
      rFn.emit(OpCode.RETURN, undefined, node.line);
      const def: FunctionDef = { name: rFn.name, params: rFn.params, code: rFn.code, functions: rFn.functions };
      const idx = fn.functions.length;
      fn.functions.push(def);
      fn.emit(OpCode.MAKE_FUNC, idx, node.line);
      if (ownerFeatureName) {
        fn.emit(OpCode.PUSH_STR, ownerFeatureName, node.line);
        fn.emit(OpCode.CALL, 3, node.line);
      } else {
        fn.emit(OpCode.CALL, 2, node.line);
      }
      fn.emit(OpCode.STORE, node.targetName, node.line);
      return;
    }

    fn.emit(OpCode.LOAD, '__fop_refine_class', node.line);
    fn.emit(OpCode.LOAD, node.targetName, node.line);
    for (const f of node.fields) {
      fn.emit(OpCode.PUSH_STR, f.name, f.line);
      this.compileNode(f.value, fn);
    }
    fn.emit(OpCode.MAKE_DICT, node.fields.length, node.line);
    for (const m of node.methods) {
      fn.emit(OpCode.PUSH_STR, m.name, m.line);
      const mIdx = this.compileMethodClosure(m, fn, m.line);
      fn.emit(OpCode.MAKE_FUNC, mIdx, m.line);
    }
    fn.emit(OpCode.MAKE_DICT, node.methods.length, node.line);
    if (ownerFeatureName) {
      fn.emit(OpCode.PUSH_STR, ownerFeatureName, node.line);
      fn.emit(OpCode.CALL, 4, node.line);
    } else {
      fn.emit(OpCode.CALL, 3, node.line);
    }
    fn.emit(OpCode.STORE, node.targetName, node.line);
  }
}
