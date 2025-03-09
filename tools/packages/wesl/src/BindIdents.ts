import { srcLog } from "mini-parse";
import { AbstractElem } from "./AbstractElems.ts";
import {
  assertThatDebug,
  assertUnreachableSilent,
  failDebug,
} from "./Assertions.ts";
import { elementValid, scopeValid } from "./Conditions.ts";
import { identToString } from "./debug/ScopeToString.ts";
import { FlatImport } from "./FlattenTreeImport.ts";
import { LinkRegistryParams, VirtualLibraryFn } from "./Linker.ts";
import { LiveDecls, makeLiveDecls } from "./LiveDeclarations.ts";
import { ManglerFn, minimalMangle } from "./Mangler.ts";
import { ParsedRegistry } from "./ParsedRegistry.ts";
import { flatImports, parseSrcModule, WeslAST } from "./ParseWESL.ts";
import {
  Conditions,
  DeclIdent,
  publicDecl,
  RefIdent,
  Scope,
  SrcModule,
} from "./Scope.ts";
import { stdEnumerant, stdFn, stdType } from "./StandardTypes.ts";
import { last } from "./Util.ts";

/**
  BindIdents pass

  Goals:
  - link references identifiers to their declaration identifiers. 
  - produce a list of declarations that are used (and need to be emitted in the link)
  - create mangled names for global declarations (to avoid name conflicts)

  BindIdents proceeds as a recursive tree walk of the scope tree, starting from the root module (e.g. main.wesl).
  It traverses the scope tree depth first (and not the syntax tree). 
  - For each ref ident, search prior declarations in the current scope, then 
    up the scope tree to find a matching declaration
  - If no local match is found, check for partial matches with import statements
    - combine the ident with import statement to match a decl in an exporting module
  - As global declaration identifies are found, also:
     - mutate their mangled name to be globally unique.
     - collect the declarations (they will be emitted) 
  
  When iterating through the idents inside a scope, we maintain a parallel data structure of
  'liveDecls', the declarations that are visible in the current scope at the currently
  processed ident, along with a link to parent liveDecls for their current decl visibility.
*/

/** results returned from binding pass */
export interface BindResults {
  /** root level names (including names mangled due to conflict with earlier names) */
  globalNames: Set<string>;

  /** global declarations that were referenced (these will need to be emitted in the link) */
  decls: DeclIdent[];

  /** additional global statements to include in linked results
   * (e.g. for adding module level const_assert statements) */
  newStatements: EmittableElem[];
}

/** an element that can be directly emitted into the linked result */
export interface EmittableElem {
  srcModule: SrcModule;
  elem: AbstractElem;
}

/** virtual package, generated by code generation function. */
export interface VirtualLibrary {
  // TODO rename to VirtualPackage
  /** function to generate the module */
  fn: VirtualLibraryFn;

  /** parsed AST for the module (constructed lazily) */
  ast?: WeslAST;
}

/** key is virtual module name */
export type VirtualLibrarySet = Record<string, VirtualLibrary>;

export interface BindIdentsParams
  extends Pick<LinkRegistryParams, "registry" | "conditions" | "mangler"> {
  rootAst: WeslAST;
  virtuals?: VirtualLibrarySet;
}

/**
 * Bind active reference idents to declaration Idents by mutating the refersTo: field
 * Also in this pass, set the mangledName: field for all active global declaration idents.
 *
 * @param parsed
 * @param conditions  only bind to/from idents that are valid with the current condition set
 * @return any new declaration elements found (they will need to be emitted)
 */
export function bindIdents(params: BindIdentsParams): BindResults {
  const { rootAst, registry, virtuals } = params;
  const { conditions = {}, mangler = minimalMangle } = params;
  const { rootScope } = rootAst;

  const globalNames = new Set<string>();
  const knownDecls = new Set<DeclIdent>();
  const validRootDecls = findValidRootDecls(rootScope, conditions);

  validRootDecls.forEach(decl => {
    decl.mangledName = decl.originalName;
    globalNames.add(decl.originalName);
    knownDecls.add(decl);
  });

  const globalStatements = new Map<AbstractElem, EmittableElem>();
  const bindContext = {
    registry,
    conditions,
    knownDecls,
    foundScopes: new Set<Scope>(),
    globalNames,
    globalStatements,
    virtuals,
    mangler,
  };

  // initialize liveDecls with all module level declarations
  // (note that in wgsl module level declarations may appear in any order, incl after their references.)
  const declEntries = validRootDecls.map(d => [d.originalName, d] as const);
  const liveDecls: LiveDecls = { decls: new Map(declEntries), parent: null };

  const decls = bindIdentsRecursive(rootScope, bindContext, liveDecls, true);
  const filteredDecls = decls.filter(isGlobal); // TODO is this needed?
  const newStatements = [...globalStatements.values()];
  return { decls: filteredDecls, globalNames, newStatements };
}

