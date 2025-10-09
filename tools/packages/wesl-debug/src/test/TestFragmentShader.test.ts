import { afterAll, beforeAll, expect, test } from "vitest";
import { testFragmentShader } from "../TestFragmentShader.ts";
import { destroySharedDevice, getGPUDevice } from "../WebGPUTestSetup.ts";

let device: GPUDevice;

beforeAll(async () => {
  device = await getGPUDevice();
});

afterAll(() => {
  destroySharedDevice();
});

test("renders simple constant color", async () => {
  const src = `
    @fragment
    fn fs_main() -> @location(0) vec4f {
      return vec4f(0.5, 0.25, 0.75, 1.0);
    }
  `;
  const projectDir = import.meta.url;
  const textureFormat = "rgba32float";
  const r = await testFragmentShader({ projectDir, device, src, textureFormat });

  expect(r).toHaveLength(4);
  expect(r[0]).toBeCloseTo(0.5);
  expect(r[1]).toBeCloseTo(0.25);
  expect(r[2]).toBeCloseTo(0.75);
  expect(r[3]).toBeCloseTo(1.0);
});

test("derivative of x coordinate", async () => {
  const src = `
    @fragment
    fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let dx = dpdx(pos.x);
      return vec4f(pos.x, dx, 0.0, 1.0);
    }
  `;
  const result = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    textureFormat: "rg32float",
    size: [2, 2],
  });
  // result at pixel (0, 0)
  const [x, dx] = result;

  expect(x).toBeCloseTo(0.5);
  expect(dx).toBeCloseTo(1);
});
