import type { DeclIdent, RefIdent, Scope, SrcModule } from "./Scope.ts";
import type { Span } from "./Span.ts";

/**
 * AST structures describing 'interesting' parts of WESL source.
 *
 * Parts needing further analysis are pulled into these structures.
 * Uninteresting parts are 'TextElem' nodes, copied to output WGSL.
 */
export type AbstractElem = GrammarElem | SyntheticElem | ExpressionElem;

export type GrammarElem = ContainerElem | TerminalElem;

export type ContainerElem =
  | AttributeElem
  | AliasElem
  | ConstAssertElem
  | ConstElem
  | ContinuingElem
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
  | VarElem
  | StatementElem
  | SwitchClauseElem;

/** Map from element kind string to element type, for type-safe element construction. */
export type ElemKindMap = {
  alias: AliasElem;
  assert: ConstAssertElem;
  const: ConstElem;
  continuing: ContinuingElem;
  gvar: GlobalVarElem;
  let: LetElem;
  member: StructMemberElem;
  override: OverrideElem;
  param: FnParamElem;
  statement: StatementElem;
  struct: StructElem;
  "switch-clause": SwitchClauseElem;
  type: TypeRefElem;
  var: VarElem;
};

/** Inspired by https://github.com/wgsl-tooling-wg/wesl-rs/blob/3b2434eac1b2ebda9eb8bfb25f43d8600d819872/crates/wgsl-parse/src/syntax.rs#L364 */
export type ExpressionElem =
  | Literal
  | TranslateTimeFeature // LATER remove once V1 parser is removed
  | RefIdentElem
  | TypeRefElem // template_elaborated_ident is a primary_expression
  | ParenthesizedExpression
  | ComponentExpression
  | ComponentMemberExpression
  | UnaryExpression
  | BinaryExpression
  | FunctionCallExpression;

export type TerminalElem =
  | DirectiveElem
  | DeclIdentElem //
  | NameElem
  | RefIdentElem
  | TextElem
  | ImportElem;

export type GlobalDeclarationElem =
  | AliasElem
  | ConstElem
  | FnElem
  | GlobalVarElem
  | OverrideElem
  | StructElem;

export type DeclarationElem =
  | GlobalDeclarationElem
  | FnParamElem
  | VarElem
  | LetElem;

export type ElemWithAttributes = Extract<AbstractElem, HasAttributes>;

export interface AbstractElemBase {
  kind: AbstractElem["kind"];
  start: number;
  end: number;
}

export interface ElemWithContentsBase extends AbstractElemBase {
  contents: AbstractElem[];
}

export interface HasAttributes {
  attributes?: AttributeElem[];
}

/* ------   Terminal Elements  (don't contain other elements)  ------   */

/** Raw text copied to linked WGSL (e.g., 'var' or '@diagnostic(off,derivative_uniformity)'). */
export interface TextElem extends AbstractElemBase {
  kind: "text";
  srcModule: SrcModule;
}

/** A name that doesn't need to be an Ident (e.g., struct member, diagnostic rule). */
export interface NameElem extends AbstractElemBase {
  kind: "name";
  name: string;
}

/** an identifier that 'refers to' a declaration (aka a symbol reference) */
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

/** Holds an import statement, and has a span */
export interface ImportElem extends AbstractElemBase, HasAttributes {
  kind: "import";
  imports: ImportStatement;
}

/** Tree-shaped import statement: `import foo::bar::{baz, cat as neko};` */
export interface ImportStatement {
  kind: "import-statement";
  segments: ImportSegment[];
  finalSegment: ImportCollection | ImportItem;
}

/** A segment in an import path: `foo` in `foo::bar`. */
export interface ImportSegment {
  kind: "import-segment";
  name: string;
}

/** A collection of import trees: `{baz, cat as neko}`. */
export interface ImportCollection {
  kind: "import-collection";
  subtrees: ImportStatement[];
}

/** A renamed item at the end of an import statement: `cat as neko`. */
export interface ImportItem {
  kind: "import-item";
  name: string;
  as?: string;
}

/* ------   Synthetic element (for transformations, not from grammar)  ------   */

