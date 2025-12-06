import { afterAll, beforeAll, expect, test } from "vitest";
import { destroySharedDevice, getGPUDevice, testCompute } from "wgsl-test";

const projectDir = new URL("..", import.meta.url).href;
let device: GPUDevice;

beforeAll(async () => {
  device = await getGPUDevice();
});

afterAll(() => {
  destroySharedDevice();
});

test("hash::lowbias32 is well-distributed", async () => {
  const src = `
    import package::hash::lowbias32; // call your shader function
    @compute @workgroup_size(256)
    fn main( @builtin(global_invocation_id) id: vec3u) {
      test::results[id.x] = lowbias32(id.x);
    }
  `;

  const params = { projectDir, device, src, size: 256 };
  const result = await testCompute(params); // run test

  const { meanDiff, uniqueValues } = distStats(result, 2 ** 32 / 2);
  expect(meanDiff).toBeLessThan(0.05); // validate within 5% of expected mean
  expect(uniqueValues).toBe(result.length); // validate no collisions
});

function distStats(values: number[], targetMean: number) {
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const meanDiff = Math.abs(mean - targetMean) / targetMean;

  return { meanDiff, uniqueValues: new Set(values).size };
}
