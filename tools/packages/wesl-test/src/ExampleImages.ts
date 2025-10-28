import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { DeviceCache } from "./DeviceCache.ts";
import { pngToTexture } from "./ImageHelpers.ts";

const textureCache = new DeviceCache<GPUTexture>();

/** return a texture to the bundled lemur test image (512x512 photo sample). */
export async function lemurTexture(device: GPUDevice): Promise<GPUTexture> {
  const lemurPath = lemurImagePath();
  const cached = textureCache.get(device, lemurPath);
  if (cached) return cached;

  const texture = await pngToTexture(device, lemurImagePath());
  textureCache.set(device, lemurPath, texture);

  return texture;
}

/** Get the path to the bundled lemur test image (512x512 photo sample). */
export function lemurImagePath(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(moduleDir, "..", "images", "lemur512.png");
}
