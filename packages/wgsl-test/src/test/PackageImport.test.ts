import { afterAll, beforeAll, expect, test } from "vitest";
import { testCompute } from "../TestComputeShader.ts";
import { destroySharedDevice, getGPUDevice } from "../WebGPUTestSetup.ts";

let device: GPUDevice;
const testPkgDir = new URL("./fixtures/test_shader_pkg/", import.meta.url).href;

async function runTest(src: string, options = {}) {
  return await testCompute({
    projectDir: testPkgDir,
    device,
    src,
    ...options,
  });
}

test("import from current package with default useSourceShaders", async () => {
  const { results } = await runTest(
    `import package::utils::helper;
    @buffer var<storage, read_write> results: array<u32, 1>;
    @compute @workgroup_size(1)
    fn main() {
      results[0] = helper();
    }`,
  );
  expect(results[0]).toBe(42);
});

test("import from bundled package with useSourceShaders: false", async () => {
  const { results } = await runTest(
    `import test_shader_pkg::utils::helper;
    @buffer var<storage, read_write> results: array<u32, 1>;
    @compute @workgroup_size(1)
    fn main() {
      results[0] = helper();
    }`,
    { useSourceShaders: false },
  );
  expect(results[0]).toBe(43);
});

test("import using actual package name instead of 'package::'", async () => {
  const { results } = await runTest(
    `import test_shader_pkg::utils::helper;
    @buffer var<storage, read_write> results: array<u32, 1>;
    @compute @workgroup_size(1)
    fn main() {
      results[0] = helper();
    }`,
  );
  expect(results[0]).toBe(42);
});

test("import from .wgsl file when .wesl doesn't exist", async () => {
  const { results } = await runTest(
    `import package::legacy::legacyHelper;
    @buffer var<storage, read_write> results: array<u32, 1>;
    @compute @workgroup_size(1)
    fn main() {
      results[0] = legacyHelper();
    }`,
  );
  expect(results[0]).toBe(99);
});

// Incremental module resolution per WESL spec:
// For "import foo::bar::zap", tries: foo.wesl::bar, then foo/bar.wesl::zap, then foo/bar/zap.wesl
// Item definitions are prioritized over filesystem structure

test("import from deeply nested path", async () => {
  const { results } = await runTest(
    `import package::nested::deeper::func::deepHelper;
    @buffer var<storage, read_write> results: array<u32, 1>;
    @compute @workgroup_size(1)
    fn main() {
      results[0] = deepHelper();
    }`,
  );
  expect(results[0]).toBe(123);
});

test("resolve when intermediate module exists but lacks the item", async () => {
  // foo/bar.wesl exists but lacks "zap" item
  // Resolution continues to foo/bar/zap.wesl
  const { results } = await runTest(
    `import package::foo::bar::zap::zapValue;
    @buffer var<storage, read_write> results: array<u32, 1>;
    @compute @workgroup_size(1)
    fn main() {
      results[0] = zapValue;
    }`,
  );
  expect(results[0]).toBe(88);
});

test("item in module takes priority over submodule file", async () => {
  // priority.wesl contains const sub = 777u
  // Per spec: "item definitions prioritized over filesystem"
  const { results } = await runTest(
    `import package::priority::sub;
    @buffer var<storage, read_write> results: array<u32, 1>;
    @compute @workgroup_size(1)
    fn main() {
      results[0] = sub;
    }`,
  );
  expect(results[0]).toBe(777);
});

beforeAll(async () => {
  device = await getGPUDevice();
});

afterAll(() => {
  destroySharedDevice();
});
