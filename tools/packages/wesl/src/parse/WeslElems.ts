import type { Span } from "mini-parse";
import type { ImportElem } from "./ImportElems.ts";
import type { DirectiveElem } from "./DirectiveElem.ts";
import { ExpressionElem, TemplatedIdentElem } from "./ExpressionElem.ts";

export interface Transform {
  /**
   * A symbol will be a string when it's returned by the parser.
   * The scopes pass turns it into a number into a symbols array.
   */
  symbolRef: number | null;
}

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

/** Either a single ident `foo`, or a qualified ident, like `package::foo::bar` */
export interface FullIdent {
  segments: string[];
  span: Span;
}

/** an identifier declaration */
export interface DeclIdent<T extends Transform> {
  symbolRef: T["symbolRef"];
  name: string;
  span: Span;
}

/** a wesl module */
export interface ModuleElem<T extends Transform> {
  kind: "module";

  /** imports found in this module */
  imports: ImportElem<T>[];

  /** directives found in this module */
  directives: DirectiveElem<T>[];

  /** declarations found in this module */
  declarations: GlobalDeclarationElem<T>[];
}

export type GlobalDeclarationElem<T extends Transform> =
  | AliasElem<T>
  | ConstAssertElem<T>
  | DeclarationElem<T>
  | FunctionDeclarationElem<T>
  | StructElem<T>;

interface GlobalDeclarationBase<T extends Transform> {
  kind: GlobalDeclarationElem<any>["kind"];
  span: Span;
  attributes?: AttributeElem<T>[];
}

/** an alias statement */
export interface AliasElem<T extends Transform>
  extends GlobalDeclarationBase<T> {
  kind: "alias";
  name: DeclIdent<T>;
  type: TemplatedIdentElem<T>;
}

/** a const_assert statement */
export interface ConstAssertElem<T extends Transform>
  extends GlobalDeclarationBase<T> {
  kind: "assert";
  expression: ExpressionElem<T>;
}

/** a var/let/const/override declaration. Can also be used as a normal statement. */
export interface DeclarationElem<T extends Transform>
  extends GlobalDeclarationBase<T> {
  kind: "declaration";
  variant: DeclarationVariant<T>;
  name: DeclIdent<T>;
  type?: TemplatedIdentElem<T>;
  initializer?: ExpressionElem<T>;
}

export type DeclarationVariant<T extends Transform> =
  | { kind: "const" }
  | { kind: "override" }
  | { kind: "let" }
  | { kind: "var"; template?: ExpressionElem<T>[] };

/** a function declaration */
export interface FunctionDeclarationElem<T extends Transform>
  extends GlobalDeclarationBase<T> {
  kind: "function";
  name: DeclIdent<T>;
  params: FunctionParam<T>[];
  returnAttributes?: AttributeElem<T>[];
  returnType?: TemplatedIdentElem<T>;
  body: CompoundStatement<T>;
}
export interface FunctionParam<T extends Transform> {
  attributes?: AttributeElem<T>[];
  name: DeclIdent<T>;
  type: TemplatedIdentElem<T>;
}

/** a struct declaration */
export interface StructElem<T extends Transform>
  extends GlobalDeclarationBase<T> {
  kind: "struct";
  name: DeclIdent<T>;
  members: StructMemberElem<T>[];
  span: Span;
  bindingStruct?: true; // used later during binding struct transformation
}

/** a member of a struct declaration */
export interface StructMemberElem<T extends Transform> {
  name: NameElem;
  type: TemplatedIdentElem<T>;
  attributes?: AttributeElem<T>[];
  mangledVarName?: string; // root name if transformed to a var (for binding struct transformation)
}

/** an attribute like '@compute' or '@binding(0)' */
export interface AttributeElem<T extends Transform> {
  kind: "attribute";
  attribute: Attribute<T>;
  span: Span;
}

export type Attribute<T extends Transform> =
  | StandardAttribute<T>
  | InterpolateAttribute
  | BuiltinAttribute
  | DiagnosticAttribute
  | IfAttribute;

