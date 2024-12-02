/** Structures for the abstract syntax tree constructed by the parser. */

import { ImportTree } from "./ImportTree.js";
import { Ident, SrcModule } from "./Scope.js";
import { FoundRef } from "./TraverseRefs.js";

export type AbstractElem =
  | AliasElem
  | TreeImportElem
  | ExportElem
  | ModuleElem
  | FnElem
  | GlobalDirectiveElem
  | TypeNameElem
  | FnNameElem
  | VarNameElem
  | CallElem
  | StructElem
  | StructMemberElem
  | ChunkElem
  | IdentElem
  | TextElem
  | VarElem
  | TypeRefElem;

export type NamedElem = Extract<AbstractElem, { name: string }>;

export interface AbstractElemBase {
  kind: string;
  start: number;
  end: number;
}

export interface CallElem extends AbstractElemBase {
  kind: "call";
  name: string;
  ref?: FoundRef;
}

export interface FnNameElem extends AbstractElemBase {
  kind: "fnName";
  name: string;
}

export interface VarNameElem extends AbstractElemBase {
  kind: "varName";
  name: string;
}

export interface FnElem extends AbstractElemBase {
  kind: "fn";
  name: string;
  nameElem: FnNameElem;
  calls: CallElem[];
  typeRefs: TypeRefElem[];
}

export interface TypeRefElem extends AbstractElemBase {
  kind: "typeRef";
  name: string;
  ref?: FoundRef;
}

export interface TypeNameElem extends AbstractElemBase {
  kind: "typeName";
  name: string;
}

export interface StructElem extends AbstractElemBase {
  kind: "struct";
  name: string;
  nameElem: TypeNameElem;
  members: StructMemberElem[];
}

export interface StructMemberElem extends AbstractElemBase {
  kind: "member";
  name: string;
  typeRefs: TypeRefElem[];
}

export interface ExportElem extends AbstractElemBase {
  kind: "export";
  args?: string[];
}

// LATER consider modeling import elems as containing multiple clauses
// instead of overlapping ImportElems

export interface TreeImportElem extends AbstractElemBase {
  kind: "treeImport";
  imports: ImportTree;
}

export interface ModuleElem extends AbstractElemBase {
  kind: "module";
  name: string;
}

export interface VarElem extends AbstractElemBase {
  kind: "var";
  name: string;
  nameElem: VarNameElem;
  typeRefs: TypeRefElem[];
}

export interface AliasElem extends AbstractElemBase {
  kind: "alias";
  name: string;
  targetName: string;
  typeRefs: TypeRefElem[];
}

/** global directive (diagnostic, enable, requires) or const_assert */
export interface GlobalDirectiveElem extends AbstractElemBase {
  kind: "globalDirective";
}

// an undifferentiated chunk of WESL source, contains other chunks and idents
export interface ChunkElem extends AbstractElemBase {
  kind: "chunk";
  elems: (ChunkElem | IdentElem | TextElem)[];
  conditions?: any; // TBD
}

// an identifier in WESL source
export interface IdentElem extends AbstractElemBase {
  kind: "ident";
  ident: Ident;
}

/** a raw bit of text in WESL source that's typically copied to the linked WGSL. 
 e.g. a keyword  like 'var' or '@diagnostic(off,derivative_uniformity)'
*/
export interface TextElem extends AbstractElemBase {
  kind: "text";
  src: SrcModule; // TODO move to abstract elem base
}
