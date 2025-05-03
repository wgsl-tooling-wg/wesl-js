# WGSL-Packager

A command tool to bundle WGSL/WESL files into an npm package.

## Usage

Create a bundled package in the `dist` directory
from sources in the `src/shaders` directory.

```sh
npx wesl-packager --rootDir src/shaders --outDir dist
```

### Development

The `PackageWesl.test.ts` uses colored output.
to see the colors, use:

```sh
FORCE_COLOR=1 pnpm vitest
```
