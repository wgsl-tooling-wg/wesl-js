import type { FragmentParams } from "./FragmentParams.ts";
import { linkFragmentShader } from "./FragmentPipeline.ts";
import { renderUniformBuffer } from "./RenderUniforms.ts";
import { simpleRender } from "./SimpleRender.ts";

/**
 * Run a fragment shader and return pixel data.
 *
 * Combines linking, uniform setup, and rendering into a single call.
 * Useful for shader testing or single-frame renders.
 *
 * @returns Pixel data as a flattened number array
 */
export async function runFragment(params: FragmentParams): Promise<number[]> {
  const { src, device } = params;
  const { textureFormat = "rgba32float", size = [1, 1] } = params;
  const { textures, samplers, uniforms = {} } = params;

  const module = await linkFragmentShader({
    device,
    fragmentSource: src,
    resolver: params.resolver,
    weslSrc: params.weslSrc,
    libs: params.libs,
    virtualLibs: params.virtualLibs,
    conditions: params.conditions,
    constants: params.constants,
    packageName: params.packageName,
    rootModuleName: params.rootModuleName,
    config: params.config,
  });

  const uniformBuffer = renderUniformBuffer(device, size, uniforms);
  return simpleRender({
    device,
    module,
    outputFormat: textureFormat,
    size,
    textures,
    samplers,
    uniformBuffer,
  });
}
