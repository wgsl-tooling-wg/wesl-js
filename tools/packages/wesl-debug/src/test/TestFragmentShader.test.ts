import { afterAll, beforeAll, expect, test } from "vitest";
import { testFragmentShader } from "../TestFragmentShader.ts";
import {
  createCheckerboardTexture,
  createGradientTexture,
  createSampler,
  createSolidTexture,
} from "../TestTextureHelpers.ts";
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
  const textureFormat: GPUTextureFormat = "rgba32float";
  const params = { projectDir, device, src, textureFormat };
  const result = await testFragmentShader(params);

  expect(result).toHaveLength(4);
  expect(result[0]).toBeCloseTo(0.5);
  expect(result[1]).toBeCloseTo(0.25);
  expect(result[2]).toBeCloseTo(0.75);
  expect(result[3]).toBeCloseTo(1.0);
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

test("samples solid color texture", async () => {
  const inputTex = createSolidTexture(device, [0.5, 0.5, 0.5, 1.0], 256, 256);
  const sampler = createSampler(device);

  const src = `
    @group(0) @binding(0) var input_tex: texture_2d<f32>;
    @group(0) @binding(1) var input_samp: sampler;

    @fragment
    fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = pos.xy / 256.0;
      return textureSample(input_tex, input_samp, uv);
    }
  `;

  const result = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    inputTextures: [{ texture: inputTex, sampler }],
  });

  expect(result[0]).toBeCloseTo(0.5);
  expect(result[1]).toBeCloseTo(0.5);
  expect(result[2]).toBeCloseTo(0.5);
  expect(result[3]).toBeCloseTo(1.0);
});

test("samples gradient texture at center", async () => {
  const inputTex = createGradientTexture(device, 256, 256, "horizontal");
  const sampler = createSampler(device);

  const src = `
    @group(0) @binding(0) var input_tex: texture_2d<f32>;
    @group(0) @binding(1) var input_samp: sampler;

    @fragment
    fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      return textureSample(input_tex, input_samp, vec2f(0.5, 0.5));
    }
  `;

  const result = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    inputTextures: [{ texture: inputTex, sampler }],
  });

  expect(result[0]).toBeCloseTo(0.5, 1);
  expect(result[1]).toBeCloseTo(0.5, 1);
  expect(result[2]).toBeCloseTo(0.5, 1);
});

test("samples checkerboard texture", async () => {
  const inputTex = createCheckerboardTexture(device, 256, 256, 128);
  const sampler = createSampler(device);

  const src = `
    @group(0) @binding(0) var input_tex: texture_2d<f32>;
    @group(0) @binding(1) var input_samp: sampler;

    @fragment
    fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      // Sample at (0.25, 0.25) - should be black (0.0)
      return textureSample(input_tex, input_samp, vec2f(0.25, 0.25));
    }
  `;

  const result = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    inputTextures: [{ texture: inputTex, sampler }],
  });

  expect(result[0]).toBeCloseTo(0.0);
  expect(result[1]).toBeCloseTo(0.0);
  expect(result[2]).toBeCloseTo(0.0);
});

test("samples multiple textures", async () => {
  const tex1 = createSolidTexture(device, [1.0, 0.0, 0.0, 1.0], 64, 64);
  const tex2 = createSolidTexture(device, [0.0, 1.0, 0.0, 1.0], 64, 64);
  const sampler = createSampler(device);

  const src = `
    @group(0) @binding(0) var tex1: texture_2d<f32>;
    @group(0) @binding(1) var samp1: sampler;
    @group(0) @binding(2) var tex2: texture_2d<f32>;
    @group(0) @binding(3) var samp2: sampler;

    @fragment
    fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = vec2f(0.5, 0.5);
      let c1 = textureSample(tex1, samp1, uv);
      let c2 = textureSample(tex2, samp2, uv);
      return c1 * 0.5 + c2 * 0.5;
    }
  `;

  const result = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    inputTextures: [
      { texture: tex1, sampler },
      { texture: tex2, sampler },
    ],
  });

  expect(result[0]).toBeCloseTo(0.5); // (1.0 + 0.0) / 2
  expect(result[1]).toBeCloseTo(0.5); // (0.0 + 1.0) / 2
  expect(result[2]).toBeCloseTo(0.0); // (0.0 + 0.0) / 2
});
