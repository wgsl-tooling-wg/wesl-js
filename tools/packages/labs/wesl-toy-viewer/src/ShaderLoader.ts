import type { WeslBundle } from "wesl";
import { findUnboundIdents, npmNameVariations, RecordResolver } from "wesl";
import type { LoadedAppState } from "./AppState.ts";
import type { BundleFile } from "./BundleEvaluator.ts";
import { buildBundleRegistry, evaluateBundleRegistry } from "./BundleEvaluator.ts";
import { fetchBundleFilesFromNpm, fetchBundleFilesFromUrl } from "./BundleLoader.ts";
import { showError } from "./Controls.ts";
import { toyRenderPipeline } from "./Gpu.ts";
import { lygiaUrl } from "./main.ts";

/** Load shader from package bundles, compile with WESL, create render pipeline. */
export async function loadAndCompileShader(
  state: LoadedAppState,
  filePath: string,
): Promise<void> {
  await withErrorHandling("load shader", async () => {
    const source = findShaderSource(state.bundles, filePath);
    if (!source) {
      throw new Error(`Shader source not found: ${filePath}`);
    }
    await compileAndRender(
      state,
      source,
      state.bundles,
      state.toyPackages.name,
    );
  });
}

/** Fetch shader source from URL, auto-detect and fetch package dependencies. */
export async function loadShaderFromUrl(
  state: LoadedAppState,
  url: string,
): Promise<void> {
  await withErrorHandling("load shader from URL", async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const source = await response.text();
    const packageNames = detectPackageDeps(source);
    const bundles = await fetchPackages(packageNames);
    await compileAndRender(state, source, bundles);
  });
}

function findShaderSource(
  bundles: WeslBundle[],
  filePath: string,
): string | undefined {
  for (const bundle of bundles) {
    if (filePath in bundle.modules) {
      return bundle.modules[filePath];
    }
  }
  return undefined;
}

async function compileAndRender(
  state: LoadedAppState,
  source: string,
  bundles: WeslBundle[],
  packageName?: string,
): Promise<void> {
  state.currentShaderSource = source;
  displaySource(source);
  await toyRenderPipeline(state, source, bundles, packageName);
}

async function withErrorHandling(
  operation: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    showError("");
    await fn();
  } catch (error) {
    showError(`Failed to ${operation}: ${error}`);
    console.error(error);
  }
}

/** Display shader source code in the UI. */
function displaySource(source: string): void {
  const sourceEl = document.querySelector<HTMLPreElement>("#source-code");
  if (sourceEl) {
    sourceEl.textContent = source;
  }
}

/** Detect external package dependencies from shader source. */
function detectPackageDeps(source: string): string[] {
  const resolver = new RecordResolver({ "./main.wesl": source });
  const unbound = findUnboundIdents(resolver);
  // Filter: skip virtual modules (constants, test)
  const pkgRefs = unbound.filter(p => p[0] !== "constants" && p[0] !== "test");
  // Extract unique first segments (WESL package identifiers)
  const pkgIds = pkgRefs.map(p => p[0]);
  return [...new Set(pkgIds)];
}

/** Fetch WESL bundles for packages, auto-fetching transitive deps on demand. */
async function fetchPackages(pkgIds: string[]): Promise<WeslBundle[]> {
  const loaded = new Set<string>();

  // Fetch initial packages
  const initialFiles = await Promise.all(pkgIds.map(id => fetchOnePackage(id, loaded)));
  const registry = await buildBundleRegistry(initialFiles.flat());

  // Evaluate with auto-fetching of transitive deps
  return evaluateBundleRegistry(registry, id => fetchOnePackage(id, loaded));
}

/** Fetch bundle files for a single package, mark as loaded. */
async function fetchOnePackage(
  pkgId: string,
  loaded: Set<string>,
): Promise<BundleFile[]> {
  if (loaded.has(pkgId)) return []; // already loaded
  loaded.add(pkgId);

  // Special case for lygia - use custom tgz URL (npm package is outdated)
  if (pkgId === "lygia") {
    return fetchBundleFilesFromUrl(lygiaUrl);
  }

  for (const npmName of npmNameVariations(pkgId)) {
    try {
      return await fetchBundleFilesFromNpm(npmName);
    } catch {
      // Try next variation
    }
  }
  console.warn(`Package not found: ${pkgId}`);
  return [];
}
