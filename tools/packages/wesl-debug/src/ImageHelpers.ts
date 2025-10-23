import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

/** Load PNG file and create GPU texture. */
export function pngToTexture(device: GPUDevice, imagePath: string): GPUTexture {
  const png = PNG.sync.read(fs.readFileSync(imagePath));

  const texture = device.createTexture({
    label: `test-texture-photo-${path.basename(imagePath)}`,
    size: { width: png.width, height: png.height, depthOrArrayLayers: 1 },
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  device.queue.writeTexture(
    { texture },
    new Uint8Array(png.data),
    { bytesPerRow: png.width * 4 },
    { width: png.width, height: png.height },
  );

  return texture;
}

/** Get the path to the bundled lemur test image (512x512 photo sample). */
export function lemurImagePath(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(moduleDir, "..", "images", "lemur512.png");
}
