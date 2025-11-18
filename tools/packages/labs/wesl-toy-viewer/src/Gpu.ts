import type { WeslBundle } from "wesl";
import { link, requestWeslDevice } from "wesl";
import {
  createUniformsVirtualLib,
  fullscreenTriangleVertex,
  fullscreenVertexCount,
  updateRenderUniforms,
} from "wesl-gpu";
import type { InitWeslToyState, WeslToyState } from "./AppState.ts";

/** Setup WebGPU for canvas */
export async function initGpu(canvas: HTMLCanvasElement): Promise<{
  device: GPUDevice;
  context: GPUCanvasContext;
  presentationFormat: GPUTextureFormat;
}> {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await requestWeslDevice(adapter);

  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("WebGPU not supported");

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "opaque",
  });

  return { device, context, presentationFormat };
}

/** Compile WESL fragment shader source, create render pipeline. */
export async function toyRenderPipeline(
  state: InitWeslToyState,
  fragmentSource: string,
  bundles: WeslBundle[],
  packageName?: string,
): Promise<void> {
  const fullSource = `${fragmentSource}\n\n${fullscreenTriangleVertex}`;
  const linked = await link({
    weslSrc: { main: fullSource },
    rootModuleName: "main",
    packageName,
    libs: bundles,
    virtualLibs: createUniformsVirtualLib(),
  });

  const shaderModule = linked.createShaderModule(state.device);
  state.pipeline = state.device.createRenderPipeline({
    layout: "auto",
    vertex: { module: shaderModule, entryPoint: "vs_main" },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [{ format: state.presentationFormat }],
    },
    primitive: { topology: "triangle-strip" },
  });

  state.bindGroup = state.device.createBindGroup({
    layout: state.pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: state.uniformBuffer } }],
  });
}

/**
 * Start WebGPU render loop.
 *
 * Pipeline can be updated dynamically by recompiling - state updates in place while loop runs.
 */
export function startRenderLoop(state: WeslToyState): void {
  function render(): void {
    const time = calculateTime(state);
    const resolution: [number, number] = [
      state.canvas.width,
      state.canvas.height,
    ];
    const mouse: [number, number] = [0.0, 0.0];

    updateRenderUniforms(
      state.uniformBuffer,
      state.device,
      resolution,
      time,
      mouse,
    );
    renderFrame(state);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

function calculateTime(state: InitWeslToyState): number {
  const currentTime = state.isPlaying
    ? performance.now()
    : state.startTime + state.pausedDuration;
  return (currentTime - state.startTime) / 1000;
}

function renderFrame(state: WeslToyState): void {
  const encoder = state.device.createCommandEncoder();
  const textureView = state.context.getCurrentTexture().createView();

  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  pass.setPipeline(state.pipeline);
  pass.setBindGroup(0, state.bindGroup);
  pass.draw(fullscreenVertexCount);
  pass.end();

  state.device.queue.submit([encoder.finish()]);
}
