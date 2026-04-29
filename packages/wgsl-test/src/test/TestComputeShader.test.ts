import { afterAll, beforeAll, expect, test } from "vitest";
import { testCompute } from "../TestComputeShader.ts";
import { destroySharedDevice, getGPUDevice } from "../WebGPUTestSetup.ts";

let device: GPUDevice;
const testPkgDir = new URL("./fixtures/test_shader_pkg/", import.meta.url).href;

test("writes simple constant values to storage buffer", async () => {
  const src = `
    @buffer var<storage, read_write> results: array<u32, 4>;
    @compute @workgroup_size(1)
    fn main() {
      results[0] = 42u;
      results[1] = 100u;
      results[2] = 255u;
      results[3] = 1u;
    }
  `;
  const { results } = await testCompute({
    projectDir: import.meta.url,
    device,
    src,
  });

  expect(results).toHaveLength(4);
  expect(results[0]).toBe(42);
  expect(results[1]).toBe(100);
  expect(results[2]).toBe(255);
  expect(results[3]).toBe(1);
});

test("performs computation and writes float results", async () => {
  const src = `
    @buffer var<storage, read_write> results: array<f32, 4>;
    @compute @workgroup_size(1)
    fn main() {
      results[0] = 3.14;
      results[1] = 2.5 * 4.0;
      results[2] = sqrt(16.0);
      results[3] = 1.0 + 2.0 + 3.0;
    }
  `;
  const { results } = await testCompute({
    projectDir: import.meta.url,
    device,
    src,
  });

  expect(results).toHaveLength(4);
  expect(results[0]).toBeCloseTo(3.14);
  expect(results[1]).toBeCloseTo(10.0);
  expect(results[2]).toBeCloseTo(4.0);
  expect(results[3]).toBeCloseTo(6.0);
});

test("uses scalar constant from constants namespace", async () => {
  const src = `
    import constants::PI;

    @buffer var<storage, read_write> results: array<f32, 2>;
    @compute @workgroup_size(1)
    fn main() {
      results[0] = PI;
      results[1] = PI * 2.0;
    }
  `;
  const { results } = await testCompute({
    projectDir: import.meta.url,
    device,
    src,
    constants: { PI: Math.PI },
  });

  expect(results[0]).toBeCloseTo(Math.PI);
  expect(results[1]).toBeCloseTo(6.28318);
});

test("uses vector constant from constants namespace", async () => {
  const src = `
    import constants::CENTER;

    @buffer var<storage, read_write> results: array<f32, 2>;
    @compute @workgroup_size(1)
    fn main() {
      let c = CENTER;
      results[0] = c.x;
      results[1] = c.y;
    }
  `;
  const { results } = await testCompute({
    projectDir: import.meta.url,
    device,
    src,
    constants: { CENTER: "vec2f(0.5, 0.75)" },
  });

  expect(results[0]).toBeCloseTo(0.5);
  expect(results[1]).toBeCloseTo(0.75);
});

test("uses conditions for conditional compilation", async () => {
  const src = `
    @buffer var<storage, read_write> results: array<u32, 1>;
    @compute @workgroup_size(1)
    fn main() {
      @if(USE_CUSTOM_VALUE)
      results[0] = 42u;
      @else
      results[0] = 99u;
    }
  `;
  const { results: resultTrue } = await testCompute({
    projectDir: import.meta.url,
    device,
    src,
    conditions: { USE_CUSTOM_VALUE: true },
  });

  expect(resultTrue[0]).toBe(42);

  const { results: resultFalse } = await testCompute({
    projectDir: import.meta.url,
    device,
    src,
    conditions: { USE_CUSTOM_VALUE: false },
  });

  expect(resultFalse[0]).toBe(99);
});

test("uses both conditions and constants together", async () => {
  const src = `
    @if(USE_MULTIPLIER)
    import constants::MULTIPLIER;

    @buffer var<storage, read_write> results: array<f32, 1>;
    @compute @workgroup_size(1)
    fn main() {
      @if(USE_MULTIPLIER)
      results[0] = MULTIPLIER * 2.0;
      @else
      results[0] = 1.0;
    }
  `;
  const { results: withConstant } = await testCompute({
    projectDir: import.meta.url,
    device,
    src,
    conditions: { USE_MULTIPLIER: true },
    constants: { MULTIPLIER: 21.0 },
  });

  expect(withConstant[0]).toBeCloseTo(42.0);

  const { results: withoutConstant } = await testCompute({
    projectDir: import.meta.url,
    device,
    src,
    conditions: { USE_MULTIPLIER: false },
  });

  expect(withoutConstant[0]).toBeCloseTo(1.0);
});

test("uses custom buffer size", async () => {
  const src = `
    @buffer var<storage, read_write> results: array<u32, 8>;
    @compute @workgroup_size(1)
    fn main() {
      for (var i = 0u; i < 8u; i++) {
        results[i] = i * 10u;
      }
    }
  `;
  const { results } = await testCompute({
    projectDir: import.meta.url,
    device,
    src,
  });

  expect(results).toHaveLength(8);
  expect(results[0]).toBe(0);
  expect(results[1]).toBe(10);
  expect(results[2]).toBe(20);
  expect(results[3]).toBe(30);
  expect(results[4]).toBe(40);
  expect(results[5]).toBe(50);
  expect(results[6]).toBe(60);
  expect(results[7]).toBe(70);
});

test("multiple @buffer declarations returned by name", async () => {
  const src = `
    @buffer var<storage, read_write> sums: array<u32, 2>;
    @buffer var<storage, read_write> products: array<u32, 2>;
    @compute @workgroup_size(1)
    fn main() {
      sums[0] = 1u + 2u;
      sums[1] = 10u + 20u;
      products[0] = 3u * 4u;
      products[1] = 5u * 6u;
    }
  `;
  const r = await testCompute({ projectDir: import.meta.url, device, src });
  expect(r.sums).toEqual([3, 30]);
  expect(r.products).toEqual([12, 30]);
});

test("unwritten slots show -999 sentinel", async () => {
  const src = `
    @buffer var<storage, read_write> results: array<f32, 4>;
    @compute @workgroup_size(1) fn main() {
      results[0] = 1.0;
      results[2] = 3.0;
    }
  `;
  const { results } = await testCompute({
    projectDir: import.meta.url,
    device,
    src,
  });
  expect(results[0]).toBeCloseTo(1.0);
  expect(results[1]).toBeCloseTo(-999.0);
  expect(results[2]).toBeCloseTo(3.0);
  expect(results[3]).toBeCloseTo(-999.0);
});

test("testCompute with moduleName - bare name", async () => {
  const { results } = await testCompute({
    projectDir: testPkgDir,
    device,
    moduleName: "compute_sum.wgsl",
  });
  expect(results[0]).toBe(3);
  expect(results[1]).toBe(30);
});

test("testCompute with moduleName - relative path", async () => {
  const { results } = await testCompute({
    projectDir: testPkgDir,
    device,
    moduleName: "algorithms/compute_multiply.wgsl",
  });
  expect(results[0]).toBe(12);
  expect(results[1]).toBe(30);
});

test("testCompute with moduleName - module path", async () => {
  const { results } = await testCompute({
    projectDir: testPkgDir,
    device,
    moduleName: "package::compute_sum",
  });
  expect(results[0]).toBe(3);
  expect(results[1]).toBe(30);
});

beforeAll(async () => {
  device = await getGPUDevice();
});

afterAll(() => {
  destroySharedDevice();
});
