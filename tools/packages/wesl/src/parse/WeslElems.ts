import type { Span } from "mini-parse";
import type { ImportElem } from "./ImportElems.ts";
import type { DirectiveElem } from "./DirectiveElem.ts";
import { ExpressionElem, TemplatedIdentElem } from "./ExpressionElem.ts";

/** A name is either a string, or refers to an entry in the symbols table. */
// export type SymbolReference = string | number;

/** a name that doesn't need to be an Ident
 * e.g.
 * - a struct member name
 * - a diagnostic rule name
 * - an enable-extension name
 * - an interpolation sampling name
 */
export interface NameElem {
  kind: "name";
  name: string;
  span: Span;
}

/**
 * Either a single ident `foo`, or a qualified ident, like `package::foo::bar`
 *
 * Implementation detail: We only treat imports with 2 or more elements as a possible package reference.
 */
export interface FullIdent {
  segments: string[];
  span: Span;
}

/** an identifier declaration */
export interface DeclIdent {
  /** Null before the symbols table pass */
  symbolRef: number | null;
  name: string;
  span: Span;
}

/** a wesl module */
export interface ModuleElem {
  kind: "module";

  /** imports found in this module */
  imports: ImportElem[];

  /** directives found in this module */
  directives: DirectiveElem[];

  /** declarations found in this module */
  declarations: GlobalDeclarationElem[];
}

export type GlobalDeclarationElem =
  | AliasElem
  | ConstAssertElem
  | DeclarationElem
  | FunctionDeclarationElem
  | StructElem;

interface GlobalDeclarationBase {
  kind: GlobalDeclarationElem["kind"];
  span: Span;
  attributes?: AttributeElem[];
}

/** an alias statement */
export interface AliasElem extends GlobalDeclarationBase {
  kind: "alias";
  name: DeclIdent;
  type: TemplatedIdentElem;
}

/** a const_assert statement */
export interface ConstAssertElem extends GlobalDeclarationBase {
  kind: "assert";
  expression: ExpressionElem;
}

/** a var/let/const/override declaration. Can also be used as a normal statement. */
export interface DeclarationElem extends GlobalDeclarationBase {
  kind: "declaration";
  variant: DeclarationVariant;
  name: DeclIdent;
  type?: TemplatedIdentElem;
  initializer?: ExpressionElem;
}

export type DeclarationVariant =
  | { kind: "const" }
  | { kind: "override" }
  | { kind: "let" }
  | { kind: "var"; template?: ExpressionElem[] };

/** a function declaration */
export interface FunctionDeclarationElem extends GlobalDeclarationBase {
  kind: "function";
  name: DeclIdent;
  params: FunctionParam[];
  returnAttributes?: AttributeElem[];
  returnType?: TemplatedIdentElem;
  body: CompoundStatement;
}
export interface FunctionParam {
  attributes?: AttributeElem[];
  name: DeclIdent;
  type: TemplatedIdentElem;
}

/** a struct declaration */
export interface StructElem extends GlobalDeclarationBase {
  kind: "struct";
  name: DeclIdent;
  members: StructMemberElem[];
  span: Span;
  bindingStruct?: true; // used later during binding struct transformation
}

/** a member of a struct declaration */
export interface StructMemberElem {
  name: NameElem;
  type: TemplatedIdentElem;
  attributes?: AttributeElem[];
  mangledVarName?: string; // root name if transformed to a var (for binding struct transformation)
}

/** an attribute like '@compute' or '@binding(0)' */
export interface AttributeElem {
  kind: "attribute";
  attribute: Attribute;
  span: Span;
}

export type Attribute =
  | StandardAttribute
  | InterpolateAttribute
  | BuiltinAttribute
  | DiagnosticAttribute
  | IfAttribute;

export interface StandardAttribute {
  kind: "attribute";
  name: string;
  params: ExpressionElem[];
}

export interface InterpolateAttribute {
  kind: "@interpolate";
  params: NameElem[];
}

export interface BuiltinAttribute {
  kind: "@builtin";
  param: NameElem;
}

export interface DiagnosticAttribute {
  kind: "@diagnostic";
  severity: NameElem;
  rule: [NameElem, NameElem | null];
}

export interface IfAttribute {
  kind: "@if";
  param: ConditionalExpressionElem;
}

/** For conditional compilation */
export interface ConditionalExpressionElem {
  kind: "translate-time-expression";
  expression: ExpressionElem;
  span: Span;
}

export type Statement =
  | ForStatement
  | IfStatement
  | LoopStatement
  | SwitchStatement
  | WhileStatement
  | CompoundStatement
  | FunctionCallStatement
  | DeclarationElem
  | AssignmentStatement
  | PostfixStatement
  | BreakStatement
  | ContinueStatement
  | DiscardStatement
  | ReturnStatement
  | ConstAssertElem;

