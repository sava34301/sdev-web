import { Token, TokenType } from './tokens';
import * as AST from './ast';
import { SdevError } from './errors';

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

  private parseStatement(): AST.ASTNode {
    if (this.check(TokenType.FORGE)) return this.parseForgeStatement();
    if (this.check(TokenType.CONJURE)) return this.parseConjureDeclaration();
    if (this.check(TokenType.ASYNC)) return this.parseAsyncConjure();
    if (this.check(TokenType.PONDER)) return this.parsePonderStatement();
    if (this.check(TokenType.CYCLE)) return this.parseCycleStatement();
    if (this.check(TokenType.ITERATE)) return this.parseIterateStatement();
    if (this.check(TokenType.WITHIN)) return this.parseWithinStatement();
    if (this.check(TokenType.YIELD)) return this.parseYieldStatement();
    if (this.check(TokenType.YEET)) return this.parseYeetStatement();
    if (this.check(TokenType.SKIP)) return this.parseSkipStatement();
    if (this.check(TokenType.ATTEMPT)) return this.parseAttemptStatement();
    // 'essence' is a contextual keyword - check by value
    if (this.checkIdentifierValue('essence')) return this.parseEssenceDeclaration();
    // Reassignment dialects used by the sdev stdlib:
    //   be x be value        (leading-'be' form)
    //   set x to value       (ML/v2 form, 'set'/'to' are contextual)
    if (this.check(TokenType.BE)) return this.parseLeadingBeStatement();
    if (this.checkIdentifierValue('set') && this.isSetToStatement()) return this.parseSetToStatement();
    if (this.check(TokenType.DOUBLE_COLON)) return this.parseBlockStatement();
    return this.parseExpressionStatement();
  }

  // be target be value  — same targets as `target be value`
  private parseLeadingBeStatement(): AST.ASTNode {
    this.consume(TokenType.BE, "Expected 'be'");
    return this.parseExpressionStatement();
  }

  /** Lookahead: does this `set ...` line contain a `to` before the statement ends? */
  private isSetToStatement(): boolean {
    let depth = 0;
    for (let i = this.current + 1; i < this.tokens.length; i++) {
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
    if (target.type === 'Identifier') {
      return { type: 'AssignStatement', name: target.name, value, line: setToken.line };
    }
    if (target.type === 'IndexExpr') {
      return { type: 'IndexAssignStatement', object: target.object, index: target.index, value, line: setToken.line };
    }
    if (target.type === 'MemberExpr') {
      return { type: 'MemberAssignStatement', object: target.object, property: target.property, value, line: setToken.line };
    }
    throw new SdevError('Invalid assignment target', setToken.line);
  }


  // forge name be value
  private parseForgeStatement(): AST.LetStatement {
    const forgeToken = this.consume(TokenType.FORGE, "Expected 'forge'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;
    this.consume(TokenType.BE, "Expected 'be'");
    const value = this.parseExpression();
    return { type: 'LetStatement', name, value, line: forgeToken.line };
  }

  // conjure name(params) :: body ;;
  private parseConjureDeclaration(): AST.FuncDeclaration {
    const conjureToken = this.consume(TokenType.CONJURE, "Expected 'conjure'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected function name").value;
    this.consume(TokenType.LPAREN, "Expected '('");
    
    const params: string[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        // allow 'self' as parameter
        if (this.check(TokenType.SELF)) {
          this.advance();
          params.push('self');
        } else {
          params.push(this.consume(TokenType.IDENTIFIER, "Expected parameter name").value);
        }
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')'");
    
    const body = this.parseBlockStatement();
    return { type: 'FuncDeclaration', name, params, body, line: conjureToken.line };
  }

  // async conjure name(params) :: body ;;
  private parseAsyncConjure(): AST.FuncDeclaration {
    const asyncToken = this.consume(TokenType.ASYNC, "Expected 'async'");
    this.consume(TokenType.CONJURE, "Expected 'conjure' after 'async'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected function name").value;
    this.consume(TokenType.LPAREN, "Expected '('");
    
    const params: string[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        if (this.check(TokenType.SELF)) {
          this.advance();
          params.push('self');
        } else {
          params.push(this.consume(TokenType.IDENTIFIER, "Expected parameter name").value);
        }
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')'");
    
    const body = this.parseBlockStatement();
    // Async functions are treated the same as regular functions in the tree-walk interpreter
    return { type: 'FuncDeclaration', name, params, body, line: asyncToken.line };
  }

  // essence ClassName (extend Parent)? :: methods ;;
  // 'essence' is treated as a contextual keyword (IDENTIFIER with value 'essence')
  private parseEssenceDeclaration(): AST.ClassDeclaration {
    const essenceToken = this.advance(); // consume 'essence' identifier
    const name = this.consume(TokenType.IDENTIFIER, "Expected class name").value;
    
    let superClass: string | undefined;
    if (this.match(TokenType.EXTEND)) {
      superClass = this.consume(TokenType.IDENTIFIER, "Expected superclass name").value;
    }

    this.consume(TokenType.DOUBLE_COLON, "Expected '::'");
    const methods: AST.FuncDeclaration[] = [];
    while (!this.check(TokenType.DOUBLE_SEMI) && !this.isAtEnd()) {
      if (this.check(TokenType.CONJURE)) {
        methods.push(this.parseConjureDeclaration());
      } else {
        // Skip unknown tokens inside class body
        this.advance();
      }
    }
    this.consume(TokenType.DOUBLE_SEMI, "Expected ';;'");
    return { type: 'ClassDeclaration', name, superClass, methods, line: essenceToken.line };
  }

  // ponder condition :: body ;; otherwise :: body ;;
  private parsePonderStatement(): AST.IfStatement {
    const ponderToken = this.consume(TokenType.PONDER, "Expected 'ponder'");
    const condition = this.parseExpression();
    const thenBranch = this.parseBlockStatement();
    
    let elseBranch: AST.BlockStatement | AST.IfStatement | undefined;
    if (this.match(TokenType.OTHERWISE)) {
      if (this.check(TokenType.PONDER)) {
        elseBranch = this.parsePonderStatement();
      } else {
        elseBranch = this.parseBlockStatement();
      }
    }
    
    return { type: 'IfStatement', condition, thenBranch, elseBranch, line: ponderToken.line };
  }

  // cycle condition :: body ;;
  private parseCycleStatement(): AST.WhileStatement {
    const cycleToken = this.consume(TokenType.CYCLE, "Expected 'cycle'");
    const condition = this.parseExpression();
    const body = this.parseBlockStatement();
    return { type: 'WhileStatement', condition, body, line: cycleToken.line };
  }

  // iterate item through list :: body ;;
  private parseIterateStatement(): AST.ForEachStatement {
    const iterateToken = this.consume(TokenType.ITERATE, "Expected 'iterate'");
    const variable = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;
    this.consume(TokenType.THROUGH, "Expected 'through'");
    const iterable = this.parseExpression();
    const body = this.parseBlockStatement();
    return { type: 'ForEachStatement', variable, iterable, body, line: iterateToken.line };
  }

  // within item be iterable :: body ;;
  private parseWithinStatement(): AST.ForInStatement {
    const withinToken = this.consume(TokenType.WITHIN, "Expected 'within'");
    const variable = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;
    this.consume(TokenType.BE, "Expected 'be'");
    const iterable = this.parseExpression();
    const body = this.parseBlockStatement();
    return { type: 'ForInStatement', variable, iterable, body, line: withinToken.line };
  }

  // yield value
  private parseYieldStatement(): AST.ReturnStatement {
    const yieldToken = this.consume(TokenType.YIELD, "Expected 'yield'");
    let value: AST.ASTNode | undefined;
    if (!this.check(TokenType.DOUBLE_SEMI) && !this.isAtEnd()) {
      if (!this.check(TokenType.FORGE) && !this.check(TokenType.CONJURE) && 
          !this.check(TokenType.PONDER) && !this.check(TokenType.CYCLE)) {
        value = this.parseExpression();
      }
    }
    return { type: 'ReturnStatement', value, line: yieldToken.line };
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

  // attempt :: body ;; rescue err :: body ;;
  private parseAttemptStatement(): AST.TryStatement {
    const attemptToken = this.consume(TokenType.ATTEMPT, "Expected 'attempt'");
    const tryBlock = this.parseBlockStatement();
    this.consume(TokenType.RESCUE, "Expected 'rescue' after attempt block");
    const errorVar = this.consume(TokenType.IDENTIFIER, "Expected error variable name").value;
    const catchBlock = this.parseBlockStatement();
    return { type: 'TryStatement', tryBlock, errorVar, catchBlock, line: attemptToken.line };
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

  private parseExpressionStatement(): AST.ExpressionStatement | AST.AssignStatement | AST.IndexAssignStatement | AST.MemberAssignStatement {
    const expr = this.parseExpression();
    
    // Check for assignment with 'be'
    if (this.match(TokenType.BE)) {
      const value = this.parseExpression();
      
      if (expr.type === 'Identifier') {
        return { type: 'AssignStatement', name: expr.name, value, line: expr.line };
      }
      if (expr.type === 'IndexExpr') {
        return { type: 'IndexAssignStatement', object: expr.object, index: expr.index, value, line: expr.line };
      }
      if (expr.type === 'MemberExpr') {
        return { type: 'MemberAssignStatement', object: expr.object, property: expr.property, value, line: expr.line };
      }
      throw new SdevError('Invalid assignment target', expr.line);
    }
    
    return { type: 'ExpressionStatement', expression: expr, line: expr.line };
  }

  private parseExpression(): AST.ASTNode {
    return this.parseTernary();
  }

  // Ternary: condition ~ thenExpr : elseExpr
  private parseTernary(): AST.ASTNode {
    let left = this.parsePipe();
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
    let left = this.parseOr();
    
    while (this.match(TokenType.PIPE)) {
      const right = this.parseOr();
      if (right.type === 'CallExpr') {
        right.args.unshift(left);
        left = right;
      } else if (right.type === 'Identifier') {
        left = { type: 'CallExpr', callee: right, args: [left], line: left.line };
      } else if (right.type === 'LambdaExpr') {
        left = { type: 'CallExpr', callee: right, args: [left], line: left.line };
      } else {
        // Treat any other expression as a callable
        left = { type: 'CallExpr', callee: right, args: [left], line: left.line };
      }
    }
    
    return left;
  }

  private parseOr(): AST.ASTNode {
    let left = this.parseAnd();
    while (this.match(TokenType.EITHER)) {
      const right = this.parseAnd();
      left = { type: 'BinaryExpr', operator: 'either', left, right, line: left.line };
    }
    return left;
  }

  private parseAnd(): AST.ASTNode {
    let left = this.parseEquality();
    while (this.match(TokenType.ALSO)) {
      const right = this.parseEquality();
      left = { type: 'BinaryExpr', operator: 'also', left, right, line: left.line };
    }
    return left;
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

  private parseComparison(): AST.ASTNode {
    let left = this.parseTerm();
    while (this.match(TokenType.LESS, TokenType.MORE, TokenType.ATMOST, TokenType.ATLEAST)) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      left = { type: 'BinaryExpr', operator, left, right, line: left.line };
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
    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const operator = this.previous().value;
      const right = this.parsePower();
      left = { type: 'BinaryExpr', operator, left, right, line: left.line };
    }
    return left;
  }

  private parsePower(): AST.ASTNode {
    let left = this.parseUnary();
    while (this.match(TokenType.CARET)) {
      const right = this.parseUnary();
      left = { type: 'BinaryExpr', operator: '^', left, right, line: left.line };
    }
    return left;
  }

  private parseUnary(): AST.ASTNode {
    if (this.match(TokenType.MINUS, TokenType.ISNT)) {
      const operator = this.previous().value === 'isnt' ? 'isnt' : '-';
      const operand = this.parseUnary();
      return { type: 'UnaryExpr', operator, operand, line: this.previous().line };
    }
    // await expression
    if (this.match(TokenType.AWAIT)) {
      const awaitLine = this.previous().line;
      const operand = this.parseUnary();
      // In our synchronous interpreter, await is a no-op pass-through
      return { type: 'AwaitExpr', operand, line: awaitLine } as AST.ASTNode;
    }
    return this.parseCall();
  }

  private parseCall(): AST.ASTNode {
    let expr = this.parsePrimary();
    
    while (true) {
      if (this.match(TokenType.LPAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.LBRACKET)) {
        const index = this.parseExpression();
        this.consume(TokenType.RBRACKET, "Expected ']'");
        expr = { type: 'IndexExpr', object: expr, index, line: expr.line };
      } else if (this.match(TokenType.DOT)) {
        const property = this.consume(TokenType.IDENTIFIER, "Expected property name").value;
        expr = { type: 'MemberExpr', object: expr, property, line: expr.line };
      } else if (this.match(TokenType.ARROW)) {
        // Lambda: x -> expr
        if (expr.type === 'Identifier') {
          let body: AST.ASTNode;
          if (this.check(TokenType.DOUBLE_COLON)) {
            body = this.parseBlockStatement();
          } else {
            body = this.parseExpression();
          }
          expr = { type: 'LambdaExpr', params: [expr.name], body, line: expr.line } as AST.LambdaExpr;
        } else {
          throw new SdevError('Invalid lambda syntax', expr.line);
        }
      } else {
        break;
      }
    }
    
    return expr;
  }

  private finishCall(callee: AST.ASTNode): AST.CallExpr {
    const args: AST.ASTNode[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')'");
    return { type: 'CallExpr', callee, args, line: callee.line };
  }

  private parsePrimary(): AST.ASTNode {
    const token = this.peek();

    if (this.match(TokenType.NUMBER)) {
      return { type: 'NumberLiteral', value: parseFloat(token.value), line: token.line };
    }

    if (this.match(TokenType.STRING)) {
      return { type: 'StringLiteral', value: token.value, line: token.line };
    }

    if (this.match(TokenType.YEP)) {
      return { type: 'BooleanLiteral', value: true, line: token.line };
    }

    if (this.match(TokenType.NOPE)) {
      return { type: 'BooleanLiteral', value: false, line: token.line };
    }

    if (this.match(TokenType.VOID)) {
      return { type: 'NullLiteral', line: token.line };
    }

    // 'self' and 'super' as identifiers
    if (this.match(TokenType.SELF)) {
      return { type: 'Identifier', name: 'self', line: token.line };
    }

    if (this.match(TokenType.SUPER)) {
      return { type: 'Identifier', name: 'super', line: token.line };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return { type: 'Identifier', name: token.value, line: token.line };
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
      // Could be grouping or multi-param lambda
      const exprs: AST.ASTNode[] = [];
      const names: string[] = [];
      let isLambdaParams = true;
      
      if (!this.check(TokenType.RPAREN)) {
        do {
          const expr = this.parseExpression();
          exprs.push(expr);
          if (expr.type !== 'Identifier') isLambdaParams = false;
          else names.push(expr.name);
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RPAREN, "Expected ')'");
      
      // Check for lambda arrow
      if (this.match(TokenType.ARROW)) {
        if (!isLambdaParams) {
          throw new SdevError('Invalid lambda parameters', token.line);
        }
        let body: AST.ASTNode;
        if (this.check(TokenType.DOUBLE_COLON)) {
          body = this.parseBlockStatement();
        } else {
          body = this.parseExpression();
        }
        return { type: 'LambdaExpr', params: names, body, line: token.line } as AST.LambdaExpr;
      }
      
      // Just grouping - return single expression
      if (exprs.length === 1) return exprs[0];
      // Empty parens that aren't lambda — error
      if (exprs.length === 0) throw new SdevError('Empty parentheses', token.line);
      throw new SdevError('Unexpected multiple expressions', token.line);
    }

    if (this.match(TokenType.LBRACKET)) {
      return this.parseArrayLiteral(token.line);
    }

    // Dict literal: :: key: value, ... ;;  OR  { key: value, ... }
    // Also handles empty dict ::;;  or  {}
    if (this.check(TokenType.LBRACE)) {
      this.advance(); // consume {
      return this.parseBraceDictLiteral(token.line);
    }
    if (this.check(TokenType.DOUBLE_COLON)) {
      // Peek ahead to see if this is a dict literal (expression context)
      // We detect dict literal when next meaningful token after :: is either
      // ;; (empty dict) or an expression followed by :
      const savedPos = this.pos;
      this.advance(); // consume ::
      
      // Empty dict: ::;;
      if (this.check(TokenType.DOUBLE_SEMI)) {
        this.advance(); // consume ;;
        return { type: 'DictLiteral', entries: [], line: token.line };
      }
      
      // Try to parse as dict: look for pattern: expr COLON
      // Restore and use proper dict parse
      this.pos = savedPos;
      this.advance(); // re-consume ::
      return this.parseDictLiteral(token.line);
    }


    throw new SdevError(`Unexpected token: '${token.value}'`, token.line, token.column);
  }

  private parseArrayLiteral(line: number): AST.ArrayLiteral {
    const elements: AST.ASTNode[] = [];
    if (!this.check(TokenType.RBRACKET)) {
      do {
        if (this.check(TokenType.RBRACKET)) break;
        elements.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RBRACKET, "Expected ']'");
    return { type: 'ArrayLiteral', elements, line };
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

  private parseBraceDictLiteral(line: number): AST.DictLiteral {
    const entries: { key: AST.ASTNode; value: AST.ASTNode }[] = [];
    if (!this.check(TokenType.RBRACE)) {
      do {
        if (this.check(TokenType.RBRACE)) break;
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
        entries.push({ key, value });
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RBRACE, "Expected '}'");
    return { type: 'DictLiteral', entries, line };
  }


  // Helper methods
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
}
