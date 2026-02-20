import { resolve } from "resolve.exports";
import type { WeslBundle } from "wesl";
import { findUnboundIdents, RecordResolver } from "wesl";
import type { WeslBundleFile } from "./BundleHydrator.ts";
import { bundleRegistry, hydrateBundleRegistry } from "./BundleHydrator.ts";

/** Loaded sources for source mode. */
export interface SourcePackage {
  sources: Record<string, string>;
  packageName: string;
}

/** Resolution mode for package loading. (Note: disconnected from main flow) */
type PackageMode = "source" | "bundle";

/** Cached package.json data. */
interface PackageJson {
  name: string;
  exports?: Record<string, unknown>;
}

const packageJsonCache = new Map<string, PackageJson>();

/** Fetch packages from HTTP base URL in bundle or source mode. */
export async function fetchPackagesFromHttp(
  pkgNames: string[],
  packageBase: string,
  mode: PackageMode,
): Promise<WeslBundle[] | SourcePackage[]> {
  if (mode === "source") {
    return fetchSourcePackages(pkgNames, packageBase);
  }
  return fetchBundlePackages(pkgNames, packageBase);
}

/** Clear package.json cache (useful for testing). */
export function clearHttpCache(): void {
  packageJsonCache.clear();
}

/** Fetch raw .wesl source files for source mode using findUnboundIdents. */
async function fetchSourcePackages(
  pkgNames: string[],
  packageBase: string,
): Promise<SourcePackage[]> {
  const results: SourcePackage[] = [];
  for (const pkgName of pkgNames) {
    const pkg = await fetchSourcePackage(pkgName, packageBase);
    results.push(pkg);
  }
  return results;
}

/** Fetch weslBundle.js files for bundle mode. */
async function fetchBundlePackages(
  pkgNames: string[],
  packageBase: string,
): Promise<WeslBundle[]> {
  const loaded = new Set<string>();
  const allFiles: WeslBundleFile[] = [];

  for (const pkgName of pkgNames) {
    const files = await fetchBundlePackage(pkgName, packageBase, loaded);
    allFiles.push(...files);
  }

  const registry = await bundleRegistry(allFiles);
  return hydrateBundleRegistry(registry, pkgId =>
    fetchBundlePackage(pkgId, packageBase, loaded),
  );
}

/** Fetch a single package's source files starting from lib.wesl. */
async function fetchSourcePackage(
  pkgName: string,
  packageBase: string,
): Promise<SourcePackage> {
  const sources: Record<string, string> = {};
  const fetched = new Set<string>();
  const pending = ["lib"];

  while (pending.length > 0) {
    const modulePath = pending.pop()!;
    if (fetched.has(modulePath)) continue;
    fetched.add(modulePath);

    const source = await fetchSourceFile(pkgName, modulePath, packageBase);
    if (!source) continue;

    const fileName = modulePath === "lib" ? "lib.wgsl" : `${modulePath}.wesl`;
    sources[fileName] = source;

    const internalRefs = findInternalReferences(source, pkgName);
    for (const ref of internalRefs) {
      if (!fetched.has(ref)) pending.push(ref);
    }
  }

  return { sources, packageName: pkgName };
}

/** Fetch bundle files for a single package. */
async function fetchBundlePackage(
  pkgName: string,
  packageBase: string,
  loaded: Set<string>,
): Promise<WeslBundleFile[]> {
  if (loaded.has(pkgName)) return [];
  loaded.add(pkgName);

  const pkg = await fetchPackageJson(pkgName, packageBase);
  if (!pkg) {
    throw new Error(`Could not fetch package.json for ${pkgName}`);
  }

  const bundleFiles: WeslBundleFile[] = [];

  // Try root bundle first (single-bundle package)
  const rootBundlePath = resolveBundlePath(pkg, ".");
  if (rootBundlePath) {
    const content = await fetchBundleFile(pkgName, rootBundlePath, packageBase);
    if (content) {
      bundleFiles.push({
        packagePath: `package/${rootBundlePath}`,
        content,
        packageName: pkgName,
      });
    }
  }

  // For multi-bundle packages, bundles are fetched on-demand by the hydrator

  return bundleFiles;
}

/** Fetch a single source file, trying various paths and extensions. */
async function fetchSourceFile(
  pkgName: string,
  modulePath: string,
  packageBase: string,
): Promise<string | null> {
  const basePath = modulePath === "lib" ? "lib" : modulePath;
  const prefixes = ["", "shaders/", "src/"];
  const extensions = ["wesl", "wgsl"];

  for (const prefix of prefixes) {
    for (const ext of extensions) {
      const url = normalizeUrl(
        `${packageBase}/${pkgName}/${prefix}${basePath}.${ext}`,
      );
      try {
        const response = await fetch(url);
        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          // Skip HTML error pages (Vite returns 200 with HTML for missing files)
          if (contentType.includes("text/html")) continue;
          return response.text();
        }
      } catch {
        // Try next combination
      }
    }
  }
  return null;
}

/** Find references to modules within the same package. */
function findInternalReferences(source: string, pkgName: string): string[] {
  const resolver = new RecordResolver(
    { main: source },
    { packageName: pkgName },
  );
  const unbound = findUnboundIdents(resolver);
  return unbound
    .filter(path => path[0] === pkgName && path.length > 1)
    .map(path => path.slice(1).join("/"));
}

/** Fetch and cache package.json. */
async function fetchPackageJson(
  pkgName: string,
  packageBase: string,
): Promise<PackageJson | null> {
  const key = `${packageBase}/${pkgName}`;
  const cached = packageJsonCache.get(key);
  if (cached) return cached;

  const url = normalizeUrl(`${packageBase}/${pkgName}/package.json`);
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const pkg = await response.json();
    packageJsonCache.set(key, pkg);
    return pkg;
  } catch {
    return null;
  }
}

/** Resolve bundle path using package.json exports via resolve.exports library. */
function resolveBundlePath(pkg: PackageJson, subpath: string): string | null {
  if (!pkg.exports) {
    // No exports field - assume single bundle at dist/weslBundle.js
    return "dist/weslBundle.js";
  }

  try {
    const resolved = resolve(pkg, subpath);
    if (resolved) {
      const path = Array.isArray(resolved) ? resolved[0] : resolved;
      return path.startsWith("./") ? path.slice(2) : path;
    }
  } catch {
    // resolve.exports throws on no match
  }

  return null;
}

/** Fetch a single bundle file. */
async function fetchBundleFile(
  pkgName: string,
  bundlePath: string,
  packageBase: string,
): Promise<string | null> {
  const url = normalizeUrl(`${packageBase}/${pkgName}/${bundlePath}`);
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  }
}

/** Normalize URL by removing double slashes (except after protocol). */
function normalizeUrl(url: string): string {
  return url.replace(/([^:])\/+/g, "$1/");
}
