# WESL

[![NPM Version](https://img.shields.io/npm/v/wesl)](https://www.npmjs.com/package/wesl) 
[![Static Badge](https://img.shields.io/badge/Read%20the%20-Docs-blue)](https://wesl-lang.dev/)

## Install


```
npm install wesl
```

<details>
<summary> Other installation methods
</summary>


###### Deno

```
deno install npm:wesl
```

###### CDN

- [jsdelivr](https://cdn.jsdelivr.net/npm/wesl/+esm)
- [unpkg](https://unpkg.com/wesl)
- [esm.sh](https://esm.sh/wesl)


</details>

> [!TIP]
> If you are using a bundler, [try the wesl plugin](../wesl-plugin#wesl-plugin).

## Usage

```ts
import { link } from "wesl";

const shaderCode = await link({
  weslSrc: {
    "main.wesl": mainWeslString,
    "fullscreen_quad.wesl": fullscreenQuadWeslString,
    "mandelbrot.wesl": mandelbrotWeslString,
  },
});

const shader = shaderCode.createShaderModule(device, {});
```

## Example

Check out the [vanilla example](https://github.com/wgsl-tooling-wg/examples/tree/main/wesl-sample-vanilla)
