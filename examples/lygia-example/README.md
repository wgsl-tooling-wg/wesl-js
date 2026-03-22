# WESL with a Bundler

This example shows how you can use [WESL](https://wesl-lang.dev/) with Vite and Lygia.

```sh
pnpm install
pnpm dev
```

The interesting bits are:

- *app.wesl* - `import lygia::math::consts::PI;` - use lygia in shader code
- *main.ts*
  - `import appWesl from "../shaders/app.wesl?link";` - assemble shader bundles with vite
  - `p const linked = await link(appWesl);` - link shaders at runtime

This example links shaders dynamically at runtime (for maximum flexibility).
The doc site also describes how to do [static linking](https://wesl-lang.dev/docs/JavaScript-Builds#controlling-static-bundler-builds).
