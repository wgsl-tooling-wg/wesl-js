import { resolve } from "import-meta-resolve";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  filterMap,
  parsedRegistry,
  parseIntoRegistry,
  WeslParseError,
} from "wesl";
import { findUnboundIdents } from "../../wesl/src/BindIdents.ts";

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
  const pkgRefs = unbound.filter(modulePath => modulePath.length > 1);
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
 * @param mPath module path, e.g. ['foo', 'bar', 'baz']
 * @param importerURL URL of the importer, e.g. 'file:///path/to/project/foo/bar/baz.wesl' (doesn't need to be a real file)
 * @returns longest resolvable subpath of mPath, e.g. 'foo/bar/baz' or 'foo/bar'
 */
function unboundToDependency(
  mPath: string[],
  importerURL: string,
): string | undefined {
  for (let i = mPath.length; i >= 0; i--) {
    const subPath = mPath.slice(0, i).join("/");
    try {
      resolve(subPath, importerURL);
      return subPath;
    } catch {
      // if the subPath cannot be resolved try a shorter version
      continue;
    }
  }
  return undefined;
}
