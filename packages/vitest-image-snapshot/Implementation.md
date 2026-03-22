# Image Snapshot Implementation

Developer documentation for the image snapshot testing system.

## Architecture Overview

The snapshot system consists of five core components:

```
User Test
    ↓ calls
ImageSnapshotMatcher (toMatchImage)
    ↓ uses
SnapshotManager (file operations)
    ↓ uses
ImageComparison (pixelmatch)
    ↓ reports to
ImageSnapshotReporter (Vitest reporter)
    ↓ generates
DiffReport (HTML)
```

## Component Responsibilities

### ImageSnapshotMatcher.ts

**Purpose**: Custom Vitest matcher implementation

**Key Function**: `toMatchImage()`
- Receives standard browser `ImageData` or `Buffer`
- Converts `ImageData` to PNG buffer for file saving
- Passes `ImageData` directly to comparison (optimization - no PNG round-trip)
- Delegates to `SnapshotManager` for file operations
- Delegates to `ImageComparison` for pixel comparison
- Returns Vitest matcher result with `pass`, `message`, `actual`, `expected`

**ImageData Compatibility**:
- Accepts real browser `ImageData` (from canvas contexts)
- Works with plain objects matching `ImageData` interface (Node.js shader tests)
- TypeScript uses structural typing - both work seamlessly

**Context Access**:
- `this.currentTestName` - Auto-generated test name from Vitest
- `this.testPath` - Path to test file

**Update Mode Detection**:
- Checks `VITEST_UPDATE_SNAPSHOTS` env var
- Falls back to command-line args (`-u`, `--update`)

**Design Decision**: Uses `expect.extend()` for clean integration with Vitest assertion API.

### SnapshotManager.ts

**Purpose**: Manages snapshot file paths and I/O

**Key Responsibilities**:
- Path resolution for reference/actual/diff directories
- File reading/writing with automatic directory creation
- Update mode detection
- Enforces directory structure conventions

**Directory Structure**:
```
test-file-directory/
├── __image_snapshots__/  (references - commit to git)
├── __image_actual__/     (current run - gitignore, always saved)
└── __image_diffs__/      (diffs - gitignore, only on failure)
```

**File Saving Behavior**:
- `__image_actual__/`: Saved on every test run (pass or fail)
  - Allows manual inspection of current outputs
  - Enables external comparison tools
- `__image_diffs__/`: Only generated on test failure
  - Contains visual diff highlighting mismatched pixels

All directories are siblings relative to test file, enabling relative paths in HTML report.

### ImageComparison.ts

**Purpose**: Pixel-level image comparison using pixelmatch

**Input Types**: Accepts `ImageData | Buffer` for both reference and actual images

**Helper Function**: `toPixelData()`
- Converts `ImageData | Buffer` to unified `PixelData` format
- For `Buffer`: Decodes PNG using `PNG.sync.read()`
- For `ImageData`: Extracts pixel data directly (no decoding needed)
- Returns `{ data: Uint8Array | Uint8ClampedArray, width, height }`

**Algorithm**:
1. Convert both inputs to pixel data (decode PNG only if needed)
2. Validate dimensions match
3. Run pixelmatch comparison on pixel arrays
4. Calculate mismatch ratio
5. Generate diff PNG if failed
6. Return structured result

**Performance Optimization**:
When comparing `ImageData` directly (typical shader test flow):
- **Before**: ImageData → PNG encode → Buffer → PNG decode → pixels (~50-100ms overhead)
- **After**: ImageData → pixels directly (~0ms overhead)

**Comparison Options**:
- `threshold` (0-1): Color difference threshold for pixel matching
- `allowedPixelRatio` (0-1): Percentage of pixels allowed to differ
- `allowedPixels` (number): Absolute pixel count threshold
- `includeAA` (boolean): Detect and ignore anti-aliased pixels

### ImageSnapshotReporter.ts

**Purpose**: Vitest 3 reporter that collects failures and generates HTML report

**Lifecycle Integration**:
- `onTestCaseResult(testCase)` - Captures failures as they occur
- `onTestRunEnd()` - Generates HTML report after all tests

**Failure Detection**:
1. Check test state is "failed"
2. Check error message contains "Images don't match"
3. Extract `actual` and `expected` paths from error metadata
4. Parse pixel mismatch stats from error message
5. Store failure information

**Test Directory Detection**:
Extracts test directory from image paths by removing `__image_actual__` directory component.

**Design Decision**: Uses Vitest 3's new reporter API (`onTestRunEnd` instead of deprecated `onFinished`).

### DiffReport.ts

**Purpose**: Generates HTML visual diff report

**Features**:
- Side-by-side comparison (expected, actual, diff)
- Clickable images for full-size view
- Mismatch statistics
- Update hint with command
- Responsive layout
- Relative paths for portability

**Path Handling**:
All image paths are relativized from report location to ensure report can be opened from filesystem.

Self-contained HTML with inline CSS, no external dependencies.

### vitest.d.ts

**Purpose**: TypeScript type declarations for custom matcher

**Augmentation**:
Extends `vitest` module's `Assertion` and `AsymmetricMatchersContaining` interfaces to add `toMatchImage` method.

