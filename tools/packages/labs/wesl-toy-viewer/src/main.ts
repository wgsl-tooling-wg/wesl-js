import "wgsl-play"; // Auto-register the <wgsl-play> component
import type { InitAppState } from "./AppState.ts";
import { setupControls } from "./Controls.ts";
import { loadNewPackage } from "./PackageControl.ts";

const defaultPackages = {
  random_wgsl: "random_wgsl",
  lygia: "lygia",
};

main();

/** Load default packages and set up controls. */
async function main(): Promise<void> {
  const initState: InitAppState = {
    toyPackages: { name: "", tgzUrl: "", shaders: [] },
    bundles: [],
    currentShaderSource: "",
  };

  const { lygia, random_wgsl } = defaultPackages;
  await loadNewPackage(initState, lygia);
  const state = await loadNewPackage(initState, random_wgsl);

  setupControls(state);
}
