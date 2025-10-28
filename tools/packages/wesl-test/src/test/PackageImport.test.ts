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

test("import from .wgsl file when .wesl doesn't exist", async () => {
  const result = await runTest(
    `import package::legacy::legacyHelper;
    @compute @workgroup_size(1)
    fn main() {
      test::results[0] = legacyHelper();
    }`,
  );
  expect(result[0]).toBe(99);
});

/** Incremental module resolution per WESL spec:
 * For "import foo::bar::zap", tries: foo.wesl::bar, then foo/bar.wesl::zap, then foo/bar/zap.wesl
 * Item definitions are prioritized over filesystem structure
 */

test("import from deeply nested path", async () => {
  const result = await runTest(
    `import package::nested::deeper::func::deepHelper;
    @compute @workgroup_size(1)
    fn main() {
      test::results[0] = deepHelper();
    }`,
  );
  expect(result[0]).toBe(123);
});

test("resolve when intermediate module exists but lacks the item", async () => {
  // foo/bar.wesl exists but lacks "zap" item
  // Resolution continues to foo/bar/zap.wesl
  const result = await runTest(
    `import package::foo::bar::zap::zapValue;
    @compute @workgroup_size(1)
    fn main() {
      test::results[0] = zapValue;
    }`,
  );
  expect(result[0]).toBe(88);
});

test("item in module takes priority over submodule file", async () => {
  // priority.wesl contains const sub = 777u
  // Per spec: "item definitions prioritized over filesystem"
  const result = await runTest(
    `import package::priority::sub;
    @compute @workgroup_size(1)
    fn main() {
      test::results[0] = sub;
    }`,
  );
  expect(result[0]).toBe(777);
});
