/* oxlint-disable no-unused-vars */
export type { WgslElementType } from "thimbleberry";
export type { ImageData } from "vitest-image-snapshot";

// Re-export from wesl-gpu for convenience
export type { RenderUniforms, SamplerOptions } from "wesl-gpu";
export {
  checkerboardTexture,
  colorBarsTexture,
  createSampler,
  createUniformsVirtualLib,
  DeviceCache,
  edgePatternTexture,
  fullscreenTriangleVertex,
  gradientTexture,
  noiseTexture,
  radialGradientTexture,
  renderUniformBuffer,
  simpleRender,
  solidTexture,
  updateRenderUniforms,
  withErrorScopes,
} from "wesl-gpu";

export * from "./CompileShader.ts";
export * from "./ExampleImages.ts";
export * from "./ImageHelpers.ts";
export * from "./TestComputeShader.ts";
export * from "./TestFragmentShader.ts";
export * from "./WebGPUTestSetup.ts";

// Re-export module augmentation from vitest-image-snapshot for packaged builds
import type {} from "vitest";
import type { MatchImageOptions } from "vitest-image-snapshot";

declare module "vitest" {
  // biome-ignore lint/correctness/noUnusedVariables: T must match Vitest's Matchers<T> signature
  interface Matchers<T = any> {
    toMatchImage(nameOrOptions?: string | MatchImageOptions): Promise<void>;
  }
}
