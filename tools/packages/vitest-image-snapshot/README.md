# Image Snapshot Testing

Visual regression testing for images. Compare rendered outputs against reference images to catch visual bugs.

- Native Vitest integration, TypeScript-first
- Accepts `ImageData` or PNG buffers - test WebGPU, Canvas, or any image processing
- Aggregated HTML diff report for visual failures


## Setup

### 1. Install

```bash
pnpm install --save-dev vitest-image-snapshot
```

### 2. Import in your test file

```typescript
import { imageMatcher } from "vitest-image-snapshot";

imageMatcher(); // Call once at the top level
```

### 3. (Optional) Configure HTML diff report

Configure the reporter in `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    include: ['src/test/**/*.test.ts'],
    reporters: [
      'default',
      ['vitest-image-snapshot/reporter', {
        reportPath: join(__dirname, '__image_diff_report__'),  // Absolute path recommended for monorepos
        autoOpen: true,  // Auto-open report in browser on failure
      }]
    ],
  },
})
```

**Default behavior** (no configuration):
- Report location: `{vitest.config.root}/__image_diff_report__/index.html`
- Auto-open: `false` (can override with `IMAGE_DIFF_AUTO_OPEN=true` env var)

**Configuration options:**
- `reportPath`: Absolute or relative to `config.root` (default: `'__image_diff_report__'`)
- `autoOpen`: Auto-open report in browser (default: `false`)

## Basic Usage

Accepts standard browser `ImageData` or `Buffer` (pre-encoded PNGs):

```typescript
// With ImageData (from canvas, shader tests, etc.)
await expect(imageData).toMatchImage("snapshot-name");

// With Buffer (pre-encoded PNG)
await expect(pngBuffer).toMatchImage("snapshot-name");

// Auto-generated name from test name (single snapshot per test only)
await expect(imageData).toMatchImage();
```

### Options

```typescript
await expect(imageData).toMatchImage({
  name: "edge-detection",
  threshold: 0.2,  // Allow more color variation
});
```

See [Match Options](#match-options) for all available configuration options.

## Updating Snapshots

When you intentionally change shader behavior:

```bash
# Update all snapshots
pnpm vitest -- -u

# Update specific test file
pnpm vitest ImageSnapshot.test.ts -- -u
```

## Diff Report

If you added `ImageSnapshotReporter` to vitest.config.ts, failed tests generate a self-contained HTML report with:
- Expected vs Actual side-by-side
- Diff visualization (mismatched pixels highlighted)
- Mismatch statistics
- All images copied to report directory (portable and shareable)

**Default location**: `{vitest.config.root}/__image_diff_report__/index.html`

**Monorepo behavior**: In workspace mode (running tests from workspace root), each package's report goes to its own directory when using absolute paths in config.

Auto-open on failure:
```bash
IMAGE_DIFF_AUTO_OPEN=true pnpm vitest
```

Or enable via inline reporter config:
```typescript
reporters: [
  'default',
  ['vitest-image-snapshot/reporter', { autoOpen: true }]
]
```

## Directory Structure

```
package-root/
├── src/test/
│   ├── ImageSnapshot.test.ts
│   ├── __image_snapshots__/       # Reference images (commit to git)
│   │   └── snapshot-name.png
│   ├── __image_actual__/          # Current test outputs (gitignore, always saved)
│   │   └── snapshot-name.png
│   └── __image_diffs__/           # Diff visualizations (gitignore, only on failure)
│       └── snapshot-name.png
└── __image_diff_report__/         # HTML report (gitignore, self-contained)
    ├── index.html
    └── src/test/                  # Copied images preserving directory structure
        ├── __image_snapshots__/
        ├── __image_actual__/
        └── __image_diffs__/
```

**Notes**:
- `__image_actual__/` saves on every run (pass or fail) for manual inspection
- Report copies all images to `__image_diff_report__/` preserving directory structure
- Report is self-contained and portable (can be zipped, shared, or committed)

## API Reference

### toMatchImage()

Vitest matcher for comparing images against reference snapshots.

```typescript
await expect(imageData).toMatchImage(nameOrOptions?)
```

#### Parameters:
- `imageData: ImageData | Buffer` - Image to compare
- `nameOrOptions?: string | MatchImageOptions` - Snapshot name or options

#### Match Options:
```typescript
interface MatchImageOptions {
  name?: string;                    // Snapshot name (default: auto-generated from test name)
  threshold?: number;               // Color difference threshold 0-1 (default: 0.1)
  allowedPixelRatio?: number;       // Max ratio of pixels allowed to differ 0-1 (default: 0)
  allowedPixels?: number;           // Max absolute pixels allowed to differ (default: 0)
  includeAA?: boolean;              // Disable AA detection if true (default: false)
}
```

## Examples

### WebGPU Shaders

```typescript
import { imageMatcher } from "vitest-image-snapshot";
import { testFragmentShaderImage } from "wesl-test";

imageMatcher();

test("shader output matches snapshot", async () => {
  const result = await testFragmentShaderImage({
    projectDir: import.meta.url,
    device,
    src: `@fragment fn fs_main() -> @location(0) vec4f { return vec4f(1.0, 0.0, 0.0, 1.0); }`,
    size: [128, 128],
  });

  await expect(result).toMatchImage("red-output");
});
```

### Canvas/DOM ImageData

```typescript
import { imageMatcher } from "vitest-image-snapshot";

imageMatcher();

test("canvas output matches snapshot", async () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Draw something
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 128, 128);

  const imageData = ctx.getImageData(0, 0, 128, 128);
  await expect(imageData).toMatchImage("red-canvas");
});
```

## Troubleshooting

### "No reference snapshot found"
**First run**: Snapshot created automatically
**CI**: Run with `-u` locally first, then commit snapshots

### Images don't match but look identical
- `threshold` too strict - increase tolerance
- GPU/driver differences - use `allowedPixelRatio`
- Anti-aliasing differences - set `includeAA: true`

## Build Version
**vitest-image-snapshot** is currently 
part of the [wesl-js](https://github.com/wgsl-tooling-wg/wesl-js/) monorepo. 
(It'll eventually move to it's own repo).

## Contributions
See [Implementation.md](./Implementation.md) for details and feature ideas.