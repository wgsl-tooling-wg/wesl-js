# wesl-toy-viewer

Prototype UI for viewing WESL fragment shaders marked with `@toy` annotations from WESL packages.

## Usage

```bash
pnpm dev
```

Load any npm package or .tgz URL containing WESL bundles. The viewer auto-discovers shaders marked with `@toy` and displays them in an interactive WebGPU viewer.

## Marking Shaders

Mark WESL fragment shaders with `@toy` annotation to make them discoverable:

```wgsl
// @toy
@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  return vec4f(pos.xy / 512.0, 0.5, 1.0);
}
```

The viewer scans bundle files for `@toy` comments and populates the shader dropdown automatically.

## Purpose

Originally designed for viewing [wgsl-test](https://github.com/wgsl-tooling-wg/wesl-js/tree/main/tools/packages/wgsl-test) image test shaders. Provides interactive playground for WESL shader libraries without manual configuration.

See [wgsl-test visual regression testing](https://github.com/wgsl-tooling-wg/wesl-js/blob/main/tools/packages/wgsl-test/API.md#visual-regression-testing) for the testing workflow this viewer complements.
