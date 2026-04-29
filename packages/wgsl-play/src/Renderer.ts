import { parseSrcModule, requestWeslDevice, type WeslAST } from "wesl";
import {
  type AutoValues,
  clearBuffers,
  createPlayResources,
  createUniformBuffer,
  linkAndCreatePipeline,
  linkComputeShader,
  type PlayResources,
  type ResolveUserTexture,
  renderFrame,
  runCompute,
  scanUniforms,
  type UniformBufferState,
  type WeslOptions,
  withErrorScopes,
  writeUniforms,
} from "wesl-gpu";
import {
  type AnnotatedLayout,
  annotatedResourcesPlugin,
  classifyEntryPoints,
  type DiscoveredResource,
  type EntryPoint,
  findAnnotatedResources,
  type VarReflection,
  varReflection,
} from "wesl-reflect";
import type { BufferEntry } from "./ResultsPanel.ts";

/** Mutable mouse state, updated by pointer event listeners. */
export interface MouseState {
  pos: [number, number];
  delta: [number, number];
  button: number; // 0=none, 1=left, 2=middle, 3=right
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

/** WebGPU state */
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

/** Animation state */
export interface PlaybackState {
  isPlaying: boolean;
  startTime: number;
  pausedDuration: number;
}

/** Options for linking shaders - re-exports wesl-gpu's WeslOptions */
export type LinkOptions = WeslOptions;

/** Result of a successful build, returned to the WgslPlay element. */
export interface BuildResult {
  layout: AnnotatedLayout | null;
  mode: RendererMode;
  /** Present iff mode === "compute"; initial readback after dispatch. */
  computeReadback?: BufferEntry[];
}

interface PrepareResourcesParams {
  state: RenderState;
  shaderSource: string;
  pkg: string;
  root: string;
  resources: DiscoveredResource[];
  resolveTexture: ResolveUserTexture;
}

interface ResourceSetup {
  playResources: PlayResources;
  pipelineLayout: GPUPipelineLayout;
  bindGroup: GPUBindGroup;
  layout: AnnotatedLayout | null;
}

interface BuildBranchParams {
  state: RenderState;
  resources: DiscoveredResource[];
  shaderSource: string;
  pipelineLayout: GPUPipelineLayout;
  bindGroup: GPUBindGroup;
  playResources: PlayResources;
  layout: AnnotatedLayout | null;
  options?: LinkOptions;
}

interface BuildComputeParams extends BuildBranchParams {
  ast: WeslAST;
  entryPoint: string;
}

interface LinkComputeForParams {
  device: GPUDevice;
  shaderSource: string;
  resources: DiscoveredResource[];
  options?: LinkOptions;
}

interface BuildRenderPipelineParams {
  device: GPUDevice;
  fragmentSource: string;
  presentationFormat: GPUTextureFormat;
  pipelineLayout: GPUPipelineLayout;
  resources: DiscoveredResource[];
  options?: LinkOptions;
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

