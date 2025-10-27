import type {
  AbstractElem,
  BatchModuleResolver,
  DeclIdent,
  EmittableElem,
  LiveDecls,
  Scope,
} from "wesl";
import { bindIdentsRecursive, findValidRootDecls, minimalMangle } from "wesl";

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
  const bindContext = {
    resolver,
    conditions: {},
    knownDecls: new Set<DeclIdent>(),
    foundScopes: new Set<Scope>(),
    globalNames: new Set<string>(),
    globalStatements: new Map<AbstractElem, EmittableElem>(),
    mangler: minimalMangle,
    unbound: [],
    dontFollowDecls: true,
  };

  for (const [_modulePath, ast] of resolver.allModules()) {
    const rootDecls = findValidRootDecls(ast.rootScope, {});
    const declEntries = rootDecls.map(d => [d.originalName, d] as const);
    const liveDecls: LiveDecls = { decls: new Map(declEntries), parent: null };
    bindIdentsRecursive(ast.rootScope, bindContext, liveDecls, true);
  }

  return bindContext.unbound;
}
