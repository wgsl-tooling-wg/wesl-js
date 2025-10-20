import { afterAll, beforeAll, expect, test } from "vitest";
import {
  testAnimatedShader,
  testFragmentShader,
} from "../TestFragmentShader.ts";
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
    @group(0) @binding(1) var input_tex: texture_2d<f32>;
    @group(0) @binding(2) var input_samp: sampler;

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
    @group(0) @binding(1) var input_tex: texture_2d<f32>;
    @group(0) @binding(2) var input_samp: sampler;

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
    @group(0) @binding(1) var input_tex: texture_2d<f32>;
    @group(0) @binding(2) var input_samp: sampler;

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
    @group(0) @binding(1) var tex1: texture_2d<f32>;
    @group(0) @binding(2) var samp1: sampler;
    @group(0) @binding(3) var tex2: texture_2d<f32>;
    @group(0) @binding(4) var samp2: sampler;

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

test("uses scalar constant from constants namespace", async () => {
  const src = `
    import constants::BRIGHTNESS;

    @fragment
    fn fs_main() -> @location(0) vec4f {
      return vec4f(BRIGHTNESS, 0.0, 0.0, 1.0);
    }
  `;

  const result = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    constants: { BRIGHTNESS: 0.75 },
  });

  expect(result[0]).toBeCloseTo(0.75);
});

test("uses vector constant from constants namespace", async () => {
  const src = `
    import constants::COLOR;

    @fragment
    fn fs_main() -> @location(0) vec4f {
      return vec4f(COLOR, 0.0, 1.0);
    }
  `;

  const result = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    constants: { COLOR: "vec2f(0.25, 0.5)" },
  });

  expect(result[0]).toBeCloseTo(0.25);
  expect(result[1]).toBeCloseTo(0.5);
  expect(result[2]).toBeCloseTo(0.0);
  expect(result[3]).toBeCloseTo(1.0);
});

test("uses conditions for conditional compilation", async () => {
  const src = `
    @fragment
    fn fs_main() -> @location(0) vec4f {
      @if(USE_RED)
      return vec4f(1.0, 0.0, 0.0, 1.0);
      @else
      return vec4f(0.0, 1.0, 0.0, 1.0);
    }
  `;

  const resultRed = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    conditions: { USE_RED: true },
  });

  expect(resultRed[0]).toBeCloseTo(1.0);
  expect(resultRed[1]).toBeCloseTo(0.0);

  const resultGreen = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    conditions: { USE_RED: false },
  });

  expect(resultGreen[0]).toBeCloseTo(0.0);
  expect(resultGreen[1]).toBeCloseTo(1.0);
});

test("uses both conditions and constants together", async () => {
  const src = `
    @if(USE_CUSTOM_COLOR)
    import constants::CUSTOM_COLOR;

    @fragment
    fn fs_main() -> @location(0) vec4f {
      @if(USE_CUSTOM_COLOR)
      return vec4f(CUSTOM_COLOR, 0.0, 1.0);
      @else
      return vec4f(0.0, 0.0, 0.0, 1.0);
    }
  `;

  const resultWithColor = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    conditions: { USE_CUSTOM_COLOR: true },
    constants: { CUSTOM_COLOR: "vec2f(0.8, 0.6)" },
  });

  expect(resultWithColor[0]).toBeCloseTo(0.8);
  expect(resultWithColor[1]).toBeCloseTo(0.6);
  expect(resultWithColor[2]).toBeCloseTo(0.0);

  const resultWithoutColor = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    conditions: { USE_CUSTOM_COLOR: false },
  });

  expect(resultWithoutColor[0]).toBeCloseTo(0.0);
  expect(resultWithoutColor[1]).toBeCloseTo(0.0);
  expect(resultWithoutColor[2]).toBeCloseTo(0.0);
});

