// Texture and sampler creation helpers with internal caching for test performance

export interface SamplerOptions {
  addressMode?: "clamp-to-edge" | "repeat" | "mirror-repeat";
  filterMode?: "nearest" | "linear";
}

// Cache maps keyed by stringified params
const textureCache = new WeakMap<GPUDevice, Map<string, GPUTexture>>();
const samplerCache = new WeakMap<GPUDevice, Map<string, GPUSampler>>();

/** Create texture filled with solid color. Internally cached. */
export function createSolidTexture(
  device: GPUDevice,
  color: [r: number, g: number, b: number, a: number],
  width: number,
  height: number,
): GPUTexture {
  const cacheKey = `solid:${color.join(",")}:${width}x${height}`;
  const cached = getFromCache(textureCache, device, cacheKey);
  if (cached) return cached;

  const texture = device.createTexture({
    label: `test-texture-solid-${color.join(",")}`,
    size: { width, height, depthOrArrayLayers: 1 },
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4 + 0] = Math.round(color[0] * 255);
    data[i * 4 + 1] = Math.round(color[1] * 255);
    data[i * 4 + 2] = Math.round(color[2] * 255);
    data[i * 4 + 3] = Math.round(color[3] * 255);
  }

  device.queue.writeTexture(
    { texture },
    data,
    { bytesPerRow: width * 4 },
    { width, height },
  );

  setInCache(textureCache, device, cacheKey, texture);
  return texture;
}

/** Create gradient texture. Direction: 'horizontal' (default) or 'vertical'. */
export function createGradientTexture(
  device: GPUDevice,
  width: number,
  height: number,
  direction: "horizontal" | "vertical" = "horizontal",
): GPUTexture {
  const cacheKey = `gradient:${direction}:${width}x${height}`;
  const cached = getFromCache(textureCache, device, cacheKey);
  if (cached) return cached;

  const texture = device.createTexture({
    label: `test-texture-gradient-${direction}`,
    size: { width, height, depthOrArrayLayers: 1 },
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const gradient =
        direction === "horizontal" ? x / (width - 1) : y / (height - 1);
      const value = Math.round(gradient * 255);
      data[idx + 0] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }

  device.queue.writeTexture(
    { texture },
    data,
    { bytesPerRow: width * 4 },
    { width, height },
  );

  setInCache(textureCache, device, cacheKey, texture);
  return texture;
}

/** Create checkerboard pattern. cellSize: pixels per cell (default: width/4). */
export function createCheckerboardTexture(
  device: GPUDevice,
  width: number,
  height: number,
  cellSize?: number,
): GPUTexture {
  const cell = cellSize ?? Math.floor(width / 4);
  const cacheKey = `checkerboard:${cell}:${width}x${height}`;
  const cached = getFromCache(textureCache, device, cacheKey);
  if (cached) return cached;

  const texture = device.createTexture({
    label: `test-texture-checkerboard-${cell}`,
    size: { width, height, depthOrArrayLayers: 1 },
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const cellX = Math.floor(x / cell);
      const cellY = Math.floor(y / cell);
      const isBlack = (cellX + cellY) % 2 === 0;
      const value = isBlack ? 0 : 255;
      data[idx + 0] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }

  device.queue.writeTexture(
    { texture },
    data,
    { bytesPerRow: width * 4 },
    { width, height },
  );

  setInCache(textureCache, device, cacheKey, texture);
  return texture;
}

/** Create sampler. Default: linear filtering with clamp-to-edge. Internally cached. */
export function createSampler(
  device: GPUDevice,
  options?: SamplerOptions,
): GPUSampler {
  const addressMode = options?.addressMode ?? "clamp-to-edge";
  const filterMode = options?.filterMode ?? "linear";
  const cacheKey = `${addressMode}:${filterMode}`;
  const cached = getFromCache(samplerCache, device, cacheKey);
  if (cached) return cached;

  const sampler = device.createSampler({
    addressModeU: addressMode,
    addressModeV: addressMode,
    magFilter: filterMode,
    minFilter: filterMode,
  });

  setInCache(samplerCache, device, cacheKey, sampler);
  return sampler;
}

// Cache utilities
function getFromCache<T>(
  cache: WeakMap<GPUDevice, Map<string, T>>,
  device: GPUDevice,
  key: string,
): T | undefined {
  return cache.get(device)?.get(key);
}

function setInCache<T>(
  cache: WeakMap<GPUDevice, Map<string, T>>,
  device: GPUDevice,
  key: string,
  value: T,
): void {
  let deviceCache = cache.get(device);
  if (!deviceCache) {
    deviceCache = new Map();
    cache.set(device, deviceCache);
  }
  deviceCache.set(key, value);
}
