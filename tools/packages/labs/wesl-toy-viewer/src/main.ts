import type { InitAppState } from "./AppState.ts";
import { setupControls } from "./Controls.ts";
import { initGpu, startRenderLoop } from "./Gpu.ts";
import { loadNewPackage } from "./PackageControl.ts";

// HACK: lygia npm package is out of date, use custom tgz URL
export const lygiaUrl =
  "https://raw.githubusercontent.com/mighdoll/big-files/refs/heads/main/lygia-1.3.5-rc.2.tgz";

const defaultPackages = {
  random_wgsl: "random_wgsl",
  lygia: lygiaUrl,
};

main();

/** Load default packages, and start render loop. */
async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) throw new Error("Canvas not found");

  const { device, context, presentationFormat } = await initGpu(canvas);

  const initState: InitAppState = {
    device,
    canvas,
    context,
    presentationFormat,
    uniformBuffer: device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    isPlaying: true,
    startTime: performance.now(),
    pausedDuration: 0,
    currentShaderSource: "",
    toyPackages: { name: "", tgzUrl: "", shaders: [] },
    bundles: [],
  };

  const { lygia, random_wgsl } = defaultPackages;
  await loadNewPackage(initState, lygia);
  const state = await loadNewPackage(initState, random_wgsl);

  setupControls(state);
  startRenderLoop(state);
}
