import {
  checkerboardTexture,
  colorBarsTexture,
  createSampler,
  edgePatternTexture,
  gradientTexture,
  noiseTexture,
  radialGradientTexture,
  solidTexture,
} from "wesl-gpu";
import type {
  DiscoveredBuffer,
  DiscoveredResource,
  DiscoveredSampler,
  DiscoveredTexture,
} from "wesl-reflect";
import { lemurTexture } from "./ExampleImages.ts";

/** GPU resources created for annotated test vars. */
export interface TestResources {
  /** Bind group entries for annotated resources (binding 1, 2, ...). */
  entries: GPUBindGroupEntry[];
  /** Layout entries for annotated resources. */
  layoutEntries: GPUBindGroupLayoutEntry[];
  /** Storage buffers to re-zero between tests. */
  buffers: GPUBuffer[];
}

/** Create GPU resources from discovered annotated vars. */
export async function createTestResources(
  device: GPUDevice,
  resources: DiscoveredResource[],
  startBinding = 1,
): Promise<TestResources> {
  const entries: GPUBindGroupEntry[] = [];
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  const buffers: GPUBuffer[] = [];

  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i];
    const binding = startBinding + i;
    const created = await createResource(device, resource, binding);
    if (
      "buffer" in created &&
      resource.kind === "buffer" &&
      resource.access === "read_write"
    ) {
      buffers.push(created.buffer as GPUBuffer);
    }
    entries.push(created.entry);
    layoutEntries.push(created.layout);
  }

  return { entries, layoutEntries, buffers };
}

/** Zero all read_write storage buffers for test isolation. */
export function reZeroBuffers(device: GPUDevice, buffers: GPUBuffer[]): void {
  if (buffers.length === 0) return;
  const encoder = device.createCommandEncoder({ label: "reZeroBuffers" });
  for (const buffer of buffers) encoder.clearBuffer(buffer);
  device.queue.submit([encoder.finish()]);
}

/** Dispatch to the appropriate resource creator by kind. */
async function createResource(
  device: GPUDevice,
  resource: DiscoveredResource,
  binding: number,
) {
  if (resource.kind === "buffer")
    return createBufferResource(device, resource, binding);
  if (resource.kind === "test_texture")
    return createTextureResource(device, resource, binding);
  return createSamplerResource(device, resource, binding);
}

/** Create a storage buffer with COPY_SRC | COPY_DST for readback and re-zeroing. */
function createBufferResource(
  device: GPUDevice,
  r: DiscoveredBuffer,
  binding: number,
) {
  const { STORAGE, COPY_SRC, COPY_DST } = GPUBufferUsage;
  const buffer = device.createBuffer({
    label: `test-buffer-${r.varName}`,
    size: r.byteSize,
    usage: STORAGE | COPY_SRC | COPY_DST,
  });
  const type: GPUBufferBindingType =
    r.access === "read_write" ? "storage" : "read-only-storage";
  return {
    entry: { binding, resource: { buffer } } as GPUBindGroupEntry,
    layout: {
      binding,
      visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
      buffer: { type },
    } as GPUBindGroupLayoutEntry,
    buffer,
  };
}

type TextureGenerator = (
  device: GPUDevice,
  params: number[],
) => GPUTexture | Promise<GPUTexture>;

const textureGenerators: Record<string, TextureGenerator> = {
  checkerboard: (dev, p) =>
    checkerboardTexture(dev, p[0] ?? 256, p[1] ?? 256, p[2]),
  gradient: (dev, p) => gradientTexture(dev, p[0] ?? 256, p[1] ?? 256),
  radial_gradient: (dev, p) => radialGradientTexture(dev, p[0] ?? 256),
  color_bars: (dev, p) => colorBarsTexture(dev, p[0] ?? 256),
  edge_pattern: (dev, p) => edgePatternTexture(dev, p[0] ?? 256),
  noise: (dev, p) => noiseTexture(dev, p[0] ?? 256),
  solid: (dev, p) =>
    solidTexture(dev, [p[0] ?? 1, p[1] ?? 1, p[2] ?? 1, p[3] ?? 1], 1, 1),
  lemur: (dev, p) => lemurTexture(dev, (p[0] === 256 ? 256 : 512) as 256 | 512),
};

/** Generate a test texture from the named source and bind it as a float texture. */
async function createTextureResource(
  device: GPUDevice,
  r: DiscoveredTexture,
  binding: number,
) {
  const gen = textureGenerators[r.source];
  if (!gen) throw new Error(`Unknown test texture source: ${r.source}`);
  const texture = await gen(device, r.params);
  return {
    entry: { binding, resource: texture.createView() } as GPUBindGroupEntry,
    layout: {
      binding,
      visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
      texture: { sampleType: "float" },
    } as GPUBindGroupLayoutEntry,
  };
}

function createSamplerResource(
  device: GPUDevice,
  r: DiscoveredSampler,
  binding: number,
) {
  const sampler = createSampler(device, { filterMode: r.filter });
  return {
    entry: { binding, resource: sampler } as GPUBindGroupEntry,
    layout: {
      binding,
      visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
      sampler: { type: "filtering" },
    } as GPUBindGroupLayoutEntry,
  };
}
