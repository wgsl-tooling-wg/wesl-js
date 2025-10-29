# wesl-test

Write GPU shader tests as easily as regular unit tests. Test WGSL and WESL shaders with vitest or your favorite Node.js test framework.

- **Test WGSL shaders** - Works with standard `.wgsl` files, no new syntax required
- **Test WESL shaders** - Import and compose shader dependencies via WESL
- **Visual regression testing** - Snapshot comparison catches rendering changes

## Installation

```bash
npm install wesl-test
```

Quick start in 3 steps:

1. Write your shader function in WGSL or WESL as normal
2. Use `testComputeShader()`, `testFragmentShader()`, `testFragmentShaderImage()`, or `expectFragmentImage()` to test your shader with inline source or from files
3. Assert the results with your test framework

## Testing Compute Shaders

The default choice for unit testing shader functions. Flexible and explicit.

Use `testComputeShader()` to test compute shader logic. A `test::results` buffer is automatically provided:

```typescript
import { testComputeShader, getGPUDevice } from "wesl-test";

const device = await getGPUDevice();

const src = `
  import package::hash::lowbias32;

  @compute @workgroup_size(1)
  fn main() {
    test::results[0] = lowbias32(0u);
    test::results[1] = lowbias32(42u);
  }
`;

const result = await testComputeShader({ device, src, size: 2 });
// result = [0, 388445122]
```

**[See API.md for complete API documentation →](./API.md#testcomputeshader)**

## Testing Fragment Shaders

For unit testing shader functions that only run in fragment shaders. Tests a single pixel output.

Use `testFragmentShader()` to test fragment shader rendering. 

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

const result = await testFragmentShader({ device, src });
// result = [2.828, 1.414, 0.0, 2.0]  // vec4f color at pixel (0,0)
```

**[See API.md for derivatives, input textures, uniforms, and more →](./API.md#testfragmentshader)**

## Visual Regression Testing

Higher level testing, good for regression. Tests don't provide much numeric descriptive value but catch visual changes automatically.

Test complete rendered images:

```typescript
import { expectFragmentImage, imageMatcher } from "wesl-test";

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

**[See API.md for snapshot workflow and visual regression testing →](./API.md#visual-regression-testing)**

## API Documentation

- **[API.md](./API.md)** - Complete API reference with detailed examples
- **[API.md#complete-test-example](./API.md#complete-test-example)** - Full vitest test setup with beforeAll/afterAll
- **[Examples](../../examples/)** - Tiny standalone examples

## Future 
What would you like to see next in wesl-test? 
Test scaffolding for vertex shaders?
Annotations to put simple tests in WESL directly?
Something else?

Please file an [issue](https://github.com/wgsl-tooling-wg/wesl-js/issues) or talk about your ideas on the tooling group [discord chat](https://discord.gg/5UhkaSu4dt).
