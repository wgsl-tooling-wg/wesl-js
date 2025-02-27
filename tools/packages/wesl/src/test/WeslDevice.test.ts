import { beforeAll, expect, test } from "vitest";

test.skip("WeslDevice doesn't conflict with uncapturederror", async () => {
  const webgpu = await import("webgpu");
  const gpu = webgpu.create([]);

  const { makeWeslDevice } = await import("../WeslDevice");

  const device = await gpu
    .requestAdapter()
    .then(v => v!.requestDevice())
    .then(v => makeWeslDevice(v));

  const errorPromise = new Promise<GPUError>((resolve, reject) => {
    const TIMEOUT = setTimeout(() => {
      reject();
    }, 1000);
    // TODO: This throws an error for some reason
    // TypeError: no overload matched for addEventListener:
    // object is not of the correct interface type
    device.addEventListener("uncapturederror", ev => {
      clearTimeout(TIMEOUT);
      resolve(ev.error);
    });
  });
  const shader = device.createShaderModule({
    code: "🐈",
  });
  // Force usage of the shader
  device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shader,
    },
  });

  const error = await errorPromise;

  expect(error.message).toContain("🐈");
});

// - pushErrorScope, popErrorScope
//
// Test that doing linkerwhatever.createShaderModule withoug a wesldevice: Points at generated code
// - with uncapturederror
// - with popErrorsScope
//
// Test that wesldevice plus linkerwhatever.createShaderModule: points at wesl code
// - with uncapturederror
// - with popErrorsScope

// Test injecterror
// Test mapGPUCompilationInfo
