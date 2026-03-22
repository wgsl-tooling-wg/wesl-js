import { PNG } from "pngjs";
import { expect, test } from "vitest";
import { compareImages } from "../ImageComparison.ts";

/** Create simple test image data. */
function createTestImage(
  width: number,
  height: number,
  color: [number, number, number, number],
): Buffer {
  const png = new PNG({ width, height, colorType: 6 });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4;
      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = color[3];
    }
  }

  return PNG.sync.write(png);
}

test("identical images should match", async () => {
  const image = createTestImage(10, 10, [255, 0, 0, 255]);

  const result = await compareImages(image, image);

  expect(result.pass).toBe(true);
  expect(result.mismatchedPixels).toBe(0);
});

test("different images should not match", async () => {
  const image1 = createTestImage(10, 10, [255, 0, 0, 255]);
  const image2 = createTestImage(10, 10, [0, 255, 0, 255]);

  const result = await compareImages(image1, image2);

  expect(result.pass).toBe(false);
  expect(result.mismatchedPixels).toBe(100); // All 100 pixels different
});

test("respects threshold option", async () => {
  const image1 = createTestImage(10, 10, [100, 100, 100, 255]);
  const image2 = createTestImage(10, 10, [105, 105, 105, 255]);

  // Should fail with strict threshold
  const strictResult = await compareImages(image1, image2, { threshold: 0.01 });
  expect(strictResult.pass).toBe(false);

  // Should pass with lenient threshold
  const lenientResult = await compareImages(image1, image2, { threshold: 0.5 });
  expect(lenientResult.pass).toBe(true);
});

test("respects allowedPixelRatio option", async () => {
  // Create 100 pixel image, with 5 different pixels
  const png1 = new PNG({ width: 10, height: 10, colorType: 6 });
  const png2 = new PNG({ width: 10, height: 10, colorType: 6 });

  for (let i = 0; i < 100; i++) {
    const idx = i * 4;
    png1.data[idx] = 255;
    png1.data[idx + 1] = 0;
    png1.data[idx + 2] = 0;
    png1.data[idx + 3] = 255;

    // First 5 pixels different, rest same
    if (i < 5) {
      png2.data[idx] = 0;
      png2.data[idx + 1] = 255;
    } else {
      png2.data[idx] = 255;
      png2.data[idx + 1] = 0;
    }
    png2.data[idx + 2] = 0;
    png2.data[idx + 3] = 255;
  }

  const buffer1 = PNG.sync.write(png1);
  const buffer2 = PNG.sync.write(png2);

  // Should fail with strict ratio
  const strictResult = await compareImages(buffer1, buffer2, {
    allowedPixelRatio: 0.01,
  });
  expect(strictResult.pass).toBe(false);
  expect(strictResult.mismatchedPixels).toBe(5);

  // Should pass with lenient ratio (5/100 = 5%)
  const lenientResult = await compareImages(buffer1, buffer2, {
    allowedPixelRatio: 0.1,
  });
  expect(lenientResult.pass).toBe(true);
  expect(lenientResult.mismatchedPixels).toBe(5);
});
