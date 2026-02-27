# wgsl-play

Web component for rendering WESL/WGSL fragment shaders.

## Usage

```html
<script type="module">import "wgsl-play";</script>

<wgsl-play src="./shader.wesl"></wgsl-play>
```

That's it. The component auto-fetches dependencies and starts animating.

### Shader API

`wgsl-play` renders a fullscreen triangle using a built-in vertex shader and only
accepts **fragment shaders**. Write a single `@fragment` function. 
WESL extensions are supported (imports, conditional compilation).

Standard uniforms are provided at binding 0:

```wgsl
import test::Uniforms;

@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  return vec4f(uv, sin(u.time) * 0.5 + 0.5, 1.0);
}
```

| Uniform | Type | Description |
|---------|------|-------------|
| `resolution` | `vec2f` | Canvas dimensions in pixels |
| `time` | `f32` | Elapsed time in seconds |
| `mouse` | `vec2f` | Mouse position (normalized 0-1) |

### Inline source

You can include shader code inline if you'd prefer. Use a `<script type="text/wgsl">` (or `<script type="text/wesl">`) tag.

```html
<wgsl-play>
  <script type="text/wesl">
    import test::Uniforms;
    @group(0) @binding(0) var<uniform> u: Uniforms;

    @fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = pos.xy / u.resolution;
      return vec4f(uv, sin(u.time) * 0.5 + 0.5, 1.0);
    }
  </script>
</wgsl-play>
```

### Programmatic control

```typescript
const player = document.querySelector("wgsl-play");
player.source = shaderCode;
player.pause();
player.rewind();
player.play();
```

### Importing shaders (Vite)

```typescript
import shader from './examples/noise.wesl?raw';

const player = document.querySelector("wgsl-play");
player.source = shader;
```

The `?raw` suffix imports the file as a string. This keeps shaders alongside your source files with HMR support.

## API

### Attributes
- `src` - URL to .wesl/.wgsl file
- `shader-root` - Root path for internal imports (default: `/shaders`)
- `autoplay` - Start animating on load (default: `true`). Set `autoplay="false"` to start paused

### Properties
- `source: string` - Get/set shader source
- `conditions: Record<string, boolean>` - Get/set conditions for conditional compilation (`@if`/`@elif`/`@else`)
- `project: WeslProject` - Set full project config (weslSrc, libs, conditions, constants)
- `isPlaying: boolean` - Playback state (readonly)
- `time: number` - Animation time in seconds (readonly)
- `hasError: boolean` - Compilation error state (readonly)
- `errorMessage: string | null` - Error message (readonly)

### Methods
- `play()` - Start/resume animation
- `pause()` - Pause animation
- `rewind()` - Reset to t=0
- `showError(message)` - Display error (empty string clears)

### Events
- `compile-error` - `{ message: string }`
- `init-error` - `{ message: string }` (WebGPU init failed)
- `playback-change` - `{ isPlaying: boolean }`

## Styling

```css
wgsl-play {
  width: 512px;
  height: 512px;
}

wgsl-play::part(canvas) {
  image-rendering: pixelated;
}
```

## Multi-file Shaders

For apps with multiple shader files, use `shader-root`. 

```
public/
  shaders/
    utils.wesl       # import package::utils
    effects/
      main.wesl      # import super::common
      common.wesl
```

```html
<wgsl-play src="/shaders/effects/main.wesl" shader-root="/shaders"></wgsl-play>
```

Local shader modules referenced via `package::` or `super::`
will be fetched from the web server.

```wgsl
// effects/main.wesl
import package::utils::noise;
import super::common::tint;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  return tint(noise(pos.xy));
}
```

## Using with wesl-plugin

For more control, use the [wesl-plugin](https://github.com/wgsl-tooling-wg/wesl-js/tree/main/tools/packages/wesl-plugin) to
assemble shaders and libraries at build time and provide
them wgsl-play in JavaScript or TypeScript.
- provides full support for Hot Module Reloading during development
- allows specifying fixed library dependency versions

### Runtime linking (?link)

With Runtime linking, WGSL is constructed from WGSL/WESL at runtime. 
Use runtime linking to enable virtual modules, 
conditional transpilation, and injecting shader constants from JavaScript.

```typescript
// vite.config.ts
import { linkBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

export default {
  plugins: [viteWesl({ extensions: [linkBuildExtension] })]
};

// app.ts
import shaderConfig from "./shader.wesl?link";

// wgsl-play links internally, allowing runtime conditions/constants
player.project = {
  ...shaderConfig,
  conditions: { MOBILE: isMobileGPU },
  constants: { num_lights: 4 }
};
```

## Exports

```typescript
// Default - auto-registers element
import "wgsl-play";

// Element class only (manual registration)
import { WgslPlay } from "wgsl-play/element";

// Configuration
import { defaults } from "wgsl-play";

defaults({ shaderRoot: "/custom/shaders" });

// Pre-bundled, all deps included
import "wgsl-play/bundle";
```
