# wgsl-test

Test WGSL and WESL shaders with the CLI or vitest.

- **Native WESL** (`@test`) - Unit test shader functions, assertions run on GPU
- **CLI** (`wgsl-test run`) - Run tests from the command line
- **TypeScript-driven** - Integration tests, visual regression, custom validation

## Installation

```bash
npm install wgsl-test
```

## Native WESL Testing

Write tests directly in WESL with the `@test` attribute. Minimal boilerplate, assertions run on the GPU:

```wgsl
/// interp_test.wesl
import package::interp::smootherstep; // source fn to test
import wgsl_test::expectNear; // expectations from wgsl-test lib

@test  // tag each test fn
fn smootherstepQuarter() {
  expectNear(smootherstep(0.0, 1.0, 0.25), 0.103516);
}
...
```

### CLI

Run tests directly from the command line:

```bash
wgsl-test run                      # discover **/*.test.wesl, run all
wgsl-test run path/to/test.wesl    # run specific file(s)
wgsl-test run --projectDir ./foo   # specify project root
```

### Vitest Integration

Or run with a minimal TypeScript wrapper:

```typescript
import { getGPUDevice, testWesl } from "wgsl-test";

const device = await getGPUDevice();

// runs all tests in interp_test
await testWesl({ device, moduleName: "interp_test" });
```

**[See API.md for assertion functions →](https://github.com/wgsl-tooling-wg/wesl-js/blob/main/tools/packages/wgsl-test/API.md#assertion-functions)**

## Visual Regression Testing

Test complete rendered images in vitest:

```typescript
import { expectFragmentImage } from "wgsl-test";
import { imageMatcher } from "vitest-image-snapshot";

imageMatcher(); // Setup once

test("blur shader matches snapshot", async () => {
  await expectFragmentImage(device, "effects/blur.wgsl"); 
  // Snapshot automatically compared against __image_snapshots__/effects-blur.png
});
```

Update snapshots with `vitest -u` as needed.

**[See API.md for snapshot workflow and visual regression testing →](https://github.com/wgsl-tooling-wg/wesl-js/blob/main/tools/packages/wgsl-test/API.md#visual-regression-testing)**

## Testing Compute Shaders

For more control, use `testCompute()`. 
A `test::results` buffer is automatically provided:

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

## API Documentation

- **[API.md](https://github.com/wgsl-tooling-wg/wesl-js/blob/main/tools/packages/wgsl-test/API.md)** - Complete API reference with detailed examples
- **[API.md#complete-test-example](https://github.com/wgsl-tooling-wg/wesl-js/blob/main/tools/packages/wgsl-test/API.md#complete-test-example)** - Full vitest test setup with beforeAll/afterAll
- **[Examples](https://github.com/wgsl-tooling-wg/wesl-js/tree/main/tools/examples)** - Tiny standalone examples

## Future

File an [issue](https://github.com/wgsl-tooling-wg/wesl-js/issues) or talk about your ideas on the tooling group [discord chat](https://discord.gg/5UhkaSu4dt).