import { pathToFileURL } from "node:url";
import { resolve } from "import-meta-resolve";
import type { WeslBundle } from "wesl";
import {
  filterMap,
  findUnboundIdents,
  RecordResolver,
  WeslParseError,
} from "wesl";
import { npmResolveWESL } from "./NpmResolver.ts";

/**
 * Find package dependencies in WESL source files.
 *
 * Parses sources and partially binds identifiers to reveal unresolved package
 * references. Returns the longest resolvable npm subpath for each dependency.
 *
 * For example, 'foo::bar::baz' could resolve to:
 *   - 'foo/bar' (package foo, export './bar' bundle)
 *   - 'foo' (package foo, default export)
 *
 * @param weslSrc - Record of WESL source files by path
 * @param projectDir - Project directory for resolving package imports
 * @returns Dependency paths in npm format (e.g., 'foo/bar', 'foo')
 */
export function parseDependencies(
  weslSrc: Record<string, string>,
  projectDir: string,
): string[] {
  let resolver: RecordResolver;
  try {
    resolver = new RecordResolver(weslSrc);
  } catch (e: any) {
    if (e.cause instanceof WeslParseError) {
      console.error(e.message, "\n");
      return [];
    }
    throw e;
  }

  const unbound = findUnboundIdents(resolver);
  if (!unbound) return [];

  // Filter: skip builtins (1 segment) and linker virtuals ('constants')
  const pkgRefs = unbound.filter(
    modulePath => modulePath.length > 1 && modulePath[0] !== "constants",
  );
  if (pkgRefs.length === 0) return [];

  const projectURL = projectDirURL(projectDir);
  const deps = filterMap(pkgRefs, mPath => npmResolveWESL(mPath, projectURL));
  const uniqueDeps = [...new Set(deps)];

  return uniqueDeps;
}

/**
 * Load WeslBundle instances referenced by WESL sources.
 *
 * Parses sources to find external module references, then dynamically imports
 * the corresponding weslBundle.js files.
 *
 * @param weslSrc - Record of WESL source files by path
 * @param projectDir - Project directory for resolving imports
 * @param packageName - Optional current package name
 * @param includeCurrentPackage - Include current package in results (default: false)
 * @returns Loaded WeslBundle instances
 */
export async function dependencyBundles(
  weslSrc: Record<string, string>,
  projectDir: string,
  packageName?: string,
  includeCurrentPackage = false,
): Promise<WeslBundle[]> {
  const deps = parseDependencies(weslSrc, projectDir);
  const filteredDeps = includeCurrentPackage
    ? deps
    : otherPackages(deps, packageName);
  const projectURL = projectDirURL(projectDir);
  const bundles = filteredDeps.map(async dep => {
    const url = resolve(dep, projectURL);
    const module = await import(url);
    return module.default;
  });

  return await Promise.all(bundles);
}

/** Exclude current package from dependency list. */
function otherPackages(deps: string[], packageName?: string): string[] {
  if (!packageName) return deps;
  return deps.filter(
    dep => dep !== packageName && !dep.startsWith(`${packageName}/`),
  );
}

/** Normalize project directory to file:// URL with trailing slash. */
function projectDirURL(projectDir: string): string {
  if (projectDir.startsWith("file://")) {
    return projectDir.endsWith("/") ? projectDir : `${projectDir}/`;
  }
  const fileUrl = pathToFileURL(projectDir).href;
  return fileUrl.endsWith("/") ? fileUrl : `${fileUrl}/`;
}
