import type {
  AbstractElem,
  DeclIdent,
  EmittableElem,
  LiveDecls,
  ParsedRegistry,
  Scope,
} from "wesl";
import { bindIdentsRecursive, findValidRootDecls, minimalMangle } from "wesl";

/**
 * Find unbound package references in library sources.
 *
 * Binds local references without following cross-package imports, revealing
 * which external packages are referenced but not resolved.
 *
 * @param registry - Pre-parsed modules to analyze
 * @returns Array of unbound module paths, each as an array of path segments
 *   (e.g., [['foo', 'bar', 'baz'], ['other', 'pkg']])
 */
export function findUnboundIdents(registry: ParsedRegistry): string[][] {
  const bindContext = {
    resolver: registry,
    conditions: {},
    knownDecls: new Set<DeclIdent>(),
    foundScopes: new Set<Scope>(),
    globalNames: new Set<string>(),
    globalStatements: new Map<AbstractElem, EmittableElem>(),
    mangler: minimalMangle,
    unbound: [],
    dontFollowDecls: true,
  };

  for (const [_modulePath, ast] of registry.allModules()) {
    const rootDecls = findValidRootDecls(ast.rootScope, {});
    const declEntries = rootDecls.map(d => [d.originalName, d] as const);
    const liveDecls: LiveDecls = { decls: new Map(declEntries), parent: null };
    bindIdentsRecursive(ast.rootScope, bindContext, liveDecls, true);
  }

  return bindContext.unbound;
}
