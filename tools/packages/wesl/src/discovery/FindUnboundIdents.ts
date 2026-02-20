import type { AbstractElem } from "../AbstractElems.ts";
import {
  bindIdentsRecursive,
  type EmittableElem,
  findValidRootDecls,
  type UnboundRef,
} from "../BindIdents.ts";
import { type LiveDecls, makeLiveDecls } from "../LiveDeclarations.ts";
import { minimalMangle } from "../Mangler.ts";
import type { BatchModuleResolver } from "../ModuleResolver.ts";
import type { DeclIdent, Scope } from "../Scope.ts";
import { filterMap } from "../Util.ts";

/**
 * Find unbound package references in library sources.
 *
 * Binds local references without following cross-package imports, revealing
 * which external packages are referenced but not resolved.
 *
 * @param resolver - Module resolver that supports batch operations
 * @returns Array of unbound module paths, each as an array of path segments
 *   (e.g., [['foo', 'bar', 'baz'], ['other', 'pkg']])
 */
export function findUnboundIdents(resolver: BatchModuleResolver): string[][] {
  return findUnboundRefs(resolver).map(ref => ref.path);
}

/** Find unbound references with full position info. */
export function findUnboundRefs(resolver: BatchModuleResolver): UnboundRef[] {
  const bindContext = {
    resolver,
    conditions: {},
    knownDecls: new Set<DeclIdent>(),
    foundScopes: new Set<Scope>(),
    globalNames: new Set<string>(),
    globalStatements: new Map<AbstractElem, EmittableElem>(),
    mangler: minimalMangle,
    unbound: [] as UnboundRef[],
    dontFollowDecls: true,
  };

  for (const [, ast] of resolver.allModules()) {
    const rootDecls = findValidRootDecls(ast.rootScope, {});
    const liveDecls: LiveDecls = {
      decls: new Map(rootDecls.map(d => [d.originalName, d] as const)),
      parent: null,
    };
    // Process dependent scopes of root decls to find unbound refs in function bodies
    const scopes = filterMap(rootDecls, decl => decl.dependentScope);
    scopes.forEach(s => {
      bindIdentsRecursive(s, bindContext, makeLiveDecls(liveDecls));
    });
    // Also process refs at root scope level
    bindIdentsRecursive(ast.rootScope, bindContext, liveDecls);
  }

  return bindContext.unbound;
}