export interface StandardAttribute<T extends Transform> {
  kind: "attribute";
  name: string;
  params: ExpressionElem<T>[];
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

export interface ConditionalT extends Transform {
  symbolRef: null;
}
/** For conditional compilation */
export interface ConditionalExpressionElem {
  kind: "translate-time-expression";
  expression: ExpressionElem<ConditionalT>;
  span: Span;
}

export type Statement<T extends Transform> =
  | ForStatement<T>
  | IfStatement<T>
  | LoopStatement<T>
  | SwitchStatement<T>
  | WhileStatement<T>
  | CompoundStatement<T>
  | FunctionCallStatement<T>
  | DeclarationElem<T>
  | AssignmentStatement<T>
  | PostfixStatement<T>
  | BreakStatement<T>
  | ContinueStatement<T>
  | DiscardStatement<T>
  | ReturnStatement<T>
  | ConstAssertElem<T>;

interface StatementBase<T extends Transform> {
  kind: Statement<any>["kind"];
  attributes?: AttributeElem<T>[];
  span: Span;
}

/** for(let i = 0; i < 10; i++) { } */
export interface ForStatement<T extends Transform> extends StatementBase<T> {
  kind: "for-statement";
  initializer?: ForInitStatement<T>;
  condition?: ExpressionElem<T>;
  update?: ForUpdateStatement<T>;
  body: CompoundStatement<T>;
}

export type ForInitStatement<T extends Transform> =
  | FunctionCallStatement<T>
  | DeclarationElem<T>
  | AssignmentStatement<T>
  | PostfixStatement<T>;

export type ForUpdateStatement<T extends Transform> =
  | FunctionCallStatement<T>
  | AssignmentStatement<T>
  | PostfixStatement<T>;

/** if(1 == 1) { } */
export interface IfStatement<T extends Transform> extends StatementBase<T> {
  kind: "if-else-statement";
  main: IfClause<T>;
}

/** A clause in an if statement (`if`, `else if`, `else`), without attributes. */
export interface IfClause<T extends Transform> {
  kind: "if-clause";
  condition: ExpressionElem<T>;
  accept: CompoundStatement<T>;
  reject?: IfClause<T> | CompoundStatement<T>;
}

export interface LoopStatement<T extends Transform> extends StatementBase<T> {
  kind: "loop-statement";
  body: CompoundStatement<T>;
  /** Last element in the body */
  continuing?: ContinuingStatement<T>;
}

export interface ContinuingStatement<T extends Transform> {
  kind: "continuing-statement";
  attributes?: AttributeElem<T>[];
  body: CompoundStatement<T>;
  /** Last element in the body */
  breakIf?: BreakIfStatement<T>;
  span: Span;
}

export interface BreakIfStatement<T extends Transform> {
  kind: "break-if-statement";
  attributes?: AttributeElem<T>[];
  expression: ExpressionElem<T>;
  span: Span;
}

export interface SwitchStatement<T extends Transform> extends StatementBase<T> {
  kind: "switch-statement";
  selector: ExpressionElem<T>;
  bodyAttributes?: AttributeElem<T>[];
  clauses: SwitchClause<T>[];
}
/**
 * `case foo: {}` or `default: {}`.
 * A `default:` is modeled as a `case default:`
 */
export interface SwitchClause<T extends Transform> {
  attributes?: AttributeElem<T>[];
  cases: SwitchCaseSelector<T>[];
  body: CompoundStatement<T>;
  span: Span;
}
export type SwitchCaseSelector<T extends Transform> =
  | ExpressionCaseSelector<T>
  | DefaultCaseSelector;
export interface ExpressionCaseSelector<T extends Transform> {
  expression: ExpressionElem<T>;
}
export interface DefaultCaseSelector {
  expression: "default";
  span: Span;
}

export interface WhileStatement<T extends Transform> extends StatementBase<T> {
  kind: "while-statement";
  condition: ExpressionElem<T>;
  body: CompoundStatement<T>;
}

export interface CompoundStatement<T extends Transform>
  extends StatementBase<T> {
  kind: "compound-statement";
  body: Statement<T>[];
}

/** `foo(arg, arg);` */
export interface FunctionCallStatement<T extends Transform>
  extends StatementBase<T> {
  kind: "call-statement";
  function: TemplatedIdentElem<T>;
  arguments: ExpressionElem<T>[];
}

export interface AssignmentStatement<T extends Transform>
  extends StatementBase<T> {
  kind: "assignment-statement";
  left: LhsExpression<T> | LhsDiscard;
  operator: AssignmentOperator;
  right: ExpressionElem<T>;
}

export interface AssignmentOperator {
  value:
    | ("=" | "<<=" | ">>=" | "%=" | "&=")
    | ("*=" | "+=" | "-=" | "/=" | "^=" | "|=");
  span: Span;
}

export interface PostfixStatement<T extends Transform>
  extends StatementBase<T> {
  kind: "postfix-statement";
  operator: PostfixOperator;
  expression: LhsExpression<T>;
}

export interface PostfixOperator {
  value: "++" | "--";
  span: Span;
}

export interface BreakStatement<T extends Transform> extends StatementBase<T> {
  kind: "break-statement";
}

export interface ContinueStatement<T extends Transform>
  extends StatementBase<T> {
  kind: "continue-statement";
}

export interface DiscardStatement<T extends Transform>
  extends StatementBase<T> {
  kind: "discard-statement";
}

export interface ReturnStatement<T extends Transform> extends StatementBase<T> {
  kind: "return-statement";
  expression?: ExpressionElem<T>;
}

export interface LhsDiscard {
  kind: "discard-expression";
  span: Span;
}

export type LhsExpression<T extends Transform> =
  | LhsUnaryExpression<T>
  | LhsComponentExpression<T>
  | LhsComponentMemberExpression<T>
  | LhsParenthesizedExpression<T>
  | LhsIdentElem<T>;

/** Analogous to the `TemplatedIdentElem` */
export interface LhsIdentElem<T extends Transform> {
  kind: "lhs-ident";
  symbolRef: T["symbolRef"];
  name: FullIdent;
}

/** (expr) */
export interface LhsParenthesizedExpression<T extends Transform> {
  kind: "parenthesized-expression";
  expression: LhsExpression<T>;
}
/** `foo[expr]` */
export interface LhsComponentExpression<T extends Transform> {
  kind: "component-expression";
  base: LhsExpression<T>;
  access: ExpressionElem<T>;
}
/** `foo.member` */
export interface LhsComponentMemberExpression<T extends Transform> {
  kind: "component-member-expression";
  base: LhsExpression<T>;
  access: NameElem;
}
/** `+foo` */
export interface LhsUnaryExpression<T extends Transform> {
  kind: "unary-expression";
  operator: LhsUnaryOperator;
  expression: LhsExpression<T>;
}
export interface LhsUnaryOperator {
  value: "&" | "*";
  span: Span;
}
