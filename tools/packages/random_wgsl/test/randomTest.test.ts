import { afterAll, beforeAll, test } from "vitest";
import {
  destroySharedDevice,
  expectFragmentImage,
  getGPUDevice,
} from "wesl-test";

const projectDir = import.meta.url;
let device: GPUDevice;

beforeAll(async () => {
  device = await getGPUDevice();
});

afterAll(() => {
  destroySharedDevice();
});

test("randomTest shader matches snapshot", async () => {
  await expectFragmentImage(device, "randomTest", { projectDir });
});
