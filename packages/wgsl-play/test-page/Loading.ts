/// <reference types="wesl-plugin/suffixes" />
import type { WgslPlay } from "../src/index.ts";
import { expose } from "./Shared.ts";
import linkConfig from "./shaders/effects/main.wesl?link";
import staticWgsl from "./shaders/effects/main.wesl?static";

const npmPlayer = document.querySelector<WgslPlay>("#npmPlayer")!;
const npmShader = `
import random_wgsl::pcg_2u_3f;
import env::u;

@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy;
  let seed = vec2u(u32(uv.x) + u32(u.time * 10.0), u32(uv.y));
  let color = pcg_2u_3f(seed);
  return vec4f(color, 1.0);
}
`;
document.querySelector("#load-npm-shader")!.addEventListener("click", () => {
  npmPlayer.shader = npmShader;
});
document
  .querySelector("#npm-play")!
  .addEventListener("click", () => npmPlayer.play());
document
  .querySelector("#npm-pause")!
  .addEventListener("click", () => npmPlayer.pause());
document
  .querySelector("#npm-rewind")!
  .addEventListener("click", () => npmPlayer.rewind());

const internalImportPlayer = document.querySelector<WgslPlay>(
  "#internalImportPlayer",
)!;
const internalShader = `
import package::utils::gradient;
import env::u;

@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let color = gradient(uv);
  return vec4f(color, 1.0);
}
`;
document
  .querySelector("#load-internal-shader")!
  .addEventListener("click", () => {
    internalImportPlayer.shader = internalShader;
  });

const srcAttrPlayer = document.querySelector<WgslPlay>("#srcAttrPlayer")!;
document.querySelector("#load-src-shader")!.addEventListener("click", () => {
  srcAttrPlayer.setAttribute("src", "/shaders/effects/main.wesl");
});

const staticImportPlayer = document.querySelector<WgslPlay>(
  "#staticImportPlayer",
)!;
document.querySelector("#load-static-shader")!.addEventListener("click", () => {
  staticImportPlayer.shader = staticWgsl;
});

const linkImportPlayer = document.querySelector<WgslPlay>("#linkImportPlayer")!;
document.querySelector("#load-link-shader")!.addEventListener("click", () => {
  linkImportPlayer.project = linkConfig;
});

expose({
  npmPlayer,
  internalImportPlayer,
  srcAttrPlayer,
  staticImportPlayer,
  linkImportPlayer,
  staticWgsl,
  linkConfig,
});
