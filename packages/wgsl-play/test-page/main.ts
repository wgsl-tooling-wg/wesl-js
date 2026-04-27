/// <reference types="wesl-plugin/suffixes" />
import "../../wgsl-edit/src/index.ts"; // Register wgsl-edit for connectToSource tests
import "../src/index.ts"; // Register wgsl-play
import type { WgslEdit } from "../../wgsl-edit/src/WgslEdit.ts";
import type { WgslPlay } from "../src/index.ts";
import linkConfig from "./shaders/effects/main.wesl?link";
import staticWgsl from "./shaders/effects/main.wesl?static";
import mouseConfig from "./shaders/mouse.wesl?link";

const player1 = document.querySelector<WgslPlay>("#player1")!;

// npm CDN test (external imports) with animation
const player2 = document.querySelector<WgslPlay>("#player2")!;
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
document.querySelector("#load-npm")!.addEventListener("click", () => {
  player2.shader = npmShader;
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
import env::u;

@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let color = gradient(uv);
  return vec4f(color, 1.0);
}
`;
document.querySelector("#load-internal")!.addEventListener("click", () => {
  player3.shader = internalShader;
});

// src attribute with shaderRoot test
const player4 = document.querySelector<WgslPlay>("#player4")!;
document.querySelector("#load-src")!.addEventListener("click", () => {
  player4.setAttribute("src", "/shaders/effects/main.wesl");
});

// ?static import test (wesl-plugin build-time linking)
const player5 = document.querySelector<WgslPlay>("#player5")!;
document.querySelector("#load-static")!.addEventListener("click", () => {
  player5.shader = staticWgsl;
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

// connectToSource + conditions toggle (section 10)
const editor10 = document.querySelector<WgslEdit>("#editor10")!;
document.querySelector("#toggle-condition10")!.addEventListener("click", () => {
  editor10.conditions = { RED: true };
});

// connectToSource + dynamic npm loading (section 12)
const editor12 = document.querySelector<WgslEdit>("#editor12")!;
document.querySelector("#inject-npm12")!.addEventListener("click", () => {
  const newSource = `import env::u;

@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let seed = vec2u(u32(pos.x), u32(pos.y));
  let color = random_wgsl::pcg_2u_3f(seed);
  return vec4f(color, 1.0);
}`;
  editor12.source = newSource;
});

// editor.link() with virtualLibs (section 13)
const editor13 = document.querySelector<WgslEdit>("#editor13")!;
const envSrc = `
  struct Uniforms { resolution: vec2f, time: f32, mouse: vec2f }
  @group(0) @binding(0) var<uniform> u: Uniforms;
`;
document.querySelector("#link-btn13")!.addEventListener("click", async () => {
  try {
    const wgsl = await editor13.link({ virtualLibs: { env: () => envSrc } });
    document.querySelector("#link-output13")!.textContent = wgsl;
  } catch (e) {
    document.querySelector("#link-output13")!.textContent = `Error: ${e}`;
  }
});

// @uniforms test (section 14) — set plain field via JS
const player14 = document.querySelector<WgslPlay>("#player14")!;
player14.setUniform("brightness", 0.6);

// mouse tracking test (?link, section 15)
const player15 = document.querySelector<WgslPlay>("#player15")!;
player15.project = mouseConfig;

// @texture single (section 16)
const player16 = document.querySelector<WgslPlay>("#player16")!;
paintGridCanvas(
  player16.querySelector<HTMLCanvasElement>('[data-texture="grid"]')!,
);

// @texture multi (section 17)
const player17 = document.querySelector<WgslPlay>("#player17")!;
paintSolidCanvas(
  player17.querySelector<HTMLCanvasElement>('[data-texture="red_panel"]')!,
  [220, 60, 60],
);
paintSolidCanvas(
  player17.querySelector<HTMLCanvasElement>('[data-texture="blue_panel"]')!,
  [60, 80, 220],
);

// @buffer palette (section 18) — no JS wiring; shader reads zero-init buffer directly.

// @texture from <img> with src swap (section 20)
const player20 = document.querySelector<WgslPlay>("#player20")!;
const img20 = document.querySelector<HTMLImageElement>("#img20")!;
const greenSwatch =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR42mOw2RLwHx9mGBkKAOevj8Eo05M5AAAAAElFTkSuQmCC";
document.querySelector("#swap-img20")!.addEventListener("click", () => {
  img20.src = greenSwatch;
});

// @test_texture rejection (section 19) — record last compile-error for the e2e assertion.
const player19 = document.querySelector<WgslPlay>("#player19")!;
const reject19Status =
  document.querySelector<HTMLPreElement>("#reject19-status")!;
player19.addEventListener("compile-error", e => {
  const detail = (e as CustomEvent).detail as { message: string; kind: string };
  reject19Status.textContent = `Status: rejected (${detail.kind}) — ${detail.message}`;
  reject19Status.dataset.rejected = "true";
});

/** Paint a 2-color grid onto the canvas; deterministic pixel bytes for snapshots. */
function paintGridCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const cell = 8;
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const on = ((x / cell) ^ (y / cell)) & 1;
      ctx.fillStyle = on ? "#f0c060" : "#204060";
      ctx.fillRect(x, y, cell, cell);
    }
  }
}

/** Paint a solid color over the canvas. */
function paintSolidCanvas(
  canvas: HTMLCanvasElement,
  rgb: [number, number, number],
): void {
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `rgb(${rgb.join(", ")})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Expose for console debugging
Object.assign(window, {
  player1,
  player2,
  player3,
  player4,
  player5,
  player6,
  player7,
  editor10,
  editor12,
  editor13,
  player14,
  player15,
  player16,
  player17,
  player19,
  player20,
  staticWgsl,
  linkConfig,
  mouseConfig,
});
