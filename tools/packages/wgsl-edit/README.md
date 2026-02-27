# wgsl-edit

Web component for editing WESL/WGSL with CodeMirror 6.

## Usage

```html
<script type="module">import "wgsl-edit";</script>

<wgsl-edit></wgsl-edit>
```

Features syntax highlighting, linting, multi-file tabs, and light/dark themes out of the box.

### Inline source

Include shader code directly via `<script>` tags:

```html
<wgsl-edit>
  <script type="text/wesl" data-name="main.wesl">
    import package::utils;
    @fragment fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      return vec4f(utils::gradient(pos.xy), 1.0);
    }
  </script>
  <script type="text/wesl" data-name="utils.wesl">
    fn gradient(uv: vec2f) -> vec3f { return vec3f(uv, 0.5); }
  </script>
</wgsl-edit>
```

Multiple `<script>` tags create a multi-file editor with tabs.

### With wgsl-play

```html
<wgsl-edit id="editor" theme="auto">
  <script type="text/wesl">/* shader code */</script>
</wgsl-edit>
<wgsl-play source="editor"></wgsl-play>
```

The play component reads sources from the editor and live-previews the shader.

### Programmatic control

```typescript
const editor = document.querySelector("wgsl-edit");

editor.source = shaderCode;           // set active file content
editor.sources = {                    // set all files
  "package::main": mainCode,
  "package::utils": utilsCode,
};
editor.addFile("helpers.wesl", code); // add a file
editor.activeFile = "helpers.wesl";   // switch tabs

editor.project = {                    // load a full project
  weslSrc: { "package::main": code },
  rootModuleName: "package::main",
  conditions: { RED: true },
  packageName: "myshader",
};
```

## API

### Attributes

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `src` | URL | - | Load source from URL |
| `theme` | `light` `dark` `auto` | `auto` | Color theme |
| `readonly` | boolean | `false` | Disable editing |
| `tabs` | boolean | `true` | Show tab bar |
| `lint` | `on` `off` | `on` | Real-time WESL validation |
| `line-numbers` | `true` `false` | `false` | Show line numbers |
| `shader-root` | string | - | Root path for shader imports |

### Properties

- `source: string` - Get/set active file content
- `sources: Record<string, string>` - Get/set all files (keyed by module path)
- `project: WeslProject` - Set full project (sources, conditions, packageName, etc.)
- `activeFile: string` - Get/set active file name
- `fileNames: string[]` - List all file names
- `theme`, `tabs`, `lint`, `lineNumbers`, `readonly`, `shaderRoot` - Mirror attributes

### Methods

- `addFile(name, content?)` - Add a new file
- `removeFile(name)` - Remove a file
- `renameFile(oldName, newName)` - Rename a file

### Events

- `change` - `{ source, sources, activeFile }` on any edit
- `file-change` - `{ action, file }` on add/remove/rename

## Using with wesl-plugin

For full project support (libraries, conditional compilation, constants),
use [wesl-plugin](https://github.com/wgsl-tooling-wg/wesl-js/tree/main/tools/packages/wesl-plugin)
to assemble shaders at build time and pass them to the editor via `project`.

```typescript
// vite.config.ts
import { linkBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

export default {
  plugins: [viteWesl({ extensions: [linkBuildExtension] })]
};

// app.ts
import shaderConfig from "./shader.wesl?link";

const editor = document.querySelector("wgsl-edit");
editor.project = {
  ...shaderConfig,
  conditions: { MOBILE: isMobileGPU },
  constants: { num_lights: 4 }
};
```

The `?link` import provides `weslSrc`, `libs`, `rootModuleName`, and `packageName`.
The editor's linter uses these to validate imports, conditions, and constants as you type.

## Styling

```css
wgsl-edit {
  height: 400px;
  border: 1px solid #444;
  border-radius: 4px;
}
```

## Bundle Size

~136 KB brotli for the full bundle with all dependencies.

| Component | Brotli |
|-----------|--------|
| CodeMirror (view, state, language, autocomplete, search, commands) | ~104 KB |
| lezer-wesl (grammar + lezer runtime) | ~26 KB |
| wesl linker (powers live linting) | ~14 KB |
| wgsl-edit (web component, theme, CSS) | ~1 KB |
| future work (tbd) | ~5 KB |


## CLI

Edit a shader file in the browser with live reload:

```bash
wgsl-edit path/to/shader.wesl
wgsl-edit shader.wgsl --port 3000 --no-open
```

## Exports

```typescript
import "wgsl-edit";                              // auto-registers element
import { WgslEdit } from "wgsl-edit/element";    // class only
import { wesl, weslLanguage } from "wgsl-edit/language"; // CodeMirror language
import "wgsl-edit/bundle";                       // pre-bundled, all deps included
```
