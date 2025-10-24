# wesl-debug

Utilities for testing WESL/WGSL shaders in Node.js environments.

## Overview

`wesl-debug` provides simple test harnesses 
for quickly running fragment and compute shaders GPU
tests.

* Write shader code in either WESL or WGSL.
* Shader library imports in WESL are 
  resolved automatically from `node_modules`. 
* Shaders are run using Dawn,
  the WebGPU engine used inside the Chrome browser.

## Installation

```bash
npm install wesl-debug
```

## Testing Compute Shaders

Use `testComputeShader()` to test compute shader behavior. A storage buffer is provided for writing test results.

### Basic Example

```typescript
import { testComputeShader } from "wesl-debug";

const gpu = /* initialize GPU */;

const src = `
  import test;  // provides test::results storage buffer

  @compute @workgroup_size(1)
  fn main() {
    test::results[0] = 42u;
    test::results[1] = 100u;
  }
`;

const result = await testComputeShader(import.meta.url, gpu, src, "u32");
// result = [42, 100, -999, -999]  // (unwritten values are filled with -999)
```

### Storage Buffer

The `test` virtual module provides a storage buffer for results in WESL code:
- Default buffer size: 16 bytes (4 × 4-byte elements for u32 or f32)
- Custom size: Use the `size` parameter to specify buffer size in bytes
- Access via `test::results[index]`

```typescript
// Example with custom buffer size
const result = await testComputeShader({
  projectDir: import.meta.url,
  device,
  src: `
    import test;
    @compute @workgroup_size(1)
    fn main() {
      for (var i = 0u; i < 8u; i++) {
        test::results[i] = i * 10u;
      }
    }
  `,
  resultFormat: "u32",
  size: 32  // 32 bytes = 8 × 4-byte u32 elements
});
// result = [0, 10, 20, 30, 40, 50, 60, 70]
```


## Testing Fragment Shaders

Use `testFragmentShader()` to test fragment shader behavior.
The function renders using a fullscreen triangle and returns pixel values for validation.

### Basic Example

```typescript
import { testFragmentShader, getGPUDevice } from "wesl-debug";

const projectDir = import.meta.url;
const device = await getGPUDevice();

const src = `
  @fragment
  fn fs_main() -> @location(0) vec4f {
    return vec4f(0.5, 0.25, 0.75, 1.0);
  }
`;
const textureFormat = "rgba32float";
const r = await testFragmentShader({ projectDir, device, src, textureFormat });
// r = [0.5, 0.25, 0.75, 1.0]
```

#### Testing using Derivatives
Derivative functions like `dpdx`, `dpdy`, and `fwidth`
require at least a 2×2 pixel quad.
Use the `size` parameter to create a 2×2 texture:

```typescript
// derivative of x coordinate
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
const [x, dx] = result; // result at pixel (0, 0)
// x = .5  dx = 1
```

**Note**: The test function always samples pixel (0,0) from the rendered texture.

#### Testing with Input Textures

Use `inputTextures` to test fragment shaders that sample from textures.
Helper functions provide common test patterns:

```typescript
import {
  testFragmentShader,
  getGPUDevice,
  solidTexture,
  createSampler
} from "wesl-debug";

const device = await getGPUDevice();
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
  projectDir: import.meta.url,
  device,
  src,
  inputTextures: [{ texture: inputTex, sampler }]
});
// result = [0.5, 0.5, 0.5, 1.0]
```

**Texture Helper Functions:**
- `solidTexture(device, color, width, height)` - uniform color
- `gradientTexture(device, width, height, direction?)` - gradient ('horizontal' or 'vertical')
- `checkerboardTexture(device, width, height, cellSize?)` - checkerboard pattern
- `createSampler(device, options?)` - texture sampler (linear filtering, clamp-to-edge by default)

**Binding Convention**: Bindings in group 0:
- `@binding(0)` - Uniform buffer (automatically provided, contains test::Uniforms)
- `inputTextures[0]` → texture at `@binding(1)`, sampler at `@binding(2)`
- `inputTextures[1]` → texture at `@binding(3)`, sampler at `@binding(4)`

## Image Testing & Visual Regression

Test complete rendered images and automate visual regression testing using snapshot comparison.

### Full Image Retrieval

Use `testFragmentShaderImage()` to get the complete rendered image instead of just pixel (0,0):

