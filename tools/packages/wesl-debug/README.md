# wesl-test

Unit tests and visual regression tests for WGSL and WESL shaders. 
Use vitest or your favorite Node.js test framework. 

## Why wesl-test?

- **Test WGSL shaders** - Works with standard `.wgsl` files, no new syntax required
- **Test WESL shaders** - Import and compose shader dependencies via WESL
- **Visual regression testing** - Snapshot comparison catches rendering changes

## Installation

```bash
npm install wesl-test
```

Quick start in 3 steps:

1. Write your shader function in WGSL or WESL as normal
2. Use `testComputeShader()`, 
`testFragmentShader()`, or `testFragmentShaderImage()` 
to call your shader function with test data.
3. Assert the results with your test framework

## Testing Compute Shaders

Use `testComputeShader()` to test compute shader logic. A `test::results` buffer is automatically provided:

```typescript
import { testComputeShader, getGPUDevice } from "wesl-test";

const device = await getGPUDevice();

const src = `
  import package::myShader::myFun;

  @compute @workgroup_size(1)
  fn main() {
    test::results[0] = myFun(0);
    test::results[1] = myFun(42);
  }
`;

const result = await testComputeShader({ device, src, size: 2 });
// result = [0, 42]
// TODO use hash fn
```

**[See GUIDE.md for complete API documentation →](./GUIDE.md)**

## Testing Fragment Shaders

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
// result = TBD
```

**[See GUIDE.md for derivatives, input textures, uniforms, and more →](./GUIDE.md)**

## Visual Regression Testing

Test complete rendered images and catch visual changes automatically:

```typescript
TBD
```

Snapshot comparison automatically detects rendering changes. Update snapshots with `vitest -u` when changes are intentional.

**[See IMAGE_TESTING.md for snapshot workflow, comparison options, and more →](./IMAGE_TESTING.md)**

## Complete Test Example

```typescript
TBD
```

## What's Next

- **[GUIDE.md](./GUIDE.md)** - API reference for `testComputeShader()` and `testFragmentShader()`
- **[IMAGE_TESTING.md](./IMAGE_TESTING.md)** - Visual regression testing guide with snapshot workflow
- **[Examples](../../examples/)** - Tiny standalone examples.

## Future 
What would you like to see next in wesl-test? 
Test scaffolding for vertex shaders?
Annotations to put simple tests in WESL directly?
Something else?

Please file an [issue](https://github.com/wgsl-tooling-wg/wesl-js/issues) or talk about your ideas on the tooling group [discord chat](https://discord.gg/5UhkaSu4dt).
