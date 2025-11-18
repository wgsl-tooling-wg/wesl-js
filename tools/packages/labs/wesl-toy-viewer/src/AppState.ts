import type { WeslBundle } from "wesl";
import type { ToyPackage } from "./ToyPackage.ts";

/** Core WebGPU state for rendering WESL shaders (general wesl-toy interface). */
export interface WeslToyState {
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  pipeline: GPURenderPipeline;
  bindGroup: GPUBindGroup;

  /** Canvas texture format for render pipeline. */
  presentationFormat: GPUTextureFormat;

  /** Uniform data (resolution, time, mouse). */
  uniformBuffer: GPUBuffer;

  /** Animation playback state. */
  isPlaying: boolean;

  /** Animation start timestamp (ms). */
  startTime: number;

  /** Accumulated pause duration (ms). */
  pausedDuration: number;

  /** Current WESL shader source code. */
  currentShaderSource: string;
}

/** WESL toy state before pipeline/bindGroup are initialized. */
export type InitWeslToyState = Omit<WeslToyState, "pipeline" | "bindGroup"> & {
  pipeline?: GPURenderPipeline;
  bindGroup?: GPUBindGroup;
};

/** Viewer-specific state extending core WESL toy with package/bundle management. */
export interface InitAppState extends InitWeslToyState {
  toyPackages: ToyPackage;
  bundles?: WeslBundle[];
}

/** App state with package and bundles loaded. */
export interface LoadedAppState extends InitAppState {
  bundles: WeslBundle[];
}

/** Fully initialized app state with package loaded and shader compiled. */
export type AppState = LoadedAppState & WeslToyState;
