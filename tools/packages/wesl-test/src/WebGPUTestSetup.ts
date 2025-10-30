import * as webgpu from "webgpu";

let sharedGpu: GPU | undefined;
let sharedDevice: GPUDevice | undefined;

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
    Object.assign(globalThis, webgpu.globals);
    sharedGpu = webgpu.create([]);
  }
  return sharedGpu;
}
