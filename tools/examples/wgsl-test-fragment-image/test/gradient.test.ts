import { afterAll, beforeAll, test } from "vitest";
import {
  destroySharedDevice,
  expectFragmentImage,
  getGPUDevice,
} from "wgsl-test";

const projectDir = import.meta.url;
let device: GPUDevice;

beforeAll(async () => {
  device = await getGPUDevice();
});

afterAll(() => {
  destroySharedDevice();
});

test("gradient shader matches snapshot", async () => {
  await expectFragmentImage(device, "gradient", { projectDir });
});
