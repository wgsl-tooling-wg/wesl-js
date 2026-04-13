/** Device-pixel size of an observed element.
 *  Prefers `devicePixelContentBoxSize` (Chromium/Firefox) — integer, pixel-exact.
 *  Falls back to `contentBoxSize × ratio` on Safari and when a `pixel-ratio`
 *  override is set (the override is CSS-pixel-based by intent). */
export function entrySize(
  entry: ResizeObserverEntry,
  pixelRatioOverride: string | null,
): [width: number, height: number] {
  if (pixelRatioOverride === null) {
    const dp = entry.devicePixelContentBoxSize?.[0];
    if (dp) return [dp.inlineSize, dp.blockSize];
  }
  const ratio =
    pixelRatioOverride !== null ? Number(pixelRatioOverride) : devicePixelRatio;
  const css = entry.contentBoxSize?.[0];
  if (css) return [css.inlineSize * ratio, css.blockSize * ratio];
  const { width, height } = entry.contentRect;
  return [width * ratio, height * ratio];
}

/** Floor and clamp to `[1, max]` so the canvas never exceeds the GPU's 2D limit.
 *  Pass `max = undefined` to skip the upper clamp (e.g. before the GPU device
 *  is available; device init will surface limit errors itself). */
export function clampCanvas(size: number, max: number | undefined): number {
  const floored = Math.max(1, Math.floor(size));
  return max !== undefined ? Math.min(floored, max) : floored;
}
