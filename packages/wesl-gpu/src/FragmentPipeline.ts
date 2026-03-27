import { CompositeResolver, link, RecordResolver } from "wesl";
import type { AnnotatedLayout } from "wesl-reflect";
import type { WeslOptions } from "./FragmentParams.ts";
import { fullscreenTriangleVertex } from "./FullscreenVertex.ts";
import { scanUniforms } from "./UniformsVirtualLib.ts";

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
  const { fragmentSource, conditions, constants, packageName, config } = params;
  const { device, resolver, libs = [], rootModuleName = "main" } = params;
  const { weslSrc, virtualLibs } = params;

  const fullSource = `${fragmentSource}\n\n${fullscreenTriangleVertex}`;

  // Build resolver chain: fragmentSource first, then weslSrc, then provided resolver
  const mainResolver = new RecordResolver(
    { [rootModuleName]: fullSource },
    { packageName },
  );
  const resolvers: RecordResolver[] = [mainResolver];
  if (weslSrc) resolvers.push(new RecordResolver(weslSrc, { packageName }));

  let finalResolver =
    resolvers.length === 1 ? resolvers[0] : new CompositeResolver(resolvers);
  if (resolver)
    finalResolver = new CompositeResolver([finalResolver, resolver]);

  // Scan for @uniforms struct and generate env:: virtual module accordingly
  const pkg = packageName ?? "package";
  const rootPath = `${pkg}::${rootModuleName}`;
  const scan = scanUniforms(fragmentSource, rootPath);
  const mergedVirtualLibs = { ...scan.virtualLibs, ...virtualLibs };

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

  return { module: linked.createShaderModule(device), layout: scan.layout };
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
