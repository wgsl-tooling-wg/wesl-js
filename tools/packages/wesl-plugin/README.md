# wesl plugin

The wesl-plugin handles `.wesl` and `.wgsl` files
in JavaScript bundlers to make using webgpu shaders more convenient.
Plugin features are accessed from JavaScript and TypeScript with `import` statements:

```ts
import linkConfig from "./shaders/app.wesl?link";
```

Each plugin features is enabled by its own wesl-plugin [extension](#extensions).

## Getting started

### Vite

Add the wesl-plugin along with any selected extensions to `vite.config.ts`:

```ts
import { UserConfig } from "vite";
import weslPlugin from "wesl-plugin/vite";
import { linkBuildPlugin } from "wesl-plugin";

const config: UserConfig = {
  plugins: [ weslPlugin({ extensions: [linkBuildPlugin] }) ],
};

export default config;
```

In your JavaScript or TypeScript program you can then import
wesl or wgsl shaders with a `?link` suffix and link them into WGSL at runtime.

```ts
import linkConfig from "./shaders/app.wesl?link";

function makeShaders() {
  const vertShader = await link({
    ...linkConfig, 
    rootModuleName: "myVerts.wesl",
    conditions: {mobileGPU: true}
  });
  const computeShader = await link({
    ...linkConfig, 
    rootModuleName: "myCompute.wesl",
    constants: {num_lights: 1}
  });
}

```

### Other Bundlers

The wesl-plugin is available for many popular bundlers:

``` ts
import weslPlugin from "wesl-plugin/esbuild"; 
import weslPlugin from "wesl-plugin/rollup"; 
import weslPlugin from "wesl-plugin/webpack"; 
import weslPlugin from "wesl-plugin/nuxt"; 
import weslPlugin from "wesl-plugin/farm"; 
import weslPlugin from "wesl-plugin/rpack"; 
// etc.
```

## Extensions

- **LinkExtension** - import `?link` in JavaScript/TypeScript programs to conveniently assemble shader files and libraries for linking at runtime.
Reads the `wesl.toml` file to find local shader files, partially parses the local
shader files to find shader libraries, and returns a `LinkParams` object
ready to use for runtime linking.

### Prototype Extensions

- **SimpleReReflectExtension** - (_demo for extension writers_) import `?simple_reflect` to
translate some wgsl `struct` elements into JavaScript and TypeScript.
Demonstrates to wesl-plugin extension authors how to connect
to the wesl-plugin, how to produce JavaScript, and how to produce TypeScript.
- **BindingLayoutExtension** - (_prototype_) import `?bindingLayout` to collect JavaScript
`BindingGroupLayout` objects.
Works in concert with the `bindingStructsPlugin` to translate a proposed new WGSL
feature for defining binding group layouts in shaders [#4957](https://github.com/gpuweb/gpuweb/issues/4957).

## Developing a wesl-plugin extension

To add a new extension to the wesl-plugin:

- Pick an import suffix (e.g. `?myExtension`).
- Implement a function that returns a JavaScript string.
  - Extensions have access to wgsl/wesl sources, a parsed abstract syntax tree for the sources, etc.

See [PluginExtension.ts](https://github.com/wgsl-tooling-wg/wesl-js/blob/master/tools/packages/wesl-plugin/src/PluginExtension.ts) for details.
