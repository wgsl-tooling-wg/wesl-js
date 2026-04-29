import type { AnnotatedLayout } from "wesl-reflect";
import type { WeslOptions } from "./FragmentParams.ts";
import { fullscreenTriangleVertex } from "./FullscreenVertex.ts";
import { linkWeslModule } from "./LinkWeslModule.ts";

export type LinkFragmentParams = WeslOptions & {
  device: GPUDevice;

  /** Fragment shader source (vertex shader is auto-provided) */
  fragmentSource: string;
};

export interface LinkResult {
  module: GPUShaderModule;
  layout: AnnotatedLayout | null;
}

export interface LinkAndCreateParams extends LinkFragmentParams {
  format: GPUTextureFormat;
  layout?: GPUPipelineLayout | "auto";
}

interface CreatePipelineParams {
  device: GPUDevice;
  module: GPUShaderModule;
  format: GPUTextureFormat;
  layout?: GPUPipelineLayout | "auto";
}

/** Combined: link WESL source and create pipeline in one step. */
export async function linkAndCreatePipeline(
  params: LinkAndCreateParams,
): Promise<GPURenderPipeline> {
  const { device, format, layout } = params;
  const { module } = await linkFragmentShader(params);
  return createFragmentPipeline({ device, module, format, layout });
}

/**
 * Link a WESL/WGSL fragment shader to a shader module.
 * Adds:
 * - vertex shader that covers the viewport with a fullscreen triangle
 * - a virtual module containing a std uniform buffer (for size, etc.)
 */
export async function linkFragmentShader(
  params: LinkFragmentParams,
): Promise<LinkResult> {
  const { fragmentSource } = params;
  return linkWeslModule({
    ...params,
    rootSource: `${fragmentSource}\n\n${fullscreenTriangleVertex}`,
    scanSource: fragmentSource,
  });
}

/** Create fullscreen fragment render pipeline from a shader module. */
function createFragmentPipeline(
  params: CreatePipelineParams,
): GPURenderPipeline {
  const { device, module, format, layout = "auto" } = params;

  return device.createRenderPipeline({
    layout,
    vertex: { module },
    fragment: { module, targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
}
