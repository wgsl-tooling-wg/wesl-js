import { FunctionParam, GlobalDeclarationElem } from "./AbstractElems.ts";
import { WeslAST } from "./ParseWESL.ts";

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

  // LATER these fields are set during binding, not parsing. Make a naming scheme _refersTo or a separate interface (BindingRefIdent) to make that clear
  /** import or decl ident in scope to which this ident refers. undefined before binding */
  refersTo?: DeclIdent;
  /** true if this is a standard wgsl identifier (like sin, or u32) */
  std?: true;

  originalName: string;
  // TODO consider tracking the current ast in BindIdents so that this field is unnecessary
  ast: WeslAST; // AST from module that contains this ident (to find imports during decl binding)

  refIdentElem: RefIdentElem; // for error reporting and mangling
}

export interface DeclIdent {
  kind: "decl";
  mangledName?: string; // name in the output code
  declElem?: DeclarationElem; // link to AST so that we can traverse scopes and know what elems to emit // LATER make separate GlobalDecl kind with this required
  scope: Scope; // scope for the references within this declaration
}

/** tree of ident references, organized by lexical scope and partialScope . */
export type Scope = LexicalScope | PartialScope;

/** A wgsl scope */
export interface LexicalScope extends ScopeBase {
  kind: "scope";

  /** @if conditions for conditionally translating this scope */
  ifAttributes?: IfAttribute[];

  /**
   * Efficient access to declarations in this scope.
   * constructed on demand, for module root scopes only */ // LATER consider make a special kind for root scopes
  scopeDecls?: Map<string, DeclIdent>;
}

/** A synthetic partial scope to contain @if conditioned idents.
 * PartialScope idents are considered to be in the wgsl lexical scope of their parent.  */
export interface PartialScope extends ScopeBase {
  kind: "partial";

  /** @if conditions for conditionally translating this scope */
  ifAttributes: IfAttribute[];
}

/** common scope elements  */
interface ScopeBase {
  /** id for debugging */
  id: number;

  /** null for root scope in a module */
  parent: Scope | null;

  /* Child scopes and idents in lexical order  */
  contents: (Ident | Scope)[];

  /** @if conditions for conditionally translating this scope */
  ifAttributes?: IfAttribute[];
}

/** return the declarations in this scope */
export function scopeDecls(scope: Scope): Map<string, DeclIdent> {
  if (scope.parent || scope.kind !== "scope") {
    console.warn("Warning: scopeDecls called on unexpected scope", scope);
    return new Map();
  }
  if (scope.scopeDecls) {
    return scope.scopeDecls;
  }
  const declMap = new Map<string, DeclIdent>();
  for (const ident of scope.contents) {
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
export function emptyScope(
  parent: Scope | null,
  kind: Scope["kind"] = "scope",
): Scope {
  const id = scopeId++;
  const ifAttributes: IfAttribute[] = [];
  return { id, kind, contents: [], parent, ifAttributes };
}

/** For debugging,
 * @return true if a scope is in the rootScope tree somewhere */
export function containsScope(rootScope: Scope, scope: Scope): boolean {
  if (scope === rootScope) {
    return true;
  }
  for (const child of rootScope.contents) {
    if (childScope(child) && containsScope(child, scope)) {
      return true;
    }
  }
  return false;
}

/** @returns true if the provided element of a Scope
 *    is itself a Scope (and not an Ident) */
export function childScope(child: Scope | Ident): child is Scope {
  const { kind } = child;
  return kind === "partial" || kind === "scope";
}

/** @returns true if the provided element of a Scope
 *    is an Ident (and not a child Scope) */
export function childIdent(child: Scope | Ident): child is Ident {
  return !childScope(child);
}

/** find a public declaration with the given original name */
export function publicDecl(scope: Scope, name: string): DeclIdent | undefined {
  for (const elem of scope.contents) {
    if (elem.kind === "decl" && elem.originalName === name) {
      return elem;
    }
  }
}
