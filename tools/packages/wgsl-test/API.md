# wgsl-test API Reference

### Native WESL Testing
- [Native WESL Testing](#native-wesl-testing) - `@test` attribute and assertion functions

### Core Functions
- [testCompute()](#testcompute) - Run compute shaders and retrieve results
- [testFragment()](#testfragment) - Test fragment shaders, returns single pixel color
- [expectFragmentImage()](#expectfragmentimage) - Visual regression testing with snapshot comparison

### Fragment Shader Configuration
- [Standard Uniform Buffer](#standard-uniform-buffer) - Built-in uniforms (resolution, time, mouse)
- [Binding Convention](#binding-convention) - Texture and uniform binding layout

### Helpers
- [Texture Helper Functions](#texture-helper-functions) - Generate test textures
- [Working with Local Shader Files](#working-with-local-shader-files) - Import and organize shader code

### Visual Regression Testing
- [Visual Regression Testing](#visual-regression-testing) - Snapshot workflow and configuration

### Advanced
- [testFragmentImage()](#advanced-testfragmentimage) - Full image data access for custom validation

## Examples
- [Compute Shader Example](#complete-test-example) - Full example on this page
- [wgsl-test-native](https://github.com/wgsl-tooling-wg/examples/tree/main/wgsl-test-native) - Native WESL testing with `@test` (example project)
- [wgsl-test-basic-compute](https://github.com/wgsl-tooling-wg/examples/tree/main/wgsl-test-basic-compute) - Compute shader testing (example project)
- [wgsl-test-fragment-image](https://github.com/wgsl-tooling-wg/examples/tree/main/wgsl-test-fragment-image) - Fragment shader & image snapshots (example project)

---

## Native WESL Testing

Write tests directly in WESL with the `@test` attribute. Assertions run on the GPU and report results back to TypeScript.

### @test Attribute

Mark functions with `@test` to create GPU unit tests:

```wgsl
import wgsl_test::expectNear;

@test fn myTest() {
  expectNear(computeValue(), 0.5);
}
```

### Assertion Functions

Import from `wgsl_test::`

| Function | Description |
|----------|-------------|
| `expect(bool)` | Assert condition is true |
| `expectEq(u32, u32)` | Assert integers are equal |
| `expectNear(f32, f32)` | Assert floats within combined tolerance (relTol=1e-3, absTol=1e-6) |
| `expectNearVec2(vec2f, vec2f)` | Assert vec2 within combined tolerance |
| `expectNearVec3(vec3f, vec3f)` | Assert vec3 within combined tolerance |
| `expectNearVec4(vec4f, vec4f)` | Assert vec4 within combined tolerance |
| `expectWithin(f32, f32, relTol, absTol)` | Assert floats within custom tolerance |
| `expectWithinVec2(vec2f, vec2f, relTol, absTol)` | Assert vec2 within custom tolerance |
| `expectWithinVec3(vec3f, vec3f, relTol, absTol)` | Assert vec3 within custom tolerance |
| `expectWithinVec4(vec4f, vec4f, relTol, absTol)` | Assert vec4 within custom tolerance |
| `expectUlp(f32, f32, maxUlp)` | Assert floats within N ULPs (units in last place) |
| `expectUlpVec2(vec2f, vec2f, maxUlp)` | Assert vec2 within N ULPs |
| `expectUlpVec3(vec3f, vec3f, maxUlp)` | Assert vec3 within N ULPs |
| `expectUlpVec4(vec4f, vec4f, maxUlp)` | Assert vec4 within N ULPs |

The `expectNear*` functions use combined tolerance: `|a - b| <= max(absTol, relTol * max(|a|, |b|))`. 
This handles both near-zero comparisons (via `absTol`) and large value comparisons (via `relTol`).

The `expectUlp*` functions measure how many representable floats apart two values are.

_**Note:** Floating point accuracy varies across GPU implementations.
See the [WGSL spec accuracy requirements](https://www.w3.org/TR/WGSL/#floating-point-accuracy) for details._

### Running Native Tests

**`testWesl()`** - Discovers `@test` functions and registers each as a vitest test. Use with top-level await:

```typescript
import { getGPUDevice, testWesl } from "wgsl-test";

const device = await getGPUDevice();
await testWesl({ device, moduleName: "my_test" });
```

**`expectWesl()`** - Runs all `@test` functions and throws on failure. Use inside a test block:

```typescript
test("shader tests", async () => {
  await expectWesl({ device, moduleName: "my_test" });
});
```

**`runWesl()`** - Returns raw results for custom validation:

```typescript
const results = await runWesl({ device, moduleName: "my_test" });
// results: [{ name: "testFn", passed: true, actual: [...], expected: [...] }, ...]

// Run a single test by name:
const single = await runWesl({ device, moduleName: "my_test", testName: "specificTest" });
```

---

## testCompute()

Tests WGSL functions by running a compute shader. Write a shader that calls the function under test and stores results in the `test::results` buffer. The buffer is automatically provided and accessed via `test::results[index]`. Buffer elements not written by the shader are initialized to -999.

### Parameters

- `device: GPUDevice` - WebGPU device
- `src: string` - Shader source code (WGSL or WESL)
- `projectDir?: string` - Import path base (usually `import.meta.url`). Optional, but helpful in monorepos where tests may run from different directories.
- `resultFormat?: string` - Result buffer format: "u32" (default), "f32", "i32"
- `size?: number` - Result buffer size in elements (default: 4)
- `dispatchWorkgroups?: number | [number, number, number]` - Number of workgroups to dispatch (default: 1)

### Example

```typescript
const src = `
  import package::hash::lowbias32;

  @compute @workgroup_size(256)
  fn main(@builtin(global_invocation_id) id: vec3u) {
    test::results[id.x] = lowbias32(id.x);
  }
`;

const result = await testCompute({
  device,
  src,
  resultFormat: "u32",
  size: 1024,
  dispatchWorkgroups: 4 // 4 workgroups × 256 threads
});
```

## Fragment Shader Testing

Three functions for testing fragment shaders, ranging from simple color validation to full visual regression testing.

### Standard Uniform Buffer

The `test::` module is available in fragment shader tests and contains:

```wgsl
struct Uniforms {
  resolution: vec2f,  // Output size in pixels (default: [256, 256])
  time: f32,          // Animation time (default: 0.0)
  mouse: vec2f,       // Mouse position [0-1] (default: [0.0, 0.0])
}
```

Access it by binding to `@group(0) @binding(0)`:

```wgsl
@group(0) @binding(0) var<uniform> u: test::Uniforms;

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let st = pos.xy / u.resolution;  // Normalized coordinates
  let wave = sin(st.x * 10.0 + u.time);
  return vec4f(st, wave, 1.0);
}
```

Pass custom uniform values when calling test functions:

```typescript
await expectFragmentImage(device, "animated/wave", {
  uniforms: { time: 5.0, mouse: [0.5, 0.5] }
});
```

### Binding Convention

All bindings are in group(0):
- `@binding(0)` - Uniform buffer (automatically provided)
- `@binding(1..n)` - Textures (textures[0..n-1])
- `@binding(n+1..n+m)` - Samplers (samplers[0..m-1])

**Sampler Rules**:
- Provide 1 sampler to reuse it for all textures
- Or provide exactly as many samplers as textures for 1-to-1 pairing

### testFragment()

Returns the color values at pixel (0,0). For full image retrieval, use `testFragmentImage()`.

**Parameters**

- `device: GPUDevice` - WebGPU device
- `src?: string` - Shader source code (WGSL or WESL)
- `moduleName?: string` - Shader file to load
- `projectDir?: string` - Import path base (usually `import.meta.url`)
- `textureFormat?: string` - Output texture format (default: "rgba32float")
- `size?: [number, number]` - Render size in pixels (default: [1, 1])
- `textures?: GPUTexture[]` - Input textures
- `samplers?: GPUSampler[]` - Samplers for input textures
- `uniforms?: {time?: number, mouse?: [number, number]}` - Custom uniform values

Either `src` or `moduleName` is required.

**Example**

```typescript
import { testFragment, solidTexture, createSampler } from "wgsl-test";

const inputTex = solidTexture(device, [0.8, 0.2, 0.4, 1.0], 256, 256);
const sampler = createSampler(device);

const src = `
  @group(0) @binding(1) var input_tex: texture_2d<f32>;
  @group(0) @binding(2) var input_samp: sampler;

  @fragment
  fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / 256.0;
    let color = textureSample(input_tex, input_samp, uv);
    return color * 0.5;  // Darken by half
  }
`;

const result = await testFragment({
  device,
  src,
  textures: [inputTex],
  samplers: [sampler]
});
// result = [0.4, 0.1, 0.2, 0.5] - RGBA values at pixel (0,0)
```

### expectFragmentImage()

Renders a shader file and compares against a snapshot. Simplest API for visual regression testing. See [Visual Regression Testing](#visual-regression-testing) for complete workflow.

**Parameters**

- `device: GPUDevice` - WebGPU device
- `moduleName: string` - Shader file to load
- `opts?:` - Optional parameters:
  - `projectDir?: string` - Import path base (usually `import.meta.url`)
  - `snapshotName?: string` - Override automatic snapshot name
  - `size?: [number, number]` - Render size (default: [256, 256])
  - `textureFormat?: string` - Texture format (default: "rgba32float")
  - `textures?: GPUTexture[]` - Input textures
  - `samplers?: GPUSampler[]` - Samplers for input textures
  - `uniforms?: {time?, mouse?}` - Custom uniform values

**Example**

```typescript
import { expectFragmentImage } from "wgsl-test";

// Simple - defaults to 256×256, no .wgsl suffix needed
test("red-blue gradient", async () => {
  await expectFragmentImage(device, "effects/gradient_red_blue");
});

// With options
test("blur with high radius", async () => {
  await expectFragmentImage(device, "effects/blur", {
    snapshotName: "blur-radius-10",
    textures: [inputTex],
    samplers: [sampler],
    uniforms: { time: 5.0 }
  });
});
```

Supported shader name formats:
- Bare name: `"gradient"` → resolves to `shaders/gradient.wgsl`
- Relative path: `"effects/blur"` → resolves to `shaders/effects/blur.wgsl`
- Module path: `"package::effects::blur"` → same as above

## Texture Helper Functions

- `solidTexture(device, color, width, height)` → `GPUTexture` - Creates uniform color texture
  - `color: [number, number, number, number]` - RGBA values [0-1]

- `gradientTexture(device, width, height, direction?)` → `GPUTexture` - Creates gradient
  - `direction?: "horizontal" | "vertical"` - Gradient direction (default: "horizontal")

- `checkerboardTexture(device, width, height, cellSize?)` → `GPUTexture` - Creates checkerboard
  - `cellSize?: number` - Size of each square in pixels (default: 16)

- `createSampler(device, options?)` → `GPUSampler` - Creates texture sampler
  - `options?: GPUSamplerDescriptor` - Sampler options (defaults to linear filtering, clamp-to-edge)

**Advanced Test Textures**

Additional texture generators for image processing tests:

- `radialGradientTexture(device, size)` → `GPUTexture` - Circular gradient from white center to black edge
- `edgePatternTexture(device, size)` → `GPUTexture` - Sharp horizontal and vertical lines for edge detection
- `colorBarsTexture(device, size)` → `GPUTexture` - Vertical bars of RGB primaries and secondaries
- `noiseTexture(device, size, seed?)` → `GPUTexture` - Deterministic pseudo-random noise
- `pngToTexture(device, path)` → `GPUTexture` - Loads a PNG file as a texture
- `lemurTexture(device, size?)` → `GPUTexture` - Bundled test photo (256×256 or 512×512, defaults to 512)

## Visual Regression Testing

Automatically compare rendered images against reference snapshots to detect visual regressions.

### Setup

```typescript
import { imageMatcher } from "vitest-image-snapshot";

// In test setup file or at top of test
imageMatcher();
```

See the [vitest-image-snapshot documentation][vitest-image-snapshot] for reporter configuration to enable HTML diff reports in your vitest config.

### Snapshot Workflow

```bash
# First run - creates reference snapshots
pnpm vitest

# Review generated snapshots in __image_snapshots__/
# Commit if they look correct
git add __image_snapshots__/
git commit -m "Add visual regression tests"

# After code changes - tests fail if output differs
pnpm vitest  # Shows diffs in __image_diffs__/

# If changes are intentional - update snapshots
pnpm vitest -- -u
```

### Advanced Configuration

For advanced configuration and detailed information, see the [vitest-image-snapshot documentation][vitest-image-snapshot]:

- **Comparison options** - Fine-tune snapshot matching with `threshold`, `allowedPixels`, and `allowedPixelRatio`
- **Directory structure** - Understanding `__image_snapshots__/`, `__image_actual__/`, and `__image_diffs__/`
- **HTML diff report** - Setup and customization for visual test failure reports

[vitest-image-snapshot]: https://github.com/wgsl-tooling-wg/wesl-js/tree/main/tools/packages/vitest-image-snapshot

## Complete Test Example

```typescript
import { expect, test } from "vitest";
import { testCompute, getGPUDevice } from "wgsl-test";

const device = await getGPUDevice();

test("hash function from file", async () => {
  const src = `
    import package::hash::lowbias32; // src fn to check

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) id: vec3u) {
      test::results[id.x] = lowbias32(id.x);
    }
  `;

  const result = await testCompute({ device, src, size: 256 });

  // Validate hash distribution
  const mean = result.reduce((a, b) => a + b, 0) / result.length;
  const expectedMean = 2 ** 32 / 2;
  expect(mean).toBeGreaterThan(expectedMean * 0.4);
  expect(mean).toBeLessThan(expectedMean * 0.6);
});
```

## Working with Local Shader Files

### Shader File Organization

Conventionally, place your shader files in a `shaders/` directory.
Or see the [wesl.toml](https://wesl-lang.dev/docs/Getting-Started-JavaScript#wesltoml)
documentation for options.

### Shader Unit Tests
For unit tests, write an WESL snippet to call the shader functions you want to test.
Import from local shader files using `import package::`

(For image regression tests, see [visual regression testing](#visual-regression-testing)).

#### Importing Shader Functions

You can write the WESL snippet as a TypeScript string.

```typescript
const src = /* wesl */`
  import package::utils::{helper, compute};

  @compute @workgroup_size(1)
  fn main() {
    test::results[0] = helper() + compute();
  }
`;

const result = await testCompute({ device, src });
```

#### Loading Shaders by Module Name

Or use `moduleName` to load the test snippet from your shader directory:

```typescript
const result = await testCompute({
  device,
  moduleName: "tests/compute_sum"  // loads from shaders/compute_sum.wesl
});
```


### Testing Built Bundles

You can test your built shader bundles before publishing:

```bash
TEST_BUNDLES=true vitest  # Tests use built bundles instead of source
```

## Advanced: testFragmentImage()

For special situations where you want to write validation code for fragment shaders across multiple pixels.

`testFragmentImage()` returns the complete rendered image (not just pixel 0,0 as `testFragment()` does). Most users should use [`testFragment()`](#testfragment) for single-pixel tests or [`expectFragmentImage()`](#expectfragmentimage) for visual regression testing.

**Parameters**

Same as [`testFragment()`](#testfragment).

**Returns**

`ImageData` object containing the rendered image (width, height, and data array).

**Example**

```typescript
import { testFragmentImage } from "wgsl-test";

const result = await testFragmentImage({
  device,
  moduleName: "effects/blur",
  size: [256, 256],
  textures: [inputTex],
  samplers: [sampler]
});

// result is ImageData with full 256×256 pixel data
// Inspect specific pixels or process the entire image
const pixel = result.data.slice(0, 4); // First pixel RGBA
```

## See Also

- [README.md](https://github.com/wgsl-tooling-wg/wesl-js/blob/main/tools/packages/wgsl-test/README.md) - Quick start guide
