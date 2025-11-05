export type { WgslElementType } from "thimbleberry";
export type { ImageData } from "vitest-image-snapshot";
export * from "./CompileShader.ts";
export * from "./ErrorScopes.ts";
export * from "./ExampleImages.ts";
export * from "./ExampleTextures.ts";
export * from "./ImageHelpers.ts";
export * from "./RenderUniforms.ts";
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