## Key Design Decisions

### ImageData Implementation

**Standard Browser Type**: Uses the standard `ImageData` interface from browser DOM types.

**Node.js Environment**:
- No polyfill needed - uses plain objects with type assertions
- `testFragmentImage()` returns: `{ data, width, height, colorSpace } as ImageData`
- TypeScript structural typing accepts plain objects matching the interface
- Runtime code only reads properties (never checks `instanceof ImageData`)

**Browser Environment**:
- Real `ImageData` instances (from canvas, etc.) work seamlessly
- Same properties as plain objects, so all code paths compatible

**Benefits**:
- No global pollution
- No runtime overhead
- Works with both Node.js and browser environments
- Simpler, clearer code

### Why Custom Matcher?

Vitest's built-in snapshot testing is for text/JSON. Images need:
- Binary comparison (pixel-level)
- Visual diff generation
- Tolerance thresholds
- Rich HTML reports

### Why Vitest Reporter?

Custom reporter enables:
- Automatic HTML report generation
- Centralized failure collection
- Single report for all test files
- Clean separation from matcher logic

### Why vitest.d.ts?

Type augmentation file for extending Vitest's assertion API:
- Uses module augmentation to add `toMatchImage` to `expect()`
- Referenced via `/// <reference path="./vitest.d.ts" />` in index.ts
- Provides TypeScript autocomplete for the custom matcher

### Why Extract Test Directory?

Generating report relative to test directory ensures:
- Image links work correctly (relative paths)
- Reports are portable (can be moved/shared)
- Consistent with snapshot directory structure

### Why Use Pixelmatch?

- Battle-tested library (used by Vitest browser mode)
- Anti-aliasing detection
- Perceptual color difference
- Fast performance
- Generates visual diff images

## Future Extension Points

### Custom Comparison Algorithm

Replace `ImageComparison.compareImages()`:

```typescript
export async function compareImages(
  reference: ImageData | Buffer,
  actual: ImageData | Buffer,
  options: ComparisonOptions = {},
): Promise<ComparisonResult> {
  // Custom implementation
  // Use toPixelData() helper to normalize inputs
  const refPixels = toPixelData(reference);
  const actualPixels = toPixelData(actual);
  // ... your comparison logic
}
```

### Custom Report Format

Replace `DiffReport.generateDiffReport()`:

```typescript
export async function generateDiffReport(
  failures: ImageSnapshotFailure[],
  config: DiffReportConfig = {},
): Promise<void> {
  // Custom report format (Markdown, JSON, etc.)
}
```

### Additional Reporter Hooks

Extend `ImageSnapshotReporter`:

```typescript
export class ImageSnapshotReporter implements Reporter {
  onTestCaseResult(testCase: TestCase) {
    // Existing logic
  }

  onTestRunEnd() {
    // Existing logic
  }

  // Add more Vitest lifecycle hooks
  onTestModuleEnd(testModule: TestModule) {
    // Per-file reports
  }
}
```

## Testing Considerations

### Unit Testing Components

Each component can be tested independently:

```typescript
// Test SnapshotManager
test("creates directories automatically", async () => {
  const manager = new ImageSnapshotManager("/test/path");
  await manager.saveReference(buffer, "test");
  expect(fs.existsSync("/test/path/__image_snapshots__")).toBe(true);
});

// Test ImageComparison
test("detects pixel differences", async () => {
  const result = await compareImages(ref, actual, { threshold: 0.1 });
  expect(result.pass).toBe(false);
  expect(result.mismatchedPixels).toBeGreaterThan(0);
});

// Test Reporter
test("captures failed image snapshots", () => {
  const reporter = new ImageSnapshotReporter();
  reporter.onTestCaseResult(mockFailedTestCase);
  expect(reporter.failures).toHaveLength(1);
});
```

### Integration Testing

Test full flow with real Vitest:

```typescript
test("generates report on failure", async () => {
  const result = await testFragmentImage({...});
  await expect(result).toMatchImage("test");

  // Verify report exists
  const reportPath = "src/test/__image_diffs__/report.html";
  expect(fs.existsSync(reportPath)).toBe(true);
});
```

## Future Enhancements

### Potential Improvements

1. **Pixelated**: Show small images with image-rendering: pixelated to see details
1. **Perceptual Diff**: Use SSIM or other perceptual metrics
1. **Interactive Report**: Slider to compare expected/actual
1. **Diff Heatmap**: Show degree of difference per pixel
1. **CI Integration**: Upload reports to cloud storage
1. **Baseline Management**: Support multiple reference sets (per-platform)
1. **Threshold Suggestions**: Recommend optimal threshold based on history
1. **Save Actual**: Configuration option save actual images only on failure, for speed.
1. **Custom Directory**: Expose configuration option to use a custom directory for actual/snapshot/diff images.

### API Extensions

```typescript
// Per-snapshot configuration
await expect(result).toMatchImage({
  name: "gradient",
  comparator: "ssim",           // Alternative algorithm
  platform: "macos",            // Platform-specific baselines
  onMismatch: (diff) => {...},  // Custom handler
});
```