interface StatementBase {
  kind: Statement["kind"];
  attributes?: AttributeElem[];
  span: Span;
}

/** for(let i = 0; i < 10; i++) { } */
export interface ForStatement extends StatementBase {
  kind: "for-statement";
  initializer?: ForInitStatement;
  condition?: ExpressionElem;
  update?: ForUpdateStatement;
  body: CompoundStatement;
}

export type ForInitStatement =
  | FunctionCallStatement
  | DeclarationElem
  | AssignmentStatement
  | PostfixStatement;

export type ForUpdateStatement =
  | FunctionCallStatement
  | AssignmentStatement
  | PostfixStatement;

/** if(1 == 1) { } */
export interface IfStatement extends StatementBase {
  kind: "if-else-statement";
  main: IfClause;
}

/** A clause in an if statement (`if`, `else if`, `else`), without attributes. */
export interface IfClause {
  kind: "if-clause";
  condition: ExpressionElem;
  accept: CompoundStatement;
  reject?: IfClause | CompoundStatement;
}

export interface LoopStatement extends StatementBase {
  kind: "loop-statement";
  body: CompoundStatement;
  /** Last element in the body */
  continuing?: ContinuingStatement;
}

export interface ContinuingStatement {
  kind: "continuing-statement";
  attributes?: AttributeElem[];
  body: CompoundStatement;
  /** Last element in the body */
  breakIf?: BreakIfStatement;
  span: Span;
}

export interface BreakIfStatement {
  kind: "break-if-statement";
  attributes?: AttributeElem[];
  expression: ExpressionElem;
  span: Span;
}

export interface SwitchStatement extends StatementBase {
  kind: "switch-statement";
  selector: ExpressionElem;
  bodyAttributes?: AttributeElem[];
  clauses: SwitchClause[];
}
/**
 * `case foo: {}` or `default: {}`.
 * A `default:` is modeled as a `case default:`
 */
export interface SwitchClause {
  attributes?: AttributeElem[];
  cases: SwitchCaseSelector[];
  body: CompoundStatement;
  span: Span;
}
export type SwitchCaseSelector = ExpressionCaseSelector | DefaultCaseSelector;
export interface ExpressionCaseSelector {
  expression: ExpressionElem;
}
export interface DefaultCaseSelector {
  expression: "default";
  span: Span;
}

export interface WhileStatement extends StatementBase {
  kind: "while-statement";
  condition: ExpressionElem;
  body: CompoundStatement;
}

export interface CompoundStatement extends StatementBase {
  kind: "compound-statement";
  body: Statement[];
}

/** `foo(arg, arg);` */
export interface FunctionCallStatement extends StatementBase {
  kind: "call-statement";
  function: TemplatedIdentElem;
  arguments: ExpressionElem[];
}

export interface AssignmentStatement extends StatementBase {
  kind: "assignment-statement";
  left: LhsExpression | LhsDiscard;
  operator: AssignmentOperator;
  right: ExpressionElem;
}

export interface AssignmentOperator {
  value:
    | ("=" | "<<=" | ">>=" | "%=" | "&=")
    | ("*=" | "+=" | "-=" | "/=" | "^=" | "|=");
  span: Span;
}

export interface PostfixStatement extends StatementBase {
  kind: "postfix-statement";
  operator: PostfixOperator;
  expression: LhsExpression;
}

export interface PostfixOperator {
  value: "++" | "--";
  span: Span;
}

export interface BreakStatement extends StatementBase {
  kind: "break-statement";
}

export interface ContinueStatement extends StatementBase {
  kind: "continue-statement";
}

export interface DiscardStatement extends StatementBase {
  kind: "discard-statement";
}

export interface ReturnStatement extends StatementBase {
  kind: "return-statement";
  expression?: ExpressionElem;
}

export interface LhsDiscard {
  kind: "discard-expression";
  span: Span;
}

export type LhsExpression =
  | LhsUnaryExpression
  | LhsComponentExpression
  | LhsComponentMemberExpression
  | LhsParenthesizedExpression
  | LhsIdentElem;

/** Analogous to the {@link TemplatedIdentElem} */
export interface LhsIdentElem {
  kind: "lhs-ident";
  symbolRef: null | number;
  name: FullIdent;
}

/** (expr) */
export interface LhsParenthesizedExpression {
  kind: "parenthesized-expression";
  expression: LhsExpression;
}
/** `foo[expr]` */
export interface LhsComponentExpression {
  kind: "component-expression";
  base: LhsExpression;
  access: ExpressionElem;
}
/** `foo.member` */
export interface LhsComponentMemberExpression {
  kind: "component-member-expression";
  base: LhsExpression;
  access: NameElem;
}
/** `+foo` */
export interface LhsUnaryExpression {
  kind: "unary-expression";
  operator: LhsUnaryOperator;
  expression: LhsExpression;
}
export interface LhsUnaryOperator {
  value: "&" | "*";
  span: Span;
}
