import { expect, test } from "vitest";

// These tests only run in temp-built-test where wgsl-test is available as a packed dep
const inBuiltTest = process.cwd().endsWith("temp-built-test");

// Register the toMatchImage matcher when in built-test mode
if (inBuiltTest) {
  const { imageMatcher } = await import("vitest-image-snapshot");
  imageMatcher();
}

test.skipIf(!inBuiltTest)("compute shader math", async () => {
  const { getGPUDevice, testCompute } = await import("wgsl-test");
  const device = await getGPUDevice();
  const result = await testCompute({
    device,
    src: `
      @compute @workgroup_size(1)
      fn main() {
        test::results[0] = 2.0 + 2.0;
      }
    `,
    resultFormat: "f32",
  });
  expect(result[0]).toBe(4);
});

test.skipIf(!inBuiltTest)("fragment shader renders gradient", async () => {
  const { getGPUDevice, testFragmentImage } = await import("wgsl-test");
  const device = await getGPUDevice();
  const imageData = await testFragmentImage({
    device,
    src: `
      @fragment
      fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
        let uv = pos.xy / vec2f(64.0);
        return vec4f(uv.x, uv.y, 0.5, 1.0);
      }
    `,
    size: [64, 64],
  });
  await expect(imageData).toMatchImage({ name: "gradient" });
});
