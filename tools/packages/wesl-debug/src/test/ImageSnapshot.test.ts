import { afterAll, beforeAll, expect, test } from "vitest";
import { imageMatcher } from "vitest-image-snapshot";
import {
  checkerboardTexture,
  colorBarsTexture,
  createSampler,
  destroySharedDevice,
  edgePatternTexture,
  getGPUDevice,
  lemurImagePath,
  pngToTexture,
  testFragmentShaderImage,
} from "../index.ts";

imageMatcher();

let device: GPUDevice;

beforeAll(async () => {
  device = await getGPUDevice();
});

afterAll(() => {
  destroySharedDevice();
});

test("simple box blur", async () => {
  const inputTex = checkerboardTexture(device, 128, 128, 16);
  const sampler = createSampler(device);

  const src = `
    @group(0) @binding(1) var input_tex: texture_2d<f32>;
    @group(0) @binding(2) var input_samp: sampler;

    @fragment
    fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = pos.xy / 128.0;
      let pixel_size = 1.0 / 128.0;

      // 3x3 box blur
      var color = vec4f(0.0);
      for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
          let offset = vec2f(f32(x), f32(y)) * pixel_size;
          color += textureSample(input_tex, input_samp, uv + offset);
        }
      }

      return color / 9.0;
    }
  `;

  const result = await testFragmentShaderImage({
    projectDir: import.meta.url,
    device,
    src,
    size: [128, 128],
    inputTextures: [{ texture: inputTex, sampler }],
  });

  await expect(result).toMatchImage("box-blur");
});

test("simple edge detection", async () => {
  const inputTex = edgePatternTexture(device, 128);
  const sampler = createSampler(device);

  const src = `
    @group(0) @binding(1) var input_tex: texture_2d<f32>;
    @group(0) @binding(2) var input_samp: sampler;

    @fragment
    fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = pos.xy / 128.0;
      let pixel_size = 1.0 / 128.0;

      // Simple Sobel operator
      let tl = textureSample(input_tex, input_samp, uv + vec2f(-pixel_size, -pixel_size)).rgb;
      let tr = textureSample(input_tex, input_samp, uv + vec2f( pixel_size, -pixel_size)).rgb;
      let bl = textureSample(input_tex, input_samp, uv + vec2f(-pixel_size,  pixel_size)).rgb;
      let br = textureSample(input_tex, input_samp, uv + vec2f( pixel_size,  pixel_size)).rgb;

      let gx = -tl + tr - bl + br;
      let gy = -tl - tr + bl + br;
      let mag = length(vec2f(dot(gx, vec3f(0.299, 0.587, 0.114)),
                             dot(gy, vec3f(0.299, 0.587, 0.114))));

      return vec4f(vec3f(mag), 1.0);
    }
  `;

  const result = await testFragmentShaderImage({
    projectDir: import.meta.url,
    device,
    src,
    size: [128, 128],
    inputTextures: [{ texture: inputTex, sampler }],
  });

  await expect(result).toMatchImage({
    name: "edge-detection",
    allowedPixelRatio: 0.01,
  });
});

test("grayscale conversion", async () => {
  const inputTex = colorBarsTexture(device, 128);
  const sampler = createSampler(device);

  const src = `
    @group(0) @binding(1) var input_tex: texture_2d<f32>;
    @group(0) @binding(2) var input_samp: sampler;

    @fragment
    fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = pos.xy / 128.0;
      let color = textureSample(input_tex, input_samp, uv);

      // Perceptual grayscale
      let gray = dot(color.rgb, vec3f(0.299, 0.587, 0.114));

      return vec4f(vec3f(gray), 1.0);
    }
  `;

  const result = await testFragmentShaderImage({
    projectDir: import.meta.url,
    device,
    src,
    size: [128, 128],
    inputTextures: [{ texture: inputTex, sampler }],
  });

  await expect(result).toMatchImage("grayscale");
});

test("sharpen filter on photo sample", async () => {
  const inputTex = await pngToTexture(device, lemurImagePath());
  const sampler = createSampler(device);

  const src = `
    @group(0) @binding(1) var input_tex: texture_2d<f32>;
    @group(0) @binding(2) var input_samp: sampler;

    @fragment
    fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = pos.xy / 512.0;
      let pixel_size = 1.0 / 512.0;

      // Simple sharpen kernel
      let center = textureSample(input_tex, input_samp, uv);
      let top = textureSample(input_tex, input_samp, uv + vec2f(0.0, -pixel_size));
      let bottom = textureSample(input_tex, input_samp, uv + vec2f(0.0, pixel_size));
      let left = textureSample(input_tex, input_samp, uv + vec2f(-pixel_size, 0.0));
      let right = textureSample(input_tex, input_samp, uv + vec2f(pixel_size, 0.0));

      let sharpened = center * 5.0 - top - bottom - left - right;
      return vec4f(clamp(sharpened.rgb, vec3f(0.0), vec3f(1.0)), 1.0);
    }
  `;

  const result = await testFragmentShaderImage({
    projectDir: import.meta.url,
    device,
    src,
    size: [512, 512],
    inputTextures: [{ texture: inputTex, sampler }],
  });

  await expect(result).toMatchImage("lemur-sharpen");
});
