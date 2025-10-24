import { DeviceCache } from "./DeviceCache.ts";

/* Texture and sampler creation helpers with internal caching for test performance */

export interface SamplerOptions {
  addressMode?: "clamp-to-edge" | "repeat" | "mirror-repeat";
  filterMode?: "nearest" | "linear";
}

const textureCache = new DeviceCache<GPUTexture>();
const samplerCache = new DeviceCache<GPUSampler>();

/** Create texture filled with solid color. Internally cached. */
export function solidTexture(
  device: GPUDevice,
  color: [r: number, g: number, b: number, a: number],
  width: number,
  height: number,
): GPUTexture {
  const cacheKey = `solid:${color.join(",")}:${width}x${height}`;
  return cachedTexture(
    device,
    cacheKey,
    `test-texture-solid-${color.join(",")}`,
    width,
    height,
    data => {
      for (let i = 0; i < width * height; i++) {
        data[i * 4 + 0] = Math.round(color[0] * 255);
        data[i * 4 + 1] = Math.round(color[1] * 255);
        data[i * 4 + 2] = Math.round(color[2] * 255);
        data[i * 4 + 3] = Math.round(color[3] * 255);
      }
    },
  );
}

/** Create gradient texture. Direction: 'horizontal' (default) or 'vertical'. */
export function gradientTexture(
  device: GPUDevice,
  width: number,
  height: number,
  direction: "horizontal" | "vertical" = "horizontal",
): GPUTexture {
  const cacheKey = `gradient:${direction}:${width}x${height}`;
  return cachedTexture(
    device,
    cacheKey,
    `test-texture-gradient-${direction}`,
    width,
    height,
    data => {
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
    },
  );
}

/** Create checkerboard pattern. cellSize: pixels per cell (default: width/4). */
export function checkerboardTexture(
  device: GPUDevice,
  width: number,
  height: number,
  cellSize?: number,
): GPUTexture {
  const cell = cellSize ?? Math.floor(width / 4);
  const cacheKey = `checkerboard:${cell}:${width}x${height}`;
  return cachedTexture(
    device,
    cacheKey,
    `test-texture-checkerboard-${cell}`,
    width,
    height,
    data => {
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
    },
  );
}

/** Create sampler. Default: linear filtering with clamp-to-edge. Internally cached. */
export function createSampler(
  device: GPUDevice,
  options?: SamplerOptions,
): GPUSampler {
  const { addressMode = "clamp-to-edge", filterMode = "linear" } =
    options ?? {};
  const cacheKey = `${addressMode}:${filterMode}`;
  const cached = samplerCache.get(device, cacheKey);
  if (cached) return cached;

  const sampler = device.createSampler({
    addressModeU: addressMode,
    addressModeV: addressMode,
    magFilter: filterMode,
    minFilter: filterMode,
  });

  samplerCache.set(device, cacheKey, sampler);
  return sampler;
}

/** Create radial gradient texture (white center to black edge). */
export function radialGradientTexture(
  device: GPUDevice,
  size: number,
): GPUTexture {
  const cacheKey = `radial:${size}`;
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
  return cachedTexture(
    device,
    cacheKey,
    `test-texture-radial-${size}`,
    size,
    size,
    data => {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const gradient = 1.0 - Math.min(distance / maxRadius, 1.0);
          const value = Math.round(gradient * 255);
          data[idx + 0] = value;
          data[idx + 1] = value;
          data[idx + 2] = value;
          data[idx + 3] = 255;
        }
      }
    },
  );
}

/** Create edge pattern texture with sharp vertical, horizontal, and diagonal lines. */
export function edgePatternTexture(
  device: GPUDevice,
  size: number,
): GPUTexture {
  const cacheKey = `edges:${size}`;
  const lineWidth = 2;
  return cachedTexture(
    device,
    cacheKey,
    `test-texture-edges-${size}`,
    size,
    size,
    data => {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const isLine =
            Math.abs(x - size / 2) < lineWidth ||
            Math.abs(y - size / 2) < lineWidth ||
            Math.abs(x - y) < lineWidth ||
            Math.abs(x - (size - 1 - y)) < lineWidth;
          const value = isLine ? 255 : 0;
          data[idx + 0] = value;
          data[idx + 1] = value;
          data[idx + 2] = value;
          data[idx + 3] = 255;
        }
      }
    },
  );
}

/** Create color bars texture (RGB primaries and secondaries). */
export function colorBarsTexture(device: GPUDevice, size: number): GPUTexture {
  const cacheKey = `colorbars:${size}`;
  const colors = [
    [255, 0, 0],
    [255, 255, 0],
    [0, 255, 0],
    [0, 255, 255],
    [0, 0, 255],
    [255, 0, 255],
  ];
  const barWidth = size / colors.length;
  return cachedTexture(
    device,
    cacheKey,
    `test-texture-colorbars-${size}`,
    size,
    size,
    data => {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const barIndex = Math.min(
            Math.floor(x / barWidth),
            colors.length - 1,
          );
          const color = colors[barIndex];
          data[idx + 0] = color[0];
          data[idx + 1] = color[1];
          data[idx + 2] = color[2];
          data[idx + 3] = 255;
        }
      }
    },
  );
}

/** Create seeded noise pattern (deterministic). */
export function noiseTexture(
  device: GPUDevice,
  size: number,
  seed = 42,
): GPUTexture {
  const cacheKey = `noise:${size}:${seed}`;
  return cachedTexture(
    device,
    cacheKey,
    `test-texture-noise-${size}`,
    size,
    size,
    data => {
      let rng = seed;
      // Simple seeded PRNG (mulberry32)
      const random = () => {
        rng |= 0;
        rng = (rng + 0x6d2b79f5) | 0;
        let t = Math.imul(rng ^ (rng >>> 15), 1 | rng);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      for (let i = 0; i < size * size * 4; i += 4) {
        const value = Math.round(random() * 255);
        data[i + 0] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 255;
      }
    },
  );
}

/** Common helper for creating cached textures with custom data generation. */
function cachedTexture(
  device: GPUDevice,
  cacheKey: string,
  label: string,
  width: number,
  height: number,
  generateData: (data: Uint8Array, width: number, height: number) => void,
): GPUTexture {
  const cached = textureCache.get(device, cacheKey);
  if (cached) return cached;

  const texture = device.createTexture({
    label,
    size: { width, height, depthOrArrayLayers: 1 },
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  const data = new Uint8Array(width * height * 4);
  generateData(data, width, height);

  device.queue.writeTexture(
    { texture },
    data,
    { bytesPerRow: width * 4 },
    { width, height },
  );

  textureCache.set(device, cacheKey, texture);
  return texture;
}
