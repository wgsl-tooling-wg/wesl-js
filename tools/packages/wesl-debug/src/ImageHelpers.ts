import * as fs from "node:fs/promises";
import * as path from "node:path";
import { PNG } from "pngjs";

/** Load PNG file and create GPU texture. */
export async function pngToTexture(
  device: GPUDevice,
  imagePath: string,
): Promise<GPUTexture> {
  const png = await loadPNG(imagePath);

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

async function loadPNG(imagePath: string): Promise<PNG> {
  const fileData = await fs.readFile(imagePath);
  return new Promise<PNG>((resolve, reject) => {
    const png = new PNG();
    png.parse(fileData, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