  const branch: BuildBranchParams = {
    state,
    resources,
    shaderSource,
    options,
    ...setup,
  };
  if (mode === "compute") {
    return buildCompute({ ...branch, ast, entryPoint: entryPoints[0].fnName });
  }
  return buildFragment(branch);
}

/** Public re-run entry point: re-dispatches the compute pipeline against the
 *  current uniform state and returns fresh BufferEntry[] for the panel. */
export async function rerunCompute(state: RenderState): Promise<BufferEntry[]> {
  return dispatchComputeAndReadback(state);
}

/** Dispose GPU resources owned by the current compile (textures + storage buffers). */
export function disposeResources(state: RenderState): void {
  for (const t of state.resourceTextures) t.destroy();
  for (const b of state.resourceBuffers) b.destroy();
  state.resourceTextures = [];
  state.resourceBuffers = [];
}

/** Render a single frame (used when paused). */
export function renderOnce(state: RenderState, playback: PlaybackState): void {
  if (!state.pipeline) return;
  const time = calculateTime(playback);
  const { mouse, canvas } = state;
  submitFrame(state, {
    resolution: [canvas.width, canvas.height],
    time,
    delta_time: 0,
    frame: state.frameCount,
    mouse_pos: mouse.pos,
    mouse_delta: [0, 0],
    mouse_button: mouse.button,
  });
}

/** Start the render loop. Returns a stop function. */
export function startRenderLoop(
  state: RenderState,
  playback: PlaybackState,
): () => void {
  let animationId: number;
  let lastTime = 0;

  function render(): void {
    if (!state.pipeline) {
      animationId = requestAnimationFrame(render);
      return;
    }

    const time = calculateTime(playback);
    const delta_time = time - lastTime;
    lastTime = time;

    const { mouse, canvas } = state;
    const auto: AutoValues = {
      resolution: [canvas.width, canvas.height],
      time,
      delta_time,
      frame: state.frameCount,
      mouse_pos: mouse.pos,
      mouse_delta: mouse.delta,
      mouse_button: mouse.button,
    };
    // Reset per-frame deltas after reading
    mouse.delta = [0, 0];

    submitFrame(state, auto);
    animationId = requestAnimationFrame(render);
  }

  animationId = requestAnimationFrame(render);
  return () => cancelAnimationFrame(animationId);
}

/** Seconds elapsed since playback start, frozen while paused. */
export function calculateTime(playback: PlaybackState): number {
  const currentTime = playback.isPlaying
    ? performance.now()
    : playback.startTime + playback.pausedDuration;
  return (currentTime - playback.startTime) / 1000;
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

async function prepareResources(
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

async function buildCompute(p: BuildComputeParams): Promise<BuildResult> {
  const { state, resources, playResources, ast, shaderSource } = p;
  const { device } = state;
  const compute = await linkComputeFor({
    device,
    shaderSource,
    resources,
    options: p.options,
  }).catch(err => {
    destroyPlayResources(playResources);
    throw err;
  });

  const readBuffers = mapBuffersByName(resources, playResources);
  const reflections = mapBufferReflections(ast, resources);

  disposeResources(state);
  state.pipeline = undefined;
  state.bindGroup = p.bindGroup;
  state.resourceTextures = playResources.textures;
  state.resourceBuffers = playResources.buffers;
  state.compute = {
    pipelineLayout: p.pipelineLayout,
    bindGroup: p.bindGroup,
    module: compute.module,
    entryPoint: p.entryPoint,
    readBuffers,
    reflections,
  };

  const computeReadback = await dispatchComputeAndReadback(state);
  return { layout: p.layout, mode: "compute", computeReadback };
}

async function buildFragment(p: BuildBranchParams): Promise<BuildResult> {
  const newPipeline = await buildRenderPipeline({
    device: p.state.device,
    fragmentSource: p.shaderSource,
    presentationFormat: p.state.presentationFormat,
    pipelineLayout: p.pipelineLayout,
    resources: p.resources,
    options: p.options,
  }).catch(err => {
    destroyPlayResources(p.playResources);
    p.state.pipeline = undefined;
    throw err;
  });

  disposeResources(p.state);
  p.state.pipeline = newPipeline;
  p.state.bindGroup = p.bindGroup;
  p.state.compute = undefined;
  p.state.resourceTextures = p.playResources.textures;
  p.state.resourceBuffers = p.playResources.buffers;
  return { layout: p.layout, mode: "fragment" };
}

/** Re-zero each readback buffer, dispatch, and read back. Used for both initial
 *  build and slider/refresh-driven re-runs in compute mode. */
async function dispatchComputeAndReadback(
  state: RenderState,
): Promise<BufferEntry[]> {
  const compute = state.compute;
  if (!compute) return [];
  // Write uniform initial/control values before dispatch. Auto fields
  // (time/frame/delta_time) stay zero in compute mode by design.
  writeUniforms(state.device, state.uniformState, computeAutoValues(state));
  clearBuffers(state.device, compute.readBuffers.values());
  const { readbacks } = await runCompute({
    device: state.device,
    module: compute.module,
    entryPoint: compute.entryPoint,
    bindGroup: compute.bindGroup,
    pipelineLayout: compute.pipelineLayout,
    readBuffers: compute.readBuffers,
  });
  return Array.from(readbacks).map(([varName, data]) => ({
    reflection: compute.reflections.get(varName)!,
    data,
  }));
}

/** Write uniforms, render to the current swap-chain texture, and tick frameCount. */
function submitFrame(state: RenderState, auto: AutoValues): void {
  const { device, context, bindGroup } = state;
  writeUniforms(device, state.uniformState, auto);
  const targetView = context.getCurrentTexture().createView();
  renderFrame({ device, pipeline: state.pipeline!, bindGroup, targetView });
  state.frameCount++;
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

async function linkComputeFor(
  p: LinkComputeForParams,
): Promise<{ module: GPUShaderModule }> {
  const config = mergeResourcePlugins(p.options?.config, p.resources);
  return withErrorScopes(p.device, () =>
    linkComputeShader({
      device: p.device,
      computeSource: p.shaderSource,
      ...p.options,
      config,
    }),
  );
}

/** Destroy all textures and buffers owned by a PlayResources bundle. */
function destroyPlayResources(r: PlayResources): void {
  for (const t of r.textures) t.destroy();
  for (const b of r.buffers) b.destroy();
}

/** Map @buffer var name to its allocated GPU buffer (positional alignment). */
function mapBuffersByName(
  resources: DiscoveredResource[],
  playResources: PlayResources,
): Map<string, GPUBuffer> {
  const bufferVars = resources.filter(r => r.kind === "buffer");
  return new Map(
    bufferVars.map((r, i) => [r.varName, playResources.buffers[i]]),
  );
}

/** Map @buffer var name to its VarReflection (type tree, address space, etc.). */
function mapBufferReflections(
  ast: WeslAST,
  resources: DiscoveredResource[],
): Map<string, VarReflection> {
  return new Map(
    resources
      .filter(r => r.kind === "buffer")
      .map(r => [r.varName, varReflection(ast, r.varName)]),
  );
}

/** Link the shader and create the render pipeline, surfacing both JS and GPU
 *  validation errors as a thrown rejection. */
async function buildRenderPipeline(
  p: BuildRenderPipelineParams,
): Promise<GPURenderPipeline> {
  const config = mergeResourcePlugins(p.options?.config, p.resources);
  return withErrorScopes(p.device, () =>
    linkAndCreatePipeline({
      device: p.device,
      fragmentSource: p.fragmentSource,
      format: p.presentationFormat,
      layout: p.pipelineLayout,
      ...p.options,
      config,
    }),
  );
}

function computeAutoValues(state: RenderState): AutoValues {
  return {
    resolution: [state.canvas.width, state.canvas.height],
    time: 0,
    delta_time: 0,
    frame: 0,
    mouse_pos: [0, 0],
    mouse_delta: [0, 0],
    mouse_button: 0,
  };
}

/** Add the @buffer/@texture/@sampler plugin to the user-supplied config. */
function mergeResourcePlugins(
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
