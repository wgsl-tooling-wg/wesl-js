import { CompositeResolver, link, RecordResolver } from "wesl";
import type { WeslOptions } from "./FragmentParams.ts";
import { fullscreenTriangleVertex } from "./FullscreenVertex.ts";
import { createUniformsVirtualLib } from "./RenderUniforms.ts";

export type LinkFragmentParams = WeslOptions & {
  device: GPUDevice;

  /** Fragment shader source (vertex shader is auto-provided) */
  fragmentSource: string;
};

export interface LinkAndCreateParams extends LinkFragmentParams {
  format: GPUTextureFormat;
  layout?: GPUPipelineLayout | "auto";
}

/** Combined: link WESL source and create pipeline in one step. */
export async function linkAndCreatePipeline(
  params: LinkAndCreateParams,
): Promise<GPURenderPipeline> {
  const module = await linkFragmentShader(params);
  return createFragmentPipeline({
    device: params.device,
    module,
    format: params.format,
    layout: params.layout,
  });
}

/**
 * Link a WESL/WGSL fragment shader to a shader module.
 * Adds:
 * - vertex shader that covers the viewport with a fullscreen triangle
 * - a virtual module containing a std uniform buffer (for size, etc.)
 */
export async function linkFragmentShader(
  params: LinkFragmentParams,
): Promise<GPUShaderModule> {
  const { fragmentSource, conditions, constants, packageName, config } = params;
  const { device, resolver, libs = [], rootModuleName = "main" } = params;
  const { weslSrc, virtualLibs } = params;

  const fullSource = `${fragmentSource}\n\n${fullscreenTriangleVertex}`;

  // Build resolver chain: fragmentSource first, then weslSrc, then provided resolver
  const resolvers: RecordResolver[] = [];
  resolvers.push(
    new RecordResolver({ [rootModuleName]: fullSource }, { packageName }),
  );
  if (weslSrc) resolvers.push(new RecordResolver(weslSrc, { packageName }));

  let finalResolver =
    resolvers.length === 1 ? resolvers[0] : new CompositeResolver(resolvers);
  if (resolver)
    finalResolver = new CompositeResolver([finalResolver, resolver]);

  // Merge user virtualLibs with default uniforms lib
  const mergedVirtualLibs = { ...createUniformsVirtualLib(), ...virtualLibs };

  const linked = await link({
    resolver: finalResolver,
    rootModuleName,
    packageName,
    libs,
    virtualLibs: mergedVirtualLibs,
    conditions,
    constants,
    config,
  });

  return linked.createShaderModule(device);
}

interface CreatePipelineParams {
  device: GPUDevice;
  module: GPUShaderModule;
  format: GPUTextureFormat;
  layout?: GPUPipelineLayout | "auto";
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
