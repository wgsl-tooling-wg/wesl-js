import { afterAll, beforeAll, expect, test } from "vitest";
import { testComputeShader } from "../TestComputeShader.ts";
import { destroySharedDevice, getGPUDevice } from "../WebGPUTestSetup.ts";

let device: GPUDevice;
const testPkgDir = new URL("./fixtures/test_shader_pkg/", import.meta.url).href;

beforeAll(async () => {
  device = await getGPUDevice();
});

afterAll(() => {
  destroySharedDevice();
});

async function runTest(src: string, options = {}) {
  return await testComputeShader({
    projectDir: testPkgDir,
    device,
    src,
    ...options,
  });
}

test("import from current package with default useSourceShaders", async () => {
  const result = await runTest(
    `import package::utils::helper;
    @compute @workgroup_size(1)
    fn main() {
      test::results[0] = helper();
    }`,
  );
  expect(result[0]).toBe(42);
});

test("import from bundled package with useSourceShaders: false", async () => {
  const result = await runTest(
    `import test_shader_pkg::utils::helper;
    @compute @workgroup_size(1)
    fn main() {
      test::results[0] = helper();
    }`,
    { useSourceShaders: false },
  );
  expect(result[0]).toBe(43);
});

test("import using actual package name instead of 'package::'", async () => {
  const result = await runTest(
    `import test_shader_pkg::utils::helper;
    @compute @workgroup_size(1)
    fn main() {
      test::results[0] = helper();
    }`,
  );
  expect(result[0]).toBe(42);
});
