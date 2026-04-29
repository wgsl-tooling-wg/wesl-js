import type { WeslAST } from "wesl";
import {
  type AutoValues,
  clearBuffers,
  linkComputeShader,
  type PlayResources,
  runCompute,
  withErrorScopes,
  writeUniforms,
} from "wesl-gpu";
import {
  type DiscoveredResource,
  type VarReflection,
  varReflection,
} from "wesl-reflect";
import type { BuildResult, LinkOptions, RenderState } from "./Renderer.ts";
import {
  type BuildBranchParams,
  destroyPlayResources,
  disposeResources,
  mergeResourcePlugins,
} from "./RenderResources.ts";
import type { BufferEntry } from "./ResultsPanel.ts";

export interface BuildComputeParams extends BuildBranchParams {
  ast: WeslAST;
  entryPoint: string;
}

interface LinkComputeForParams {
  device: GPUDevice;
  shaderSource: string;
  resources: DiscoveredResource[];
  options?: LinkOptions;
}

/** Build the compute pipeline, dispatch once, and return initial readback. */
export async function buildCompute(
  p: BuildComputeParams,
): Promise<BuildResult> {
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

/** Re-dispatch the compute pipeline against the current uniform state and
 *  return fresh BufferEntry[] for the panel. */
export async function rerunCompute(state: RenderState): Promise<BufferEntry[]> {
  return dispatchComputeAndReadback(state);
}

/** Re-zero each readback buffer, dispatch, and read back. Used for both initial
 *  build and slider/refresh-driven re-runs in compute mode. */
async function dispatchComputeAndReadback(
  state: RenderState,
): Promise<BufferEntry[]> {
  const compute = state.compute;
  if (!compute) return [];
  // Auto fields (time/frame/delta_time) stay zero in compute mode by design.
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
  return [...readbacks].map(([varName, data]) => ({
    reflection: compute.reflections.get(varName)!,
    data,
  }));
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
