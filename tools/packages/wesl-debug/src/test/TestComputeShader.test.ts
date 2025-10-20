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

test("uses scalar constant from constants namespace", async () => {
  const src = `
    import constants::PI;

    @compute @workgroup_size(1)
    fn main() {
      test::results[0] = PI;
      test::results[1] = PI * 2.0;
    }
  `;
  const result = await testComputeShader({
    projectDir: import.meta.url,
    device,
    src,
    resultFormat: "f32",
    constants: { PI: Math.PI },
  });

  expect(result[0]).toBeCloseTo(Math.PI);
  expect(result[1]).toBeCloseTo(6.28318);
});

test("uses vector constant from constants namespace", async () => {
  const src = `
    import constants::CENTER;

    @compute @workgroup_size(1)
    fn main() {
      let c = CENTER;
      test::results[0] = c.x;
      test::results[1] = c.y;
    }
  `;
  const result = await testComputeShader({
    projectDir: import.meta.url,
    device,
    src,
    resultFormat: "f32",
    constants: { CENTER: "vec2f(0.5, 0.75)" },
  });

  expect(result[0]).toBeCloseTo(0.5);
  expect(result[1]).toBeCloseTo(0.75);
});

test("uses conditions for conditional compilation", async () => {
  const src = `
    @compute @workgroup_size(1)
    fn main() {
      @if(USE_CUSTOM_VALUE)
      test::results[0] = 42u;
      @else
      test::results[0] = 99u;
    }
  `;
  const resultTrue = await testComputeShader({
    projectDir: import.meta.url,
    device,
    src,
    conditions: { USE_CUSTOM_VALUE: true },
  });

  expect(resultTrue[0]).toBe(42);

  const resultFalse = await testComputeShader({
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

    @compute @workgroup_size(1)
    fn main() {
      @if(USE_MULTIPLIER)
      test::results[0] = MULTIPLIER * 2.0;
      @else
      test::results[0] = 1.0;
    }
  `;
  const resultWithConstant = await testComputeShader({
    projectDir: import.meta.url,
    device,
    src,
    resultFormat: "f32",
    conditions: { USE_MULTIPLIER: true },
    constants: { MULTIPLIER: 21.0 },
  });

  expect(resultWithConstant[0]).toBeCloseTo(42.0);

  const resultWithoutConstant = await testComputeShader({
    projectDir: import.meta.url,
    device,
    src,
    resultFormat: "f32",
    conditions: { USE_MULTIPLIER: false },
  });

  expect(resultWithoutConstant[0]).toBeCloseTo(1.0);
});

test("uses custom buffer size", async () => {
  const src = `
    @compute @workgroup_size(1)
    fn main() {
      for (var i = 0u; i < 8u; i++) {
        test::results[i] = i * 10u;
      }
    }
  `;
  const result = await testComputeShader({
    projectDir: import.meta.url,
    device,
    src,
    resultFormat: "u32",
    size: 32,
  });

  expect(result).toHaveLength(8);
  expect(result[0]).toBe(0);
  expect(result[1]).toBe(10);
  expect(result[2]).toBe(20);
  expect(result[3]).toBe(30);
  expect(result[4]).toBe(40);
  expect(result[5]).toBe(50);
  expect(result[6]).toBe(60);
  expect(result[7]).toBe(70);
});
