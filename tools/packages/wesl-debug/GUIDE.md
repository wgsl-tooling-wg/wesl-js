# wesl-test API Reference

Complete API documentation for testing WGSL/WESL shaders.

## Table of Contents

- [testComputeShader()](#testcomputeshader)
- [testFragmentShader()](#testfragmentshader)
- [expectFragmentImage()](#expectfragmentimage)
- [Texture Helper Functions](#texture-helper-functions)
- [Working with Local Shader Packages](#working-with-local-shader-packages)
- [Complete Test Example](#complete-test-example)

## testComputeShader()

Runs a compute shader and returns result buffer values.

### Storage Buffer

The `test::results` buffer is automatically provided:
- **Default size**: 4 elements
- **Custom size**: Use the `size` parameter to specify buffer size in elements
- **Access**: Via `test::results[index]`
- **Unwritten values**: Filled with -999

### Multiple Invocations with Custom Buffer Size

For shaders that process multiple values, combine `size`, `@workgroup_size`, and `dispatchWorkgroups`:

```typescript
const src = `
  import package::hash::lowbias32;

  @compute @workgroup_size(256)
  fn main(@builtin(global_invocation_id) id: vec3u) {
    test::results[id.x] = lowbias32(id.x);
  }
`;

const result = await testComputeShader({
  device,
  src,
  resultFormat: "u32",
  size: 1024, // 1024 u32 elements
  dispatchWorkgroups: 4 // 4 workgroups × 256 threads = 1024 invocations
});
```

### Parameters

- `device: GPUDevice` - WebGPU device
- `src: string` - Shader source code (WGSL or WESL)
- `projectDir?: string` - Import path base (usually `import.meta.url`). Optional, but helpful in monorepos where tests may run from different directories.
- `resultFormat?: string` - Result buffer format: "u32" (default), "f32", "i32"
- `size?: number` - Result buffer size in elements (default: 4)
- `dispatchWorkgroups?: number | [number, number, number]` - Number of workgroups to dispatch (default: 1)

## testFragmentShader()

Renders a fragment shader and returns pixel (0,0) color values.

### Testing with Derivatives

Derivative functions (`dpdx`, `dpdy`, `fwidth`) require at least a 2×2 pixel quad. Use the `size` parameter:

```typescript
const src = `
  @fragment
  fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let dx = dpdx(pos.x);
    return vec4f(pos.x, dx, 0.0, 1.0);
  }
`;
const result = await testFragmentShader({
  device,
  src,
  textureFormat: "rg32float",
  size: [2, 2]
});
const [x, dx] = result;
// x = 0.5, dx = 1.0
```

**Note**: The function always samples pixel (0,0) from the rendered texture.

### Testing with Input Textures

Use `inputTextures` to test shaders that sample from textures:

```typescript
import {
  testFragmentShader,
  solidTexture,
  createSampler
} from "wesl-test";

const inputTex = solidTexture(device, [0.5, 0.5, 0.5, 1.0], 256, 256);
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
  device,
  src,
  inputTextures: [{ texture: inputTex, sampler }]
});
// result = [0.5, 0.5, 0.5, 1.0]
```

### Binding Convention

Bindings in group 0:
- `@binding(0)` - Uniform buffer (automatically provided, contains `test::Uniforms`)
- `inputTextures[0]` → texture at `@binding(1)`, sampler at `@binding(2)`
- `inputTextures[1]` → texture at `@binding(3)`, sampler at `@binding(4)`
- Pattern continues for additional textures

### Uniform Buffer

Fragment shaders can access standard uniforms via `test::Uniforms`:

```wgsl
@group(0) @binding(0) var<uniform> u: test::Uniforms;

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let st = pos.xy / u.resolution;  // Normalized coordinates
  return vec4f(st, 0.0, 1.0);
}
```

**Available uniforms:**
- `resolution: vec2f` - Auto-populated from `size` parameter
- `time: f32` - Animation time (default: 0.0)
- `mouse: vec2f` - Mouse position in [0,1] (default: [0.0, 0.0])

Pass custom values via the `uniforms` parameter:

```typescript
const result = await testFragmentShader({
  device,
  src,
  uniforms: { time: 5.0, mouse: [0.5, 0.5] }
});
```

### Parameters

- `device: GPUDevice` - WebGPU device
- `src?: string` - Shader source code (WGSL or WESL). Either `src` or `moduleName` required.
- `moduleName?: string` - Shader file to load (e.g., "effects/blur.wgsl"). Either `src` or `moduleName` required.
- `projectDir?: string` - Import path base (usually `import.meta.url`). Optional, but helpful in monorepos.
- `textureFormat?: string` - Output texture format (default: "rgba32float")
- `size?: [number, number]` - Render size in pixels (default: [1, 1])
- `inputTextures?: Array<{texture: GPUTexture, sampler: GPUSampler}>` - Input textures
- `uniforms?: {time?: number, mouse?: [number, number]}` - Custom uniform values

**Note**: Provide either `src` (inline shader) or `moduleName` (load from file), but not both.

## expectFragmentImage()

Loads a shader from a file, renders it, and automatically compares against a snapshot. Simplest API for visual regression testing of shader files.

### Basic Usage

```typescript
import { expectFragmentImage } from "wesl-test";

test("blur shader matches snapshot", async () => {
  await expectFragmentImage(device, "effects/blur.wgsl", {
    projectDir: import.meta.url,
    size: [256, 256],
  });
  // Snapshot name automatically derived: "effects-blur"
});
```

### Shader Name Formats

The `moduleName` parameter supports three formats:

- **Bare name**: `"blur.wgsl"` → resolves to `shaders/blur.wgsl`
- **Relative path**: `"effects/blur.wgsl"` → resolves to `shaders/effects/blur.wgsl`
- **Module path**: `"package::effects::blur"` → same as relative path

The root directory (`shaders/`) is determined by `wesl.toml` configuration.

### Custom Snapshot Names

Override the automatic snapshot name for testing shader variations:

```typescript
test("blur with high radius", async () => {
  await expectFragmentImage(device, "effects/blur.wgsl", {
    projectDir: import.meta.url,
    snapshotName: "blur-radius-10",
    uniforms: { radius: 10 },
    size: [256, 256],
  });
});
```

### Parameters

- `device: GPUDevice` - WebGPU device
- `moduleName: string` - Shader file to load
- `opts?:` - Optional parameters:
  - `projectDir?: string` - Import path base (usually `import.meta.url`)
  - `snapshotName?: string` - Override automatic snapshot name
  - `size?: [number, number]` - Render size (default: [256, 256])
  - `textureFormat?: string` - Texture format (default: "rgba32float")
  - `inputTextures?: Array<{texture, sampler}>` - Input textures
  - `uniforms?: {time?, mouse?}` - Custom uniform values

**See also**: [IMAGE_TESTING.md](./IMAGE_TESTING.md) for complete visual regression testing workflow.

## Texture Helper Functions

Helper functions for creating test textures:

### Basic Helpers

```typescript
import {
  solidTexture,
  gradientTexture,
  checkerboardTexture,
  createSampler
} from "wesl-test";

// Uniform color texture
const solid = solidTexture(device, [1.0, 0.0, 0.0, 1.0], 256, 256);

// Gradient (horizontal or vertical)
const gradient = gradientTexture(device, 256, 256, "horizontal");

// Checkerboard pattern
const checker = checkerboardTexture(device, 256, 256, 32); // 32px cells

// Texture sampler
const sampler = createSampler(device, {
  addressModeU: "repeat",
  addressModeV: "repeat",
  magFilter: "linear",
  minFilter: "linear"
});
```

### Function Signatures

- `solidTexture(device, color, width, height)` - Creates uniform color texture
  - `color: [number, number, number, number]` - RGBA values [0-1]

- `gradientTexture(device, width, height, direction?)` - Creates gradient
  - `direction?: "horizontal" | "vertical"` - Gradient direction (default: "horizontal")

- `checkerboardTexture(device, width, height, cellSize?)` - Creates checkerboard
  - `cellSize?: number` - Size of each square in pixels (default: 16)

- `createSampler(device, options?)` - Creates texture sampler
  - `options?: GPUSamplerDescriptor` - Sampler options (defaults to linear filtering, clamp-to-edge)

See [IMAGE_TESTING.md](./IMAGE_TESTING.md) for advanced texture generators.

## Working with Local Shader Packages

### Shader File Organization

By default, place your shader files in a `shaders/` directory. You can customize this using a `wesl.toml` file:

```toml
include = ["shaders/**/*.w[eg]sl"]
root = "shaders"
dependencies = []
```

See the [wesl.toml documentation](https://wesl-lang.dev/docs/Getting-Started-JavaScript#wesltoml) for more configuration options.

### Importing Shader Functions

Import from local shader files using `package::` or your actual package name:

```typescript
const src = `
  import package::utils::helper;      // generic package:: works
  import my_shader_lib::math::compute; // or use actual package name

  @compute @workgroup_size(1)
  fn main() {
    test::results[0] = helper() + compute();
  }
`;

const result = await testComputeShader({ device, src });
```

### Testing Built Bundles

Test your built shader bundles before publishing:

```bash
TEST_BUNDLES=true vitest  # Tests use built bundles instead of source
```

Or configure per-test:

```typescript
const result = await testComputeShader({
  device,
  src,
  useSourceShaders: false  // Use built bundle
});
```

## Complete Test Example

```typescript
import { afterAll, beforeAll, expect, test } from "vitest";
import { testComputeShader, destroySharedDevice, getGPUDevice } from "wesl-test";
import shaderSource from "./shaders/hash.wgsl?raw";

let device: GPUDevice;

beforeAll(async () => {
  device = await getGPUDevice();
});

afterAll(() => {
  destroySharedDevice();
});

test("hash function from file", async () => {
  const src = `
    import package::hash::lowbias32;

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) id: vec3u) {
      test::results[id.x] = lowbias32(id.x);
    }
  `;

  const result = await testComputeShader({ device, src, size: 256 });

  // Validate hash distribution
  const mean = result.reduce((a, b) => a + b, 0) / result.length;
  const expectedMean = 0xFFFFFFFF / 2;
  expect(mean).toBeGreaterThan(expectedMean * 0.3);
  expect(mean).toBeLessThan(expectedMean * 0.7);
});
```

## See Also

- [IMAGE_TESTING.md](./IMAGE_TESTING.md) - Visual regression testing guide
- [README.md](./README.md) - Quick start guide
