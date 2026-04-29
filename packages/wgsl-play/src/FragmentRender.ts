import {
  type AutoValues,
  linkAndCreatePipeline,
  renderFrame,
  withErrorScopes,
  writeUniforms,
} from "wesl-gpu";
import type { DiscoveredResource } from "wesl-reflect";
import type { BuildResult, LinkOptions, RenderState } from "./Renderer.ts";
import {
  type BuildBranchParams,
  destroyPlayResources,
  disposeResources,
  mergeResourcePlugins,
} from "./RenderResources.ts";

/** Animation playback state. */
export interface PlaybackState {
  isPlaying: boolean;
  startTime: number;
  pausedDuration: number;
}

interface BuildRenderPipelineParams {
  device: GPUDevice;
  fragmentSource: string;
  presentationFormat: GPUTextureFormat;
  pipelineLayout: GPUPipelineLayout;
  resources: DiscoveredResource[];
  options?: LinkOptions;
}

/** Build the render pipeline and install it on state. */
export async function buildFragment(
  p: BuildBranchParams,
): Promise<BuildResult> {
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

/** Write uniforms, render to the current swap-chain texture, and tick frameCount. */
function submitFrame(state: RenderState, auto: AutoValues): void {
  const { device, context, bindGroup } = state;
  writeUniforms(device, state.uniformState, auto);
  const targetView = context.getCurrentTexture().createView();
  renderFrame({ device, pipeline: state.pipeline!, bindGroup, targetView });
  state.frameCount++;
}
