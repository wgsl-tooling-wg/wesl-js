import type { WeslBundle } from "wesl";
import { fetchDependencies } from "wgsl-play";
import type { LoadedAppState } from "./AppState.ts";
import { getPlayer } from "./Controls.ts";

/** Load shader from package bundles, compile with WESL, create render pipeline. */
export async function loadAndCompileShader(
  state: LoadedAppState,
  filePath: string,
): Promise<void> {
  await withErrorHandling("load shader", async () => {
    const source = findShaderSource(state.bundles, filePath);
    if (!source) throw new Error(`Shader source not found: ${filePath}`);
    const { bundles, toyPackages } = state;
    await compileAndRender(state, source, bundles, toyPackages.name);
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
    const { libs } = await fetchDependencies(source);
    await compileAndRender(state, source, libs);
  });
}

async function withErrorHandling(op: string, fn: () => Promise<void>) {
  const player = getPlayer();
  try {
    player.showError("");
    await fn();
  } catch (error) {
    player.showError(`Failed to ${op}: ${error}`);
    console.error(error);
  }
}

function findShaderSource(bundles: WeslBundle[], filePath: string) {
  for (const bundle of bundles) {
    if (filePath in bundle.modules) return bundle.modules[filePath];
  }
  return undefined;
}

function compileAndRender(
  state: LoadedAppState,
  source: string,
  libs: WeslBundle[],
  packageName?: string,
) {
  state.currentShaderSource = source;
  displaySource(source);
  getPlayer().project = {
    weslSrc: { main: source },
    rootModuleName: "main",
    libs,
    packageName,
  };
}

function displaySource(source: string) {
  const sourceEl = document.querySelector<HTMLPreElement>("#source-code");
  if (sourceEl) sourceEl.textContent = source;
}
