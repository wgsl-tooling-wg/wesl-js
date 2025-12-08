import type { WeslBundle } from "wesl";
import { findUnboundIdents, npmNameVariations, RecordResolver } from "wesl";
import type { WeslBundleFile } from "./BundleHydrator.ts";
import { bundleRegistry, hydrateBundleRegistry } from "./BundleHydrator.ts";
import {
  fetchBundleFilesFromNpm,
  fetchBundleFilesFromUrl,
  lygiaTgzUrl,
} from "./BundleLoader.ts";

/** Shader source with resolved dependency bundles. */
export interface ShaderWithDeps {
  source: string;
  bundles: WeslBundle[];
}

/** Fetch bundles for external dependencies detected in shader source. */
export async function fetchDependenciesForSource(
  source: string,
): Promise<WeslBundle[]> {
  const packageNames = detectPackageDeps(source);
  return fetchPackages(packageNames);
}

/** Load shader text from a url and recursively fetch imported bundles */
export async function loadShaderFromUrl(url: string): Promise<ShaderWithDeps> {
  const source = await fetchShaderSource(url);
  const packageNames = detectPackageDeps(source);
  const bundles = await fetchPackages(packageNames);
  return { source, bundles };
}

/** Detect external package dependencies from shader source. */
function detectPackageDeps(source: string): string[] {
  const resolver = new RecordResolver({ "./main.wesl": source });
  const unbound = findUnboundIdents(resolver);
  const pkgRefs = unbound.filter(p => p[0] !== "constants" && p[0] !== "test"); // LATER make dynamic
  const weslPackages = pkgRefs.map(p => p[0]);
  return [...new Set(weslPackages)];
}

/** Fetch WESL bundles for packages, auto-fetching dependencies recursively. */
async function fetchPackages(pkgIds: string[]): Promise<WeslBundle[]> {
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
  if (loaded.has(pkgId)) return []; // already loaded
  loaded.add(pkgId);

  // Special case for lygia - use custom tgz URL (npm package is outdated)
  if (pkgId === "lygia") {
    return fetchBundleFilesFromUrl(lygiaTgzUrl);
  }

  for (const npmName of npmNameVariations(pkgId)) {
    try {
      return await fetchBundleFilesFromNpm(npmName);
    } catch {
      // Try next variation
    }
  }
  throw new Error(`Package not found: ${pkgId}`);
}

/** Fetch shader source from URL. */
async function fetchShaderSource(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.text();
}
