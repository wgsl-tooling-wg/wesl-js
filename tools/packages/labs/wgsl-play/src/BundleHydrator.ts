import { init, parse } from "es-module-lexer";
import type { WeslBundle } from "wesl";

// Initialize es-module-lexer WASM once at module load
const initPromise = init;

/**
 * Bundle hydration for WESL packages.
 *
 * Takes bundle JS source files (strings) and returns WeslBundle objects with
 * resolved cross-references. Each bundle file is an ES module that exports a
 * `weslBundle` object containing shader source and metadata, and declares
 * dependencies via imports:
 *
 *   import dependency from "other-package";
 *   export const weslBundle = { ..., dependencies: [dependency] };
 *
 * We use es-module-lexer to parse imports without executing code, reconstruct
 * the dependency graph, then hydrate bundles in dependency order using
 * Function() constructor with dependency injection. Returns WeslBundle objects
 * where dependency references are resolved to actual bundle objects.
 */

// This relies the generated weslBundle.js using a conventional format. LATER generalize

/** Bundle file from filesystem, tgz, or network source. (i.e. a weslBundle.js file) */
export interface WeslBundleFile {
  /** for debug, normally weslBundle.js */
  packagePath: string;

  /** JavaScript source code */
  content: string;

  /** name of the wesl package (the npm package name, sanitized to remove @ and -) */
  packageName: string;
}

interface BundleInfo {
  /** JavaScript source containing the weslBundle object literal */
  bundleLiteral: string;

  imports: Array<{ varName: string; path: string }>;
}

/** Registry of parsed bundle info, keyed by import path. */
export type BundleRegistry = Map<string, BundleInfo>;

/** Fetcher callback for loading missing packages on-demand. */
type PackageFetcher = (pkgName: string) => Promise<WeslBundleFile[]>;

// Matches: package/dist/foo/bar/weslBundle.js (captures "foo/bar")
const nestedBundlePattern = /package\/dist\/(.+)\/weslBundle\.js$/;

// Matches: package/dist/weslBundle.js
const rootBundlePattern = /package\/dist\/weslBundle\.js$/;

/** Load WeslBundle objects from BundleFile sources. */
export async function loadBundlesFromFiles(
  bundleFiles: WeslBundleFile[],
): Promise<WeslBundle[]> {
  const registry = await bundleRegistry(bundleFiles);
  return hydrateBundleRegistry(registry);
}

/** Parse bundle files into a registry without hydrating. */
export async function bundleRegistry(
  bundleFiles: WeslBundleFile[],
  registry: BundleRegistry = new Map(),
): Promise<BundleRegistry> {
  await initPromise;
  for (const file of bundleFiles) {
    const { content, packagePath, packageName } = file;
    const bundleInfo = parseBundleImports(content);
    const modulePath = filePathToModulePath(packagePath, packageName);
    registry.set(modulePath, bundleInfo);
  }
  return registry;
}

/** Hydrate bundles, optionally fetching missing packages on-demand. */
export async function hydrateBundleRegistry(
  registry: BundleRegistry,
  fetcher?: PackageFetcher,
): Promise<WeslBundle[]> {
  const hydrated = new Map<string, WeslBundle>();
  const bundles: WeslBundle[] = [];
  for (const path of registry.keys()) {
    bundles.push(await hydrateBundle(path, registry, hydrated, fetcher));
  }
  return bundles;
}

// Matches: export const weslBundle = { ... };
const weslBundleExportPattern =
  /export\s+const\s+weslBundle\s*=\s*({[\s\S]+});?\s*$/m;

// Matches: import foo from "package" (captures "foo")
const importVarPattern = /import\s+(\w+)\s+from/;

/** Parse ES module imports from bundle code using es-module-lexer.  */
function parseBundleImports(code: string): BundleInfo {
  const exportMatch = code.match(weslBundleExportPattern);
  if (!exportMatch) {
    throw new Error("Could not find weslBundle export in bundle");
  }

  const [imports] = parse(code);
  const parsedImports = imports.map(imp => {
    const statement = code.slice(imp.ss, imp.se);
    const match = statement.match(importVarPattern);
    if (!match) {
      throw new Error(
        `Could not parse import variable name from: ${statement}`,
      );
    }
    return { varName: match[1], path: imp.n!.replace(/\//g, "::") };
  });

  return { bundleLiteral: exportMatch[1], imports: parsedImports };
}

/**
 * Recursively hydrate a bundle with dependency injection.
 *
 * Uses Function() constructor to evaluate the bundle object literal with
 * dependencies injected as parameters. Supports circular dependencies via
 * placeholder objects.
 *
 * If fetcher is provided and a dependency is missing, fetches the package
 * on-demand, adds to registry, and continues. Otherwise throws on missing deps.
 */
async function hydrateBundle(
  path: string,
  registry: BundleRegistry,
  hydrated: Map<string, WeslBundle>,
  fetcher?: PackageFetcher,
): Promise<WeslBundle> {
  const cached = hydrated.get(path);
  if (cached) return cached;

  let info = registry.get(path);
  if (!info) {
    if (!fetcher) throw new Error(`Bundle not found in registry: ${path}`);

    const pkgName = path.split("::")[0];
    const files = await fetcher(pkgName);
    await bundleRegistry(files, registry);
    info = registry.get(path);
    if (!info) throw new Error(`Bundle not found after fetch: ${path}`);
  }

  // Create placeholder before recursing to handle cycles
  const placeholder = {} as WeslBundle;
  hydrated.set(path, placeholder);

  // Recursively hydrate dependencies (will auto-fetch if missing)
  const paramNames = info.imports.map(imp => imp.varName);
  const paramValues = await Promise.all(
    info.imports.map(imp =>
      hydrateBundle(imp.path, registry, hydrated, fetcher),
    ),
  );

  // Hydrate and fill placeholder with actual bundle data
  const fn = new Function(
    ...paramNames,
    `'use strict'; return ${info.bundleLiteral}`,
  );
  const bundle = fn(...paramValues) as WeslBundle;
  Object.assign(placeholder, bundle);

  return placeholder;
}

/** Convert bundle file path to module path (e.g., "package/dist/math/consts/weslBundle.js" => "pkg::math::consts"). */
function filePathToModulePath(filePath: string, packageName: string): string {
  const multiMatch = filePath.match(nestedBundlePattern);
  if (multiMatch) {
    const subpath = multiMatch[1].replace(/\//g, "::");
    return `${packageName}::${subpath}`;
  }

  const singleMatch = filePath.match(rootBundlePattern);
  if (singleMatch) return packageName;

  throw new Error(`Invalid bundle file path: ${filePath}`);
}
