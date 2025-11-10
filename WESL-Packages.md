# WESL Package Structures

WESL packages are distributed on npm by encoding WESL sources into JavaScript objects that
match the WeslBundle interface. One npm library can export multiple WESL bundles, distinguished
by export paths in `package.json`.

## WeslBundle Interface

See [WeslBundle.ts](tools/packages/wesl/src/WeslBundle.ts) for the complete interface definition.

Example bundle file (`dist/color/hueShift/weslBundle.js`):

```javascript
import lygia_color_space_rgb2hsl from "lygia/color/space/rgb2hsl"; // reference other bundles via JS imports
import lygia_color_space_hsl2rgb from "lygia/color/space/hsl2rgb";

export const weslBundle = {
  name: "lygia",
  edition: "unstable_2025_1",
  modules: {
    "color/hueShift.wesl": "fn hueShift(color: vec3f, amount: f32) -> vec3f { ... }"
  },
  dependencies: [lygia_color_space_rgb2hsl, lygia_color_space_hsl2rgb]
};
```

**Key fields**:
- `name`: Package name only (not including subpath)
- `modules`: Map of file paths to WESL/WGSL code strings
- `dependencies`: Array of imported WeslBundle objects

## Single-Bundle Packages

**Example**: random_wgsl

```
random_wgsl/
├── shaders/
│   └── lib.wgsl
├── dist/
│   └── weslBundle.js          # all modules in one bundle
└── package.json
    exports: {
      ".": "./dist/weslBundle.js"
    }
```

## Multi-Bundle Packages

**When to use**: Large libraries that want to enable granular tree-shaking

**Example**: lygia (380+ bundles)

```
lygia/
├── dist/
│   ├── color/
│   │   ├── hueShift/weslBundle.js      # one bundle per source file
│   │   └── space/
│   │       ├── rgb2hsl/weslBundle.js
│   │       └── hsl2rgb/weslBundle.js
│   ├── sdf/
│   │   └── boxSDF/weslBundle.js
│   ├── math/
│   │   └── cubic/weslBundle.js
│   └── ... (190+ total bundles)
└── package.json
    exports: {
      "./*": "./dist/*/weslBundle.js"
    }
```

**Key characteristics**:
- One weslBundle.js per source file
- Each bundle contains exactly ONE module + its dependencies
- `bundle.name` is package name ("lygia"), NOT "lygia/color/hueShift"
- Enables tree-shaking: javascript bundlers eliminate unused imports
