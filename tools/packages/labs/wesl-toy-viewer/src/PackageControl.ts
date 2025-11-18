import type { WeslBundle } from "wesl";
import type { AppState, InitAppState, LoadedAppState } from "./AppState.ts";
import { loadBundlesWithPackageName } from "./BundleLoader.ts";
import { showError } from "./Controls.ts";
import { loadAndCompileShader } from "./ShaderLoader.ts";
import { collectToyShaders, type ToyPackage } from "./ToyPackage.ts";

/** Available packages. Keys are URLs for URL-based packages or `pkg-${packageName}` for npm packages. */
const toyPackages: Record<string, ToyPackage> = {};

/** Load package from URL or npm name, add to dropdown, compile first shader. */
export async function loadNewPackage(
  state: InitAppState,
  input: string,
): Promise<AppState> {
  showError("");
  const { bundles, packageName, tgzUrl } =
    await loadBundlesWithPackageName(input);
  const info = collectToyShaders(tgzUrl, bundles, packageName);

  updateStateWithPackage(state, bundles, info);
  addPackageToDropdown(packageName, input);
  await compileFirstShader(state, packageName);

  return state as AppState;
}

/** Select package from dropdown, load bundles, compile first shader. */
export async function selectPackage(
  state: InitAppState,
  packageId: string,
): Promise<void> {
  try {
    showError("");
    const packageInfo = toyPackages[packageId];
    if (!packageInfo) {
      throw new Error(`Unknown package: ${packageId}`);
    }
    const { bundles, packageName, tgzUrl } = await loadBundlesWithPackageName(
      packageInfo.tgzUrl,
    );
    const info = collectToyShaders(tgzUrl, bundles, packageName);

    updateStateWithPackage(state, bundles, info);
    toyPackages[packageId] = info;
    await compileFirstShader(state, packageName);
  } catch (error) {
    showError(`Failed to load package: ${error}`);
    console.error(error);
  }
}

/** Populate shader dropdown with available shaders from package info. */
export function populateShaderDropdown(state: InitAppState): void {
  const shaderSelect =
    document.querySelector<HTMLSelectElement>("#shader-select");
  if (!shaderSelect) return;

  shaderSelect.innerHTML = "";
  state.toyPackages.shaders.forEach(shader => {
    const option = document.createElement("option");
    option.value = shader.filePath;
    option.textContent = shader.displayName;
    shaderSelect.appendChild(option);
  });
}

function updateStateWithPackage(
  state: InitAppState,
  bundles: WeslBundle[],
  info: ToyPackage,
): void {
  state.toyPackages = info;
  state.bundles = bundles;
  populateShaderDropdown(state);
}

async function compileFirstShader(
  state: InitAppState,
  packageName: string,
): Promise<void> {
  const firstShader = state.toyPackages.shaders[0]?.filePath;
  if (!firstShader) {
    showError(`No @toy shaders found in package: ${packageName}`);
    return;
  }
  await loadAndCompileShader(state as LoadedAppState, firstShader);
}

/** Add package to dropdown. For URLs, uses URL as key to allow multiple versions. */
function addPackageToDropdown(packageName: string, input: string): void {
  const packageSelect =
    document.querySelector<HTMLSelectElement>("#package-select");
  if (!packageSelect) return;

  const isUrl = input.startsWith("http://") || input.startsWith("https://");
  const packageId = isUrl ? input : `pkg-${packageName}`;
  const existing = packageSelect.querySelector(`option[value="${packageId}"]`);

  if (!existing) {
    const option = document.createElement("option");
    option.value = packageId;
    option.textContent = isUrl
      ? `${packageName} (-> ${input.split("/").pop() || input})`
      : packageName;
    packageSelect.appendChild(option);

    toyPackages[packageId] = {
      name: packageName,
      tgzUrl: input,
      shaders: [],
    };
  }

  packageSelect.value = packageId;
}
