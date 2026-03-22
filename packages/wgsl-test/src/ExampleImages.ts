import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { DeviceCache } from "wesl-gpu";
import { pngToTexture } from "./ImageHelpers.ts";

const textureCache = new DeviceCache<GPUTexture>();

/** return a texture to the bundled lemur test image. */
export async function lemurTexture(
  device: GPUDevice,
  size: 256 | 512 = 512,
): Promise<GPUTexture> {
  const lemurPath = lemurImagePath(size);
  const cached = textureCache.get(device, lemurPath);
  if (cached) return cached;

  const texture = await pngToTexture(device, lemurImagePath(size));
  textureCache.set(device, lemurPath, texture);

  return texture;
}

/** Get the path to the bundled lemur test image. */
export function lemurImagePath(size: 256 | 512 = 512): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(moduleDir, "..", "images", `lemur${size}.png`);
}
