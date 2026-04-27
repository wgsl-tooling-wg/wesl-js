import { parseSrcModule, requestWeslDevice } from "wesl";
import {
  type AutoValues,
  createPlayResources,
  createUniformBuffer,
  linkAndCreatePipeline,
  type PlayResources,
  type ResolveUserTexture,
  renderFrame,
  scanUniforms,
  type UniformBufferState,
  type WeslOptions,
  writeUniforms,
} from "wesl-gpu";
import {
  type AnnotatedLayout,
  annotatedResourcesPlugin,
  findAnnotatedResources,
} from "wesl-reflect";

/** Mutable mouse state, updated by pointer event listeners. */
export interface MouseState {
  pos: [number, number];
  delta: [number, number];
  button: number; // 0=none, 1=left, 2=middle, 3=right
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
}

/** Animation state */
export interface PlaybackState {
  isPlaying: boolean;
  startTime: number;
  pausedDuration: number;
}

/** Options for linking shaders - re-exports wesl-gpu's WeslOptions */
export type LinkOptions = WeslOptions;

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
  const bindGroupLayout = uniformOnlyLayout(device);
  const bindGroup = createUniformBindGroup(
    device,
    bindGroupLayout,
    uniformState,
  );
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

/** Compile WESL fragment shader and create render pipeline.
 *  Recreates uniform buffer, discovers annotated resources, builds a dynamic
 *  bind group layout, and disposes prior resources. */
export async function createPipeline(
  state: RenderState,
  fragmentSource: string,
  resolveTexture: ResolveUserTexture,
  options?: LinkOptions,
): Promise<AnnotatedLayout | null> {
  const pkg = options?.packageName ?? "package";
  const root = options?.rootModuleName ?? "main";
  const scan = scanUniforms(fragmentSource, `${pkg}::${root}`);
  const resources = findAnnotatedResources(
    parseSrcModule({
      modulePath: `${pkg}::${root}`,
      debugFilePath: `./${root}.wesl`,
      src: fragmentSource,
    }),
  );

  const { device, presentationFormat } = state;
  const playResources = await createPlayResources({
    device,
    resources,
    startBinding: 1,
    visibility: GPUShaderStage.FRAGMENT,
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

  const newPipeline = await buildPipeline({
    device,
    fragmentSource,
    presentationFormat,
    pipelineLayout,
    resources,
    options,
  }).catch(err => {
    destroyPlayResources(playResources);
    state.pipeline = undefined;
    throw err;
  });

  disposeResources(state);
  state.pipeline = newPipeline;
  state.bindGroup = bindGroup;
  state.resourceTextures = playResources.textures;
  state.resourceBuffers = playResources.buffers;
  return scan.layout;
}

interface BuildPipelineParams {
  device: GPUDevice;
  fragmentSource: string;
  presentationFormat: GPUTextureFormat;
  pipelineLayout: GPUPipelineLayout;
  resources: ReturnType<typeof findAnnotatedResources>;
  options?: LinkOptions;
}

/** Link the shader and create the render pipeline, surfacing both JS and GPU
 *  validation errors as a thrown rejection. */
async function buildPipeline(
  p: BuildPipelineParams,
): Promise<GPURenderPipeline> {
  const plugins =
    p.resources.length > 0
      ? [annotatedResourcesPlugin(p.resources, 1)]
      : undefined;
  const userConfig = p.options?.config;
  const config = plugins
    ? { ...userConfig, plugins: [...(userConfig?.plugins ?? []), ...plugins] }
    : userConfig;

  p.device.pushErrorScope("validation");
  let pipeline: GPURenderPipeline | undefined;
  let jsError: unknown;
  try {
    pipeline = await linkAndCreatePipeline({
      device: p.device,
      fragmentSource: p.fragmentSource,
      format: p.presentationFormat,
      layout: p.pipelineLayout,
      ...p.options,
      config,
    });
  } catch (e) {
    jsError = e;
  }
  const gpuError = await p.device.popErrorScope();
  if (jsError || gpuError || !pipeline) throw jsError ?? gpuError;
  return pipeline;
}

function destroyPlayResources(r: PlayResources): void {
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

/** Render a single frame (used when paused). */
export function renderOnce(state: RenderState, playback: PlaybackState): void {
  if (!state.pipeline) return;
  doRender(state, playback);
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

    const { mouse, device, canvas, context, bindGroup } = state;
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

    writeUniforms(device, state.uniformState, auto);
    const targetView = context.getCurrentTexture().createView();
    renderFrame({ device, pipeline: state.pipeline!, bindGroup, targetView });
    state.frameCount++;
    animationId = requestAnimationFrame(render);
  }

  animationId = requestAnimationFrame(render);
  return () => cancelAnimationFrame(animationId);
}

/** Update uniforms and submit one GPU frame (one-shot, e.g. when paused). */
function doRender(state: RenderState, playback: PlaybackState): void {
  const time = calculateTime(playback);
  const { mouse, device, canvas, context, bindGroup } = state;
  const auto: AutoValues = {
    resolution: [canvas.width, canvas.height],
    time,
    delta_time: 0,
    frame: state.frameCount,
    mouse_pos: mouse.pos,
    mouse_delta: [0, 0],
    mouse_button: mouse.button,
  };
  writeUniforms(device, state.uniformState, auto);
  const targetView = context.getCurrentTexture().createView();
  renderFrame({ device, pipeline: state.pipeline!, bindGroup, targetView });
  state.frameCount++;
}

export function calculateTime(playback: PlaybackState): number {
  const currentTime = playback.isPlaying
    ? performance.now()
    : playback.startTime + playback.pausedDuration;
  return (currentTime - playback.startTime) / 1000;
}

function uniformOnlyLayout(device: GPUDevice): GPUBindGroupLayout {
  return device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: {} }],
  });
}

function buildBindGroupLayout(
  device: GPUDevice,
  resources: PlayResources,
): GPUBindGroupLayout {
  return device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: {} },
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
