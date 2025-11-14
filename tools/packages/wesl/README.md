# WESL

[![Static Badge](https://img.shields.io/badge/Documentation-0475b6?style=for-the-badge)](https://wesl-lang.dev/)
[![NPM Version](https://img.shields.io/npm/v/wesl?style=for-the-badge)](https://www.npmjs.com/package/wesl)
[![Discord](https://img.shields.io/discord/1275293995152703488?style=for-the-badge&label=Discord)](https://discord.gg/Ty7MjWVfvh)

For documentation, see:
  **[Getting Started with JavaScript/TypeScript](https://wesl-lang.dev/docs/Getting-Started-JavaScript)**

For sample code, start with one of the wesl-js **[Examples]**.

---

_WESL is an extended version of WebGPU's [WGSL](https://www.w3.org/TR/WGSL/#intro) shading language. Everything you know from WGSL just works._

WESL adds features:

- **imports** to split shaders into modular, reusable files.
- **conditional compiliation** to configure shader variations at compile time or run time.
- **shader libraries** on npm and cargo, for community sharing of shader code modules.

This [wesl] library contains a **TypeScript** WESL linker.
[wesl] can be used at runtime or at build time to assemble WESL and WGSL modules for WebGPU.

<img style="margin:10px 0px -10px 40px" src="https://docs.google.com/drawings/d/e/2PACX-1vRKxcnMB-U-UVcDRO6N6UMJESTodUBRnV6cVrrS_XwJetucnOfYCU9ztk9veXoqLJ7DinBdDnR9EiK-/pub?w=400&amp;h=300">


## WESL Example

<pre>
<b>import</b> package::colors::chartreuse;    <b>// 1. modularize shaders in separate files</b>
<b>import</b> random_wgsl::pcg_2u_3f;         <b>// 2. use shader libraries from npm/cargo</b>

fn random_color(uv: vec2u) -> vec3f {
  var color = pcg_2u_3f(uv);

  <b>@if(DEBUG)</b> color = chartreuse;       <b>// 3. set conditions at runtime or build time</b>

  return color;
}
</pre>

[wesl plugin]: https://www.npmjs.com/package/wesl-plugin
[examples]: https://github.com/wgsl-tooling-wg/wesl-js/tree/main/tools/examples 
[wesl]: https://www.npmjs.com/package/wesl