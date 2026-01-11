import type {
  DeclarationElem,
  ElifAttribute,
  ElseAttribute,
  IfAttribute,
  RefIdentElem,
} from "./AbstractElems.ts";
import { assertThatDebug } from "./Assertions.ts";
import type { LiveDecls } from "./LiveDeclarations.ts";
import type { WeslAST } from "./ParseWESL.ts";

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

/** LATER change this to a Map, so that `toString` isn't accidentally a condition */
export type Conditions = Record<string, boolean>;

interface IdentBase {
  originalName: string; // name in the source code for ident matching (may be mangled in the output)
  id?: number; // for debugging
}

export interface RefIdent extends IdentBase {
  kind: "ref";

  // LATER these fields are set during binding, not parsing. Make a naming scheme _refersTo or a separate interface (BindingRefIdent) to make that clear
  refersTo?: Ident; // import or decl ident in scope to which this ident refers. undefined before binding
  std?: true; // true if this is a standard wgsl identifier (like sin, or u32)

  /** True for identifiers in @if/@elif conditions. Binding skips these (for now). */
  conditionRef?: true;

  /** Attribute name if this ref is inside an attribute param (for skip-binding check). */
  attrParam?: string;

  // LATER consider tracking the current ast in BindIdents so that this field is unnecessary
  ast: WeslAST; // AST from module that contains this ident (to find imports during decl binding)

  refIdentElem: RefIdentElem; // for error reporting and mangling
}

export interface DeclIdent extends IdentBase {
  kind: "decl";

  /** name in the output code */
  mangledName?: string;

  /** link to AST so that we can traverse scopes and know what elems to emit */
  declElem?: DeclarationElem; // LATER make separate GlobalDecl kind with this required

  /** scope in which this declaration is found */
  containingScope: Scope;

  /** scope for the references within this declaration
   * (only needed for global decls.)
   * if this decl is included in the link, dependentScope holds other refIdents that should be included too */
  dependentScope?: Scope;

  /** true if this is a global declaration (e.g. not a local variable) */
  isGlobal: boolean;

  /** To figure out which module this declaration is from. */
  srcModule: SrcModule;
}

/** tree of ident references, organized by lexical scope and partialScope . */
export type Scope = LexicalScope | PartialScope;

/** A wgsl scope */
export interface LexicalScope extends ScopeBase {
  kind: "scope";

  /**
   * Efficient access to declarations in this scope.
   * constructed on demand, for module root scopes only */ // LATER consider make a special kind for root scopes
  _scopeDecls?: LiveDecls;

  /** Cached list of valid root declarations after conditional filtering.
   * Populated on first access for module root scopes. */
  _validRootDecls?: DeclIdent[];
}

/** A synthetic partial scope to contain @if conditioned idents.
 * PartialScope idents are considered to be in the wgsl lexical scope of their parent.  */
export interface PartialScope extends ScopeBase {
  kind: "partial";
}

/** common scope elements  */
interface ScopeBase {
  /** id for debugging */
  id: number;

  /** null for root scope in a module */
  parent: Scope | null;

  /* Child scopes and idents in lexical order  */
  contents: (Ident | Scope)[];

  /** Conditional attribute (@if or @else) for this scope */
  condAttribute?: IfAttribute | ElifAttribute | ElseAttribute;
}

/** Combine two scope siblings.
 * The first scope is mutated to append the contents of the second.  */
export function mergeScope(a: Scope, b: Scope | undefined): void {
  if (!b) return;
  assertThatDebug(a.kind === b.kind);
  assertThatDebug(a.parent === b.parent);
  assertThatDebug(!b.condAttribute);
  a.contents = a.contents.concat(b.contents);
}

/** reset scope and ident debugging ids */
export function resetScopeIds() {
  scopeId = 0;
  identId = 0;
}

let scopeId = 0;
let identId = 0;

export function nextIdentId(): number {
  return identId++;
}

/** make a new Scope object */
export function emptyScope(
  parent: Scope | null,
  kind: Scope["kind"] = "scope",
): Omit<Scope, "condAttribute"> {
  const id = scopeId++;
  return { id, kind, parent, contents: [] };
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
