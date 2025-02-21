import type { Span } from "mini-parse";
import type { DeclIdent, RefIdent, SrcModule } from "./Scope.ts";
import type { ImportElem } from "./parse/ImportElems.ts";
import type { DirectiveElem } from "./parse/DirectiveElem.ts";
import { ExpressionElem } from "./parse/ExpressionElem.ts";

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
  | AliasElem
  | ConstAssertElem
  | ConstElem
  | UnknownExpressionElem
  | SimpleMemberRef
  | FnElem
  | TypedDeclElem
  | GlobalVarElem
  | LetElem
  | ModuleElem
  | OverrideElem
  | FnParamElem
  | StructElem
  | StructMemberElem
  | StuffElem
  | TypeRefElem
  | VarElem;

export type TerminalElem =
  | DeclIdentElem //
  | NameElem
  | RefIdentElem
  | TextElem;

export type DeclarationElem = GlobalDeclarationElem | FnParamElem | VarElem;

export interface AbstractElemBase {
  kind: AbstractElem["kind"];
  span: Span;
}

export interface ElemWithContentsBase extends AbstractElemBase {
  contents: AbstractElem[];
}

/* ------   Terminal Elements  (don't contain other elements)  ------   */

/**
 * a raw bit of text in WESL source that's typically copied to the linked WGSL.
 * e.g. a keyword  like 'var'
 * or a phrase we needn't analyze further like '@diagnostic(off,derivative_uniformity)'
 */
export interface TextElem extends AbstractElemBase {
  kind: "text";
  text: string;
}

/** a name that doesn't need to be an Ident
 * e.g.
 * - a struct member name
 * - a diagnostic rule name
 * - an enable-extension name
 * - an interpolation sampling name
 * - a translate time feature
 */
export interface NameElem extends AbstractElemBase {
  kind: "name";
  name: string;
}

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

