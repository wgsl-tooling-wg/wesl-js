import { PNG } from "pngjs";

/** Convert standard browser ImageData to PNG Buffer for comparison. */
export function pngBuffer(imageData: ImageData): Buffer {
  const png = new PNG({
    width: imageData.width,
    height: imageData.height,
    colorType: 6,
  });
  png.data = Buffer.from(imageData.data);
  return PNG.sync.write(png);
}