/**
 * @return the list of conditional valid declarations at the root level
 * decls are either in the root scope or in a conditionally valid partial scope
 */
export function findValidRootDecls(
  rootScope: Scope,
  conditions: Conditions,
): DeclIdent[] {
  const found: DeclIdent[] = [];
  for (const e of rootScope.contents) {
    if (e.kind === "decl") {
      assertThatDebug(e.declElem);
      if (elementValid(e.declElem!, conditions)) {
        found.push(e);
      }
    } else if (e.kind === "partial") {
      found.push(...findValidRootDecls(e, conditions));
    }
  }
  return found;
}

/** state used during the recursive scope tree walk to bind references to declarations */
interface BindContext {
  registry: ParsedRegistry;

  /** live runtime conditions currently defined by the user */
  conditions: Record<string, any>;

  /** decl idents discovered so far (to avoid re-traversing) */
  knownDecls: Set<DeclIdent>;

  /** save work by not processing scopes multiple times */
  foundScopes: Set<Scope>;

  /** root level names used so far (so that manglers or ast rewriting plugins can pick unique names) */
  globalNames: Set<string>;

  /** additional global statements to include in linked results
   * (e.g. for adding module level const_assert statements)
   * (indexed by elem for uniqueness) */
  globalStatements: Map<AbstractElem, EmittableElem>;

  /** construct unique identifer names for global declarations */
  mangler: ManglerFn;

  /** virtual libraries provided by the user (e.g. for code generators or constants) */
  virtuals?: VirtualLibrarySet;
}

/**
 * Recursively bind references to declarations in this scope and
 * any child scopes referenced by these declarations.
 * Uses a hash set of found declarations to avoid duplication
 * @return any new declarations found
 * @param liveDecls current set of live declaration in this scope
 *  (empty when traversing to a new scope, possibly non-empty for a partial scope)
 * @param isRoot liveDecls refers to a prepopulated root scope
 *  (root scoope declarations may appear in any order)
 */
function bindIdentsRecursive(
  scope: Scope,
  bindContext: BindContext,
  liveDecls: LiveDecls,
  isRoot = false,
): DeclIdent[] {
  // early exit if we've processed this scope before
  const { conditions, foundScopes } = bindContext;
  if (foundScopes.has(scope)) return [];
  foundScopes.add(scope);

  const newGlobals: DeclIdent[] = []; // new decl idents to process for binding (and return for emitting)

  // active declarations in this scope
  const newFromChildren: DeclIdent[] = [];

  // process all identifiers and subscopes in this scope
  scope.contents.forEach(child => {
    const { kind } = child;
    if (kind === "decl") {
      const ident = child;
      if (!isRoot) liveDecls.decls.set(ident.originalName, ident);
    } else if (kind === "ref") {
      const newDecl = handleRef(child, liveDecls, bindContext);
      newDecl && newGlobals.push(newDecl);
    } else {
      const fromScope = handleScope(child, liveDecls, bindContext);
      if (fromScope) {
        newFromChildren.push(...fromScope);
      }
    }
  });

  // follow references from referenced declarations
  const newFromRefs = newGlobals.flatMap(decl => {
    const foundsScope = decl.scope;
    const rootDecls = globalDeclToRootLiveDecls(decl, conditions);
    if (rootDecls) {
      const rootLive = makeLiveDecls(rootDecls);
      return bindIdentsRecursive(foundsScope, bindContext, rootLive);
    }
    failDebug(`WARNING decl not from root ${identToString(decl)}`);
    return [];
  });

  return [newGlobals, newFromChildren, newFromRefs].flat();
}

/**
 * Trace references to their declarations
 * mutates to:
 *  mangle declarations
 *  mark references as 'std' if they match a wgsl std function or type
 *
 * @return the found declaration, or undefined if this ref has already been processed
 */
