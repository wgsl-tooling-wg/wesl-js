export const isDeno = !!(globalThis as any).Deno;

let sharedGpu: GPU | undefined;
let sharedAdapter: GPUAdapter | undefined;
let sharedDevice: GPUDevice | undefined;

/** get or create shared GPU device for testing */
export async function getGPUDevice(): Promise<GPUDevice> {
  if (!sharedDevice) {
    const adapter = await getGPUAdapter();
    sharedDevice = await adapter.requestDevice();
  }
  return sharedDevice;
}

/** get or create shared GPU object for testing */
export async function getGPU(): Promise<GPU> {
  if (!sharedGpu) {
    if (isDeno) {
      sharedGpu = navigator.gpu;
    } else if (typeof navigator !== "undefined" && navigator.gpu) {
      sharedGpu = navigator.gpu;
    } else {
      const webgpu = await import("webgpu");
      Object.assign(globalThis, webgpu.globals);
      sharedGpu = webgpu.create([]);
    }
  }
  return sharedGpu;
}

/** get or create shared GPU adapter for testing */
export async function getGPUAdapter(): Promise<GPUAdapter> {
  if (!sharedAdapter) {
    const gpu = await getGPU();
    const adapter = await gpu.requestAdapter();
    if (!adapter) throw new Error("Failed to get GPU adapter");
    sharedAdapter = adapter;
  }
  return sharedAdapter;
}

/** destroy globally shared GPU test device */
export function destroySharedDevice(): void {
  sharedDevice?.destroy();
  sharedDevice = undefined;
}
