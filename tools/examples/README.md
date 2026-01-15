# WESL JS Shader Examples

Most examples are available as stackblitz demos that run in
the browser. Or use [degit](https://github.com/Rich-Harris/degit/tree/master) to make a convenient local copy.

## Testing with wgsl-test

These examples require WebGPU and must be run locally (no StackBlitz demos).

**wgsl-test-native** - Native WESL testing with `@test` attribute, assertions run on GPU.
  - `degit github:wgsl-tooling-wg/examples/wgsl-test-native`

**wgsl-test-basic-compute** - Test compute shaders with TypeScript-driven validation.
  - `degit github:wgsl-tooling-wg/examples/wgsl-test-basic-compute`

**wgsl-test-fragment-image** - Visual regression testing for fragment shaders.
  - `degit github:wgsl-tooling-wg/examples/wgsl-test-fragment-image`

## WESL Applications

**wesl-vite-minimal** - Minimal vite front end app, shows transpiled code.
[Demo](https://stackblitz.com/github/wgsl-tooling-wg/examples/tree/main/wesl-vite-minimal?startScript=dev)
  - `degit github:wgsl-tooling-wg/examples/wesl-vite-minimal`

**wesl-vite** - Simple vite front end app, shows Mandelbrot set.
[Demo](https://stackblitz.com/github/wgsl-tooling-wg/examples/tree/main/wesl-vite?startScript=dev)
  - `degit github:wgsl-tooling-wg/examples/wesl-vite`

**wesl-rand** - Shows a random number field, using vite and an external library.
[Demo](https://stackblitz.com/github/wgsl-tooling-wg/examples/tree/main/wesl-rand?startScript=dev)
  - `degit github:wgsl-tooling-wg/examples/wesl-rand`

**wesl-unbundled** - No bundler, dynamic linking.
[Demo](https://stackblitz.com/github/wgsl-tooling-wg/examples/tree/main/wesl-unbundled)
  - `degit github:wgsl-tooling-wg/examples/wesl-unbundled`

**wesl-deno** - Deno backend, creates a PNG file with WebGPU.
  - `degit github:wgsl-tooling-wg/examples/wesl-deno`

## Lygia Shader Library

**lygia-example** - Minimal example using Lygia.
[Demo](https://stackblitz.com/github/wgsl-tooling-wg/examples/tree/main/lygia-example)
  - `degit github:wgsl-tooling-wg/examples/lygia-example`

**lygia-static-example** - Static linking, no runtime library needed.
[Demo](https://stackblitz.com/github/wgsl-tooling-wg/examples/tree/main/lygia-static-example)
  - `degit github:wgsl-tooling-wg/examples/lygia-static-example`

**lygia-cli-example** - Link from the command line (e.g. for a custom build pipeline).
[Demo](https://stackblitz.com/github/wgsl-tooling-wg/examples/tree/main/lygia-cli-example)
  - `degit github:wgsl-tooling-wg/examples/lygia-cli-example`

**wgsl-play-lygia-example** - wgsl-play web component with inline lygia shader.
[Demo](https://stackblitz.com/github/wgsl-tooling-wg/examples/tree/main/wgsl-play-lygia-example)
  - `degit github:wgsl-tooling-wg/examples/wgsl-play-lygia-example`
