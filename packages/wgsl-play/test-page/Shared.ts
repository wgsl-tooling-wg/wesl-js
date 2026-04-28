/// <reference types="wesl-plugin/suffixes" />
import "../../wgsl-edit/src/index.ts";
import "../src/index.ts";

/** Paint a 2-color grid onto the canvas; deterministic pixel bytes for snapshots. */
export function paintGridCanvas(canvas: HTMLCanvasElement): void {
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
export function paintSolidCanvas(
  canvas: HTMLCanvasElement,
  rgb: [number, number, number],
): void {
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `rgb(${rgb.join(", ")})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/** Expose values on `window` for console debugging. */
export function expose(values: Record<string, unknown>): void {
  Object.assign(window, values);
}
