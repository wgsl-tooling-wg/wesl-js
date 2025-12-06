import type { WeslBundle } from "wesl";

/** Shader metadata for @toy-annotated shaders in the viewer dropdown. */
export interface ToyShaderInfo {
  /** Human-readable name displayed in the UI dropdown. */
  displayName: string;
  /** File path in the bundle (e.g., "test/shaders/draw-shapes.wesl"). */
  filePath: string;
}

/** Package metadata for a WESL package containing wesl-toy shaders. */
export interface ToyPackage {
  /** Package name used in WESL module paths (e.g., "lygia" for "lygia::sdf::circle"). */
  name: string;

  /** URL to fetch the .tgz file when package is selected (allows re-fetching on package switch). */
  tgzUrl: string;

  /** wesl-toy shaders to populate the dropdown selector (auto-populated from @toy annotations). */
  shaders: ToyShaderInfo[];
}

/** Scan bundles for @toy annotations, return shader metadata for dropdown. */
export function collectToyShaders(
  tgzUrl: string,
  bundles: WeslBundle[],
  packageName: string,
): ToyPackage {
  const shaders: ToyShaderInfo[] = [];

  for (const bundle of bundles) {
    for (const [filePath, source] of Object.entries(bundle.modules)) {
      if (/@toy\b/.test(source)) {
        const displayName = filePath
          .replace(/\.(wesl|wgsl)$/, "")
          .split("/")
          .pop()!;
        shaders.push({ displayName, filePath });
      }
    }
  }

  return { name: packageName, tgzUrl, shaders };
}
