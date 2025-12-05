import type { LinkParams, ModuleResolver, WeslBundle } from "wesl";
import { CompositeResolver, link, RecordResolver } from "wesl";
import { fullscreenTriangleVertex } from "./FullscreenVertex.ts";
import { createUniformsVirtualLib } from "./RenderUniforms.ts";

export interface LinkFragmentParams {
  device: GPUDevice;

  /** Fragment shader source (vertex shader is auto-provided) */
  fragmentSource: string;

  /** WESL library bundles for dependencies */
  bundles?: WeslBundle[];

  /** Resolver for lazy file loading (e.g., useSourceShaders mode in tests) */
  resolver?: ModuleResolver;

  /** Conditional compilation flags */
  conditions?: Record<string, boolean>;

  /** Compile-time constants */
  constants?: Record<string, string | number>;

  /** Package name (allows imports to mention the current package by name instead of package::) */
  packageName?: string;
}

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
  const { device, fragmentSource, bundles = [], resolver } = params;
  const { conditions, constants, packageName } = params;

  const fullSource = `${fragmentSource}\n\n${fullscreenTriangleVertex}`;

  // Use provided resolver or fall back to simple weslSrc
  let sourceParams: Pick<LinkParams, "resolver" | "weslSrc">;
  if (resolver) {
    const srcResolver = new RecordResolver(
      { main: fullSource },
      { packageName },
    );
    sourceParams = { resolver: new CompositeResolver([srcResolver, resolver]) };
  } else {
    sourceParams = { weslSrc: { main: fullSource } };
  }

  const linked = await link({
    ...sourceParams,
    rootModuleName: "main",
    packageName,
    libs: bundles,
    virtualLibs: createUniformsVirtualLib(),
    conditions,
    constants,
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
