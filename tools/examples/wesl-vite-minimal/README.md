# WESL with a Bundler

This example shows how you can use [WESL](https://wesl-lang.dev/) with Vite. We also support other bundlers.

The standout feature of this example is that it uses a vite plugin to
- hook into Vite's hot reloading! Try editing a shader 🚀
- reads the `wesl.toml` and automatically resolve shaders
- minimizes the number of HTTP requests by bundling shaders


Try it out with
```
pnpm install
pnpm run dev
```