function handleRef(
  ident: RefIdent,
  liveDecls: LiveDecls,
  bindContext: BindContext,
): DeclIdent | undefined {
  const { registry, conditions } = bindContext;
  const { virtuals } = bindContext;
  if (!ident.refersTo && !ident.std) {
    const foundDecl =
      findDeclInModule(ident, liveDecls) ??
      findQualifiedImport(ident, registry, conditions, virtuals);

    if (foundDecl) {
      ident.refersTo = foundDecl.decl;
      return handleNewDecl(ident, foundDecl, bindContext);
    } else if (stdWgsl(ident.originalName)) {
      ident.std = true;
    } else {
      failMissingIdent(ident);
    }
  }
}

/**
 * If the child scope is conditionally valid,
 * update liveDecls tree and recurse to process the elements in it.
 *
 * @return any new global declarations found
 */
function handleScope(
  childScope: Scope,
  liveDecls: LiveDecls,
  bindContext: BindContext,
): DeclIdent[] | undefined {
  const { conditions } = bindContext;
  if (!scopeValid(childScope, conditions)) return;
  const { kind } = childScope;
  if (kind === "scope") {
    const newLive = makeLiveDecls(liveDecls);
    return bindIdentsRecursive(childScope, bindContext, newLive);
  } else if (kind === "partial") {
    return bindIdentsRecursive(childScope, bindContext, liveDecls);
  } else {
    assertUnreachableSilent(kind);
  }
}

/**
 * If the found declaration is new, mangle its name and update the
 * knownDecls and globalNames sets.
 * If the found declaration is new and also a global declaration, return it
 * for ruther processing (bindident traversing, and emitting to wgsl).
 */
function handleNewDecl(
  refIdent: RefIdent,
  foundDecl: FoundDecl,
  bindContext: BindContext,
): DeclIdent | undefined {
  const { decl, moduleAst } = foundDecl;
  const { knownDecls, globalNames, mangler, globalStatements } = bindContext;
  if (!knownDecls.has(decl)) {
    knownDecls.add(decl);

    const { srcModule } = decl;
    const proposed = refIdent.originalName;
    setMangledName(proposed, decl, globalNames, srcModule, mangler);

    if (isGlobal(decl)) {
      const { moduleAsserts } = moduleAst;
      const moduleEmit = moduleAsserts?.map(elem => ({ srcModule, elem }));
      moduleEmit?.forEach(e => globalStatements.set(e.elem, e));

      return decl;
    }
  }
}

/** given a global declIdent, return the liveDecls for its root scope */
function globalDeclToRootLiveDecls(
  decl: DeclIdent,
  conditions: Conditions,
): LiveDecls | undefined {
  assertThatDebug(decl.isGlobal, identToString(decl));
  let rootScope = decl.scope;
  while (rootScope.parent) {
    rootScope = rootScope.parent;
  }

  const rootDecls = findValidRootDecls(rootScope, conditions);
  const entires = rootDecls.map(d => [d.originalName, d] as const);
  const decls = new Map(entires);
  return { decls };
}

/** warn the user about a missing identifer */
function failMissingIdent(ident: RefIdent): void {
  const { refIdentElem } = ident;
  if (refIdentElem) {
    const { srcModule, start, end } = refIdentElem;
    const { debugFilePath: filePath } = srcModule;
    const msg = `unresolved identifier '${ident.originalName}' in file: ${filePath}`; // TODO make error message clickable
    srcLog(srcModule.src, [start, end], msg);
    throw new Error(msg);
  }
}

/**
 * Mutate a DeclIdent to set a unique name for global linking
 * using a mangling function to choose a unique name.
 * Also update the set of globally unique names.
 */
function setMangledName(
  proposedName: string,
  decl: DeclIdent,
  globalNames: Set<string>,
  srcModule: SrcModule,
  mangler: ManglerFn,
): void {
  if (!decl.mangledName) {
    let mangledName: string;
    if (isGlobal(decl)) {
      const sep = proposedName.lastIndexOf("::");
      const name = sep === -1 ? proposedName : proposedName.slice(sep + 2);
      mangledName = mangler(decl, srcModule, name, globalNames);
    } else {
      mangledName = decl.originalName;
    }
    decl.mangledName = mangledName;
    globalNames.add(mangledName);
  }
}

/** @return true if ident is a standard wgsl type, fn, or enumerant */
function stdWgsl(name: string): boolean {
  return stdType(name) || stdFn(name) || stdEnumerant(name); // TODO add tests for enumerants case (e.g. var x = read;)
}

