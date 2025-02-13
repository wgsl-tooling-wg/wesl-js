import { Span } from "mini-parse";
import { DeclIdent, RefIdent, SrcModule } from "./Scope.ts";

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

export type GrammarElem = ContainerElem | ExpressionElem | TerminalElem;

export type ContainerElem =
  | AliasElem
  | AttributeElem
  | ConstAssertElem
  | ConstElem
  | UnknownExpression
  | SimpleMemberRef
  | DirectiveElem
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

/** Inspired by https://github.com/wgsl-tooling-wg/wesl-rs/blob/3b2434eac1b2ebda9eb8bfb25f43d8600d819872/crates/wgsl-parse/src/syntax.rs#L364 */
export type ExpressionElem =
  | LiteralElem
  | TranslateTimeFeatureElem
  | RefIdentElem
  | ParenthesizedExpression
  | ComponentExpression
  | ComponentMemberExpression
  | UnaryExpression
  | BinaryExpression
  | FunctionCallExpression;

export type TerminalElem =
  | DeclIdentElem //
  | NameElem
  | RefIdentElem
  | TextElem
  | ImportElem;

export type DeclarationElem =
  | AliasElem
  | ConstElem
  | FnElem
  | GlobalVarElem
  | OverrideElem
  | FnParamElem
  | StructElem
  | VarElem;

export interface AbstractElemBase {
  kind: AbstractElem["kind"];
  start: number;
  end: number;
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
  srcModule: SrcModule;
}

/** A literal value in WESL source. A boolean or a number. */
export interface LiteralElem extends AbstractElemBase {
  kind: "literal";
  value: string;
  srcModule: SrcModule;
}

/** a name (e.g. a struct member name) that doesn't need to be an Ident */
export interface NameElem extends AbstractElemBase {
  kind: "name";
  name: string;
  srcModule: SrcModule;
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

/** Holds an import statement, and has a span */
export interface ImportElem extends AbstractElemBase {
  kind: "import";
  imports: ImportStatement;
  srcModule: SrcModule;
}

/**
 * An import statement, which is tree shaped.
 * `import foo::bar::{baz, cat as neko};
 */
export interface ImportStatement {
  kind: "import-statement";
  segments: ImportSegment[];
  finalSegment: ImportCollection | ImportItem;
}

/**
 * A collection of import trees.
 * `{baz, cat as neko}`
 */
export interface ImportSegment {
  kind: "import-segment";
  name: string;
}

/**
 * A primitive segment in an import statement.
 * `foo`
 */
export interface ImportCollection {
  kind: "import-collection";
  subtrees: ImportStatement[];
}

/**
 * A renamed item at the end of an import statement.
 * `cat as neko`
 */
export interface ImportItem {
  kind: "import-item";
  name: string;
  as?: string;
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

/** an alias statement */
export interface AliasElem extends ElemWithContentsBase {
  kind: "alias";
  name: DeclIdentElem;
  typeRef: TypeRefElem;
}

/** an attribute like '@compute' or '@binding(0)' */
export interface AttributeElem extends ElemWithContentsBase {
  kind: "attribute";
  name: string;
  params?: ExpressionElem[];
}

/** a const_assert statement */
export interface ConstAssertElem extends ElemWithContentsBase {
  kind: "assert";
}

/** a const declaration */
export interface ConstElem extends ElemWithContentsBase {
  kind: "const";
  name: TypedDeclElem;
}

export interface UnknownExpression extends ElemWithContentsBase {
  kind: "expression";
}

/** `words`s inside `@if` */
export interface TranslateTimeFeatureElem extends AbstractElemBase {
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
/** `foo(arg, arg)` */
export interface FunctionCallExpression extends AbstractElemBase {
  kind: "call-expression";
  function: RefIdentElem;
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

export interface DirectiveElem extends AbstractElemBase {
  kind: "directive";
  directive: "diagnostic" | "enable" | "requires";
  arguments: string[];
}

/** a function declaration */
export interface FnElem extends ElemWithContentsBase {
  kind: "fn";
  name: DeclIdentElem;
  params: FnParamElem[];
  fnAttributes?: AttributeElem[];
  returnType?: TypeRefElem;
}

/** a global variable declaration (at the root level) */
export interface GlobalVarElem extends ElemWithContentsBase {
  kind: "gvar";
  name: TypedDeclElem;
}

/** an entire file */
export interface ModuleElem extends ElemWithContentsBase {
  kind: "module";
}

/** an override declaration */
export interface OverrideElem extends ElemWithContentsBase {
  kind: "override";
  name: TypedDeclElem;
}

/** a parameter in a function declaration */
export interface FnParamElem extends ElemWithContentsBase {
  kind: "param";
  name: TypedDeclElem;
}

/** simple references to structures, like myStruct.bar
 * (used for transforming refs to binding structs) */
export interface SimpleMemberRef extends ElemWithContentsBase {
  kind: "memberRef";
  name: RefIdentElem;
  member: NameElem;
  extraComponents?: StuffElem;
}

/** a struct declaration */
export interface StructElem extends ElemWithContentsBase {
  kind: "struct";
  name: DeclIdentElem;
  members: StructMemberElem[];
  bindingStruct?: true; // used later during binding struct transformation
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

/** a member of a struct declaration */
export interface StructMemberElem extends ElemWithContentsBase {
  kind: "member";
  name: NameElem;
  attributes?: AttributeElem[];
  typeRef: TypeRefElem;
  mangledVarName?: string; // root name if transformed to a var (for binding struct transformation)
}

export type TypeTemplateParameter = TypeRefElem | ExpressionElem;

/** a reference to a type, like 'f32', or 'MyStruct', or 'ptr<storage, array<f32>, read_only>'   */
export interface TypeRefElem extends ElemWithContentsBase {
  kind: "type";
  name: RefIdent;
  templateParams?: TypeTemplateParameter[];
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
