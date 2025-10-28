# Image Testing & Visual Regression

Complete guide to full-image testing and visual regression testing with wesl-test.

## Table of Contents

- [Full Image Retrieval](#full-image-retrieval)
- [Advanced Test Textures](#advanced-test-textures)
- [Visual Regression Testing](#visual-regression-testing)
- [Comparison Options](#comparison-options)
- [HTML Diff Report](#html-diff-report)

## Full Image Retrieval

Use `testFragmentShaderImage()` to get the complete rendered image instead of just pixel (0,0):

```typescript
import { testFragmentShaderImage } from "wesl-test";

// Inline shader source
const result = await testFragmentShaderImage({
  device,
  src: blurShaderSource,
  size: [256, 256],
  inputTextures: [{ texture: inputTex, sampler }]
});

// Or load shader from file
const result = await testFragmentShaderImage({
  device,
  moduleName: "effects/blur.wgsl",
  projectDir: import.meta.url,
  size: [256, 256],
  inputTextures: [{ texture: inputTex, sampler }]
});

// result is ImageData with full 256x256 pixel data
// Use with snapshot testing (see Visual Regression section below)
await expect(result).toMatchImage("blur-result");
```

### Saving Images to Disk

```typescript
import { saveImageDataToPNG } from "wesl-test";

const imageData = await testFragmentShaderImage({
  device,
  src,
  size: [512, 512]
});

// Save to PNG file
await saveImageDataToPNG(imageData, "./output/result.png");
```

## Advanced Test Textures

Additional texture generators for image processing tests:

### Available Generators

- **radialGradientTexture(device, size)** - Circular gradient from white center to black edge
- **edgePatternTexture(device, size)** - Sharp horizontal and vertical lines for edge detection
- **colorBarsTexture(device, size)** - Vertical bars of RGB primaries and secondaries
- **noiseTexture(device, size, seed?)** - Deterministic pseudo-random noise
- **pngToTexture(device, path)** - Loads a PNG file as a texture
- **lemurTexture(device)** - Bundled 512×512 test photo

**Note**: `radialGradientTexture` and `edgePatternTexture` currently don't accept customization options.

## Visual Regression Testing

Automate visual testing using snapshot comparison to catch unintended changes.

### Setup

```typescript
import { imageMatcher } from "vitest-image-snapshot";

// In test setup file or at top of test
imageMatcher();
```

### File-Based Snapshot Testing

Use `expectFragmentImage()` for the simplest workflow when testing shader files:

```typescript
import { expectFragmentImage } from "wesl-test";

test("blur shader matches snapshot", async () => {
  await expectFragmentImage(device, "effects/blur.wgsl", {
    projectDir: import.meta.url,
    size: [256, 256],
    inputTextures: [{ texture: inputTex, sampler }]
  });
  // Snapshot name automatically derived: "effects-blur"
});

// Custom snapshot name for variations
test("blur with high radius", async () => {
  await expectFragmentImage(device, "effects/blur.wgsl", {
    projectDir: import.meta.url,
    snapshotName: "blur-radius-10",
    uniforms: { radius: 10 }
  });
});
```

Supported shader name formats:
- Bare name: `"blur.wgsl"` → resolves to `shaders/blur.wgsl`
- Relative path: `"effects/blur.wgsl"` → resolves to `shaders/effects/blur.wgsl`
- Module path: `"package::effects::blur"` → same as above

### Inline Shader Testing

For inline shaders or custom validation, use `testFragmentShaderImage()`:

```typescript
import { testFragmentShaderImage } from "wesl-test";

test("blur filter produces expected result", async () => {
  const result = await testFragmentShaderImage({
    device,
    src: blurShaderSource,
    size: [256, 256],
    inputTextures: [{ texture: inputTex, sampler }]
  });

  // Compare against reference snapshot
  await expect(result).toMatchImage("blur-filter");
});
```

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

### Directory Structure

Visual regression testing creates several directories:

- **`__image_snapshots__/`** - Reference images (commit to git)
- **`__image_actual__/`** - Current test outputs (gitignored, always saved)
- **`__image_diffs__/`** - Diff visualizations (gitignored, failures only)
- **`__image_diff_report__/`** - HTML report (gitignored)
- **`__image_dev__/`** - Development experiments (gitignored)

## Comparison Options

Fine-tune snapshot comparison with these options:

| Option | Type | Description | Example Use Case |
|--------|------|-------------|------------------|
| `threshold` | `number` (0-1) | Per-pixel color difference tolerance | 0.1 for normal tests, 0.2+ for noisy effects |
| `allowedPixels` | `number` | Absolute count of pixels allowed to differ | 100 for anti-aliasing differences |
| `allowedPixelRatio` | `number` (0-1) | Percentage of pixels allowed to differ | 0.01 (1%) for stochastic effects |

```typescript
await expect(result).toMatchImage({
  name: "complex-shader",
  threshold: 0.1,
  allowedPixelRatio: 0.02
});
```

## HTML Diff Report

When snapshot tests fail, an HTML report is automatically generated showing all failures.

### Setup

Configure vitest to use the image snapshot reporter:

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

### What It Shows

- Side-by-side comparison: Expected | Actual | Diff
- Mismatch statistics: Pixel count, percentage, max color difference
- Clickable images for full-size viewing
- Test context: Test name, file path, comparison options

### Accessing the Report

After test failures:

```bash
pnpm vitest  # Tests run and fail

# Report is generated at:
# __image_diff_report__/index.html

# Open in browser
open __image_diff_report__/index.html
```

The report is self-contained (all images embedded) and can be shared or archived.

### Report Options

Customize report generation in your test setup:

```typescript
import { imageMatcher } from "vitest-image-snapshot";

imageMatcher({
  createDiffReport: true,        // Enable HTML report (default: true)
  diffReportDir: "./__diffs__",  // Custom report directory
});
```

## See Also

- [GUIDE.md](./GUIDE.md) - Complete API reference
- [README.md](./README.md) - Quick start guide