/** using the LiveDecls, search earlier in the scope and in parent scopes to find a matching decl ident */
function findDeclInModule(
  ident: RefIdent,
  liveDecls: LiveDecls,
): FoundDecl | undefined {
  const { originalName } = ident;
  const found = liveDecls.decls.get(originalName);
  if (found) {
    return { decl: found, moduleAst: ident.ast };
  }
  // recurse to check all idents in parent scope
  const { parent } = liveDecls;
  if (parent) {
    return findDeclInModule(ident, parent);
  }
}

/** Match a reference identifier to a declaration in
 * another module via an import statement
 * or via an inline qualified ident e.g.  foo::bar() */
function findQualifiedImport(
  refIdent: RefIdent,
  parsed: ParsedRegistry,
  conditions: Conditions,
  virtuals?: VirtualLibrarySet,
): FoundDecl | undefined {
  const flatImps = flatImports(refIdent.ast);

  const identParts = refIdent.originalName.split("::");

  // find module path by combining identifer reference with import statement
  const modulePathParts =
    matchingImport(identParts, flatImps) ?? qualifiedImport(identParts);

  if (modulePathParts) {
    const { srcModule } = refIdent.ast;
    return findExport(modulePathParts, srcModule, parsed, conditions, virtuals);
  }
}

function qualifiedImport(identParts: string[]): string[] | undefined {
  if (identParts.length > 1) return identParts;
}

/** combine and import using the flattened import array, find an import that matches a provided identi*/
function matchingImport(
  identParts: string[],
  flatImports: FlatImport[],
): string[] | undefined {
  for (const flat of flatImports) {
    if (flat.importPath.at(-1) === identParts.at(0)) {
      return [...flat.modulePath, ...identParts.slice(1)];
    }
  }
}

/** discovered declaration found during binding */
interface FoundDecl {
  decl: DeclIdent;
  /** module containing the decl */
  moduleAst: WeslAST;
}

/** @return an exported root declIdent for the provided path */
function findExport(
  modulePathParts: string[],
  srcModule: SrcModule,
  parsed: ParsedRegistry,
  conditions: Conditions = {},
  virtuals?: VirtualLibrarySet,
): FoundDecl | undefined {
  const fqPathParts = absoluteModulePath(modulePathParts, srcModule);
  const modulePath = fqPathParts.slice(0, -1).join("::");
  const moduleAst =
    parsed.modules[modulePath] ??
    virtualModule(modulePathParts[0], conditions, virtuals); // LATER consider virtual modules with submodules

  if (!moduleAst) {
    // TODO show error with source location
    console.log(`ident ${modulePathParts.join("::")}, but module not found`);
    return undefined;
  }

  const name = last(modulePathParts)!;
  const decl = publicDecl(moduleAst.rootScope, name, conditions);
  if (decl) {
    return { decl, moduleAst };
  }
}

/** convert a module path with super:: elements to one with no super:: elements */
function absoluteModulePath(
  modulePathParts: string[],
  srcModule: SrcModule,
): string[] {
  const lastSuper = modulePathParts.findLastIndex(p => p === "super");
  if (lastSuper > -1) {
    const srcModuleParts = srcModule.modulePath.split("::");
    const base = srcModuleParts.slice(0, -(lastSuper + 1));
    const noSupers = modulePathParts.slice(lastSuper + 1);
    return [...base, ...noSupers];
  }
  return modulePathParts;
}

/** @return AST for a virtual module */
function virtualModule(
  moduleName: string,
  conditions: Conditions = {},
  virtuals?: VirtualLibrarySet,
): WeslAST | undefined {
  if (!virtuals) return undefined;
  const found = virtuals[moduleName];
  if (found) {
    const { ast, fn } = found;
    if (ast) return ast;
    const src = fn(conditions); // generate the virtual module
    const srcModule: SrcModule = {
      modulePath: moduleName,
      debugFilePath: moduleName,
      src,
    };
    found.ast = parseSrcModule(srcModule); // cache parsed virtual module
    return found.ast;
  }
}

// LATER capture isGlobal in the ident during parsing
/** @return true if this decl is at the root scope level of a module */
export function isGlobal(declIdent: DeclIdent): boolean {
  const { declElem } = declIdent;
  if (!declElem) return false;

  return ["alias", "const", "override", "fn", "struct", "gvar"].includes(
    declElem.kind,
  );
}
