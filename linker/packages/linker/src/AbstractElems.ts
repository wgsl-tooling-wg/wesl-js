import { ImportTree } from "./ImportTree.ts";
import { DeclIdent, RefIdent, SrcModule } from "./Scope.ts";

export type AbstractElem =
  | AliasElem
  | AttributeElem
  | AttributeParamElem
  | ConstElem
  | ImportElem
  | ConstAssertElem
  | FnElem
  | RefIdentElem
  | DeclIdentElem
  | ModuleElem
  | NameElem
  | OverrideElem
  | ParamElem
  | StructElem
  | StructMemberElem
  | TextElem
  | GlobalVarElem
  | VarElem;

export type DeclarationElem =
  | AliasElem
  | ConstElem
  | OverrideElem
  | ParamElem
  | FnElem
  | StructElem
  | GlobalVarElem
  | VarElem;

export interface AbstractElemBase {
  kind: string;
  start: number;
  end: number;
}

export interface ElemWithContents extends AbstractElemBase {
  contents: AbstractElem[];
}

export interface ImportElem extends ElemWithContents {
  kind: "import";
  imports: ImportTree;
}

/** an identifier in WESL source */
export interface RefIdentElem extends AbstractElemBase {
  kind: RefIdent["kind"];
  ident: RefIdent;
  srcModule: SrcModule;
}

/** an identifier in WESL source */
export interface DeclIdentElem extends AbstractElemBase {
  kind: DeclIdent["kind"];
  ident: DeclIdent;
  srcModule: SrcModule;
}

/** a raw bit of text in WESL source that's typically copied to the linked WGSL. 
 e.g. a keyword  like 'var' or '@diagnostic(off,derivative_uniformity)'
*/
export interface TextElem extends AbstractElemBase {
  kind: "text";
  srcModule: SrcModule;
}

/** a parameter in a function declaration */
export interface ParamElem extends ElemWithContents {
  kind: "param";
  name: DeclIdentElem;
  typeRef: RefIdentElem;
}

export interface AttributeElem extends ElemWithContents {
  kind: "attribute";
  name: string;
  params: AttributeParamElem[];
}

export interface AttributeParamElem extends ElemWithContents {
  kind: "attrParam";
}

/** a variable declaration */
export interface VarElem extends ElemWithContents {
  kind: "var";
  name: DeclIdentElem;
  typeRef?: RefIdentElem;
}

/** a global variable declaration (at the root level) */
export interface GlobalVarElem extends ElemWithContents {
  kind: "gvar";
  name: DeclIdentElem;
  typeRef?: RefIdentElem;
}

/** a const declaration */
export interface ConstElem extends ElemWithContents {
  kind: "const";
  name: DeclIdentElem;
  typeRef?: RefIdentElem;
}

/** an override declaration */
export interface OverrideElem extends ElemWithContents {
  kind: "override";
  name: DeclIdentElem;
  typeRef?: RefIdentElem;
}

/** an entire file */
export interface ModuleElem extends ElemWithContents {
  kind: "module";
}

/** an alias statement */
export interface AliasElem extends ElemWithContents {
  kind: "alias";
  name: DeclIdentElem;
  typeRef: RefIdentElem;
}

/** a const_assert statement */
export interface ConstAssertElem extends ElemWithContents {
  kind: "assert";
}

/** a struct declaration */
export interface StructElem extends ElemWithContents {
  kind: "struct";
  name: DeclIdentElem;
  members: StructMemberElem[];
}

/** a member of a struct declaration */
export interface StructMemberElem extends ElemWithContents {
  kind: "member";
  name: NameElem;
  typeRef: RefIdentElem;
}

/** a name (e.g. a struct member name) that doesn't need to be an Ident */
export interface NameElem extends AbstractElemBase {
  kind: "name";
  name: string;
  srcModule: SrcModule;
}

/** a function declaration */
export interface FnElem extends ElemWithContents {
  kind: "fn";
  name: DeclIdentElem;
  params: ParamElem[];
  returnType?: RefIdentElem;
}
