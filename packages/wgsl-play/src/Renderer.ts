import { requestWeslDevice } from "wesl";
import {
  type AutoValues,
  createUniformBuffer,
  linkAndCreatePipeline,
  renderFrame,
  scanUniforms,
  type UniformBufferState,
  type WeslOptions,
  writeUniforms,
} from "wesl-gpu";
import type { AnnotatedLayout } from "wesl-reflect";

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
  bindGroupLayout: GPUBindGroupLayout;
  pipelineLayout: GPUPipelineLayout;
  uniformState: UniformBufferState;
  bindGroup: GPUBindGroup;
  mouse: MouseState;
  pipeline?: GPURenderPipeline;
  frameCount: number;
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

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: {} }],
  });
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  // Initial buffer with default layout (will be recreated per-compile)
  const uniformState = createUniformBuffer(device, null);
  const bindGroup = createBindGroup(device, bindGroupLayout, uniformState);
  const mouse: MouseState = { pos: [0, 0], delta: [0, 0], button: 0 };

  return {
    device,
    canvas,
    context,
    presentationFormat,
    bindGroupLayout,
    pipelineLayout,
    uniformState,
    bindGroup,
    mouse,
    pipeline: undefined,
    frameCount: 0,
  };
}

/** Compile WESL fragment shader and create render pipeline.
 *  Recreates the uniform buffer and bind group based on @uniforms metadata. */
export async function createPipeline(
  state: RenderState,
  fragmentSource: string,
  options?: LinkOptions,
): Promise<AnnotatedLayout | null> {
  const pkg = options?.packageName ?? "package";
  const root = options?.rootModuleName ?? "main";
  const scan = scanUniforms(fragmentSource, `${pkg}::${root}`);

  const { device, bindGroupLayout, presentationFormat, pipelineLayout } = state;
  state.uniformState.buffer.destroy();
  state.uniformState = createUniformBuffer(device, scan.layout);
  state.bindGroup = createBindGroup(
    device,
    bindGroupLayout,
    state.uniformState,
  );

  device.pushErrorScope("validation");
  let gpuError: unknown;
  let jsError: unknown;
  try {
    state.pipeline = await linkAndCreatePipeline({
      device,
      fragmentSource,
      format: presentationFormat,
      layout: pipelineLayout,
      ...options,
    });
  } catch (e) {
    jsError = e;
  } finally {
    gpuError = await device.popErrorScope();
  }
  if (jsError || gpuError) {
    state.pipeline = undefined;
    throw jsError ?? gpuError;
  }

  return scan.layout;
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

export function calculateTime(playback: PlaybackState): number {
  const currentTime = playback.isPlaying
    ? performance.now()
    : playback.startTime + playback.pausedDuration;
  return (currentTime - playback.startTime) / 1000;
}

function createBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  uniformState: UniformBufferState,
): GPUBindGroup {
  return device.createBindGroup({
    layout,
    entries: [{ binding: 0, resource: { buffer: uniformState.buffer } }],
  });
}
