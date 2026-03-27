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

Standard uniforms are available via `env::u`:

```wgsl
import env::u;

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  return vec4f(uv, sin(u.time) * 0.5 + 0.5, 1.0);
}
```

When no `@uniforms` struct is declared, a default is provided with `resolution` and `time`.

### Custom Uniforms

Declare a struct with `@uniforms` to add your own fields with UI controls:

```wgsl
import env::u;

@uniforms struct Params {
  @auto resolution: vec2f,
  @auto time: f32,
  @range(1.0, 20.0, 5.0, 6.0) frequency: f32,
  @color(0.2, 0.5, 1.0) tint: vec3f,
  @toggle(0) invert: u32,
}

@fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let wave = sin(pos.x * u.frequency + u.time);
  var color = wave * u.tint;
  if u.invert == 1u { color = 1.0 - color; }
  return vec4f(color, 1.0);
}
```

### `@auto` -- Runtime Fields

The player fills these automatically each frame. The field name determines
which value is bound (or use `@auto(name)` when the field name differs):

| Name | Type | Description |
|------|------|-------------|
| `resolution` | `vec2f` | Canvas size in pixels |
| `time` | `f32` | Elapsed time in seconds |
| `delta_time` | `f32` | Delta time since last frame |
| `frame` | `u32` | Frame count |
| `mouse_pos` | `vec2f` | Pointer position in pixels |
| `mouse_delta` | `vec2f` | Pointer movement since last frame |
| `mouse_button` | `i32` | Active button: 0=none, 1=left, 2=middle, 3=right |

### UI Annotations

These generate interactive controls in the player.

#### `@range(min, max [, step [, initial]])`

Slider for `f32` or `i32`. Step defaults to `0.01` for `f32`, `1` for `i32`.
Initial defaults to `min`.

```wgsl
@range(1.0, 20.0)              frequency: f32,
@range(1.0, 20.0, 5.0)         frequency: f32,  // step=5
@range(1.0, 20.0, 0.5, 5.0)    frequency: f32,  // step=0.5, initial=5
```

#### `@color(r, g, b)`

Color picker for `vec3f`:

```wgsl
@color(0.2, 0.5, 1.0) tint: vec3f,
```

#### `@toggle([initial])`

Boolean toggle for `u32` (0 or 1). WGSL forbids `bool` in uniform buffers.

```wgsl
@toggle     invert: u32,    // default=0
@toggle(1)  invert: u32,    // default=1
```

### Plain Fields

Fields without annotations are zero-initialized and settable from JavaScript
via `setUniform()`. This works before or after compilation.

```wgsl
@uniforms struct Params {
  @auto resolution: vec2f,
  brightness: f32,           // no annotation — set from JS
}
```

```javascript
const player = document.querySelector("wgsl-play");
player.setUniform("brightness", 0.8);
```

### Inline source

You can include shader code inline if you'd prefer. Use a `<script type="text/wgsl">` (or `<script type="text/wesl">`) tag.

```html
<wgsl-play>
  <script type="text/wesl">
    import env::u;

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
player.shader = shaderCode;
player.pause();
player.rewind();
player.play();
```

### Importing shaders (Vite)

```typescript
import shader from './examples/noise.wesl?raw';

const player = document.querySelector("wgsl-play");
player.shader = shader;
```

The `?raw` suffix imports the file as a string. This keeps shaders alongside your source files with HMR support.

## API

### Attributes
- `src` - URL to .wesl/.wgsl file
- `shader-root` - Root path for internal imports (default: `/shaders`)
- `autoplay` - Start animating on load (default: `true`). Set `autoplay="false"` to start paused
- `transparent` - Use premultiplied alpha for transparent backgrounds (default: opaque)
- `from` - Element ID of a source provider (e.g., wgsl-edit) to connect to
- `no-controls` - Hide playback controls
- `no-settings` - Hide the uniform controls panel
- `fetch-libs` - Auto-fetch missing libraries from npm (default: `true`). Set `fetch-libs="false"` to disable
- `fetch-sources` - Auto-fetch local .wesl source files via HTTP (default: `true`). Set `fetch-sources="false"` to disable

### Properties
- `shader: string` - Get/set shader source (single-file convenience)
- `conditions: Record<string, boolean>` - Get/set conditions for conditional compilation (`@if`/`@elif`/`@else`)
- `project: WeslProject` - Get/set full project config (weslSrc, libs, conditions, constants)
- `isPlaying: boolean` - Playback state (readonly)
- `time: number` - Animation time in seconds (readonly)
- `hasError: boolean` - Compilation error state (readonly)
- `errorMessage: string | null` - Error message (readonly)

### Methods
- `play()` - Start/resume animation
- `pause()` - Pause animation
- `rewind()` - Reset to t=0
- `setUniform(name, value)` - Set a uniform value programmatically
- `showError(message)` - Display error (empty string clears)

### Events
- `compile-error` - `{ message: string }`
- `init-error` - `{ message: string }` (WebGPU init failed)
- `playback-change` - `{ isPlaying: boolean }`
- `uniforms-layout` - `{ detail: AnnotatedLayout }` (fired after each compile)

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

For more control, use the [wesl-plugin](https://github.com/wgsl-tooling-wg/wesl-js/tree/main/packages/wesl-plugin) to
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
