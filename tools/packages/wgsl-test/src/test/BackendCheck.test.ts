import { expect, test } from "vitest";
import { getGPUDevice, isDeno } from "../WebGPUTestSetup.ts";

test("check WebGPU backend", async () => {
  const device = await getGPUDevice();
  expect(device).toBeTruthy();

  console.log(
    "==> Backend:",
    isDeno ? "wgpu (Deno native)" : "Dawn (Node webgpu package)",
  );
});