/** Generated element produced after parsing and binding. */
export interface SyntheticElem {
  kind: "synthetic";
  text: string;
}

/* ------   Container Elements  (contain other elements)  ------   */

/** A declaration identifier with an optional type. */
export interface TypedDeclElem extends ElemWithContentsBase {
  kind: "typeDecl";
  decl: DeclIdentElem;
  typeRef?: TypeRefElem; // LATER Consider a variant for fn params and alias where typeRef is required
  typeScope?: Scope;
}

/** An alias statement. */
export interface AliasElem extends ElemWithContentsBase, HasAttributes {
  kind: "alias";
  name: DeclIdentElem;
  typeRef: TypeRefElem;
}

/** An attribute like '@compute' or '@binding(0)'. */
export interface AttributeElem extends ElemWithContentsBase {
  kind: "attribute";
  attribute: Attribute;
}

export type Attribute =
  | StandardAttribute
  | InterpolateAttribute
  | BuiltinAttribute
  | DiagnosticAttribute
  | IfAttribute
  | ElifAttribute
  | ElseAttribute;

export interface StandardAttribute {
  kind: "@attribute";
  name: string;
  params?: UnknownExpressionElem[];
}

export interface InterpolateAttribute {
  kind: "@interpolate";
  params: NameElem[];
}

export interface BuiltinAttribute {
  kind: "@builtin";
  param: NameElem;
}

export type DiagnosticRule = [NameElem, NameElem | null];

export interface DiagnosticAttribute {
  kind: "@diagnostic";
  severity: NameElem;
  rule: DiagnosticRule;
}

export interface IfAttribute {
  kind: "@if";
  param: TranslateTimeExpressionElem;
}

export interface ElifAttribute {
  kind: "@elif";
  param: TranslateTimeExpressionElem;
}

export interface ElseAttribute {
  kind: "@else";
}

export type ConditionalAttribute = IfAttribute | ElifAttribute | ElseAttribute;

/** A const_assert statement. */
export interface ConstAssertElem extends ElemWithContentsBase, HasAttributes {
  kind: "assert";
}

/** A const declaration. */
export interface ConstElem extends ElemWithContentsBase, HasAttributes {
  kind: "const";
  name: TypedDeclElem;
}

/** An expression without special handling, used in attribute parameters. */
export interface UnknownExpressionElem extends ElemWithContentsBase {
  kind: "expression";
}

/** An expression that can be safely evaluated at compile time. */
export interface TranslateTimeExpressionElem {
  kind: "translate-time-expression";
  expression: ExpressionElem;
  span: Span;
}

/** A literal value (boolean or number) in WESL source. */
export interface Literal extends AbstractElemBase {
  kind: "literal";
  value: string;
}

/** Feature names inside `@if`. LATER remove once V1 parser is removed */
export interface TranslateTimeFeature extends AbstractElemBase {
  kind: "translate-time-feature";
  name: string;
}

/** (expr) */
export interface ParenthesizedExpression extends AbstractElemBase {
  kind: "parenthesized-expression";
  expression: ExpressionElem;
}

/** `foo[expr]` */
export interface ComponentExpression extends AbstractElemBase {
  kind: "component-expression";
  base: ExpressionElem;
  access: ExpressionElem;
}

/** `foo.member` */
export interface ComponentMemberExpression extends AbstractElemBase {
  kind: "component-member-expression";
  base: ExpressionElem;
  access: NameElem;
}

/** `+foo` */
export interface UnaryExpression extends AbstractElemBase {
  kind: "unary-expression";
  operator: UnaryOperator;
  expression: ExpressionElem;
}

/** `foo + bar` */
export interface BinaryExpression extends AbstractElemBase {
  kind: "binary-expression";
  operator: BinaryOperator;
  left: ExpressionElem;
  right: ExpressionElem;
}

/** `foo<T>(arg, arg)` */
export interface FunctionCallExpression extends AbstractElemBase {
  kind: "call-expression";
  function: RefIdentElem | TypeRefElem; // template_elaborated_ident
  templateArgs?: TypeTemplateParameter[];
  arguments: ExpressionElem[];
}

