import {
  checkerboardTexture,
  colorBarsTexture,
  createBindResources,
  edgePatternTexture,
  gradientTexture,
  noiseTexture,
  radialGradientTexture,
  solidTexture,
  type TextureBinding,
} from "wesl-gpu";
import type { DiscoveredResource } from "wesl-reflect";
import { lemurTexture } from "./ExampleImages.ts";

/** GPU resources created for annotated test vars. */
export interface TestResources {
  /** Bind group entries for annotated resources (binding 1, 2, ...). */
  entries: GPUBindGroupEntry[];
  /** Layout entries for annotated resources. */
  layoutEntries: GPUBindGroupLayoutEntry[];
  /** Read-write storage buffers to re-zero between tests. */
  buffers: GPUBuffer[];
}

export interface CreateTestResourcesOptions {
  /** f32 sentinel to pre-fill storage buffers, so unwritten slots are visible in failing tests. */
  prefill?: number;
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

/** Create GPU resources from discovered annotated vars for testing. */
export async function createTestResources(
  device: GPUDevice,
  resources: DiscoveredResource[],
  startBinding = 1,
  opts: CreateTestResourcesOptions = {},
): Promise<TestResources> {
  const out = await createBindResources({
    device,
    resources,
    startBinding,
    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
    textureHandler: testTextureHandler,
    prefill: opts.prefill,
  });
  const buffers = collectReadWriteBuffers(resources, out.buffers);
  return { entries: out.entries, layoutEntries: out.layoutEntries, buffers };
}

/** Generate a test texture from the named source. */
async function testTextureHandler(
  device: GPUDevice,
  r: DiscoveredResource,
): Promise<TextureBinding> {
  if (r.kind === "texture") {
    throw new Error(
      `@texture(${r.source}) requires a host-provided image and is not supported in wgsl-test — use @test_texture(...) instead (var '${r.varName}')`,
    );
  }
  if (r.kind !== "test_texture") {
    throw new Error(`unexpected resource kind for test: ${r.kind}`);
  }
  const gen = textureGenerators[r.source];
  if (!gen) throw new Error(`Unknown test texture source: ${r.source}`);
  return { texture: await gen(device, r.params) };
}

/** Filter to only read_write buffers (for rezeroing between tests). */
function collectReadWriteBuffers(
  resources: DiscoveredResource[],
  allBuffers: GPUBuffer[],
): GPUBuffer[] {
  return resources
    .filter(r => r.kind === "buffer")
    .flatMap((r, i) => (r.access === "read_write" ? [allBuffers[i]] : []));
}
