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

#### Testing using Derivatvees 
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

## Testing Compute Shaders

Use `testComputeShader()` to test compute shader behavior. A 16-byte storage buffer is provided for writing test results.

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
- Buffer size: 16 bytes (4 × 4-byte elements)
- Access via `test::results[index]`

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