/** a wesl module */
export interface ModuleElem extends ElemWithContentsBase {
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
  | ConstElem
  | FnElem
  | GlobalVarElem
  | OverrideElem
  | StructElem;

interface GlobalDeclarationBase {
  kind: GlobalDeclarationElem["kind"];
  span: Span;
  attributes?: AttributeElem[];
}

/** an alias statement */
export interface AliasElem extends ElemWithContentsBase, GlobalDeclarationBase {
  kind: "alias";
  name: DeclIdentElem;
  typeRef: TypeRefElem;
  attributes: AttributeElem[];
}

/** a const_assert statement */
export interface ConstAssertElem
  extends ElemWithContentsBase,
    GlobalDeclarationBase {
  kind: "assert";
}

/** a const declaration */
export interface ConstElem extends ElemWithContentsBase, GlobalDeclarationBase {
  kind: "const";
  name: TypedDeclElem;
}

/** a function declaration */
export interface FnElem extends ElemWithContentsBase, GlobalDeclarationBase {
  kind: "fn";
  name: DeclIdentElem;
  params: FnParamElem[];
  returnType?: TypeRefElem;
  body: Statement[];
  // TODO: Model everything
}

/** a global variable declaration (at the root level) */
export interface GlobalVarElem
  extends ElemWithContentsBase,
    GlobalDeclarationBase {
  kind: "gvar";
  name: TypedDeclElem;
}

/** an override declaration */
export interface OverrideElem
  extends ElemWithContentsBase,
    GlobalDeclarationBase {
  kind: "override";
  name: TypedDeclElem;
}

/** a struct declaration */
export interface StructElem
  extends ElemWithContentsBase,
    GlobalDeclarationBase {
  kind: "struct";
  name: DeclIdentElem;
  members: StructMemberElem[];
  bindingStruct?: true; // used later during binding struct transformation
  attributes: AttributeElem[];
}

/** a member of a struct declaration */
export interface StructMemberElem extends ElemWithContentsBase {
  kind: "member";
  name: NameElem;
  attributes?: AttributeElem[];
  typeRef: TypeRefElem;
  mangledVarName?: string; // root name if transformed to a var (for binding struct transformation)
}

/* ------   Synthetic element (for transformations, not produced by grammar) ------   */

/** generated element, produced after parsing and binding */
export interface SyntheticElem {
  kind: "synthetic";
  text: string;
}

/* ------   Container Elements  (contain other elements)  ------   */

/** a declaration identifer with a possible type */
export interface TypedDeclElem extends ElemWithContentsBase {
  kind: "typeDecl";
  decl: DeclIdentElem;
  typeRef?: TypeRefElem; // TODO Consider a variant for fn params and alias where typeRef is required
}

/** an attribute like '@compute' or '@binding(0)' */
export interface AttributeElem extends ElemWithContentsBase {
  kind: "attribute";
  attribute: Attribute;
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
  params: UnknownExpressionElem[];
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

export interface UnknownExpressionElem extends ElemWithContentsBase {
  kind: "expression";
}

export interface TranslateTimeExpressionElem {
  kind: "translate-time-expression";
  expression: ExpressionElem;
  span: Span;
}

/** a parameter in a function declaration */
export interface FnParamElem extends ElemWithContentsBase {
  kind: "param";
  name: TypedDeclElem;
  attributes: AttributeElem[];
}

/** simple references to structures, like myStruct.bar
 * (used for transforming refs to binding structs) */
export interface SimpleMemberRef extends ElemWithContentsBase {
  kind: "memberRef";
  name: RefIdentElem;
  member: NameElem;
  extraComponents?: StuffElem;
}

/** generic container of other elements */
export interface StuffElem extends ElemWithContentsBase {
  kind: "stuff";
}

/** a struct declaration that's been marked as a bindingStruct */
export interface BindingStructElem extends StructElem {
  bindingStruct: true;
  entryFn?: FnElem;
}

export type TypeTemplateParameter = TypeRefElem | UnknownExpressionElem;

/** a reference to a type, like 'f32', or 'MyStruct', or 'ptr<storage, array<f32>, read_only>'   */
export interface TypeRefElem extends ElemWithContentsBase {
  kind: "type";
  name: RefIdent;
  templateParams?: TypeTemplateParameter[];
}

export type Statement =
  | ForStatement
  | IfStatement
  | LoopStatement
  | SwitchStatement
  | WhileStatement
  | CompoundStatement
  | FunctionCallStatement
  | VarStatement
  | LetStatement
  | ConstElem
  | VariableUpdatingStatement
  | BreakStatement
  | ContinueStatement
  | DiscardStatement
  | ReturnStatement
  | ConstAssertElem;

interface StatementBase {
  kind: Statement["kind"];
  attributes: AttributeElem[];
  span: Span;
}

/** a variable declaration */
export interface VarElem extends ElemWithContentsBase {
  kind: "var";
  name: TypedDeclElem;
}

export interface LetElem extends ElemWithContentsBase {
  kind: "let";
  name: TypedDeclElem;
}

/** for(let i = 0; i < 10; i++) { } */
export interface ForStatement extends StatementBase {
  kind: "for-statement";
  // TODO:
  body: Statement[];
}

/** if(1 == 1) { } */
export interface IfStatement extends StatementBase {
  kind: "if-else-statement";
  condition: ExpressionElem;
  accept: CompoundStatement;
  reject: IfStatement | CompoundStatement;
}

export interface LoopStatement extends StatementBase {
  kind: "loop-statement";
  // TODO:
}

export interface SwitchStatement extends StatementBase {
  kind: "switch-statement";
  selector: ExpressionElem;
  cases: SwitchCase;
}
/**
 * `case foo: {}` or `default: {}`.
 * A `default:` is modeled as a `case default:`
 */
export interface SwitchCase {
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
}

export interface CompoundStatement extends StatementBase {
  kind: "compound-statement";
  body: Statement[];
}

/** `foo(arg, arg);` */
export interface FunctionCallStatement extends StatementBase {
  kind: "call-statement";
  function: RefIdentElem;
  arguments: ExpressionElem[];
}

type VarStatement = VarElem;
type LetStatement = LetElem;

export interface VariableUpdatingStatement extends StatementBase {
  kind: "variable-updating-statement";
  // TODO:
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

export type LhsExpression =
  | LhsUnaryExpression
  | LhsComponentExpression
  | LhsComponentMemberExpression
  | LhsParenthesizedExpression
  | DeclIdentElem;

/** (expr) */
export interface LhsParenthesizedExpression {
  kind: "parenthesized-expression";
  expression: LhsExpression;
}
/** `foo[expr]` */
export interface LhsComponentExpression {
  kind: "component-expression";
  base: LhsExpression;
  access: LhsExpression;
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
