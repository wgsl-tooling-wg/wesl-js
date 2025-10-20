import path from "node:path";
import { pathToFileURL } from "node:url";
import { resolve } from "import-meta-resolve";
import type { WeslBundle } from "wesl";
import {
  filterMap,
  findUnboundIdents,
  parsedRegistry,
  parseIntoRegistry,
  WeslParseError,
} from "wesl";

/**
 * Find the wesl package dependencies in a set of WESL files
 * (for packaging WESL files into a library)
 *
 * Parse the WESL files and partially bind the identifiers,
 * returning any identifiers that are not succesfully bound.
 * Those identifiers are the package dependencies.
 *
 * The dependency might be a default export bundle or
 * a named export bundle. e.g. for 'foo::bar::baz', it could be
 *    . package foo, export '.' bundle, module bar
 *    . package foo, export './bar' bundle, element baz
 *    . package foo, export './bar/baz' bundle, module lib.wesl, element baz
 * To distinguish these, we node resolve the longest path we can.
 */
export function parseDependencies(
  weslSrc: Record<string, string>,
  projectDir: string,
): string[] {
  const registry = parsedRegistry();
  try {
    parseIntoRegistry(weslSrc, registry);
  } catch (e: any) {
    if (e.cause instanceof WeslParseError) {
      console.error(e.message, "\n");
    } else {
      throw e;
    }
  }

  const unbound = findUnboundIdents(registry);
  if (!unbound) return [];

  // a package module reference needs at least two segments (length 1 is probably a builtin wgsl fn or type)
  // filter out virtual packages like 'constants' that are provided by the linker
  const pkgRefs = unbound.filter(
    modulePath => modulePath.length > 1 && modulePath[0] !== "constants",
  );
  if (pkgRefs.length === 0) return [];

  const fullProjectDir = path.resolve(path.join(projectDir, "foo"));
  const projectURL = pathToFileURL(fullProjectDir).href;
  const deps = filterMap(pkgRefs, mPath =>
    unboundToDependency(mPath, projectURL),
  );
  const uniqueDeps = [...new Set(deps)];

  return uniqueDeps;
}

/**
 * Find the longest resolvable npm subpath from a module path.
 *
 * @param mPath module path, e.g. ['foo', 'bar', 'baz', 'elem']
 * @param importerURL URL of the importer, e.g. 'file:///path/to/project/foo/bar/baz.wesl' (doesn't need to be a real file)
 * @returns longest resolvable subpath of mPath, e.g. 'foo/bar/baz' or 'foo/bar'
 */
function unboundToDependency(
  mPath: string[],
  importerURL: string,
): string | undefined {
  // return the longest subpath that can be resolved
  return [...exportSubpaths(mPath)].find(subPath =>
    // Note that we're not checking here that the resolved file exists.
    // The file (a weslBundle.js file somewhere in dist) may not have been built yet.
    // LATER we could do save these paths and check that the resolved files exist.
    tryResolve(subPath, importerURL),
  );
}

/** Try to resolve a path using node's resolve algorithm.
 * @return the resolved path */
function tryResolve(path: string, importerURL: string): string | undefined {
  try {
    return resolve(path, importerURL); // resolve() throws if the path is not resolvable.
  } catch {
    return undefined;
  }
}

/**
 * Yield possible export entry subpaths from module path
 * longest subpath first.
 */
function* exportSubpaths(mPath: string[]): Generator<string> {
  const longest = mPath.length - 1; // drop the last segment (the element name)
  for (let i = longest; i >= 0; i--) {
    const subPath = mPath.slice(0, i).join("/");
    yield subPath;
  }
}

/** @return WeslBundle instances referenced by wesl sources
 *
 * Parse the WESL files to find references to external WESL modules,
 * and then load those modules (weslBundle.js files) using node dynamic imports.
 */
export async function dependencyBundles(
  weslSrc: Record<string, string>,
  projectDir: string,
): Promise<WeslBundle[]> {
  const deps = parseDependencies(weslSrc, projectDir);
  const projectDirAbs = path.resolve(path.join(projectDir, "dummy.js"));
  const projectURL = pathToFileURL(projectDirAbs).href;
  const bundles = deps.map(async dep => {
    const url = resolve(dep, projectURL);
    const module = await import(url);
    return module.default;
  });

  return await Promise.all(bundles);
}
