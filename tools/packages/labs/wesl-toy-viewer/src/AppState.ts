import type { WeslBundle } from "wesl";
import type { ToyPackage } from "./ToyPackage.ts";

/** Viewer state for package/bundle management. GPU state is owned by <wgsl-play>. */
export interface InitAppState {
  toyPackages: ToyPackage;
  bundles?: WeslBundle[];
  currentShaderSource: string;
}

/** App state with package and bundles loaded. */
export interface LoadedAppState extends InitAppState {
  bundles: WeslBundle[];
}
