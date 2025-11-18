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

/** Load WeslBundle objects from BundleFile sources. */
export async function loadBundlesFromFiles(
  bundleFiles: BundleFile[],
): Promise<WeslBundle[]> {
  await initPromise;

  // Build registry of bundle code strings + imports (not yet evaluated)
  const registry = new Map<string, BundleInfo>();
  for (const file of bundleFiles) {
    try {
      const bundleInfo = parseBundleImports(file.content);
      const importPath = filePathToImportPath(file.name, file.packageName);
      registry.set(importPath, bundleInfo);
    } catch (error) {
      console.warn(`Failed to parse bundle ${file.name}:`, error);
    }
  }

  // Evaluate bundles in dependency order to create WeslBundle objects
  const evaluated = new Map<string, WeslBundle>();
  const bundles: WeslBundle[] = [];

  for (const [path] of registry) {
    try {
      const bundle = evaluateBundle(path, registry, evaluated);
      bundles.push(bundle);
    } catch (error) {
      console.warn(`Failed to evaluate bundle ${path}:`, error);
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
    return { varName: match[1], path: imp.n! };
  });

  return { code: exportMatch[1], imports: parsedImports };
}

// Matches: package/dist/foo/bar/weslBundle.js (captures "foo/bar")
const nestedBundlePattern = /package\/dist\/(.+)\/weslBundle\.js$/;

// Matches: package/dist/weslBundle.js
const rootBundlePattern = /package\/dist\/weslBundle\.js$/;

/** Convert bundle file path to import path (e.g., "package/dist/math/consts/weslBundle.js" => "pkg/math/consts"). */
export function filePathToImportPath(
  filePath: string,
  packageName: string,
): string {
  const multiMatch = filePath.match(nestedBundlePattern);
  if (multiMatch) return `${packageName}/${multiMatch[1]}`;

  const singleMatch = filePath.match(rootBundlePattern);
  if (singleMatch) return packageName;

  throw new Error(`Invalid bundle file path: ${filePath}`);
}

/**
 * Recursively evaluate a bundle with dependency injection.
 *
 * Uses Function() constructor to evaluate the bundle object literal with
 * dependencies injected as parameters. This avoids eval() while still allowing
 * dynamic evaluation. The dependency graph is traversed depth-first.
 *
 * Supports circular dependencies by creating a placeholder bundle before
 * evaluating dependencies, which allows cycles to resolve.
 *
 * Throws if bundle or its dependencies are not found in registry.
 */
function evaluateBundle(
  path: string,
  registry: Map<string, BundleInfo>,
  evaluated: Map<string, WeslBundle>,
): WeslBundle {
  const cached = evaluated.get(path);
  if (cached) return cached;

  const info = registry.get(path);
  if (!info) {
    throw new Error(`Bundle not found in registry: ${path}`);
  }

  // Create placeholder before recursing to handle cycles
  const placeholder = {} as WeslBundle;
  evaluated.set(path, placeholder);

  // Recursively evaluate dependencies, building parameter list
  const paramNames = info.imports.map(imp => imp.varName);
  const paramValues = info.imports.map(imp =>
    evaluateBundle(imp.path, registry, evaluated),
  );

  // Evaluate and fill placeholder with actual bundle data
  // E.g., new Function('dep', 'return { ..., dependencies: [dep] }')(depValue)
  const fn = new Function(...paramNames, `'use strict'; return ${info.code}`);
  const bundle = fn(...paramValues) as WeslBundle;
  Object.assign(placeholder, bundle);

  return placeholder;
}
