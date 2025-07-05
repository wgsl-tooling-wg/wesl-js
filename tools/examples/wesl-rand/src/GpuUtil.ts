import { requestWeslDevice, type WeslDevice } from "wesl";

/** @return a GPUDevice with a WESL wrapper for error reporting */
export async function gpuDevice(): Promise<WeslDevice> {
  const adapter = await navigator.gpu.requestAdapter();
  return requestWeslDevice(adapter);
}

/** configure the webgpu canvas context for typical webgpu use */
export function configureCanvas(
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  debug = false,
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
