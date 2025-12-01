import type { WeslBundle } from "wesl";
import { findUnboundIdents, npmNameVariations, RecordResolver } from "wesl";
import type { LoadedAppState } from "./AppState.ts";
import { loadBundlesWithPackageName } from "./BundleLoader.ts";
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

/** Fetch WESL bundles for detected packages from npm. */
async function fetchPackages(pkgIds: string[]): Promise<WeslBundle[]> {
  const results = await Promise.all(pkgIds.map(loadPackage));
  return results.flat();
}

/** Load package by trying npm name variations sequentially. */
async function loadPackage(pkgId: string): Promise<WeslBundle[]> {
  // Special case for lygia - use custom URL instead of npm
  if (pkgId === "lygia") {
    const { bundles } = await loadBundlesWithPackageName(lygiaUrl);
    return bundles;
  }

  for (const npmName of npmNameVariations(pkgId)) {
    try {
      const { bundles } = await loadBundlesWithPackageName(npmName);
      return bundles;
    } catch {
      // Try next variation
    }
  }
  throw new Error(`Package not found: ${pkgId}`);
}
