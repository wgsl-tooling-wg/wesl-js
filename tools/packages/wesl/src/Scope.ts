import { FunctionParam, GlobalDeclarationElem } from "./AbstractElems.ts";

export interface SrcModule {
  /** module path "rand_pkg::sub::foo", or "package::main" */
  modulePath: string;

  /** file path to the module for user error reporting e.g "rand_pkg:sub/foo.wesl", or "./sub/foo.wesl" */
  debugFilePath: string;

  /** original src for module */
  src: string;
}

export type Conditions = Record<string, boolean>;

export interface RefIdent {
  kind: "ref";
  originalName: string;
  /** import or decl ident in scope to which this ident refers. undefined before binding */
  refersTo?: DeclIdent;
  /** true if this is a standard wgsl identifier (like sin, or u32) */
  std?: true;
}

export interface DeclIdent {
  kind: "decl";
  originalName: string;
  /** name in the output code */
  mangledName?: string;
  /** link to AST so that we can traverse scopes and know what elems to emit // TODO make separate GlobalDecl kind with this required */
  declElem: GlobalDeclarationElem | FunctionParam;
  /** To figure out which module this declaration is from. */
  srcModule: SrcModule;
}

/** tree of ident references, organized by lexical scope. */
export interface Scope {
  id?: number; // for debugging
  /** idents found in lexical order in this scope */
  idents: (RefIdent | DeclIdent)[];
  /** null for root scope in a module */
  parent: Scope | null;
  children: Scope[];
}

export function resetScopeIds() {
  // for debugging
  scopeId = 0;
}

let scopeId = 0; // for debugging

/** make a new Scope object */
export function makeScope(s: Omit<Scope, "id">): Scope {
  return { ...s, id: scopeId++ };
}

export function emptyScope(parent: Scope | null): Scope {
  return makeScope({
    idents: [],
    parent,
    children: [],
  });
}

/** For debugging,
 * @return true if a scope is in the rootScope tree somewhere */
export function containsScope(rootScope: Scope, scope: Scope): boolean {
  if (scope === rootScope) {
    return true;
  }
  for (const child of rootScope.children) {
    if (containsScope(child, scope)) {
      return true;
    }
  }
  return false;
}
