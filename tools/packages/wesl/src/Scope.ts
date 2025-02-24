import { DeclarationElem, IfAttribute, RefIdentElem } from "./AbstractElems.ts";
import { WeslAST } from "./ParseWESL.ts";

export interface SrcModule {
  /** module path "rand_pkg::sub::foo", or "package::main" */
  modulePath: string;

  /** file path to the module for user error reporting e.g "rand_pkg:sub/foo.wesl", or "./sub/foo.wesl" */
  debugFilePath: string;

  /** original src for module */
  src: string;
}

/** a src declaration or reference to an ident */
export type Ident = DeclIdent | RefIdent;

export type Conditions = Record<string, boolean>;

interface IdentBase {
  originalName: string; // name in the source code for ident matching (may be mangled in the output)
  conditions?: Conditions; // conditions under which this ident is valid (combined from all containing elems)
  id?: number; // for debugging
}

export interface RefIdent extends IdentBase {
  kind: "ref";

  // LATER these fields are set during binding, not parsing. Make a naming scheme _refersTo or a separate interface (BindingRefIdent) to make that clear
  refersTo?: Ident; // import or decl ident in scope to which this ident refers. undefined before binding
  std?: true; // true if this is a standard wgsl identifier (like sin, or u32)

  // TODO consider tracking the current ast in BindIdents so that this field is unnecessary
  ast: WeslAST; // AST from module that contains this ident (to find imports during decl binding)

  // TODO drop this, I don't think it's used anymore.
  scope: Scope; // scope containing this reference (bind to decls starting from this scope)

  refIdentElem: RefIdentElem; // for error reporting and mangling
}

export interface DeclIdent extends IdentBase {
  kind: "decl";
  mangledName?: string; // name in the output code
  declElem?: DeclarationElem; // link to AST so that we can traverse scopes and know what elems to emit // TODO make separate GlobalDecl kind with this required
  scope: Scope; // scope for the references within this declaration
  srcModule: SrcModule; // To figure out which module this declaration is from.
}

/** tree of ident references, organized by lexical scope. */
export interface Scope {
  /** id for debugging */
  id: number;

  /** idents found in lexical order in this scope */
  idents: Ident[];

  /** null for root scope in a module */
  parent: Scope | null;

  // TODO child scopes should be in lexical order intermixed with idents
  // (declarations that are lexicaly after a child scope are not visible from that child scope)
  /** null for root scope in a module */
  children: Scope[];

  /** @if conditions for conditionally translating this scope */
  ifAttributes?: IfAttribute[];

  /**
   * Efficient access to declarations in this scope.
   * constructed on demand, for module root scopes only */
  scopeDecls?: Map<string, DeclIdent>;
}

/** return the declarations in this scope */
export function scopeDecls(scope: Scope): Map<string, DeclIdent> {
  if (scope.parent) {
    console.warn("Warning: scopeDecls called on non-root scope");
  }
  if (scope.scopeDecls) {
    return scope.scopeDecls;
  }
  const declMap = new Map<string, DeclIdent>();
  for (const ident of scope.idents) {
    if (ident.kind === "decl") {
      declMap.set(ident.originalName, ident);
    }
  }
  scope.scopeDecls = declMap;
  return declMap;
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

export function exportDecl(scope: Scope, name: string): DeclIdent | undefined {
  for (const ident of scope.idents) {
    if (ident.originalName === name && ident.kind === "decl") {
      return ident;
    }
  }
}
