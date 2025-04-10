import { makeWeslDevice, WeslDevice } from "wesl";

/** @return a GPUDevice with a WESL wrapper for error reporting */
export async function gpuDevice(): Promise<WeslDevice> {
  const gpu = navigator.gpu;
  if (!gpu) {
    console.error("No GPU found, try chrome, or firefox on windows");
    throw new Error("no GPU");
  }
  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    console.error("No gpu adapter found");
    throw new Error("no GPU adapter");
  }
  const device = await adapter.requestDevice();
  return makeWeslDevice(device);
}

/** configure the webgpu canvas context for typical webgpu use */
export function configureCanvas(
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  debug = false
): GPUCanvasContext {
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("no WebGPU context available");
  }
  let usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST;
  if (debug) {
    usage |= GPUTextureUsage.COPY_SRC;
  }
  context.configure({
    device,
    alphaMode: "opaque",
    format: navigator.gpu.getPreferredCanvasFormat(),
    usage: usage,
  });

  return context;
}
