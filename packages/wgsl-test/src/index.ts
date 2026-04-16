/* oxlint-disable no-unused-vars */
export type { WgslElementType } from "thimbleberry";
export type { ImageData } from "vitest-image-snapshot";

// Re-export from wesl-gpu for convenience
export type { SamplerOptions } from "wesl-gpu";
export {
  checkerboardTexture,
  colorBarsTexture,
  createSampler,
  DeviceCache,
  edgePatternTexture,
  fullscreenTriangleVertex,
  gradientTexture,
  noiseTexture,
  radialGradientTexture,
  simpleRender,
  solidTexture,
  withErrorScopes,
} from "wesl-gpu";

export * from "./CompileShader.ts";
export * from "./ExampleImages.ts";
export * from "./ImageHelpers.ts";
export * from "./ResourceCreation.ts";
export * from "./TestComputeShader.ts";
export * from "./TestDiscovery.ts";
export * from "./TestFragmentShader.ts";
export * from "./TestSnapshotShader.ts";
export * from "./TestWesl.ts";
export * from "./WebGPUTestSetup.ts";

// Re-export module augmentation from vitest-image-snapshot for packaged builds
import type {} from "vitest";
import type { MatchImageOptions } from "vitest-image-snapshot";

declare module "vitest" {
  interface Matchers<T = any> {
    toMatchImage(nameOrOptions?: string | MatchImageOptions): Promise<void>;
  }
}
