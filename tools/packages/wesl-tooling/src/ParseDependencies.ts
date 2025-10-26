import { pathToFileURL } from "node:url";
import { resolve } from "import-meta-resolve";
import type { WeslBundle } from "wesl";
import { filterMap, ParsedRegistry, WeslParseError } from "wesl";
import { findUnboundIdents } from "./FindUnboundIdents.ts";

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
  let registry: ParsedRegistry;
  try {
    registry = new ParsedRegistry(weslSrc);
  } catch (e: any) {
    if (e.cause instanceof WeslParseError) {
      console.error(e.message, "\n");
      return [];
    }
    throw e;
  }

  const unbound = findUnboundIdents(registry);
  if (!unbound) return [];

  // Filter: skip builtins (1 segment) and linker virtuals ('constants')
  const pkgRefs = unbound.filter(
    modulePath => modulePath.length > 1 && modulePath[0] !== "constants",
  );
  if (pkgRefs.length === 0) return [];

  const projectURL = projectDirURL(projectDir);
  const deps = filterMap(pkgRefs, mPath =>
    unboundToDependency(mPath, projectURL),
  );
  const uniqueDeps = [...new Set(deps)];

  return uniqueDeps;
}

/** Find longest resolvable npm subpath from module path segments.
 *
 * @param mPath - Module path segments (e.g., ['foo', 'bar', 'baz', 'elem'])
 * @param importerURL - Base URL for resolution (e.g., 'file:///path/to/project/')
 * @returns Longest resolvable subpath (e.g., 'foo/bar/baz' or 'foo')
 */
function unboundToDependency(
  mPath: string[],
  importerURL: string,
): string | undefined {
  // Try longest subpaths first; resolved file may not exist yet (e.g., dist/weslBundle.js)
  return [...exportSubpaths(mPath)].find(subPath =>
    tryResolve(subPath, importerURL),
  );
}

/** Try Node.js module resolution; returns undefined if unresolvable. */
function tryResolve(path: string, importerURL: string): string | undefined {
  try {
    return resolve(path, importerURL);
  } catch {
    return undefined;
  }
}

/** Yield possible export subpaths from module path, longest first.
 * Drops the last segment (element name) and iterates down. */
function* exportSubpaths(mPath: string[]): Generator<string> {
  const longest = mPath.length - 1;
  for (let i = longest; i >= 0; i--) {
    yield mPath.slice(0, i).join("/");
  }
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
