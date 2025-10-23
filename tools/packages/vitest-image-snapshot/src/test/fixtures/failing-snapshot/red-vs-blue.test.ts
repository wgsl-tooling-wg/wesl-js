import { PNG } from "pngjs";
import { expect, test } from "vitest";
import { imageMatcher } from "../../../ImageSnapshotMatcher.ts";

imageMatcher();

function createSolidImage(
  width: number,
  height: number,
  color: [number, number, number, number],
): Buffer {
  const png = new PNG({ width, height, colorType: 6 });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4;
      [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]] =
        color;
    }
  }
  return PNG.sync.write(png);
}

test("red vs blue snapshot", async () => {
  const blueImage = createSolidImage(2, 2, [0, 0, 255, 255]);
  await expect(blueImage).toMatchImage("red-square");
});