test("shader with resolution uniform (auto-populated)", async () => {
  const src = `
    @group(0) @binding(0) var<uniform> u: test::Uniforms;

    @fragment
    fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let st = pos.xy / u.resolution;
      return vec4f(st.x, st.y, 0.0, 1.0);
    }
  `;

  const result = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    size: [256, 256],
    // resolution auto-populated as [256, 256]
  });

  // Pixel (0,0) is at fragment coordinate (0.5, 0.5)
  // Normalized: (0.5/256, 0.5/256, 0, 1)
  expect(result[0]).toBeCloseTo(0.5 / 256, 4);
  expect(result[1]).toBeCloseTo(0.5 / 256, 4);
  expect(result[2]).toBe(0.0);
  expect(result[3]).toBe(1.0);
});

test("shader with time uniform", async () => {
  const src = `
    @group(0) @binding(0) var<uniform> u: test::Uniforms;

    @fragment
    fn fs_main() -> @location(0) vec4f {
      return vec4f(u.time, u.time * 2.0, u.time * 3.0, 1.0);
    }
  `;

  const result = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    uniforms: { time: 5.0 },
  });

  expect(result[0]).toBeCloseTo(5.0);
  expect(result[1]).toBeCloseTo(10.0);
  expect(result[2]).toBeCloseTo(15.0);
  expect(result[3]).toBeCloseTo(1.0);
});

test("shader with mouse uniform", async () => {
  const src = `
    @group(0) @binding(0) var<uniform> u: test::Uniforms;

    @fragment
    fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let st = pos.xy / u.resolution;
      let dist = length(st - u.mouse);
      return vec4f(dist, 0.0, 0.0, 1.0);
    }
  `;

  const result = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    size: [256, 256],
    uniforms: { mouse: [0.5, 0.5] },
  });

  // Distance from (0.5/256, 0.5/256) to (0.5, 0.5)
  const st = [0.5 / 256, 0.5 / 256];
  const expectedDist = Math.sqrt((st[0] - 0.5) ** 2 + (st[1] - 0.5) ** 2);
  expect(result[0]).toBeCloseTo(expectedDist, 4);
});

test("shader with uniforms and texture", async () => {
  const inputTex = createSolidTexture(device, [0.5, 0.5, 0.5, 1.0], 64, 64);
  const sampler = createSampler(device);

  const src = `
    @group(0) @binding(0) var<uniform> u: test::Uniforms;
    @group(0) @binding(1) var input_tex: texture_2d<f32>;
    @group(0) @binding(2) var input_samp: sampler;

    @fragment
    fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = pos.xy / u.resolution;
      let tex_color = textureSample(input_tex, input_samp, uv);
      let time_mod = vec4f(u.time * 0.1);
      return tex_color + time_mod;
    }
  `;

  const result = await testFragmentShader({
    projectDir: import.meta.url,
    device,
    src,
    size: [64, 64],
    uniforms: { time: 10.0 },
    inputTextures: [{ texture: inputTex, sampler }],
  });

  // 0.5 (texture) + 1.0 (time * 0.1 where time=10) = 1.5
  expect(result[0]).toBeCloseTo(1.5, 2);
});

test("multi-frame animation", async () => {
  const src = `
    @group(0) @binding(0) var<uniform> u: test::Uniforms;

    @fragment
    fn fs_main() -> @location(0) vec4f {
      let phase = sin(u.time);
      return vec4f(phase, 0.0, 0.0, 1.0);
    }
  `;

  const frames = await testAnimatedShader({
    projectDir: import.meta.url,
    device,
    src,
    timePoints: [0.0, 1.57, 3.14], // 0, π/2, π
  });

  expect(frames[0][0]).toBeCloseTo(0.0, 2); // sin(0) = 0
  expect(frames[1][0]).toBeCloseTo(1.0, 2); // sin(π/2) = 1
  expect(frames[2][0]).toBeCloseTo(0.0, 2); // sin(π) ≈ 0
});
