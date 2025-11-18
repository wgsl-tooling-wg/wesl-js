import type { WeslBundle } from "wesl";
import type { LoadedAppState } from "./AppState.ts";
import { showError } from "./Controls.ts";
import { toyRenderPipeline } from "./Gpu.ts";

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

/** Fetch shader source from URL, compile without package dependencies. */
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
    await compileAndRender(state, source, []);
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