export interface UnaryOperator {
  value: "!" | "&" | "*" | "-" | "~";
  span: Span;
}

export interface BinaryOperator {
  value:
    | ("||" | "&&" | "+" | "-" | "*" | "/" | "%" | "==")
    | ("!=" | "<" | "<=" | ">" | ">=" | "|" | "&" | "^")
    | ("<<" | ">>");
  span: Span;
}

export type DirectiveVariant =
  | DiagnosticDirective
  | EnableDirective
  | RequiresDirective;

export interface DirectiveElem extends AbstractElemBase, HasAttributes {
  kind: "directive";
  directive: DirectiveVariant;
}

export interface DiagnosticDirective {
  kind: "diagnostic";
  severity: NameElem;
  rule: [NameElem, NameElem | null];
}

export interface EnableDirective {
  kind: "enable";
  extensions: NameElem[];
}

export interface RequiresDirective {
  kind: "requires";
  extensions: NameElem[];
}

/** A function declaration. */
export interface FnElem extends ElemWithContentsBase, HasAttributes {
  // LATER doesn't need contents
  kind: "fn";
  name: DeclIdentElem;
  params: FnParamElem[];
  body: StatementElem;
  returnAttributes?: AttributeElem[];
  returnType?: TypeRefElem;
}

/** A global variable declaration (at the root level). */
export interface GlobalVarElem extends ElemWithContentsBase, HasAttributes {
  kind: "gvar";
  name: TypedDeclElem;
}

/** An entire file. */
export interface ModuleElem extends ElemWithContentsBase {
  kind: "module";
}

/** An override declaration. */
export interface OverrideElem extends ElemWithContentsBase, HasAttributes {
  kind: "override";
  name: TypedDeclElem;
}

/** A parameter in a function declaration. */
export interface FnParamElem extends ElemWithContentsBase, HasAttributes {
  kind: "param";
  name: TypedDeclElem;
}

/** Simple struct references like `myStruct.bar` (for binding struct transforms). */
export interface SimpleMemberRef extends ElemWithContentsBase {
  kind: "memberRef";
  name: RefIdentElem;
  member: NameElem;
  extraComponents?: StuffElem;
}

/** A struct declaration. */
export interface StructElem extends ElemWithContentsBase, HasAttributes {
  kind: "struct";
  name: DeclIdentElem;
  members: StructMemberElem[];
  bindingStruct?: true; // used later during binding struct transformation
}

/** Generic container of other elements. */
export interface StuffElem extends ElemWithContentsBase {
  kind: "stuff";
}

/** A struct declaration marked as a binding struct. */
export interface BindingStructElem extends StructElem {
  bindingStruct: true;
  entryFn?: FnElem;
}

/** A member of a struct declaration. */
export interface StructMemberElem extends ElemWithContentsBase, HasAttributes {
  kind: "member";
  name: NameElem;
  typeRef: TypeRefElem;
  mangledVarName?: string; // root name if transformed to a var (for binding struct transformation)
}

export type TypeTemplateParameter = ExpressionElem;

/** A type reference like 'f32', 'MyStruct', or 'ptr<storage, array<f32>, read_only>'. */
export interface TypeRefElem extends ElemWithContentsBase {
  kind: "type";
  name: RefIdent;
  templateParams?: TypeTemplateParameter[];
}

/** A variable declaration. */
export interface VarElem extends ElemWithContentsBase, HasAttributes {
  kind: "var";
  name: TypedDeclElem;
}

export interface LetElem extends ElemWithContentsBase, HasAttributes {
  kind: "let";
  name: TypedDeclElem;
}

export interface StatementElem extends ElemWithContentsBase, HasAttributes {
  kind: "statement";
}

export interface ContinuingElem extends ElemWithContentsBase, HasAttributes {
  kind: "continuing";
}

/** Statement or continuing - used in loop body parsing. */
export type BlockStatement = StatementElem | ContinuingElem;

export interface SwitchClauseElem extends ElemWithContentsBase, HasAttributes {
  kind: "switch-clause";
}
