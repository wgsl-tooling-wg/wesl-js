import { afterAll, beforeAll, expect, test } from "vitest";
import { testComputeShader } from "../TestComputeShader.ts";
import { destroySharedDevice, getGPUDevice } from "../WebGPUTestSetup.ts";

let device: GPUDevice;

beforeAll(async () => {
  device = await getGPUDevice();
});

afterAll(() => {
  destroySharedDevice();
});

test("writes simple constant values to storage buffer", async () => {
  const src = `
    @compute @workgroup_size(1)
    fn main() {
      test::results[0] = 42u;
      test::results[1] = 100u;
      test::results[2] = 255u;
      test::results[3] = 1u;
    }
  `;
  const projectDir = import.meta.url;
  const resultFormat = "u32";
  const r = await testComputeShader({ projectDir, device, src, resultFormat });

  expect(r).toHaveLength(4);
  expect(r[0]).toBe(42);
  expect(r[1]).toBe(100);
  expect(r[2]).toBe(255);
  expect(r[3]).toBe(1);
});

test("performs computation and writes float results", async () => {
  const src = `
    @compute @workgroup_size(1)
    fn main() {
      test::results[0] = 3.14;
      test::results[1] = 2.5 * 4.0;
      test::results[2] = sqrt(16.0);
      test::results[3] = 1.0 + 2.0 + 3.0;
    }
  `;
  const result = await testComputeShader({
    projectDir: import.meta.url,
    device,
    src,
    resultFormat: "f32",
  });

  expect(result).toHaveLength(4);
  expect(result[0]).toBeCloseTo(3.14);
  expect(result[1]).toBeCloseTo(10.0);
  expect(result[2]).toBeCloseTo(4.0);
  expect(result[3]).toBeCloseTo(6.0);
});
