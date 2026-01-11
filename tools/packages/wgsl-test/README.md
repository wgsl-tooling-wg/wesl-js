# wgsl-test

Test WGSL and WESL shaders with vitest or your favorite Node.js test framework.

- **Native WESL** (`@test`) - Unit test shader functions, assertions run on GPU
- **TypeScript-driven** - Integration tests, visual regression, custom validation

## Installation

```bash
npm install wgsl-test
```

## Native WESL Testing

Write tests directly in WESL with the `@test` attribute. No boilerplate, assertions run on the GPU:

```wgsl
// luminance_test.wesl
import lygia::color::luminance::luminance;
import wgsl_test::expectNear;

@test fn luminanceOrange() {
  expectNear(luminance(vec3f(1.0, 0.5, 0.0)), 0.5702);
}

@test fn luminanceWhite() {
  expectNear(luminance(vec3f(1.0, 1.0, 1.0)), 1.0);
}
```

Run with a minimal TypeScript wrapper:

```typescript
import { expectWesl, getGPUDevice } from "wgsl-test";

test("luminance", async () => {
  const device = await getGPUDevice();
  await expectWesl({ device, moduleName: "luminance_test" });
});
```

Use `runWesl()` instead if you need to inspect individual test results.

**[See API.md for assertion functions →](https://github.com/wgsl-tooling-wg/wesl-js/blob/main/tools/packages/wgsl-test/API.md#assertion-functions)**

## Testing Compute Shaders

For more control, use `testCompute()` directly. A `test::results` buffer is automatically provided:

```typescript
import { testCompute, getGPUDevice } from "wgsl-test";

const device = await getGPUDevice();

const src = `
  import package::hash::lowbias32;

  @compute @workgroup_size(1)
  fn main() {
    test::results[0] = lowbias32(0u);
    test::results[1] = lowbias32(42u);
  }
`;

const result = await testCompute({ device, src, size: 2 });
// result = [0, 388445122]
```

**[See API.md for complete API documentation →](https://github.com/wgsl-tooling-wg/wesl-js/blob/main/tools/packages/wgsl-test/API.md#testcompute)**

## Testing Fragment Shaders

Some functions only make sense in fragment shaders. 

Use `testFragment()` to test fragment shader rendering. 

```rs
/// shaders/foo.wesl
fn bar(p: vec4f) -> vec4f {
  return 2 * sqrt(p);
}
```

```typescript
const src = `
  @fragment
  fn fs_main(@builtin(position) pos:vec4f) -> @location(0) vec4f {
    return foo::bar(pos * 2);
  }
`;

const result = await testFragment({ device, src });
// result = [2.828, 1.414, 0.0, 2.0]  // vec4f color at pixel (0,0)
```

**[See API.md for derivatives, input textures, uniforms, and more →](https://github.com/wgsl-tooling-wg/wesl-js/blob/main/tools/packages/wgsl-test/API.md#testfragment)**

## Visual Regression Testing

Higher level testing, good for regression. Tests don't provide much numeric descriptive value but catch visual changes automatically.

Test complete rendered images:

```typescript
import { expectFragmentImage, imageMatcher } from "wgsl-test";

imageMatcher(); // Setup once

test("blur shader matches snapshot", async () => {
  await expectFragmentImage(device, "effects/blur.wgsl", {
    projectDir: import.meta.url,
    size: [256, 256],
  });
  // Snapshot automatically compared against __image_snapshots__/effects-blur.png
});
```

Snapshot comparison automatically detects rendering changes. Update snapshots with `vitest -u` when changes are intentional.

**[See API.md for snapshot workflow and visual regression testing →](https://github.com/wgsl-tooling-wg/wesl-js/blob/main/tools/packages/wgsl-test/API.md#visual-regression-testing)**

## API Documentation

- **[API.md](https://github.com/wgsl-tooling-wg/wesl-js/blob/main/tools/packages/wgsl-test/API.md)** - Complete API reference with detailed examples
- **[API.md#complete-test-example](https://github.com/wgsl-tooling-wg/wesl-js/blob/main/tools/packages/wgsl-test/API.md#complete-test-example)** - Full vitest test setup with beforeAll/afterAll
- **[Examples](https://github.com/wgsl-tooling-wg/wesl-js/tree/main/tools/examples)** - Tiny standalone examples

## Future

What would you like to see next in wgsl-test? 

Please file an [issue](https://github.com/wgsl-tooling-wg/wesl-js/issues) or talk about your ideas on the tooling group [discord chat](https://discord.gg/5UhkaSu4dt).
