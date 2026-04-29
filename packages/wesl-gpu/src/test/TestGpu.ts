/** Lazy GPU bootstrap for wesl-gpu tests. Mirrors wgsl-test's WebGPUTestSetup
 *  but lives inside wesl-gpu to avoid a circular workspace dep. */

let cachedGpu: GPU | null | undefined;
let cachedDevice: GPUDevice | undefined;

export async function getTestDevice(): Promise<GPUDevice | null> {
  if (cachedDevice) return cachedDevice;
  const gpu = await getGpu();
  if (!gpu) return null;
  const adapter = await gpu.requestAdapter();
  if (!adapter) return null;
  cachedDevice = await adapter.requestDevice();
  return cachedDevice;
}

async function getGpu(): Promise<GPU | null> {
  if (cachedGpu !== undefined) return cachedGpu;
  if (typeof navigator !== "undefined" && navigator.gpu) {
    cachedGpu = navigator.gpu;
    return cachedGpu;
  }
  try {
    const webgpu = await import("webgpu");
    Object.assign(globalThis, webgpu.globals);
    cachedGpu = webgpu.create([]);
    return cachedGpu;
  } catch {
    cachedGpu = null;
    return null;
  }
}
