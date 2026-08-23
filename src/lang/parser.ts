import { Token, TokenType } from './tokens';
import { Lexer } from './lexer';
import * as AST from './ast';
import { SdevError } from './errors';

/**
 * sdev recursive-descent parser.
 *
 * Supports the full v1 dialect plus the Python-parity surface:
 * decorators, generators, comprehensions, pattern matching, context
 * managers, star-params, keyword arguments, slices, sets, tuples,
 * f-strings, walrus binding, augmented assignment, typed annotations,
 * structured exception handling and module imports.
 */
export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): AST.Program {
    const statements: AST.ASTNode[] = [];
    while (!this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    return { type: 'Program', statements, line: 1 };
  }

  // ==========================================================
  // Statements
  // ==========================================================

  private parseStatement(): AST.ASTNode {
    if (this.check(TokenType.AT) && this.isDecoratorPosition()) return this.parseDecorated();
    if (this.check(TokenType.FORGE)) return this.parseForgeStatement();
    if (this.check(TokenType.CONJURE)) return this.parseConjureDeclaration();
    if (this.check(TokenType.ASYNC)) return this.parseAsyncStatement();
    if (this.check(TokenType.PONDER)) return this.parsePonderStatement();
    if (this.check(TokenType.CYCLE)) return this.parseCycleStatement();
    if (this.check(TokenType.ITERATE)) return this.parseIterateStatement();
    if (this.check(TokenType.WITHIN)) return this.parseWithinStatement();
    if (this.check(TokenType.YIELD)) return this.parseYieldStatement();
    if (this.check(TokenType.YEET)) return this.parseYeetStatement();
    if (this.check(TokenType.SKIP)) return this.parseSkipStatement();
    if (this.check(TokenType.PASS)) { const t = this.advance(); return { type: 'PassStatement', line: t.line }; }
    if (this.check(TokenType.ATTEMPT)) return this.parseAttemptStatement();
    if (this.check(TokenType.WITH)) return this.parseWithStatement(false);
    if (this.check(TokenType.MATCH) && this.isMatchStatement()) return this.parseMatchStatement();
    if (this.check(TokenType.RAISE)) return this.parseRaiseStatement();
    if (this.check(TokenType.ASSERT)) return this.parseAssertStatement();
    if (this.check(TokenType.DEL)) return this.parseDelStatement();
    if (this.check(TokenType.GLOBAL) || this.check(TokenType.NONLOCAL)) return this.parseScopeStatement();
    if (this.check(TokenType.SUMMON)) return this.parseImportStatement();
    if (this.check(TokenType.FROM)) return this.parseFromImportStatement();
    if (this.check(TokenType.ESSENCE_KW)) return this.parseEssenceDeclaration();
    // 'essence' stays a contextual keyword - check by value
    if (this.checkIdentifierValue('essence')) return this.parseEssenceDeclaration();
    // Reassignment dialects used by the sdev stdlib:
    //   be x be value        (leading-'be' form)
    //   set x to value       (ML/v2 form, 'set'/'to' are contextual)
    if (this.check(TokenType.BE)) return this.parseLeadingBeStatement();
    if (this.checkIdentifierValue('set') && this.isSetToStatement()) return this.parseSetToStatement();
    // `either cond :: ... ;; otherwise :: ... ;;` — guard form used by the stdlib.
    if (this.check(TokenType.EITHER)) return this.parseEitherStatement();

    if (this.check(TokenType.DOUBLE_COLON)) return this.parseBlockStatement();
    return this.parseExpressionStatement();
  }

  /** A '@' begins a decorator only when a declaration follows on a later token. */
  private isDecoratorPosition(): boolean {
    const next = this.tokens[this.pos + 1];
    return !!next && (next.type === TokenType.IDENTIFIER || next.type === TokenType.ESSENCE_KW);
  }

  /** `match` is a statement when a block follows the subject; otherwise it's an identifier. */
  private isMatchStatement(): boolean {
    for (let i = this.pos + 1; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type === TokenType.DOUBLE_COLON) return true;
      if (t.type === TokenType.DOUBLE_SEMI || t.type === TokenType.EOF) return false;
      if (t.line !== this.peek().line) return false;
    }
    return false;
  }

  // @decorator ... conjure/essence
  private parseDecorated(): AST.ASTNode {
    const decorators: AST.ASTNode[] = [];
    while (this.check(TokenType.AT) && this.isDecoratorPosition()) {
      this.advance();
      decorators.push(this.parseCall());
    }
    if (this.check(TokenType.ASYNC)) {
      const node = this.parseAsyncStatement();
      if (node.type === 'FuncDeclaration') node.decorators = decorators;
      return node;
    }
    if (this.check(TokenType.CONJURE)) {
      const fn = this.parseConjureDeclaration();
      fn.decorators = decorators;
      return fn;
    }
    if (this.check(TokenType.ESSENCE_KW) || this.checkIdentifierValue('essence')) {
      const cls = this.parseEssenceDeclaration();
      cls.decorators = decorators;
      return cls;
    }
    throw new SdevError('Decorators must precede a function or class declaration', this.peek().line);
  }

  private parseAsyncStatement(): AST.ASTNode {
    const asyncToken = this.consume(TokenType.ASYNC, "Expected 'async'");
    if (this.check(TokenType.CONJURE)) {
      const fn = this.parseConjureDeclaration();
      fn.isAsync = true;
      fn.line = asyncToken.line;
      return fn;
    }
    if (this.check(TokenType.WITH)) return this.parseWithStatement(true);
    if (this.check(TokenType.ITERATE)) {
      const loop = this.parseIterateStatement();
      loop.isAsync = true;
      return loop;
    }
    throw new SdevError("'async' must precede a function, loop or with-block", asyncToken.line);
  }

  // be target be value  — same targets as `target be value`
  private parseLeadingBeStatement(): AST.ASTNode {
    this.consume(TokenType.BE, "Expected 'be'");
    return this.parseExpressionStatement();
  }

  // either condition :: body ;; [otherwise :: body ;; | otherwise either ...]
  private parseEitherStatement(): AST.IfStatement {
    const eitherToken = this.consume(TokenType.EITHER, "Expected 'either'");
    const condition = this.parseExpression();
    const thenBranch = this.parseBlockStatement();

    let elseBranch: AST.BlockStatement | AST.IfStatement | undefined;
    if (this.match(TokenType.OTHERWISE)) {
      if (this.check(TokenType.EITHER)) elseBranch = this.parseEitherStatement();
      else elseBranch = this.parseBlockStatement();
    }

    return { type: 'IfStatement', condition, thenBranch, elseBranch, line: eitherToken.line };
  }

  /** Lookahead: does this `set ...` line contain a `to` before the statement ends? */
  private isSetToStatement(): boolean {
    let depth = 0;
    for (let i = this.pos + 1; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type === TokenType.LPAREN || t.type === TokenType.LBRACKET || t.type === TokenType.LBRACE) depth++;
      else if (t.type === TokenType.RPAREN || t.type === TokenType.RBRACKET || t.type === TokenType.RBRACE) depth--;
      else if (depth === 0 && t.type === TokenType.IDENTIFIER && t.value === 'to') return true;
      else if (depth === 0 && (t.type === TokenType.DOUBLE_COLON || t.type === TokenType.DOUBLE_SEMI || t.type === TokenType.EOF)) return false;
    }
    return false;
  }

  // set target to value
  private parseSetToStatement(): AST.ASTNode {
    const setToken = this.advance(); // 'set'
    const target = this.parseExpression();
    const toToken = this.peek();
    if (!(toToken.type === TokenType.IDENTIFIER && toToken.value === 'to')) {
      throw new SdevError("Expected 'to' in set statement", setToken.line);
    }
    this.advance();
    const value = this.parseExpression();
    return this.makeAssignment(target, value, setToken.line);
  }

  private makeAssignment(target: AST.ASTNode, value: AST.ASTNode, line: number): AST.ASTNode {
    if (target.type === 'Identifier') {
      return { type: 'AssignStatement', name: target.name, value, line };
    }
    if (target.type === 'IndexExpr') {
      return { type: 'IndexAssignStatement', object: target.object, index: target.index, value, line };
    }
    if (target.type === 'MemberExpr') {
      return { type: 'MemberAssignStatement', object: target.object, property: target.property, value, line };
    }
    if (target.type === 'TupleLiteral' || target.type === 'ArrayLiteral') {
      const names = (target.elements as AST.ASTNode[]).map((e) => {
        if (e.type !== 'Identifier') throw new SdevError('Invalid destructuring target', line);
        return e.name;
      });
      return { type: 'LetStatement', name: names[0], targets: names, value, line };
    }
    throw new SdevError('Invalid assignment target', line);
  }

  // forge name[: Type] be value    |    forge a, b be pair
  private parseForgeStatement(): AST.LetStatement {
    const forgeToken = this.consume(TokenType.FORGE, "Expected 'forge'");
    const names: string[] = [this.consumeName("Expected variable name")];
    while (this.match(TokenType.COMMA)) names.push(this.consumeName('Expected variable name'));

    let annotation: AST.ASTNode | undefined;
    if (this.match(TokenType.COLON)) annotation = this.parseTypeExpr();

    // Declaration without initialiser: `forge x: Int`
    if (!this.check(TokenType.BE)) {
      return { type: 'LetStatement', name: names[0], targets: names.length > 1 ? names : undefined, annotation, value: { type: 'NullLiteral', line: forgeToken.line }, line: forgeToken.line };
    }
    this.consume(TokenType.BE, "Expected 'be'");
    const value = this.parseExpressionOrTuple();
    return {
      type: 'LetStatement',
      name: names[0],
      targets: names.length > 1 ? names : undefined,
      annotation,
      value,
      line: forgeToken.line,
    };
  }

  /** Type annotations are ordinary expressions (`Int`, `List[Str]`, `Int | Void`). */
  private parseTypeExpr(): AST.ASTNode {
    return this.parseBitOr();
  }

  // conjure name(params) [-> Type] :: body ;;
  private parseConjureDeclaration(): AST.FuncDeclaration {
    const conjureToken = this.consume(TokenType.CONJURE, "Expected 'conjure'");
    const name = this.consumeName('Expected function name');
    const paramSpecs = this.parseParamList();
    let returnType: AST.ASTNode | undefined;
    if (this.match(TokenType.ARROW)) returnType = this.parseTypeExpr();

    const body = this.parseBlockStatement();
    return {
      type: 'FuncDeclaration',
      name,
      params: paramSpecs.map((p) => p.name),
      paramSpecs,
      returnType,
      isGenerator: this.blockEmits(body),
      body,
      line: conjureToken.line,
    };
  }

  /** Does this function body contain an `emit` / `delegate` (making it a generator)? */
  private blockEmits(node: AST.ASTNode): boolean {
    let found = false;
    const walk = (n: unknown): void => {
      if (found || !n || typeof n !== 'object') return;
      const node = n as { type?: string; [k: string]: unknown };
      if (node.type === 'EmitExpr') { found = true; return; }
      // Do not descend into nested function bodies.
      if (node.type === 'FuncDeclaration' || node.type === 'LambdaExpr') return;
      for (const key of Object.keys(node)) {
        const v = node[key];
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object') walk(v);
      }
    };
    walk(node);
    return found;
  }

  private parseParamList(): AST.Param[] {
    this.consume(TokenType.LPAREN, "Expected '('");
    const params: AST.Param[] = [];
    let kwOnly = false;
    if (!this.check(TokenType.RPAREN)) {
      do {
        if (this.check(TokenType.RPAREN)) break;
        // `/` marks the end of positional-only params
        if (this.check(TokenType.SLASH)) {
          this.advance();
          for (const p of params) if (p.kind === 'normal') p.kind = 'posonly';
          continue;
        }
        // bare `*` marks the start of keyword-only params
        if (this.check(TokenType.STAR) && (this.tokens[this.pos + 1]?.type === TokenType.COMMA || this.tokens[this.pos + 1]?.type === TokenType.RPAREN)) {
          this.advance();
          kwOnly = true;
          continue;
        }
        let kind: AST.Param['kind'] = kwOnly ? 'kwonly' : 'normal';
        if (this.match(TokenType.STARSTAR)) kind = 'named';
        else if (this.match(TokenType.STAR)) { kind = 'rest'; kwOnly = true; }

        let name: string;
        if (this.check(TokenType.SELF)) { this.advance(); name = 'self'; }
        else name = this.consumeName('Expected parameter name');

        let annotation: AST.ASTNode | undefined;
        if (this.match(TokenType.COLON)) annotation = this.parseTypeExpr();
        let def: AST.ASTNode | undefined;
        if (this.match(TokenType.BE)) def = this.parseExpression();

        params.push({ name, kind, annotation, default: def });
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')'");
    return params;
  }

  // essence/kind Name (extend A, B)? :: fields + methods ;;
  private parseEssenceDeclaration(): AST.ClassDeclaration {
    const essenceToken = this.advance(); // 'essence' | 'kind' | 'class'
    const name = this.consumeName('Expected class name');

    const superClasses: string[] = [];
    let metaclass: string | undefined;
    if (this.match(TokenType.EXTEND)) {
      do {
        superClasses.push(this.consumeName('Expected superclass name'));
      } while (this.match(TokenType.COMMA));
    } else if (this.check(TokenType.LPAREN)) {
      // Python-style base list: kind Name(Base1, Base2, metaclass be M)
      this.advance();
      if (!this.check(TokenType.RPAREN)) {
        do {
          if (this.check(TokenType.RPAREN)) break;
          const id = this.consumeName('Expected base class name');
          if (this.match(TokenType.BE)) {
            const target = this.consumeName('Expected metaclass name');
            if (id === 'metaclass') metaclass = target;
          } else {
            superClasses.push(id);
          }
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RPAREN, "Expected ')'");
    }

    this.consume(TokenType.DOUBLE_COLON, "Expected '::'");
    const methods: AST.FuncDeclaration[] = [];
    const fields: AST.LetStatement[] = [];
    while (!this.check(TokenType.DOUBLE_SEMI) && !this.isAtEnd()) {
      if (this.check(TokenType.AT) && this.isDecoratorPosition()) {
        const decorated = this.parseDecorated();
        if (decorated.type === 'FuncDeclaration') methods.push(decorated);
        continue;
      }
      if (this.check(TokenType.ASYNC)) {
        const node = this.parseAsyncStatement();
        if (node.type === 'FuncDeclaration') methods.push(node);
        continue;
      }
      if (this.check(TokenType.CONJURE)) {
        methods.push(this.parseConjureDeclaration());
        continue;
      }
      if (this.check(TokenType.FORGE)) {
        fields.push(this.parseForgeStatement());
        continue;
      }
      if (this.check(TokenType.PASS)) { this.advance(); continue; }
      // Skip unknown tokens inside class body (docstrings etc.)
      this.advance();
    }
    this.consume(TokenType.DOUBLE_SEMI, "Expected ';;'");
    return {
      type: 'ClassDeclaration',
      name,
      superClass: superClasses[0],
      superClasses,
      fields,
      metaclass,
      methods,
      line: essenceToken.line,
    };
  }

  // ponder condition :: body ;; [elsewise cond :: ;;] [otherwise :: body ;;]
  private parsePonderStatement(): AST.IfStatement {
    const ponderToken = this.consume(TokenType.PONDER, "Expected 'ponder'");
    const condition = this.parseExpression();
    const thenBranch = this.parseBlockStatement();

    let elseBranch: AST.BlockStatement | AST.IfStatement | undefined;
    if (this.check(TokenType.ELIF)) {
      elseBranch = this.parseElifChain();
    } else if (this.match(TokenType.OTHERWISE)) {
      if (this.check(TokenType.PONDER)) {
        elseBranch = this.parsePonderStatement();
      } else {
        elseBranch = this.parseBlockStatement();
      }
    }

    return { type: 'IfStatement', condition, thenBranch, elseBranch, line: ponderToken.line };
  }

  private parseElifChain(): AST.IfStatement {
    const t = this.consume(TokenType.ELIF, "Expected 'elif'");
    const condition = this.parseExpression();
    const thenBranch = this.parseBlockStatement();
    let elseBranch: AST.BlockStatement | AST.IfStatement | undefined;
    if (this.check(TokenType.ELIF)) elseBranch = this.parseElifChain();
    else if (this.match(TokenType.OTHERWISE)) elseBranch = this.parseBlockStatement();
    return { type: 'IfStatement', condition, thenBranch, elseBranch, line: t.line };
  }

  // cycle condition :: body ;; [otherwise :: body ;;]
  private parseCycleStatement(): AST.WhileStatement {
    const cycleToken = this.consume(TokenType.CYCLE, "Expected 'cycle'");
    const condition = this.parseExpression();
    const body = this.parseBlockStatement();
    let elseBlock: AST.BlockStatement | undefined;
    if (this.check(TokenType.OTHERWISE) && this.tokens[this.pos + 1]?.type === TokenType.DOUBLE_COLON) {
      this.advance();
      elseBlock = this.parseBlockStatement();
    }
    return { type: 'WhileStatement', condition, body, elseBlock, line: cycleToken.line };
  }

  // iterate item[, item2] through list :: body ;; [otherwise :: ;;]
  private parseIterateStatement(): AST.ForEachStatement {
    const iterateToken = this.consume(TokenType.ITERATE, "Expected 'iterate'");
    const variables: string[] = [this.consumeName('Expected variable name')];
    while (this.match(TokenType.COMMA)) variables.push(this.consumeName('Expected variable name'));
    this.consume(TokenType.THROUGH, "Expected 'through'");
    const iterable = this.parseExpressionOrTuple();
    const body = this.parseBlockStatement();
    let elseBlock: AST.BlockStatement | undefined;
    if (this.check(TokenType.OTHERWISE) && this.tokens[this.pos + 1]?.type === TokenType.DOUBLE_COLON) {
      this.advance();
      elseBlock = this.parseBlockStatement();
    }
    return {
      type: 'ForEachStatement',
      variable: variables[0],
      variables: variables.length > 1 ? variables : undefined,
      iterable,
      body,
      elseBlock,
      line: iterateToken.line,
    };
  }

  // within item be iterable :: body ;;
  private parseWithinStatement(): AST.ForInStatement {
    const withinToken = this.consume(TokenType.WITHIN, "Expected 'within'");
    const variable = this.consumeName('Expected variable name');
    this.consume(TokenType.BE, "Expected 'be'");
    const iterable = this.parseExpression();
    const body = this.parseBlockStatement();
    return { type: 'ForInStatement', variable, iterable, body, line: withinToken.line };
  }

  // weave expr [as name], ... :: body ;;
  private parseWithStatement(isAsync: boolean): AST.WithStatement {
    const t = this.consume(TokenType.WITH, "Expected 'with'");
    const items: AST.WithItem[] = [];
    do {
      const expr = this.parseExpression();
      let alias: string | undefined;
      if (this.match(TokenType.AS)) alias = this.consumeName('Expected binding name');
      items.push({ expr, alias });
    } while (this.match(TokenType.COMMA));
    const body = this.parseBlockStatement();
    return { type: 'WithStatement', items, body, isAsync, line: t.line };
  }

  // sift subject :: omen pattern [when guard] :: body ;; ... ;;
  private parseMatchStatement(): AST.MatchStatement {
    const t = this.consume(TokenType.MATCH, "Expected 'match'");
    const subject = this.parseExpressionOrTuple();
    this.consume(TokenType.DOUBLE_COLON, "Expected '::' to open the match block");
    const cases: AST.MatchCase[] = [];
    while (!this.check(TokenType.DOUBLE_SEMI) && !this.isAtEnd()) {
      this.consume(TokenType.CASE, "Expected 'case' inside a match block");
      const pattern = this.parsePattern();
      let guard: AST.ASTNode | undefined;
      if (this.match(TokenType.WHEN)) guard = this.parseExpression();
      const body = this.parseBlockStatement();
      cases.push({ pattern, guard, body });
    }
    this.consume(TokenType.DOUBLE_SEMI, "Expected ';;' to close the match block");
    return { type: 'MatchStatement', subject, cases, line: t.line };
  }

  private parsePattern(): AST.PatternNode {
    let pat = this.parsePatternPrimary();
    if (this.check(TokenType.BAR)) {
      const options = [pat];
      while (this.match(TokenType.BAR)) options.push(this.parsePatternPrimary());
      pat = { type: 'PatOr', options, line: pat.line };
    }
    if (this.match(TokenType.AS)) {
      const name = this.consumeName('Expected capture name');
      pat = { type: 'PatCapture', name, pattern: pat, line: pat.line };
    }
    return pat;
  }

  private parsePatternPrimary(): AST.PatternNode {
    const t = this.peek();

    // Wildcard `_`
    if (t.type === TokenType.IDENTIFIER && t.value === '_') {
      this.advance();
      return { type: 'PatWildcard', line: t.line };
    }

    // Sequence pattern [a, b, *rest]
    if (this.match(TokenType.LBRACKET)) {
      const elements: AST.PatternNode[] = [];
      let restIndex: number | undefined;
      let restName: string | undefined;
      if (!this.check(TokenType.RBRACKET)) {
        do {
          if (this.check(TokenType.RBRACKET)) break;
          if (this.match(TokenType.STAR)) {
            restIndex = elements.length;
            restName = this.consumeName('Expected rest name');
            continue;
          }
          elements.push(this.parsePattern());
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RBRACKET, "Expected ']'");
      return { type: 'PatSequence', elements, restIndex, restName, line: t.line };
    }

    // Mapping pattern { "k": pat, **rest }
    if (this.match(TokenType.LBRACE)) {
      const entries: { key: AST.ASTNode; pattern: AST.PatternNode }[] = [];
      let restName: string | undefined;
      if (!this.check(TokenType.RBRACE)) {
        do {
          if (this.check(TokenType.RBRACE)) break;
          if (this.match(TokenType.STARSTAR)) {
            restName = this.consumeName('Expected rest name');
            continue;
          }
          let key: AST.ASTNode;
          const kt = this.peek();
          if (kt.type === TokenType.IDENTIFIER && this.tokens[this.pos + 1]?.type === TokenType.COLON) {
            this.advance();
            key = { type: 'StringLiteral', value: kt.value, line: kt.line };
          } else {
            key = this.parseExpression();
          }
          this.consume(TokenType.COLON, "Expected ':' in mapping pattern");
          entries.push({ key, pattern: this.parsePattern() });
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RBRACE, "Expected '}'");
      return { type: 'PatMapping', entries, restName, line: t.line };
    }

    // Literals
    if (this.check(TokenType.NUMBER) || this.check(TokenType.STRING) ||
        this.check(TokenType.YEP) || this.check(TokenType.NOPE) || this.check(TokenType.VOID)) {
      const value = this.parseUnary();
      return { type: 'PatLiteral', value, line: t.line };
    }
    if (this.check(TokenType.MINUS)) {
      const value = this.parseUnary();
      return { type: 'PatLiteral', value, line: t.line };
    }

    // Identifier: capture, dotted value, or class pattern
    if (this.check(TokenType.IDENTIFIER)) {
      const name = this.advance().value;
      // Class pattern Name(...)
      if (this.check(TokenType.LPAREN)) {
        this.advance();
        const positional: AST.PatternNode[] = [];
        const keywords: { name: string; pattern: AST.PatternNode }[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            if (this.check(TokenType.RPAREN)) break;
            if (this.check(TokenType.IDENTIFIER) && this.tokens[this.pos + 1]?.type === TokenType.BE) {
              const kw = this.advance().value;
              this.advance(); // be
              keywords.push({ name: kw, pattern: this.parsePattern() });
            } else {
              positional.push(this.parsePattern());
            }
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, "Expected ')'");
        return { type: 'PatClass', className: name, positional, keywords, line: t.line };
      }
      // Dotted value pattern Colour.RED
      if (this.check(TokenType.DOT)) {
        let expr: AST.ASTNode = { type: 'Identifier', name, line: t.line };
        while (this.match(TokenType.DOT)) {
          const prop = this.consumeName('Expected property name');
          expr = { type: 'MemberExpr', object: expr, property: prop, line: t.line };
        }
        return { type: 'PatValue', expr, line: t.line };
      }
      return { type: 'PatCapture', name, line: t.line };
    }

    throw new SdevError(`Invalid pattern near '${t.value}'`, t.line, t.column);
  }

  // hurl Error("boom") [from cause]
  private parseRaiseStatement(): AST.RaiseStatement {
    const t = this.consume(TokenType.RAISE, "Expected 'raise'");
    let error: AST.ASTNode | undefined;
    let cause: AST.ASTNode | undefined;
    if (!this.atStatementEnd()) {
      error = this.parseExpression();
      if (this.match(TokenType.FROM)) cause = this.parseExpression();
    }
    return { type: 'RaiseStatement', error, cause, line: t.line };
  }

  // insist condition, "message"
  private parseAssertStatement(): AST.AssertStatement {
    const t = this.consume(TokenType.ASSERT, "Expected 'assert'");
    const condition = this.parseExpression();
    let message: AST.ASTNode | undefined;
    if (this.match(TokenType.COMMA)) message = this.parseExpression();
    return { type: 'AssertStatement', condition, message, line: t.line };
  }

  // banish target[, target]
  private parseDelStatement(): AST.DelStatement {
    const t = this.consume(TokenType.DEL, "Expected 'del'");
    const targets: AST.ASTNode[] = [];
    do {
      targets.push(this.parseExpression());
    } while (this.match(TokenType.COMMA));
    return { type: 'DelStatement', targets, line: t.line };
  }

  private parseScopeStatement(): AST.ScopeStatement {
    const t = this.advance();
    const scope = t.type === TokenType.GLOBAL ? 'global' : 'nonlocal';
    const names: string[] = [];
    do {
      names.push(this.consumeName('Expected a name'));
    } while (this.match(TokenType.COMMA));
    return { type: 'ScopeStatement', scope, names, line: t.line };
  }

  // summon "gist-id"  |  import module [as alias]
  private parseImportStatement(): AST.ASTNode {
    const t = this.consume(TokenType.SUMMON, "Expected 'import'");
    if (this.check(TokenType.STRING)) {
      const module = this.advance().value;
      let alias: string | undefined;
      if (this.match(TokenType.AS)) alias = this.consumeName('Expected alias');
      return { type: 'ImportStatement', module, alias, isFrom: false, line: t.line };
    }
    const parts = [this.consumeName('Expected module name')];
    while (this.match(TokenType.DOT)) parts.push(this.consumeName('Expected module name'));
    let alias: string | undefined;
    if (this.match(TokenType.AS)) alias = this.consumeName('Expected alias');
    return { type: 'ImportStatement', module: parts.join('.'), alias, isFrom: false, line: t.line };
  }

  // from module import a [as b], c   |  from "file.sdev" import x
  private parseFromImportStatement(): AST.ImportStatement {
    const t = this.consume(TokenType.FROM, "Expected 'from'");
    let module: string;
    if (this.check(TokenType.STRING)) module = this.advance().value;
    else {
      const parts = [this.consumeName('Expected module name')];
      while (this.match(TokenType.DOT)) parts.push(this.consumeName('Expected module name'));
      module = parts.join('.');
    }
    this.consume(TokenType.SUMMON, "Expected 'import' after module name");
    const names: { name: string; alias?: string }[] = [];
    if (this.check(TokenType.STAR)) {
      this.advance();
      return { type: 'ImportStatement', module, names: undefined, isFrom: true, line: t.line };
    }
    do {
      const name = this.consumeName('Expected imported name');
      let alias: string | undefined;
      if (this.match(TokenType.AS)) alias = this.consumeName('Expected alias');
      names.push({ name, alias });
    } while (this.match(TokenType.COMMA));
    return { type: 'ImportStatement', module, names, isFrom: true, line: t.line };
  }

  // yield value
  private parseYieldStatement(): AST.ReturnStatement {
    const yieldToken = this.consume(TokenType.YIELD, "Expected 'yield'");
    let value: AST.ASTNode | undefined;
    if (!this.atStatementEnd()) {
      value = this.parseExpressionOrTuple();
    }
    return { type: 'ReturnStatement', value, line: yieldToken.line };
  }

  private atStatementEnd(): boolean {
    if (this.isAtEnd()) return true;
    const t = this.peek();
    return t.type === TokenType.DOUBLE_SEMI ||
      t.type === TokenType.FORGE || t.type === TokenType.CONJURE ||
      t.type === TokenType.PONDER || t.type === TokenType.CYCLE ||
      t.type === TokenType.ITERATE || t.type === TokenType.YIELD ||
      t.type === TokenType.CASE;
  }

  // yeet (break)
  private parseYeetStatement(): AST.BreakStatement {
    const t = this.consume(TokenType.YEET, "Expected 'yeet'");
    return { type: 'BreakStatement', line: t.line };
  }

  // skip (continue)
  private parseSkipStatement(): AST.ContinueStatement {
    const t = this.consume(TokenType.SKIP, "Expected 'skip'");
    return { type: 'ContinueStatement', line: t.line };
  }

  // attempt :: ;; rescue [Type[, Type]] [as e] :: ;; [otherwise :: ;;] [ensure :: ;;]
  private parseAttemptStatement(): AST.TryStatement {
    const attemptToken = this.consume(TokenType.ATTEMPT, "Expected 'attempt'");
    const tryBlock = this.parseBlockStatement();

    const handlers: AST.ExceptHandler[] = [];
    while (this.check(TokenType.RESCUE)) {
      this.advance();
      const star = this.match(TokenType.STAR);
      const types: AST.ASTNode[] = [];
      let alias: string | undefined;

      if (!this.check(TokenType.DOUBLE_COLON)) {
        // Legacy form: `rescue err ::` binds a lowercase name.
        const first = this.peek();
        const legacyBind =
          first.type === TokenType.IDENTIFIER &&
          /^[a-z_]/.test(first.value) &&
          (this.tokens[this.pos + 1]?.type === TokenType.DOUBLE_COLON);
        if (legacyBind) {
          alias = this.advance().value;
        } else {
          do {
            if (this.check(TokenType.DOUBLE_COLON)) break;
            types.push(this.parseCall());
          } while (this.match(TokenType.COMMA));
          if (this.match(TokenType.AS)) alias = this.consumeName('Expected error name');
        }
      }
      const body = this.parseBlockStatement();
      handlers.push({ types, alias, body, star });
    }

    let elseBlock: AST.BlockStatement | undefined;
    if (this.check(TokenType.OTHERWISE) && this.tokens[this.pos + 1]?.type === TokenType.DOUBLE_COLON) {
      this.advance();
      elseBlock = this.parseBlockStatement();
    }

    let finallyBlock: AST.BlockStatement | undefined;
    if (this.match(TokenType.FINALLY)) finallyBlock = this.parseBlockStatement();

    if (handlers.length === 0 && !finallyBlock) {
      throw new SdevError("Expected 'rescue' or 'ensure' after attempt block", attemptToken.line);
    }

    return {
      type: 'TryStatement',
      tryBlock,
      errorVar: handlers[0]?.alias ?? '_error',
      catchBlock: handlers[0]?.body ?? { type: 'BlockStatement', statements: [], line: attemptToken.line },
      handlers,
      elseBlock,
      finallyBlock,
      line: attemptToken.line,
    };
  }

  // :: statements ;;
  private parseBlockStatement(): AST.BlockStatement {
    const colonToken = this.consume(TokenType.DOUBLE_COLON, "Expected '::'");
    const statements: AST.ASTNode[] = [];
    while (!this.check(TokenType.DOUBLE_SEMI) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    this.consume(TokenType.DOUBLE_SEMI, "Expected ';;'");
    return { type: 'BlockStatement', statements, line: colonToken.line };
  }

  private parseExpressionStatement(): AST.ASTNode {
    const expr = this.parseExpression();

    // Augmented assignment: target += value
    if (this.check(TokenType.AUGASSIGN)) {
      const op = this.advance().value.slice(0, -1);
      const value = this.parseExpression();
      return { type: 'AugAssignStatement', target: expr, operator: op, value, line: expr.line };
    }

    // Multi-target destructuring: a, b be pair
    if (this.check(TokenType.COMMA) && expr.type === 'Identifier') {
      const save = this.pos;
      const names = [expr.name];
      let ok = true;
      while (this.match(TokenType.COMMA)) {
        if (!this.check(TokenType.IDENTIFIER)) { ok = false; break; }
        names.push(this.advance().value);
      }
      if (ok && this.check(TokenType.BE)) {
        this.advance();
        const value = this.parseExpressionOrTuple();
        return { type: 'LetStatement', name: names[0], targets: names, value, line: expr.line };
      }
      this.pos = save;
    }

    // Check for assignment with 'be'. Only assignable targets consume the
    // 'be' — otherwise the token belongs to a following `be x be ...`
    // statement on the next line.
    const assignable =
      expr.type === 'Identifier' || expr.type === 'IndexExpr' || expr.type === 'MemberExpr' ||
      expr.type === 'SliceExpr';
    if (assignable && this.check(TokenType.BE)) {
      this.advance();
      const value = this.parseExpressionOrTuple();
      if (expr.type === 'SliceExpr') {
        return { type: 'ExpressionStatement', expression: {
          type: 'CallExpr',
          callee: { type: 'Identifier', name: 'slice_assign', line: expr.line },
          args: [expr.object, expr.start ?? { type: 'NullLiteral', line: expr.line }, expr.stop ?? { type: 'NullLiteral', line: expr.line }, expr.step ?? { type: 'NullLiteral', line: expr.line }, value],
          line: expr.line,
        }, line: expr.line };
      }
      return this.makeAssignment(expr, value, expr.line);
    }

    return { type: 'ExpressionStatement', expression: expr, line: expr.line };
  }

  // ==========================================================
  // Expressions
  // ==========================================================

  /** Parses `a, b, c` into a tuple when commas appear at top level. */
  private parseExpressionOrTuple(): AST.ASTNode {
    const first = this.parseExpression();
    if (!this.check(TokenType.COMMA)) return first;
    const elements = [first];
    while (this.match(TokenType.COMMA)) {
      if (this.atStatementEnd() || this.check(TokenType.RPAREN)) break;
      elements.push(this.parseExpression());
    }
    return { type: 'TupleLiteral', elements, line: first.line };
  }

  private parseExpression(): AST.ASTNode {
    return this.parseWalrus();
  }

  private parseWalrus(): AST.ASTNode {
    if (this.check(TokenType.IDENTIFIER) && this.tokens[this.pos + 1]?.type === TokenType.WALRUS) {
      const name = this.advance().value;
      const t = this.advance();
      const value = this.parseWalrus();
      return { type: 'WalrusExpr', name, value, line: t.line };
    }
    return this.parseTernary();
  }

  // Ternary: condition ~ thenExpr : elseExpr
  private parseTernary(): AST.ASTNode {
    const left = this.parsePipe();
    if (this.match(TokenType.TILDE)) {
      const thenExpr = this.parsePipe();
      this.consume(TokenType.COLON, "Expected ':' in ternary expression");
      const elseExpr = this.parsePipe();
      return { type: 'TernaryExpr', condition: left, thenExpr, elseExpr, line: left.line };
    }
    return left;
  }

  // Pipe operator |>
  private parsePipe(): AST.ASTNode {
    let left = this.parseLambdaExpr();

    while (this.match(TokenType.PIPE)) {
      const right = this.parseLambdaExpr();
      if (right.type === 'CallExpr') {
        right.args.unshift(left);
        left = right;
      } else {
        left = { type: 'CallExpr', callee: right, args: [left], line: left.line };
      }
    }

    return left;
  }

  // lambda a, b: expr    |    spell a, b :: block ;;
  private parseLambdaExpr(): AST.ASTNode {
    if (this.check(TokenType.LAMBDA)) {
      const t = this.advance();
      const params: AST.Param[] = [];
      while (!this.check(TokenType.COLON) && !this.check(TokenType.DOUBLE_COLON) && !this.isAtEnd()) {
        let kind: AST.Param['kind'] = 'normal';
        if (this.match(TokenType.STARSTAR)) kind = 'named';
        else if (this.match(TokenType.STAR)) kind = 'rest';
        const name = this.consumeName('Expected lambda parameter');
        let def: AST.ASTNode | undefined;
        if (this.match(TokenType.BE)) def = this.parseExpression();
        params.push({ name, kind, default: def });
        if (!this.match(TokenType.COMMA)) break;
      }
      let body: AST.ASTNode;
      if (this.check(TokenType.DOUBLE_COLON)) body = this.parseBlockStatement();
      else {
        this.consume(TokenType.COLON, "Expected ':' in lambda");
        body = this.parseExpression();
      }
      return {
        type: 'LambdaExpr',
        params: params.map((p) => p.name),
        paramSpecs: params,
        body,
        line: t.line,
      };
    }
    return this.parseOr();
  }

  private parseOr(): AST.ASTNode {
    let left = this.parseAnd();
    // `either` is the OR operator, but it also opens a guard statement. Only
    // continue the expression when the token sits on the same line as the
    // operand — a leading `either` on a new line starts a statement.
    while (this.check(TokenType.EITHER) && this.peek().line === this.previous().line) {
      this.advance();
      const right = this.parseAnd();
      left = { type: 'BinaryExpr', operator: 'either', left, right, line: left.line };
    }
    return left;
  }

  private parseAnd(): AST.ASTNode {
    let left = this.parseNot();
    while (this.match(TokenType.ALSO)) {
      const right = this.parseNot();
      left = { type: 'BinaryExpr', operator: 'also', left, right, line: left.line };
    }
    return left;
  }

  /** `not x` at boolean precedence (Python's `not`). */
  private parseNot(): AST.ASTNode {
    if (this.check(TokenType.ISNT) && this.tokens[this.pos + 1]?.type !== TokenType.THROUGH) {
      const t = this.advance();
      const operand = this.parseNot();
      return { type: 'UnaryExpr', operator: 'isnt', operand, line: t.line };
    }
    return this.parseEquality();
  }

  private parseEquality(): AST.ASTNode {
    let left = this.parseComparison();
    while (this.match(TokenType.EQUALS, TokenType.DIFFERS)) {
      const operator = this.previous().type === TokenType.EQUALS ? 'equals' : 'differs';
      const right = this.parseComparison();
      left = { type: 'BinaryExpr', operator, left, right, line: left.line };
    }
    return left;
  }

  /** Comparison chain: `1 < x < 10` lowers to `1 < x also x < 10`. */
  private parseComparison(): AST.ASTNode {
    let left = this.parseMembership();
    const ops: { op: string; right: AST.ASTNode }[] = [];
    while (this.match(TokenType.LESS, TokenType.MORE, TokenType.ATMOST, TokenType.ATLEAST)) {
      const operator = this.previous().value;
      const right = this.parseMembership();
      ops.push({ op: operator === '<' || operator === '>' || operator === '<=' || operator === '>=' ? operator : operator, right });
    }
    if (ops.length === 0) return left;
    if (ops.length === 1) {
      return { type: 'BinaryExpr', operator: ops[0].op, left, right: ops[0].right, line: left.line };
    }
    // Chained: build `a < b also b < c ...`
    let prev = left;
    let result: AST.ASTNode | null = null;
    for (const { op, right } of ops) {
      const cmp: AST.ASTNode = { type: 'BinaryExpr', operator: op, left: prev, right, line: left.line };
      result = result ? { type: 'BinaryExpr', operator: 'also', left: result, right: cmp, line: left.line } : cmp;
      prev = right;
    }
    return result!;
  }

  /** `x through xs`, `x isnt through xs`, `a same b`, `a isnt same b`. */
  private parseMembership(): AST.ASTNode {
    let left = this.parseBitOr();
    for (;;) {
      if (this.check(TokenType.THROUGH)) {
        this.advance();
        const right = this.parseBitOr();
        left = { type: 'BinaryExpr', operator: 'in', left, right, line: left.line };
        continue;
      }
      if (this.check(TokenType.IS)) {
        this.advance();
        const negated = this.match(TokenType.ISNT);
        const right = this.parseBitOr();
        left = { type: 'BinaryExpr', operator: negated ? 'is not' : 'is', left, right, line: left.line };
        continue;
      }
      if (this.check(TokenType.ISNT) && this.tokens[this.pos + 1]?.type === TokenType.THROUGH) {
        this.advance();
        this.advance();
        const right = this.parseBitOr();
        left = { type: 'BinaryExpr', operator: 'not in', left, right, line: left.line };
        continue;
      }
      break;
    }
    return left;
  }

  private parseBitOr(): AST.ASTNode {
    let left = this.parseBitXor();
    while (this.check(TokenType.BAR)) {
      this.advance();
      const right = this.parseBitXor();
      left = { type: 'BinaryExpr', operator: '|', left, right, line: left.line };
    }
    return left;
  }

  private parseBitXor(): AST.ASTNode {
    let left = this.parseBitAnd();
    // '^' is power in sdev; bitwise xor is the `bit_xor` builtin.
    return left;
  }

  private parseBitAnd(): AST.ASTNode {
    let left = this.parseShift();
    while (this.check(TokenType.AMP)) {
      this.advance();
      const right = this.parseShift();
      left = { type: 'BinaryExpr', operator: '&', left, right, line: left.line };
    }
    return left;
  }

  private parseShift(): AST.ASTNode {
    let left = this.parseTerm();
    while (this.check(TokenType.SHL) || this.check(TokenType.SHR)) {
      const op = this.advance().value;
      const right = this.parseTerm();
      left = { type: 'BinaryExpr', operator: op, left, right, line: left.line };
    }
    return left;
  }

  private parseTerm(): AST.ASTNode {
    let left = this.parseFactor();
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value;
      const right = this.parseFactor();
      left = { type: 'BinaryExpr', operator, left, right, line: left.line };
    }
    return left;
  }

  private parseFactor(): AST.ASTNode {
    let left = this.parsePower();
    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT, TokenType.BACKSLASH, TokenType.AT)) {
      const tok = this.previous();
      const operator = tok.type === TokenType.BACKSLASH ? '\\' : tok.type === TokenType.AT ? '@' : tok.value;
      const right = this.parsePower();
      left = { type: 'BinaryExpr', operator, left, right, line: left.line };
    }
    return left;
  }

  private parsePower(): AST.ASTNode {
    const left = this.parseUnary();
    if (this.match(TokenType.CARET, TokenType.STARSTAR)) {
      const right = this.parsePower(); // right-associative
      return { type: 'BinaryExpr', operator: '^', left, right, line: left.line };
    }
    return left;
  }

  private parseUnary(): AST.ASTNode {
    if (this.match(TokenType.MINUS, TokenType.ISNT)) {
      const operator = this.previous().value === '-' ? '-' : 'isnt';
      const line = this.previous().line;
      const operand = this.parseUnary();
      return { type: 'UnaryExpr', operator, operand, line };
    }
    if (this.match(TokenType.PLUS)) {
      return this.parseUnary();
    }
    // await expression
    if (this.match(TokenType.AWAIT)) {
      const awaitLine = this.previous().line;
      const operand = this.parseUnary();
      return { type: 'AwaitExpr', operand, line: awaitLine };
    }
    // generator emit / delegate as an expression
    if (this.check(TokenType.EMIT) || this.check(TokenType.DELEGATE)) {
      const t = this.advance();
      const delegate = t.type === TokenType.DELEGATE;
      let value: AST.ASTNode | undefined;
      if (!this.atStatementEnd() && !this.check(TokenType.RPAREN) && !this.check(TokenType.RBRACKET)) {
        value = this.parseExpression();
      }
      return { type: 'EmitExpr', value, delegate, line: t.line };
    }
    return this.parseCall();
  }

  private parseCall(): AST.ASTNode {
    let expr = this.parsePrimary();

    for (;;) {
      if (this.match(TokenType.LPAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.LBRACKET)) {
        expr = this.finishSubscript(expr);
      } else if (this.match(TokenType.DOT)) {
        const property = this.consumeName('Expected property name');
        expr = { type: 'MemberExpr', object: expr, property, line: expr.line };
      } else if (this.check(TokenType.ARROW) && expr.type === 'Identifier') {
        // Lambda: x -> expr
        this.advance();
        let body: AST.ASTNode;
        if (this.check(TokenType.DOUBLE_COLON)) body = this.parseBlockStatement();
        else body = this.parseExpression();
        expr = { type: 'LambdaExpr', params: [expr.name], body, line: expr.line };
      } else {
        break;
      }
    }

    return expr;
  }

  /** `xs[i]`, `xs[a:b]`, `xs[a:b:c]` */
  private finishSubscript(object: AST.ASTNode): AST.ASTNode {
    const line = object.line;
    let start: AST.ASTNode | undefined;
    if (!this.check(TokenType.COLON)) start = this.parseExpression();

    if (this.check(TokenType.COLON)) {
      this.advance();
      let stop: AST.ASTNode | undefined;
      let step: AST.ASTNode | undefined;
      if (!this.check(TokenType.COLON) && !this.check(TokenType.RBRACKET)) stop = this.parseExpression();
      if (this.match(TokenType.COLON)) {
        if (!this.check(TokenType.RBRACKET)) step = this.parseExpression();
      }
      this.consume(TokenType.RBRACKET, "Expected ']'");
      return { type: 'SliceExpr', object, start, stop, step, line };
    }

    this.consume(TokenType.RBRACKET, "Expected ']'");
    return { type: 'IndexExpr', object, index: start!, line };
  }

  private finishCall(callee: AST.ASTNode): AST.ASTNode {
    const args: AST.ASTNode[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        if (this.check(TokenType.RPAREN)) break;
        // **kwargs spread
        if (this.match(TokenType.STARSTAR)) {
          args.push({ type: 'StarExpr', operand: this.parseExpression(), double: true, line: callee.line });
          continue;
        }
        // *args spread
        if (this.match(TokenType.STAR)) {
          args.push({ type: 'StarExpr', operand: this.parseExpression(), double: false, line: callee.line });
          continue;
        }
        // keyword argument:  name be value  |  name: value
        if (this.check(TokenType.IDENTIFIER) &&
            (this.tokens[this.pos + 1]?.type === TokenType.BE || this.tokens[this.pos + 1]?.type === TokenType.COLON)) {
          const name = this.advance().value;
          this.advance();
          args.push({ type: 'KeywordArg', name, value: this.parseExpression(), line: callee.line });
          continue;
        }
        const first = this.parseExpression();
        // Generator expression as the sole argument: f(x iterate x through xs)
        if (this.check(TokenType.ITERATE) && args.length === 0) {
          const comp = this.finishComprehension(first, 'gen', undefined, callee.line);
          this.consume(TokenType.RPAREN, "Expected ')'");
          return { type: 'CallExpr', callee, args: [comp], line: callee.line };
        }
        args.push(first);
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')'");
    return { type: 'CallExpr', callee, args, line: callee.line };
  }

  /** Shared comprehension tail: `iterate v through xs [ponder cond]...` */
  private finishComprehension(
    element: AST.ASTNode,
    form: 'list' | 'set' | 'dict' | 'gen',
    valueExpr: AST.ASTNode | undefined,
    line: number
  ): AST.ComprehensionExpr {
    const clauses: AST.ComprehensionClause[] = [];
    while (this.check(TokenType.ITERATE) || this.check(TokenType.ASYNC)) {
      let isAsync = false;
      if (this.check(TokenType.ASYNC)) { this.advance(); isAsync = true; }
      this.consume(TokenType.ITERATE, "Expected 'for' in comprehension");
      const vars: string[] = [this.consumeName('Expected loop variable')];
      while (this.match(TokenType.COMMA)) vars.push(this.consumeName('Expected loop variable'));
      this.consume(TokenType.THROUGH, "Expected 'in' in comprehension");
      const iterable = this.parseBitOr();
      const conditions: AST.ASTNode[] = [];
      while (this.check(TokenType.PONDER)) {
        this.advance();
        conditions.push(this.parseOr());
      }
      clauses.push({ variable: vars.length > 1 ? vars : vars[0], iterable, conditions, isAsync });
    }
    return { type: 'ComprehensionExpr', form, element, valueExpr, clauses, line };
  }

  private parsePrimary(): AST.ASTNode {
    const token = this.peek();

    if (this.match(TokenType.NUMBER)) {
      return { type: 'NumberLiteral', value: parseFloat(token.value), line: token.line };
    }

    if (this.match(TokenType.STRING)) {
      // Implicit adjacent string concatenation
      let value = token.value;
      while (this.check(TokenType.STRING)) value += this.advance().value;
      return { type: 'StringLiteral', value, line: token.line };
    }

    if (this.match(TokenType.FSTRING)) {
      return this.buildFString(token.value, token.line);
    }

    if (this.match(TokenType.BYTES)) {
      return { type: 'BytesLiteral', value: token.value, line: token.line };
    }

    if (this.match(TokenType.ELLIPSIS)) {
      return { type: 'EllipsisLiteral', line: token.line };
    }

    if (this.match(TokenType.YEP)) return { type: 'BooleanLiteral', value: true, line: token.line };
    if (this.match(TokenType.NOPE)) return { type: 'BooleanLiteral', value: false, line: token.line };
    if (this.match(TokenType.VOID)) return { type: 'NullLiteral', line: token.line };

    if (this.match(TokenType.SELF)) return { type: 'Identifier', name: 'self', line: token.line };
    if (this.match(TokenType.SUPER)) return { type: 'Identifier', name: 'super', line: token.line };

    if (this.match(TokenType.IDENTIFIER)) {
      return { type: 'Identifier', name: token.value, line: token.line };
    }

    // Contextual keywords usable as plain values (`match`, `case`, `when`, ...)
    if (this.check(TokenType.MATCH) || this.check(TokenType.WHEN) || this.check(TokenType.CASE)) {
      const t = this.advance();
      return { type: 'Identifier', name: t.value, line: t.line };
    }

    // new ClassName(args)
    if (this.match(TokenType.NEW)) {
      const classExpr = this.parseCall();
      if (classExpr.type === 'CallExpr') {
        return { type: 'NewExpr', className: classExpr.callee, args: classExpr.args, line: token.line };
      }
      return { type: 'NewExpr', className: classExpr, args: [], line: token.line };
    }

    if (this.match(TokenType.LPAREN)) {
      return this.parseParenthesised(token.line);
    }

    if (this.match(TokenType.LBRACKET)) {
      return this.parseBracketLiteral(token.line);
    }

    // Set literal / set comprehension: {| 1, 2, 3 |}
    if (this.match(TokenType.LSET)) {
      return this.parseSetLiteral(token.line);
    }

    // Dict literal: { key: value, ... }
    if (this.check(TokenType.LBRACE)) {
      this.advance();
      return this.parseBraceDictLiteral(token.line);
    }

    if (this.check(TokenType.DOUBLE_COLON)) {
      const savedPos = this.pos;
      this.advance(); // consume ::
      if (this.check(TokenType.DOUBLE_SEMI)) {
        this.advance();
        return { type: 'DictLiteral', entries: [], line: token.line };
      }
      this.pos = savedPos;
      this.advance();
      return this.parseDictLiteral(token.line);
    }

    throw new SdevError(`Unexpected token: '${token.value}'`, token.line, token.column);
  }

  /** Grouping, tuple, lambda parameter list, or generator expression. */
  private parseParenthesised(line: number): AST.ASTNode {
    if (this.check(TokenType.RPAREN)) {
      this.advance();
      if (this.match(TokenType.ARROW)) {
        const body = this.check(TokenType.DOUBLE_COLON) ? this.parseBlockStatement() : this.parseExpression();
        return { type: 'LambdaExpr', params: [], body, line };
      }
      return { type: 'TupleLiteral', elements: [], line };
    }

    const exprs: AST.ASTNode[] = [];
    const names: string[] = [];
    let isLambdaParams = true;
    let sawComma = false;

    do {
      if (this.check(TokenType.RPAREN)) { sawComma = true; break; }
      const expr = this.parseExpression();
      // Generator expression
      if (exprs.length === 0 && this.check(TokenType.ITERATE)) {
        const comp = this.finishComprehension(expr, 'gen', undefined, line);
        this.consume(TokenType.RPAREN, "Expected ')'");
        return comp;
      }
      exprs.push(expr);
      if (expr.type !== 'Identifier') isLambdaParams = false;
      else names.push(expr.name);
      if (this.check(TokenType.COMMA)) sawComma = true;
    } while (this.match(TokenType.COMMA));

    this.consume(TokenType.RPAREN, "Expected ')'");

    if (this.match(TokenType.ARROW)) {
      if (!isLambdaParams) throw new SdevError('Invalid lambda parameters', line);
      const body = this.check(TokenType.DOUBLE_COLON) ? this.parseBlockStatement() : this.parseExpression();
      return { type: 'LambdaExpr', params: names, body, line };
    }

    if (exprs.length === 1 && !sawComma) return exprs[0];
    return { type: 'TupleLiteral', elements: exprs, line };
  }

  /** List literal or list comprehension. */
  private parseBracketLiteral(line: number): AST.ASTNode {
    if (this.check(TokenType.RBRACKET)) {
      this.advance();
      return { type: 'ArrayLiteral', elements: [], line };
    }
    const elements: AST.ASTNode[] = [];
    let first = true;
    do {
      if (this.check(TokenType.RBRACKET)) break;
      if (this.match(TokenType.STAR)) {
        elements.push({ type: 'StarExpr', operand: this.parseExpression(), double: false, line });
        first = false;
        continue;
      }
      const expr = this.parseExpression();
      if (first && this.check(TokenType.ITERATE)) {
        const comp = this.finishComprehension(expr, 'list', undefined, line);
        this.consume(TokenType.RBRACKET, "Expected ']'");
        return comp;
      }
      elements.push(expr);
      first = false;
    } while (this.match(TokenType.COMMA));
    this.consume(TokenType.RBRACKET, "Expected ']'");
    return { type: 'ArrayLiteral', elements, line };
  }

  /** Set literal or set comprehension: {| ... |} */
  private parseSetLiteral(line: number): AST.ASTNode {
    if (this.check(TokenType.RSET)) {
      this.advance();
      return { type: 'SetLiteral', elements: [], line };
    }
    const elements: AST.ASTNode[] = [];
    let first = true;
    do {
      if (this.check(TokenType.RSET)) break;
      if (this.match(TokenType.STAR)) {
        elements.push({ type: 'StarExpr', operand: this.parseExpression(), double: false, line });
        first = false;
        continue;
      }
      const expr = this.parseExpression();
      if (first && this.check(TokenType.ITERATE)) {
        const comp = this.finishComprehension(expr, 'set', undefined, line);
        this.consume(TokenType.RSET, "Expected '|}'");
        return comp;
      }
      elements.push(expr);
      first = false;
    } while (this.match(TokenType.COMMA));
    this.consume(TokenType.RSET, "Expected '|}'");
    return { type: 'SetLiteral', elements, line };
  }

  private parseDictLiteral(line: number): AST.DictLiteral {
    const entries: { key: AST.ASTNode; value: AST.ASTNode }[] = [];
    if (!this.check(TokenType.DOUBLE_SEMI)) {
      do {
        if (this.check(TokenType.DOUBLE_SEMI)) break;
        const key = this.parseExpression();
        this.consume(TokenType.COLON, "Expected ':'");
        const value = this.parseExpression();
        entries.push({ key, value });
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.DOUBLE_SEMI, "Expected ';;'");
    return { type: 'DictLiteral', entries, line };
  }

  private parseBraceDictLiteral(line: number): AST.ASTNode {
    const entries: { key: AST.ASTNode; value: AST.ASTNode }[] = [];
    let first = true;
    if (!this.check(TokenType.RBRACE)) {
      do {
        if (this.check(TokenType.RBRACE)) break;
        if (this.match(TokenType.STARSTAR)) {
          entries.push({
            key: { type: 'StarExpr', operand: this.parseExpression(), double: true, line },
            value: { type: 'NullLiteral', line },
          });
          first = false;
          continue;
        }
        // Allow bare identifier keys (treated as string)
        let key: AST.ASTNode;
        const t = this.peek();
        if (t.type === TokenType.IDENTIFIER && this.tokens[this.pos + 1]?.type === TokenType.COLON) {
          this.advance();
          key = { type: 'StringLiteral', value: t.value, line: t.line };
        } else {
          key = this.parseExpression();
        }
        this.consume(TokenType.COLON, "Expected ':'");
        const value = this.parseExpression();
        if (first && this.check(TokenType.ITERATE)) {
          const comp = this.finishComprehension(key, 'dict', value, line);
          this.consume(TokenType.RBRACE, "Expected '}'");
          return comp;
        }
        entries.push({ key, value });
        first = false;
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RBRACE, "Expected '}'");
    return { type: 'DictLiteral', entries, line };
  }

  /**
   * Compiles an f-string template into an FStringExpr. Supports `{expr}`,
   * `{expr!r}` conversions, `{expr:spec}` format specs, `{expr=}` debug
   * output and `{{` / `}}` escapes.
   */
  private buildFString(template: string, line: number): AST.FStringExpr {
    const parts: AST.FStringPart[] = [];
    let text = '';
    let i = 0;
    while (i < template.length) {
      const ch = template[i];
      if (ch === '{' && template[i + 1] === '{') { text += '{'; i += 2; continue; }
      if (ch === '}' && template[i + 1] === '}') { text += '}'; i += 2; continue; }
      if (ch === '{') {
        if (text) { parts.push({ kind: 'text', value: text }); text = ''; }
        let depth = 1;
        let body = '';
        i++;
        while (i < template.length && depth > 0) {
          const c = template[i];
          if (c === '{') depth++;
          else if (c === '}') { depth--; if (depth === 0) break; }
          body += c;
          i++;
        }
        i++; // closing }
        let spec: string | undefined;
        let conv: string | undefined;
        let debug: string | undefined;

        // Format spec (last top-level ':' outside brackets)
        let bracket = 0;
        let specIdx = -1;
        for (let k = 0; k < body.length; k++) {
          const c = body[k];
          if (c === '[' || c === '(' || c === '{') bracket++;
          else if (c === ']' || c === ')' || c === '}') bracket--;
          else if (c === ':' && bracket === 0) { specIdx = k; break; }
        }
        if (specIdx >= 0) {
          spec = body.slice(specIdx + 1);
          body = body.slice(0, specIdx);
        }
        const convMatch = /!([rsa])$/.exec(body);
        if (convMatch) {
          conv = convMatch[1];
          body = body.slice(0, -2);
        }
        if (body.trimEnd().endsWith('=')) {
          debug = body.slice(0, body.lastIndexOf('=')).trim();
          body = debug;
        }

        const sub = new Parser(this.lexTemplate(body, line));
        parts.push({ kind: 'expr', expr: sub.parseExpression(), spec, conv, debug });
        continue;
      }
      text += ch;
      i++;
    }
    if (text) parts.push({ kind: 'text', value: text });
    return { type: 'FStringExpr', parts, line };
  }

  private lexTemplate(source: string, line: number): Token[] {
    const tokens = new Lexer(source, { sourceLanguage: null }).tokenize();
    return tokens.map((t) => ({ ...t, line }));
  }

  // ==========================================================
  // Helpers
  // ==========================================================

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  /** Check if current token is IDENTIFIER with a specific value */
  private checkIdentifierValue(value: string): boolean {
    if (this.isAtEnd()) return false;
    const t = this.peek();
    return t.type === TokenType.IDENTIFIER && t.value === value;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new SdevError(message + ` (got '${token.value}')`, token.line, token.column);
  }

  /**
   * Consumes a plain name. Soft keywords (`match`, `case`, `when`, `emit`,
   * `pass`, ...) stay usable as identifiers so older programs keep working.
   */
  private consumeName(message: string): string {
    const t = this.peek();
    const soft = new Set<TokenType>([
      TokenType.MATCH, TokenType.CASE, TokenType.WHEN, TokenType.EMIT,
      TokenType.DELEGATE, TokenType.PASS, TokenType.AS, TokenType.IS,
      TokenType.FROM, TokenType.WITH, TokenType.DEL, TokenType.ASSERT,
      TokenType.GLOBAL, TokenType.NONLOCAL, TokenType.RAISE, TokenType.ELIF,
      TokenType.LAMBDA, TokenType.FINALLY,
    ]);
    if (t.type === TokenType.IDENTIFIER || soft.has(t.type)) {
      this.advance();
      return t.value;
    }
    throw new SdevError(message + ` (got '${t.value}')`, t.line, t.column);
  }
}
