# wgsl-play

Web component for rendering WESL/WGSL fragment shaders.

## Usage

```html
<script type="module">import "wgsl-play";</script>

<wgsl-play src="./shader.wesl"></wgsl-play>
```

That's it. The component auto-fetches dependencies and starts animating.

### Inline source

```html
<wgsl-play>
  @fragment fn fs_main() -> @location(0) vec4f {
    return vec4f(1.0, 0.0, 0.0, 1.0);
  }
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

## API

### Attributes
- `src` - URL to .wesl/.wgsl file

### Properties
- `source: string` - Get/set shader source
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

## Exports

```typescript
// Default - auto-registers element
import "wgsl-play";

// Element class only (manual registration)
import { WgslPlay } from "wgsl-play/element";
```
