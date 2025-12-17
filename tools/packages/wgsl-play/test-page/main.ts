/// <reference types="wesl-plugin/suffixes" />
import "../src/index.ts"; // Register the custom element

import type { WgslPlay } from "../src/index.ts";
import linkConfig from "./shaders/effects/main.wesl?link";
import staticWgsl from "./shaders/effects/main.wesl?static";

const player1 = document.querySelector<WgslPlay>("#player1")!;

// npm CDN test (external imports) with animation
const player2 = document.querySelector<WgslPlay>("#player2")!;
const npmShader = `
import random_wgsl::pcg_2u_3f;
import test::Uniforms;

@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy;
  let seed = vec2u(u32(uv.x) + u32(u.time * 10.0), u32(uv.y));
  let color = pcg_2u_3f(seed);
  return vec4f(color, 1.0);
}
`;
document.querySelector("#load-npm")!.addEventListener("click", () => {
  player2.source = npmShader;
});
document
  .querySelector("#play2")!
  .addEventListener("click", () => player2.play());
document
  .querySelector("#pause2")!
  .addEventListener("click", () => player2.pause());
document
  .querySelector("#rewind2")!
  .addEventListener("click", () => player2.rewind());

// shaderRoot test (internal imports)
const player3 = document.querySelector<WgslPlay>("#player3")!;
const internalShader = `
import package::utils::gradient;
import test::Uniforms;

@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let color = gradient(uv);
  return vec4f(color, 1.0);
}
`;
document.querySelector("#load-internal")!.addEventListener("click", () => {
  player3.source = internalShader;
});

// src attribute with shaderRoot test
const player4 = document.querySelector<WgslPlay>("#player4")!;
document.querySelector("#load-src")!.addEventListener("click", () => {
  player4.setAttribute("src", "/shaders/effects/main.wesl");
});

// ?static import test (wesl-plugin build-time linking)
const player5 = document.querySelector<WgslPlay>("#player5")!;
document.querySelector("#load-static")!.addEventListener("click", () => {
  player5.source = staticWgsl;
});

// ?link import test (wesl-plugin runtime linking)
const player6 = document.querySelector<WgslPlay>("#player6")!;
document.querySelector("#load-link")!.addEventListener("click", () => {
  player6.project = linkConfig;
});

// conditions test (project.conditions with inline shader)
const player7 = document.querySelector<WgslPlay>("#player7")!;
document.querySelector("#load-conditions")!.addEventListener("click", () => {
  player7.project = { conditions: { RED: true } };
});

// Expose for console debugging
Object.assign(window, {
  player1,
  player2,
  player3,
  player4,
  player5,
  player6,
  player7,
  staticWgsl,
  linkConfig,
});
