import type { Span } from "mini-parse";
import type { DeclIdent, RefIdent, SrcModule } from "./Scope.ts";
import type { ImportElem } from "./parse/ImportElems.ts";
import type { DirectiveElem } from "./parse/DirectiveElem.ts";
import { ExpressionElem, TemplatedIdentElem } from "./parse/ExpressionElem.ts";

/**
 * Structures to describe the 'interesting' parts of a WESL source file.
 *
 * The parts of the source that need to analyze further in the linker
 * are pulled out into these structures.
 *
 * The parts that are uninteresting the the linker are recorded
 * as 'TextElem' nodes, which are generally just copied to the output WGSL
 * along with their containing element.
 */
export type AbstractElem = GrammarElem | SyntheticElem;

export type GrammarElem = ContainerElem | TerminalElem;

export type ContainerElem =
  | AttributeElem
  | ConstAssertElem
  | FunctionDeclarationElem
  | TypedDeclElem
  | FnParamElem
  | StructElem
  | StructMemberElem
  | StuffElem
  | TypeRefElem;
export type TerminalElem =
  | DeclIdentElem //
  | NameElem
  | RefIdentElem;

/* ------   OLD ELEMENTS  ------   */

/* ------   Terminal Elements  (don't contain other elements)  ------   */
/** an identifier that refers to a declaration (aka a symbol reference) */
export interface RefIdentElem extends AbstractElemBase {
  kind: RefIdent["kind"];
  ident: RefIdent;
  srcModule: SrcModule;
}

/** a declaration identifier (aka a symbol declaration) */
export interface DeclIdentElem extends AbstractElemBase {
  kind: DeclIdent["kind"];
  ident: DeclIdent;
  srcModule: SrcModule;
}

export interface AbstractElemBase {
  kind: string;
  span: Span;
}

export interface ElemWithContentsBase extends AbstractElemBase {
  contents: AbstractElem[];
}
/** generated element, produced after parsing and binding */
export interface SyntheticElem {
  kind: "synthetic";
  text: string;
}

/** a declaration identifer with a possible type */
export interface TypedDeclElem extends ElemWithContentsBase {
  kind: "typeDecl";
  decl: DeclIdentElem;
  typeRef?: TypeRefElem; // TODO Consider a variant for fn params and alias where typeRef is required
}

/** a parameter in a function declaration */
export interface FnParamElem extends ElemWithContentsBase {
  kind: "param";
  name: TypedDeclElem;
  attributes: AttributeElem[];
}

/** generic container of other elements */
export interface StuffElem extends ElemWithContentsBase {
  kind: "stuff";
}

/** a struct declaration that's been marked as a bindingStruct */
export interface BindingStructElem extends StructElem {
  bindingStruct: true;
  entryFn?: FunctionDeclarationElem;
}

export type TypeTemplateParameter = ExpressionElem;

/** a reference to a type, like 'f32', or 'MyStruct', or 'ptr<storage, array<f32>, read_only>'   */
export interface TypeRefElem extends ElemWithContentsBase {
  kind: "type";
  name: RefIdent;
  templateParams?: TypeTemplateParameter[];
}

// TODO: Remove the above ^^^^

/** a name that doesn't need to be an Ident
 * e.g.
 * - a struct member name
 * - a diagnostic rule name
 * - an enable-extension name
 * - an interpolation sampling name
 * - a translate time feature
 */
export interface NameElem {
  kind: "name";
  name: string;
  span: Span;
}

/** an identifier */
export interface IdentElem {
  kind: "ident";
  name: string;
  span: Span;
  scopeIdent?: DeclIdent | RefIdent;
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
  name: IdentElem;
  type: TemplatedIdentElem;
}

/** a const_assert statement */
export interface ConstAssertElem extends GlobalDeclarationBase {
  kind: "assert";
  expression: ExpressionElem;
}

/** a var/let/const/override declaration */
export interface DeclarationElem extends GlobalDeclarationBase {
  kind: "declaration";
  variant: DeclarationVariant;
  name: IdentElem;
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
  name: IdentElem;
  params: FunctionParam[];
  returnAttributes?: AttributeElem[];
  returnType?: TemplatedIdentElem;
  body: CompoundStatement;
}
export interface FunctionParam {
  attributes?: AttributeElem[];
  name: IdentElem;
  type: TemplatedIdentElem;
}

/** a struct declaration */
export interface StructElem extends GlobalDeclarationBase {
  kind: "struct";
  name: IdentElem;
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
  param: TranslateTimeExpressionElem;
}

export interface TranslateTimeExpressionElem {
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
  | IncrementStatement
  | DecrementStatement
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
  initializer?: Statement;
  condition?: ExpressionElem;
  update?: Statement;
  body: CompoundStatement;
}

/** if(1 == 1) { } */
export interface IfStatement extends StatementBase {
  kind: "if-else-statement";
  main: IfClause;
}

/** A clause in an if statement (`if`, `else if`, `else`), without attributes. */
export interface IfClause {
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

export interface IncrementStatement extends StatementBase {
  kind: "increment-statement";
  expression: LhsExpression;
}

export interface DecrementStatement extends StatementBase {
  kind: "decrement-statement";
  expression: LhsExpression;
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

/** Analogous to the `TemplatedIdentElem` */
export interface LhsIdentElem {
  kind: "lhs-ident";
  name: IdentElem;
  path?: IdentElem[];
  span: Span;
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