```typescript
import { testFragmentShaderImage } from "wesl-debug";

const result = await testFragmentShaderImage({
  projectDir: import.meta.url,
  device,
  src: blurShaderSource,
  size: [256, 256],
  inputTextures: [{ texture: inputTex, sampler }]
});

// Use with snapshot testing (see below)
await expect(result).toMatchImage("blur-result");
```

### Advanced Test Textures

Additional texture generators for image processing tests:

```typescript
import {
  radialGradientTexture,   // White center → black edge
  edgePatternTexture,       // Sharp lines for edge detection
  colorBarsTexture,         // RGB primaries/secondaries
  noiseTexture,             // Deterministic seeded noise
  pngToTexture              // Load from PNG file
} from "wesl-debug";

const radial = radialGradientTexture(device, 256);
const edges = edgePatternTexture(device, 256);
const colors = colorBarsTexture(device, 256);
const noise = noiseTexture(device, 256, 42); // seed = 42

// Load from a PNG file
const photo = await pngToTexture(device, "path/to/image.png");
```

### Visual Regression Testing

Use snapshot comparison to catch unintended visual changes:

```typescript
import { imageMatcher } from "vitest-image-snapshot";

// In test setup file or at top of test
imageMatcher();

test("blur filter produces expected result", async () => {
  const result = await testFragmentShaderImage({
    projectDir: import.meta.url,
    device,
    src: blurShaderSource,
    size: [256, 256],
    inputTextures: [{ texture: inputTex, sampler }]
  });

  // Compare against reference snapshot
  await expect(result).toMatchImage("blur-filter");
});
```

**Snapshot Workflow:**

```bash
# Run tests - creates reference snapshots on first run
pnpm vitest

# Review generated snapshots in __image_snapshots__/
# Commit if they look correct
git add __image_snapshots__/
git commit -m "Add visual regression tests"

# After code changes, tests fail if output changed
pnpm vitest  # Shows diffs in __image_diffs__/

# If changes are intentional, update snapshots
pnpm vitest -- -u
```

**Directory Structure:**
- `__image_snapshots__/` - Reference images (committed to git)
- `__image_actual__/` - Current test outputs (gitignored, saved on every run)
- `__image_diffs__/` - Diff visualizations (gitignored, only on failure)
- `__image_diff_report__/` - HTML report (gitignored, self-contained)
- `__image_dev__/` - Dev experiments (gitignored)

### Comparison Options

Fine-tune snapshot comparison thresholds:

```typescript
await expect(result).toMatchImage({
  name: "edge-detection",
  threshold: 0.1,                      // Color difference threshold (0-1)
  allowedPixelRatio: 0.01,  // Allow 1% of pixels to differ
  allowedPixels: 100         // Or allow 100 pixels to differ
});
```

### HTML Diff Report

When snapshot tests fail, an HTML report is automatically generated showing all failures side-by-side:

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    reporters: [
      "default",
      ["vitest-image-snapshot/reporter"]
    ]
  }
});
```

If any tests fail, a report is saved to `__image_diff_report__/index.html` and shows:
- Side-by-side comparison (Expected | Actual | Diff)
- Mismatch statistics per test
- Clickable images for full-size viewing

## Complete Test Example

```typescript
import { afterAll, beforeAll, expect, test } from "vitest";
import { testFragmentShader, testComputeShader } from "wesl-debug";
import { destroySharedDevice, getGPUDevice } from "wesl-debug";

const projectDir = import.meta.url;
let device: GPUDevice;

beforeAll(async () => {
  device = await getGPUDevice();
});

afterAll(() => {
  destroySharedDevice();
});

test("fragment shader renders color", async () => {
  const src = `
    @fragment
    fn fs_main() -> @location(0) vec4f {
      return vec4f(1.0, 0.0, 0.0, 1.0);
    }
  `;
  const textureFormat = "rgba32float";
  const r = await testFragmentShader({ projectDir, device, src, textureFormat });
  expect(r).toEqual([1.0, 0.0, 0.0, 1.0]);
});

test("compute shader writes results", async () => {
  const src = `
    import test;

    @compute @workgroup_size(1)
    fn main() {
      test::results[0] = 123u;
    }
  `;
  const result = await testComputeShader(projectDir, device, src, "u32");
  expect(result[0]).toBe(123);
});
```