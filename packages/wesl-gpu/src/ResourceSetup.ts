import type {
  DiscoveredBuffer,
  DiscoveredResource,
  DiscoveredSampler,
} from "wesl-reflect";
import { createSampler } from "./ExampleTextures.ts";

/** Host-side resource failure (missing texture source, unsupported texture dim,
 *  test-only annotation in a non-test runtime). Distinguishes asset/configuration
 *  problems from shader compile/link errors. */
export class ResourceLoadError extends Error {
  readonly resourceSource: string;
  constructor(message: string, resourceSource: string) {
    super(message);
    this.name = "ResourceLoadError";
    this.resourceSource = resourceSource;
  }
}

/** GPU resources created from annotated shader vars. */
export interface BindResources {
  entries: GPUBindGroupEntry[];
  layoutEntries: GPUBindGroupLayoutEntry[];
  buffers: GPUBuffer[];
  textures: GPUTexture[];
}

export interface TextureBinding {
  texture: GPUTexture;
  /** Defaults to "float". */
  sampleType?: GPUTextureSampleType;
}

/** Acquires or generates a texture for a texture-kind resource.
 *  Throw to reject unsupported kinds (e.g. test_texture in play). */
export type TextureHandler = (
  device: GPUDevice,
  resource: DiscoveredResource,
) => Promise<TextureBinding>;

export interface CreateBindResourcesParams {
  device: GPUDevice;
  resources: DiscoveredResource[];
  /** First binding index; uniform typically occupies binding 0. */
  startBinding?: number;
  visibility: GPUShaderStageFlags;
  textureHandler: TextureHandler;
}

/** Create GPU resources for @buffer/@sampler/@texture vars. */
export async function createBindResources(
  p: CreateBindResourcesParams,
): Promise<BindResources> {
  const { device, resources, visibility, textureHandler, startBinding = 1 } = p;
  const entries: GPUBindGroupEntry[] = [];
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  const buffers: GPUBuffer[] = [];
  const textures: GPUTexture[] = [];

  for (const [i, resource] of resources.entries()) {
    const binding = startBinding + i;
    if (resource.kind === "buffer") {
      const made = bufferEntry(device, resource, binding, visibility);
      buffers.push(made.buffer);
      entries.push(made.entry);
      layoutEntries.push(made.layout);
    } else if (resource.kind === "sampler") {
      const made = samplerEntry(device, resource, binding, visibility);
      entries.push(made.entry);
      layoutEntries.push(made.layout);
    } else {
      const t = await textureHandler(device, resource);
      const made = textureEntry(binding, visibility, t);
      textures.push(t.texture);
      entries.push(made.entry);
      layoutEntries.push(made.layout);
    }
  }

  return { entries, layoutEntries, buffers, textures };
}

/** Allocate a storage buffer for an @buffer var. */
function bufferEntry(
  device: GPUDevice,
  r: DiscoveredBuffer,
  binding: number,
  visibility: GPUShaderStageFlags,
) {
  const { STORAGE, COPY_SRC, COPY_DST } = GPUBufferUsage;
  const buffer = device.createBuffer({
    label: `annotated-buffer-${r.varName}`,
    size: Math.max(r.byteSize, 4),
    usage: STORAGE | COPY_SRC | COPY_DST,
  });
  const entry = { binding, resource: { buffer } };
  const type = r.access === "read_write" ? "storage" : "read-only-storage";
  const layout: GPUBindGroupLayoutEntry = {
    binding,
    visibility,
    buffer: { type },
  };
  return { buffer, entry, layout };
}

/** Build a filtering sampler for an @sampler var. */
function samplerEntry(
  device: GPUDevice,
  r: DiscoveredSampler,
  binding: number,
  visibility: GPUShaderStageFlags,
) {
  const resource = createSampler(device, { filterMode: r.filter });
  const sampler = { type: "filtering" };
  return {
    entry: { binding, resource } as GPUBindGroupEntry,
    layout: { binding, visibility, sampler } as GPUBindGroupLayoutEntry,
  };
}

/** Wrap a TextureBinding into bind group + layout entries. */
function textureEntry(
  binding: number,
  visibility: GPUShaderStageFlags,
  t: TextureBinding,
) {
  const texture = { sampleType: t.sampleType ?? "float" };
  return {
    entry: { binding, resource: t.texture.createView() } as GPUBindGroupEntry,
    layout: { binding, visibility, texture } as GPUBindGroupLayoutEntry,
  };
}
