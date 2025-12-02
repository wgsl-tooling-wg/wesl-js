import { init, parse } from "es-module-lexer";
import type { WeslBundle } from "wesl";

/**
 * Bundle evaluation for WESL packages.
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
 * the dependency graph, then evaluate bundles in dependency order using
 * Function() constructor with dependency injection. Returns WeslBundle objects
 * where dependency references are resolved to actual bundle objects.
 */

// Initialize es-module-lexer WASM once at module load
const initPromise = init;

/** Bundle file from filesystem, tgz, or network source. */
export interface BundleFile {
  name: string;
  content: string;
  packageName: string;
}

interface BundleInfo {
  code: string; // JavaScript source containing the weslBundle object literal
  imports: Array<{ varName: string; path: string }>;
}

/** Registry of parsed bundle info, keyed by import path. */
export type BundleRegistry = Map<string, BundleInfo>;

/** Load WeslBundle objects from BundleFile sources. */
export async function loadBundlesFromFiles(
  bundleFiles: BundleFile[],
): Promise<WeslBundle[]> {
  const registry = await buildBundleRegistry(bundleFiles);
  return evaluateBundleRegistry(registry); // no fetcher = throws on missing deps
}

/** Parse bundle files into a registry without evaluating. */
export async function buildBundleRegistry(
  bundleFiles: BundleFile[],
  registry: BundleRegistry = new Map(),
): Promise<BundleRegistry> {
  await initPromise;
  for (const file of bundleFiles) {
    try {
      const bundleInfo = parseBundleImports(file.content);
      const modulePath = filePathToModulePath(file.name, file.packageName);
      registry.set(modulePath, bundleInfo);
    } catch (error) {
      console.warn(`Failed to parse bundle ${file.name}:`, error);
    }
  }
  return registry;
}

/** Fetcher callback for loading missing packages on-demand. */
export type PackageFetcher = (pkgName: string) => Promise<BundleFile[]>;

/**
 * Evaluate bundles, optionally fetching missing packages on-demand.
 * If fetcher provided: auto-fetches missing deps during evaluation.
 * If no fetcher: skips bundles with missing deps (partial load).
 */
export async function evaluateBundleRegistry(
  registry: BundleRegistry,
  fetcher?: PackageFetcher,
): Promise<WeslBundle[]> {
  const evaluated = new Map<string, WeslBundle>();
  const bundles: WeslBundle[] = [];
  for (const path of registry.keys()) {
    try {
      bundles.push(await evaluateBundle(path, registry, evaluated, fetcher));
    } catch (e) {
      // Skip bundles with missing deps when no fetcher provided
      if (fetcher) throw e;
    }
  }
  return bundles;
}

// Matches: export const weslBundle = { ... };
const weslBundleExportPattern =
  /export\s+const\s+weslBundle\s*=\s*({[\s\S]+});?\s*$/m;

// Matches: import foo from "package" (captures "foo")
const importVarPattern = /import\s+(\w+)\s+from/;

/** Parse ES module imports from bundle code using es-module-lexer. */
export function parseBundleImports(code: string): BundleInfo {
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

  return { code: exportMatch[1], imports: parsedImports };
}

// Matches: package/dist/foo/bar/weslBundle.js (captures "foo/bar")
const nestedBundlePattern = /package\/dist\/(.+)\/weslBundle\.js$/;

// Matches: package/dist/weslBundle.js
const rootBundlePattern = /package\/dist\/weslBundle\.js$/;

/** Convert bundle file path to module path (e.g., "package/dist/math/consts/weslBundle.js" => "pkg::math::consts"). */
export function filePathToModulePath(
  filePath: string,
  packageName: string,
): string {
  const multiMatch = filePath.match(nestedBundlePattern);
  if (multiMatch) {
    const subpath = multiMatch[1].replace(/\//g, "::");
    return `${packageName}::${subpath}`;
  }

  const singleMatch = filePath.match(rootBundlePattern);
  if (singleMatch) return packageName;

  throw new Error(`Invalid bundle file path: ${filePath}`);
}

/**
 * Recursively evaluate a bundle with dependency injection.
 *
 * Uses Function() constructor to evaluate the bundle object literal with
 * dependencies injected as parameters. Supports circular dependencies via
 * placeholder objects.
 *
 * If fetcher is provided and a dependency is missing, fetches the package
 * on-demand, adds to registry, and continues. Otherwise throws on missing deps.
 */
async function evaluateBundle(
  path: string,
  registry: BundleRegistry,
  evaluated: Map<string, WeslBundle>,
  fetcher?: PackageFetcher,
): Promise<WeslBundle> {
  const cached = evaluated.get(path);
  if (cached) return cached;

  let info = registry.get(path);
  if (!info) {
    if (!fetcher) throw new Error(`Bundle not found in registry: ${path}`);

    // Fetch missing package and add to registry
    // LATER: read package.json from tgz to get version constraints for deps,
    // then fetch specific versions instead of latest
    const pkgName = path.split("::")[0];
    const files = await fetcher(pkgName);
    await buildBundleRegistry(files, registry);
    info = registry.get(path);
    if (!info) throw new Error(`Bundle not found after fetch: ${path}`);
  }

  // Create placeholder before recursing to handle cycles
  const placeholder = {} as WeslBundle;
  evaluated.set(path, placeholder);

  // Recursively evaluate dependencies (will auto-fetch if missing)
  const paramNames = info.imports.map(imp => imp.varName);
  const paramValues = await Promise.all(
    info.imports.map(imp =>
      evaluateBundle(imp.path, registry, evaluated, fetcher),
    ),
  );

  // Evaluate and fill placeholder with actual bundle data
  const fn = new Function(...paramNames, `'use strict'; return ${info.code}`);
  const bundle = fn(...paramValues) as WeslBundle;
  Object.assign(placeholder, bundle);

  return placeholder;
}
