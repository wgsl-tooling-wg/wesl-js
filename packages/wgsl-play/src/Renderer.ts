import { parseSrcModule, requestWeslDevice } from "wesl";
import {
  createUniformBuffer,
  type ResolveUserTexture,
  type UniformBufferState,
  type WeslOptions,
} from "wesl-gpu";
import {
  type AnnotatedLayout,
  classifyEntryPoints,
  type DiscoveredResource,
  type EntryPoint,
  findAnnotatedResources,
  type VarReflection,
} from "wesl-reflect";
import { buildCompute } from "./ComputeBuild.ts";
import { buildFragment } from "./FragmentRender.ts";
import { prepareResources } from "./RenderResources.ts";
import type { BufferEntry } from "./ResultsPanel.ts";

/** Mutable mouse state, updated by pointer event listeners. */
export interface MouseState {
  pos: [number, number];
  delta: [number, number];
  /** 0=none, 1=left, 2=middle, 3=right */
  button: number;
}

export type RendererMode = "fragment" | "compute";

/** Compute-mode runtime state, retained for re-dispatch on slider/refresh. */
export interface ComputeState {
  pipelineLayout: GPUPipelineLayout;
  bindGroup: GPUBindGroup;
  module: GPUShaderModule;
  entryPoint: string;
  /** Storage buffers to read back, keyed by var name. */
  readBuffers: Map<string, GPUBuffer>;
  /** Buffer type info, keyed by var name. */
  reflections: Map<string, VarReflection>;
}

/** WebGPU state retained across frames. */
export interface RenderState {
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  presentationFormat: GPUTextureFormat;
  uniformState: UniformBufferState;
  bindGroup: GPUBindGroup;
  mouse: MouseState;
  pipeline?: GPURenderPipeline;
  frameCount: number;
  /** Textures owned by the last successful compile, disposed on next compile. */
  resourceTextures: GPUTexture[];
  /** Storage buffers owned by the last successful compile, disposed on next compile. */
  resourceBuffers: GPUBuffer[];
  /** Compute-mode runtime info, present iff mode === "compute". */
  compute?: ComputeState;
}

/** Options for linking shaders (re-exported from wesl-gpu). */
export type LinkOptions = WeslOptions;

/** Result of a successful build, returned to the WgslPlay element. */
export interface BuildResult {
  layout: AnnotatedLayout | null;
  mode: RendererMode;
  /** Present iff mode === "compute"; initial readback after dispatch. */
  computeReadback?: BufferEntry[];
}

/** Initialize WebGPU for a canvas element. */
export async function initWebGPU(
  canvas: HTMLCanvasElement,
  alphaMode: GPUCanvasAlphaMode = "opaque",
): Promise<RenderState> {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("WebGPU adapter not available");

  const device = await requestWeslDevice(adapter);
  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("WebGPU context not available");

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format: presentationFormat, alphaMode });

  const uniformState = createUniformBuffer(device, null);
  const layout = uniformOnlyLayout(device);
  const bindGroup = createUniformBindGroup(device, layout, uniformState);
  const mouse: MouseState = { pos: [0, 0], delta: [0, 0], button: 0 };

  return {
    device,
    canvas,
    context,
    presentationFormat,
    uniformState,
    bindGroup,
    mouse,
    pipeline: undefined,
    frameCount: 0,
    resourceTextures: [],
    resourceBuffers: [],
  };
}

/** Compile a WESL shader and configure pipelines + bindings.
 *  Auto-detects fragment vs compute mode based on entry-point attributes. */
export async function createPipeline(
  state: RenderState,
  shaderSource: string,
  resolveTexture: ResolveUserTexture,
  options?: LinkOptions,
): Promise<BuildResult> {
  const pkg = options?.packageName ?? "package";
  const root = options?.rootModuleName ?? "main";
  const ast = parseSrcModule({
    modulePath: `${pkg}::${root}`,
    debugFilePath: `./${root}.wesl`,
    src: shaderSource,
  });
  const resources = findAnnotatedResources(ast);
  const entryPoints = classifyEntryPoints(ast);
  const mode = detectMode(entryPoints);
  if (mode === "compute") rejectComputeUnsupported(resources);

  const setup = await prepareResources({
    state,
    shaderSource,
    pkg,
    root,
    resources,
    resolveTexture,
  });

  const branch = { state, resources, shaderSource, options, ...setup };
  if (mode === "compute") {
    return buildCompute({ ...branch, ast, entryPoint: entryPoints[0].fnName });
  }
  return buildFragment(branch);
}

function uniformOnlyLayout(device: GPUDevice): GPUBindGroupLayout {
  const visibility = GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT;
  return device.createBindGroupLayout({
    entries: [{ binding: 0, visibility, buffer: {} }],
  });
}

function createUniformBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  uniformState: UniformBufferState,
): GPUBindGroup {
  return device.createBindGroup({
    layout,
    entries: [{ binding: 0, resource: { buffer: uniformState.buffer } }],
  });
}

/** Pick fragment vs compute mode from entry points; throws on mixed/multi-compute. */
function detectMode(entryPoints: EntryPoint[]): RendererMode {
  const compute = entryPoints.filter(e => e.stage === "compute");
  const fragment = entryPoints.filter(e => e.stage === "fragment");
  if (compute.length > 0 && fragment.length > 0) {
    throw new Error(
      "mixed compute and fragment entry points are not supported (use either, not both)",
    );
  }
  if (compute.length > 1) {
    throw new Error(
      `compute mode requires exactly one @compute entry point; found ${compute.length}`,
    );
  }
  return compute.length === 1 ? "compute" : "fragment";
}

/** @sampler/@texture in compute mode are not yet implemented; throw early. */
function rejectComputeUnsupported(resources: DiscoveredResource[]): void {
  for (const r of resources) {
    if (r.kind === "texture" || r.kind === "test_texture") {
      throw new Error("@texture in compute mode is not yet supported");
    }
    if (r.kind === "sampler") {
      throw new Error("@sampler in compute mode is not yet supported");
    }
  }
}
