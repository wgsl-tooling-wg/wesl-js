import {
  createPlayResources,
  createUniformBuffer,
  type PlayResources,
  type ResolveUserTexture,
  scanUniforms,
  type UniformBufferState,
} from "wesl-gpu";
import {
  type AnnotatedLayout,
  annotatedResourcesPlugin,
  type DiscoveredResource,
} from "wesl-reflect";
import type { LinkOptions, RenderState } from "./Renderer.ts";

export interface PrepareResourcesParams {
  state: RenderState;
  shaderSource: string;
  pkg: string;
  root: string;
  resources: DiscoveredResource[];
  resolveTexture: ResolveUserTexture;
}

export interface ResourceSetup {
  playResources: PlayResources;
  pipelineLayout: GPUPipelineLayout;
  bindGroup: GPUBindGroup;
  layout: AnnotatedLayout | null;
}

/** Common params shared by both fragment and compute build paths. */
export interface BuildBranchParams {
  state: RenderState;
  resources: DiscoveredResource[];
  shaderSource: string;
  pipelineLayout: GPUPipelineLayout;
  bindGroup: GPUBindGroup;
  playResources: PlayResources;
  layout: AnnotatedLayout | null;
  options?: LinkOptions;
}

/** Default allocation size (bytes) for runtime-sized `@buffer` arrays. The
 *  WGSL gives no element count, so the playground picks one. 1024 bytes covers
 *  256 f32s or 64 vec4f, enough for casual playground use. */
const defaultRuntimeArrayBytes = 1024;

/** Allocate user-declared resources, rebuild the uniform buffer to match the
 *  shader's uniform layout, and assemble the pipeline layout + bind group. */
export async function prepareResources(
  p: PrepareResourcesParams,
): Promise<ResourceSetup> {
  const { state, resources, resolveTexture } = p;
  const { device } = state;
  const scan = scanUniforms(p.shaderSource, `${p.pkg}::${p.root}`);
  const playResources = await createPlayResources({
    device,
    resources,
    startBinding: 1,
    resolveTexture,
    minBufferBytes: defaultRuntimeArrayBytes,
  });
  state.uniformState.buffer.destroy();
  state.uniformState = createUniformBuffer(device, scan.layout);
  const bindGroupLayout = buildBindGroupLayout(device, playResources);
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });
  const bindGroup = buildBindGroup(
    device,
    bindGroupLayout,
    state.uniformState,
    playResources,
  );
  return { playResources, pipelineLayout, bindGroup, layout: scan.layout };
}

/** Destroy all textures and buffers owned by a PlayResources bundle. */
export function destroyPlayResources(r: PlayResources): void {
  for (const t of r.textures) t.destroy();
  for (const b of r.buffers) b.destroy();
}

/** Dispose GPU resources owned by the current compile (textures + storage buffers). */
export function disposeResources(state: RenderState): void {
  for (const t of state.resourceTextures) t.destroy();
  for (const b of state.resourceBuffers) b.destroy();
  state.resourceTextures = [];
  state.resourceBuffers = [];
}

/** Add the @buffer/@texture/@sampler plugin to the user-supplied config. */
export function mergeResourcePlugins(
  userConfig: LinkOptions["config"],
  resources: DiscoveredResource[],
): LinkOptions["config"] {
  if (resources.length === 0) return userConfig;
  const plugins = [
    ...(userConfig?.plugins ?? []),
    annotatedResourcesPlugin(resources, 1),
  ];
  return { ...userConfig, plugins };
}

function buildBindGroupLayout(
  device: GPUDevice,
  resources: PlayResources,
): GPUBindGroupLayout {
  const visibility = GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT;
  return device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility, buffer: {} },
      ...resources.layoutEntries,
    ],
  });
}

function buildBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  uniformState: UniformBufferState,
  resources: PlayResources,
): GPUBindGroup {
  return device.createBindGroup({
    layout,
    entries: [
      { binding: 0, resource: { buffer: uniformState.buffer } },
      ...resources.entries,
    ],
  });
}
