export type ASTNode =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NullLiteral
  | Identifier
  | BinaryExpr
  | UnaryExpr
  | TernaryExpr
  | AwaitExpr
  | CallExpr
  | IndexExpr
  | MemberExpr
  | MemberAssignStatement
  | ArrayLiteral
  | DictLiteral
  | LambdaExpr
  | LetStatement
  | AssignStatement
  | IndexAssignStatement
  | IfStatement
  | WhileStatement
  | ForEachStatement
  | ForInStatement
  | FuncDeclaration
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | TryStatement
  | ClassDeclaration
  | NewExpr
  | BlockStatement
  | ExpressionStatement
  | Program
  // --- Python-parity nodes ---
  | FStringExpr
  | BytesLiteral
  | EllipsisLiteral
  | TupleLiteral
  | SetLiteral
  | SliceExpr
  | StarExpr
  | KeywordArg
  | WalrusExpr
  | ComprehensionExpr
  | EmitExpr
  | WithStatement
  | MatchStatement
  | RaiseStatement
  | AssertStatement
  | DelStatement
  | ScopeStatement
  | PassStatement
  | ImportStatement
  | AugAssignStatement
  | PatternNode;

export interface NumberLiteral {
  type: 'NumberLiteral';
  value: number;
  line: number;
}

export interface StringLiteral {
  type: 'StringLiteral';
  value: string;
  line: number;
}

export interface BooleanLiteral {
  type: 'BooleanLiteral';
  value: boolean;
  line: number;
}

export interface NullLiteral {
  type: 'NullLiteral';
  line: number;
}

export interface Identifier {
  type: 'Identifier';
  name: string;
  line: number;
}

export interface BinaryExpr {
  type: 'BinaryExpr';
  operator: string;
  left: ASTNode;
  right: ASTNode;
  line: number;
}

export interface UnaryExpr {
  type: 'UnaryExpr';
  operator: string;
  operand: ASTNode;
  line: number;
}

export interface TernaryExpr {
  type: 'TernaryExpr';
  condition: ASTNode;
  thenExpr: ASTNode;
  elseExpr: ASTNode;
  line: number;
}

export interface AwaitExpr {
  type: 'AwaitExpr';
  operand: ASTNode;
  line: number;
}

export interface CallExpr {
  type: 'CallExpr';
  callee: ASTNode;
  args: ASTNode[];
  line: number;
}

export interface IndexExpr {
  type: 'IndexExpr';
  object: ASTNode;
  index: ASTNode;
  line: number;
}

export interface MemberExpr {
  type: 'MemberExpr';
  object: ASTNode;
  property: string;
  line: number;
}

export interface MemberAssignStatement {
  type: 'MemberAssignStatement';
  object: ASTNode;
  property: string;
  value: ASTNode;
  line: number;
}

export interface ArrayLiteral {
  type: 'ArrayLiteral';
  elements: ASTNode[];
  line: number;
}

export interface DictLiteral {
  type: 'DictLiteral';
  entries: { key: ASTNode; value: ASTNode }[];
  line: number;
}

export interface LambdaExpr {
  type: 'LambdaExpr';
  params: string[];
  /** Rich parameter info (defaults, *rest, **named, annotations). */
  paramSpecs?: Param[];
  body: ASTNode;
  isAsync?: boolean;
  isGenerator?: boolean;
  line: number;
}

export interface LetStatement {
  type: 'LetStatement';
  name: string;
  /** Destructuring targets: `forge a, b be pair`. */
  targets?: string[];
  /** Index of a starred target (`forge a, *rest be xs`), if any. */
  starIndex?: number;
  annotation?: ASTNode;
  value: ASTNode;
  line: number;
}

export interface AssignStatement {
  type: 'AssignStatement';
  name: string;
  value: ASTNode;
  line: number;
}

export interface IndexAssignStatement {
  type: 'IndexAssignStatement';
  object: ASTNode;
  index: ASTNode;
  value: ASTNode;
  line: number;
}

export interface IfStatement {
  type: 'IfStatement';
  condition: ASTNode;
  thenBranch: BlockStatement;
  elseBranch?: BlockStatement | IfStatement;
  line: number;
}

export interface WhileStatement {
  type: 'WhileStatement';
  condition: ASTNode;
  body: BlockStatement;
  elseBlock?: BlockStatement;
  line: number;
}

export interface ForEachStatement {
  type: 'ForEachStatement';
  variable: string;
  /** Tuple unpacking targets: `iterate k, v through pairs`. */
  variables?: string[];
  iterable: ASTNode;
  body: BlockStatement;
  elseBlock?: BlockStatement;
  isAsync?: boolean;
  line: number;
}

export interface ForInStatement {
  type: 'ForInStatement';
  variable: string;
  iterable: ASTNode;
  body: BlockStatement;
  line: number;
}

export interface FuncDeclaration {
  type: 'FuncDeclaration';
  name: string;
  params: string[];
  paramSpecs?: Param[];
  decorators?: ASTNode[];
  isAsync?: boolean;
  isGenerator?: boolean;
  returnType?: ASTNode;
  docstring?: string;
  body: BlockStatement;
  line: number;
}

export interface ReturnStatement {
  type: 'ReturnStatement';
  value?: ASTNode;
  line: number;
}

export interface BreakStatement {
  type: 'BreakStatement';
  line: number;
}

export interface ContinueStatement {
  type: 'ContinueStatement';
  line: number;
}

export interface TryStatement {
  type: 'TryStatement';
  tryBlock: BlockStatement;
  /** Legacy single-handler form. */
  errorVar: string;
  catchBlock: BlockStatement;
  /** Typed handler chain (`rescue ValueError as e`). */
  handlers?: ExceptHandler[];
  elseBlock?: BlockStatement;
  finallyBlock?: BlockStatement;
  line: number;
}

