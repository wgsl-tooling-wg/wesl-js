import type { WgslPlay } from "../src/index.ts";
import { expose, paintGridCanvas, paintSolidCanvas } from "./Shared.ts";

const singleTexturePlayer = document.querySelector<WgslPlay>(
  "#singleTexturePlayer",
)!;
paintGridCanvas(
  singleTexturePlayer.querySelector<HTMLCanvasElement>(
    '[data-texture="grid"]',
  )!,
);

const multiTexturePlayer = document.querySelector<WgslPlay>(
  "#multiTexturePlayer",
)!;
paintSolidCanvas(
  multiTexturePlayer.querySelector<HTMLCanvasElement>(
    '[data-texture="red_panel"]',
  )!,
  [220, 60, 60],
);
paintSolidCanvas(
  multiTexturePlayer.querySelector<HTMLCanvasElement>(
    '[data-texture="blue_panel"]',
  )!,
  [60, 80, 220],
);

const bufferPlayer = document.querySelector<WgslPlay>("#bufferPlayer")!;

const imgTexturePlayer = document.querySelector<WgslPlay>("#imgTexturePlayer")!;
const imgTextureSwatch =
  document.querySelector<HTMLImageElement>("#imgTextureSwatch")!;
const greenSwatch =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR42mOw2RLwHx9mGBkKAOevj8Eo05M5AAAAAElFTkSuQmCC";
document.querySelector("#swap-img-texture")!.addEventListener("click", () => {
  imgTextureSwatch.src = greenSwatch;
});

const rejectedTexturePlayer = document.querySelector<WgslPlay>(
  "#rejectedTexturePlayer",
)!;
const rejectedStatus = document.querySelector<HTMLPreElement>(
  "#rejected-texture-status",
)!;
rejectedTexturePlayer.addEventListener("compile-error", e => {
  const detail = (e as CustomEvent).detail as { message: string; kind: string };
  rejectedStatus.textContent = `Status: rejected (${detail.kind}) - ${detail.message}`;
  rejectedStatus.dataset.rejected = "true";
});

expose({
  singleTexturePlayer,
  multiTexturePlayer,
  bufferPlayer,
  imgTexturePlayer,
  rejectedTexturePlayer,
});
