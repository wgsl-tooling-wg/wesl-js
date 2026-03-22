# WESL with a Bundler, Static Linking

This example shows how you can use [WESL](https://wesl-lang.dev/) with Vite and Lygia.

```sh
pnpm install
pnpm dev
```

The interesting bits are:

- *app.wesl* - `import lygia::math::consts::PI;` - use lygia in shader code
- *main.ts*
  - `import appWgsl from "../shaders/app.wesl?static";` - link shader with vite

This example links shader code at build time using the WESL Vite plugin.
Lygia shader functions are linked to the application shader during Vite bundling.

No library is needed at runtime.
`appWgsl` is a plain JavaScript string containing WGSL for use in WebGPU.