export interface ClassDeclaration {
  type: 'ClassDeclaration';
  name: string;
  superClass?: string;
  /** Full base list for multiple inheritance / C3 linearisation. */
  superClasses?: string[];
  decorators?: ASTNode[];
  /** Class-level attributes declared with `forge`. */
  fields?: LetStatement[];
  metaclass?: string;
  docstring?: string;
  methods: FuncDeclaration[];
  line: number;
}

export interface NewExpr {
  type: 'NewExpr';
  className: ASTNode;
  args: ASTNode[];
  line: number;
}

export interface BlockStatement {
  type: 'BlockStatement';
  statements: ASTNode[];
  line: number;
}

export interface ExpressionStatement {
  type: 'ExpressionStatement';
  expression: ASTNode;
  line: number;
}

export interface Program {
  type: 'Program';
  statements: ASTNode[];
  line: number;
}

export type ExpressionNode = Exclude<ASTNode, Program>;


// ============================================================
// Python-parity AST nodes
// ============================================================

/** A single parameter in a function / lambda / method signature. */
export interface Param {
  name: string;
  /** 'normal' | 'rest' (*args) | 'named' (**kwargs) | 'kwonly' | 'posonly' */
  kind: 'normal' | 'rest' | 'named' | 'kwonly' | 'posonly';
  default?: ASTNode;
  annotation?: ASTNode;
}

export interface FStringExpr {
  type: 'FStringExpr';
  /** Alternating literal chunks and embedded expressions. */
  parts: FStringPart[];
  line: number;
}

export type FStringPart =
  | { kind: 'text'; value: string }
  | { kind: 'expr'; expr: ASTNode; spec?: string; conv?: string; debug?: string };

export interface BytesLiteral {
  type: 'BytesLiteral';
  value: string;
  line: number;
}

export interface EllipsisLiteral {
  type: 'EllipsisLiteral';
  line: number;
}

export interface TupleLiteral {
  type: 'TupleLiteral';
  elements: ASTNode[];
  line: number;
}

export interface SetLiteral {
  type: 'SetLiteral';
  elements: ASTNode[];
  frozen?: boolean;
  line: number;
}

export interface SliceExpr {
  type: 'SliceExpr';
  object: ASTNode;
  start?: ASTNode;
  stop?: ASTNode;
  step?: ASTNode;
  line: number;
}

export interface StarExpr {
  type: 'StarExpr';
  operand: ASTNode;
  double: boolean;
  line: number;
}

export interface KeywordArg {
  type: 'KeywordArg';
  name: string;
  value: ASTNode;
  line: number;
}

export interface WalrusExpr {
  type: 'WalrusExpr';
  name: string;
  value: ASTNode;
  line: number;
}

export interface ComprehensionClause {
  variable: string | string[];
  iterable: ASTNode;
  conditions: ASTNode[];
  isAsync?: boolean;
}

export interface ComprehensionExpr {
  type: 'ComprehensionExpr';
  form: 'list' | 'set' | 'dict' | 'gen';
  element: ASTNode;
  valueExpr?: ASTNode; // dict comprehension value
  clauses: ComprehensionClause[];
  line: number;
}

export interface EmitExpr {
  type: 'EmitExpr';
  value?: ASTNode;
  delegate: boolean;
  line: number;
}

export interface WithItem {
  expr: ASTNode;
  alias?: string;
}

export interface WithStatement {
  type: 'WithStatement';
  items: WithItem[];
  body: BlockStatement;
  isAsync?: boolean;
  line: number;
}

export type PatternNode =
  | { type: 'PatWildcard'; line: number }
  | { type: 'PatCapture'; name: string; pattern?: PatternNode; line: number }
  | { type: 'PatLiteral'; value: ASTNode; line: number }
  | { type: 'PatValue'; expr: ASTNode; line: number }
  | { type: 'PatSequence'; elements: PatternNode[]; restIndex?: number; restName?: string; line: number }
  | { type: 'PatMapping'; entries: { key: ASTNode; pattern: PatternNode }[]; restName?: string; line: number }
  | { type: 'PatClass'; className: string; positional: PatternNode[]; keywords: { name: string; pattern: PatternNode }[]; line: number }
  | { type: 'PatOr'; options: PatternNode[]; line: number };

export interface MatchCase {
  pattern: PatternNode;
  guard?: ASTNode;
  body: BlockStatement;
}

export interface MatchStatement {
  type: 'MatchStatement';
  subject: ASTNode;
  cases: MatchCase[];
  line: number;
}

export interface RaiseStatement {
  type: 'RaiseStatement';
  error?: ASTNode;
  cause?: ASTNode;
  line: number;
}

export interface AssertStatement {
  type: 'AssertStatement';
  condition: ASTNode;
  message?: ASTNode;
  line: number;
}

export interface DelStatement {
  type: 'DelStatement';
  targets: ASTNode[];
  line: number;
}

export interface ScopeStatement {
  type: 'ScopeStatement';
  scope: 'global' | 'nonlocal';
  names: string[];
  line: number;
}

export interface PassStatement {
  type: 'PassStatement';
  line: number;
}

export interface ImportStatement {
  type: 'ImportStatement';
  module: string;
  alias?: string;
  /** `from mod import a as b, c` */
  names?: { name: string; alias?: string }[];
  isFrom: boolean;
  line: number;
}

export interface AugAssignStatement {
  type: 'AugAssignStatement';
  target: ASTNode;
  operator: string;
  value: ASTNode;
  line: number;
}

export interface ExceptHandler {
  types: ASTNode[];
  alias?: string;
  body: BlockStatement;
  /** except* group handler */
  star?: boolean;
}
