let sharedGpu: GPU | undefined;
let sharedDevice: GPUDevice | undefined;

export const isDeno = !!(globalThis as any).Deno;

/** get or create shared GPU device for testing */
export async function getGPUDevice(): Promise<GPUDevice> {
  if (!sharedDevice) {
    const gpu = await setupWebGPU();
    const adapter = await gpu.requestAdapter();
    if (!adapter) throw new Error("Failed to get GPU adapter");
    sharedDevice = await adapter.requestDevice();
  }
  return sharedDevice;
}

/** destroy globally shared GPU test device */
export function destroySharedDevice(): void {
  sharedDevice?.destroy();
  sharedDevice = undefined;
}

/** initialize WebGPU for testing */
async function setupWebGPU(): Promise<GPU> {
  if (!sharedGpu) {
    if (isDeno) {
      // Deno has native WebGPU via navigator.gpu
      sharedGpu = navigator.gpu;
    } else {
      // Node.js needs the webgpu npm package
      const webgpu = await import("webgpu");
      Object.assign(globalThis, webgpu.globals);
      sharedGpu = webgpu.create([]);
    }
  }
  return sharedGpu;
}
