# wgsl-play lygia example

Minimal example using the wgsl-play web component with an inline lygia shader.

## Run

```bash
pnpm install
pnpm dev
```

## How it works

The shader is embedded inline in index.html using `<script type="text/wesl">`.
wgsl-play auto-fetches lygia from npm at runtime - no build-time linking needed.
