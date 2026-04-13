import { expect, test } from "vitest";
import { clampCanvas, entrySize } from "../CanvasSize.ts";

function fakeEntry(opts: {
  dp?: { inlineSize: number; blockSize: number };
  css?: { inlineSize: number; blockSize: number };
  rect?: { width: number; height: number };
}): ResizeObserverEntry {
  return {
    devicePixelContentBoxSize: opts.dp ? [opts.dp] : undefined,
    contentBoxSize: opts.css ? [opts.css] : undefined,
    contentRect: opts.rect ?? { width: 0, height: 0 },
  } as unknown as ResizeObserverEntry;
}

test("entrySize prefers devicePixelContentBoxSize when no override", () => {
  const entry = fakeEntry({
    dp: { inlineSize: 800, blockSize: 600 },
    css: { inlineSize: 400, blockSize: 300 },
  });
  expect(entrySize(entry, null)).toEqual([800, 600]);
});

test("entrySize falls back to contentBoxSize × devicePixelRatio on Safari", () => {
  globalThis.devicePixelRatio = 2;
  const entry = fakeEntry({ css: { inlineSize: 400, blockSize: 300 } });
  expect(entrySize(entry, null)).toEqual([800, 600]);
});

test("entrySize respects pixel-ratio override even when devicePixelContentBoxSize present", () => {
  const entry = fakeEntry({
    dp: { inlineSize: 800, blockSize: 600 },
    css: { inlineSize: 400, blockSize: 300 },
  });
  expect(entrySize(entry, "1")).toEqual([400, 300]);
});

test("entrySize falls back to contentRect when contentBoxSize missing", () => {
  const entry = fakeEntry({ rect: { width: 400, height: 300 } });
  expect(entrySize(entry, "2")).toEqual([800, 600]);
});

test("clampCanvas floors and clamps to [1, max]", () => {
  expect(clampCanvas(799.9, 8192)).toBe(799);
  expect(clampCanvas(0.5, 8192)).toBe(1);
  expect(clampCanvas(12000, 8192)).toBe(8192);
  expect(clampCanvas(-5, 8192)).toBe(1);
});
