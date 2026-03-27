import type { LinkParams } from "wesl";
import type { AutoValues } from "./UniformBuffer.ts";

/** WESL linker options - aligned with wesl's LinkParams */
export type WeslOptions = Pick<
  LinkParams,
  | "resolver"
  | "weslSrc"
  | "rootModuleName"
  | "conditions"
  | "libs"
  | "virtualLibs"
  | "packageName"
  | "constants"
  | "config"
>;

/** GPU rendering params for fragment shaders */
export interface FragmentRenderParams {
  device: GPUDevice;

  /** Output texture format. Default: "rgba32float" */
  textureFormat?: GPUTextureFormat;

  /** Output texture size. Default: [1, 1] */
  size?: [width: number, height: number];

  /** Uniform values (resolution auto-populated from size). */
  uniforms?: AutoValues;

  /** Input textures. Bindings: [1..n], samplers at [n+1..n+m]. */
  textures?: GPUTexture[];

  /** Samplers. Length 1 (reused) or match textures.length. */
  samplers?: GPUSampler[];
}

/** Combined params for fragment shader execution */
export interface FragmentParams extends WeslOptions, FragmentRenderParams {
  /** Fragment shader source (vertex shader auto-provided) */
  src: string;
}
