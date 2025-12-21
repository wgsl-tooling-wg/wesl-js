/**
 * Module Discovery Phase
 *
 * Before linking, we run a discovery phase to find and fetch all needed modules.
 * This uses a lightweight binding pass (findUnboundIdents) that walks the scope tree
 * to find module references without fully resolving them.
 *
 * Module paths (e.g., foo::bar::baz) come from import statements or inline qualified
 * references. We categorize them as:
 *   - internal: package:: and super:: paths, fetched from local URLs (shaderRoot)
 *   - external: other packages, fetched from npm
 *
 * The discovery loop uses FetchingResolver which provides:
 *   - Sync resolveModule() for findUnboundIdents compatibility
 *   - Async resolveModuleAsync() as prototype for future async BindIdents
 *
 * When wesl gets async BindIdents, the shim loop disappears and BindIdents
 * will call resolveModuleAsync directly.
 */

import type { WeslBundle } from "wesl";
import {
  fileToModulePath,
  findUnboundIdents,
  npmNameVariations,
  partition,
} from "wesl";
import type { WeslBundleFile } from "./BundleHydrator.ts";
import { bundleRegistry, hydrateBundleRegistry } from "./BundleHydrator.ts";
import { fetchBundleFilesFromNpm } from "./BundleLoader.ts";
import { getConfig, type WgslPlayConfig } from "./Config.ts";
import { FetchingResolver } from "./FetchingResolver.ts";

/** Resolved sources ready for the linker. */
export interface ResolvedSources {
  /** All sources keyed by module path. */
  weslSrc: Record<string, string>;
  libs: WeslBundle[];
  /** Module name for the root/main module. */
  rootModuleName?: string;
}

const virtualModules = ["constants", "test"];

/** Resolve dependencies: internal modules via HTTP, external packages from npm. */
export async function fetchDependencies(
  rootModuleSource: string,
  configOverrides?: Partial<WgslPlayConfig>,
  currentPath?: string,
  existingSources?: Record<string, string>,
): Promise<ResolvedSources> {
  const config = getConfig(configOverrides);
  const rootModuleName = currentPath
    ? urlToModulePath(currentPath, config.shaderRoot)
    : "package::main";
  const initialSources = {
    ...existingSources,
    [rootModuleName]: rootModuleSource,
  };
  const resolverOpts = {
    shaderRoot: config.shaderRoot,
    srcModulePath: currentPath,
  };
  const resolver = new FetchingResolver(initialSources, resolverOpts);

  const libs: WeslBundle[] = [];
  const fetched = new Set<string>();

  // Discovery loop (LATER we'll make BindIdents async, and this can go away)
  while (true) {
    findUnboundIdents(resolver);

    const unresolved = getNonVirtualUnresolved(resolver, fetched);
    if (unresolved.length === 0) break;

    const [internal, external] = partition(unresolved, isInternal);
    await Promise.all(internal.map(p => resolver.resolveModuleAsync(p)));

    const newLibs = await fetchExternalBundles(external, fetched);
    libs.push(...newLibs);
  }

  const weslSrc = extractWeslSrc(resolver);
  return { libs, weslSrc };
}

/** Load shader from URL, resolving all dependencies. */
export async function loadShaderFromUrl(
  url: string,
  configOverrides?: Partial<WgslPlayConfig>,
): Promise<ResolvedSources> {
  const source = await fetchText(url);
  const currentPath = new URL(url, window.location.href).pathname;
  const config = getConfig(configOverrides);
  const rootModuleName = urlToModulePath(currentPath, config.shaderRoot);
  const { weslSrc, libs } = await fetchDependencies(
    source,
    configOverrides,
    currentPath,
  );
  return { weslSrc, libs, rootModuleName };
}

function getNonVirtualUnresolved(
  resolver: FetchingResolver,
  fetched: Set<string>,
): string[] {
  return resolver.getUnresolved().filter(p => {
    const pkg = p.split("::")[0];
    return !virtualModules.includes(pkg) && !fetched.has(pkg);
  });
}

function isInternal(modulePath: string): boolean {
  return modulePath.startsWith("package::") || modulePath.startsWith("super::");
}

/** Extract all sources from resolver (including main). */
function extractWeslSrc(resolver: FetchingResolver): Record<string, string> {
  const weslSrc: Record<string, string> = {};
  for (const [path] of resolver.allModules()) {
    if (resolver.sources[path]) {
      weslSrc[path] = resolver.sources[path];
    }
  }
  return weslSrc;
}

/** Fetch external packages from npm. */
async function fetchExternalBundles(
  modulePaths: string[],
  fetched: Set<string>,
): Promise<WeslBundle[]> {
  const pkgNames = [...new Set(modulePaths.map(p => p.split("::")[0]))];
  const newPkgs = pkgNames.filter(p => !fetched.has(p));
  if (newPkgs.length === 0) return [];

  for (const p of newPkgs) fetched.add(p);
  return fetchPackagesFromNpm(newPkgs);
}

/** Fetch WESL bundles from npm, auto-fetching dependencies recursively. */
async function fetchPackagesFromNpm(pkgIds: string[]): Promise<WeslBundle[]> {
  const loaded = new Set<string>();

  const promisedBundles = pkgIds.map(id => fetchOnePackage(id, loaded));
  const initialFiles = await Promise.all(promisedBundles);
  const registry = await bundleRegistry(initialFiles.flat());

  return hydrateBundleRegistry(registry, id => fetchOnePackage(id, loaded));
}

/** Fetch bundle files for a single package. */
async function fetchOnePackage(
  pkgId: string,
  loaded: Set<string>,
): Promise<WeslBundleFile[]> {
  if (loaded.has(pkgId)) return [];
  loaded.add(pkgId);

  for (const npmName of npmNameVariations(pkgId)) {
    try {
      return await fetchBundleFilesFromNpm(npmName);
    } catch {
      // Try next variation
    }
  }
  throw new Error(`Package not found: ${pkgId}`);
}

/** Convert URL path to module path (e.g., "/shaders/effects/main.wesl" -> "package::effects::main"). */
function urlToModulePath(urlPath: string, shaderRoot: string): string {
  const cleanRoot = shaderRoot.replace(/\/$/, "");
  const relativePath = urlPath.replace(cleanRoot, "").replace(/^\//, "");
  return fileToModulePath(relativePath, "package", false);
}

/** Fetch text content from URL. */
async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.text();
}
