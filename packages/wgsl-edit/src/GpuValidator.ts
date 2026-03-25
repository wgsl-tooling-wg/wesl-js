/** Lazy-loaded GPU device singleton for shader validation. */

let device: GPUDevice | null = null;
let initPromise: Promise<GPUDevice | null> | null = null;
let warned = false;

/** Get or initialize the shared GPU device, returning null if WebGPU is unavailable. */
async function getDevice(): Promise<GPUDevice | null> {
  if (device) return device;
  if (initPromise) return initPromise;

  if (typeof navigator === "undefined" || !navigator.gpu) {
    if (!warned)
      console.warn("wgsl-edit: WebGPU unavailable, GPU lint disabled");
    warned = true;
    return null;
  }

  initPromise = (async () => {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.warn("wgsl-edit: no GPU adapter, GPU lint disabled");
        return null;
      }
      const dev = await adapter.requestDevice();
      dev.lost.then(() => {
        device = null;
        initPromise = null;
      });
      device = dev;
      return dev;
    } catch (e) {
      console.warn("wgsl-edit: GPU device request failed", e);
      return null;
    }
  })();

  return initPromise;
}

export interface GpuDiagnostic {
  offset: number;
  length: number;
  message: string;
  severity: "error" | "warning";
}

/** Validate WGSL code via WebGPU createShaderModule + getCompilationInfo. */
export async function validateWgsl(code: string): Promise<GpuDiagnostic[]> {
  const dev = await getDevice();
  if (!dev) return [];

  const module = dev.createShaderModule({ code });
  const info = await module.getCompilationInfo();

  return info.messages
    .filter(m => m.type !== "info")
    .map(m => ({
      offset: m.offset,
      length: m.length,
      message: m.message,
      severity: m.type as "error" | "warning",
    }));
}
