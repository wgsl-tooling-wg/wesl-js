import { type FnElem, parseSrcModule, type WeslBundle } from "wesl";

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

/** Scan bundles for @toy attributes on functions, return shader metadata for dropdown. */
export function collectToyShaders(
  tgzUrl: string,
  bundles: WeslBundle[],
  packageName: string,
): ToyPackage {
  const shaders: ToyShaderInfo[] = [];

  for (const bundle of bundles) {
    for (const [filePath, source] of Object.entries(bundle.modules)) {
      if (hasToyFunction(filePath, source)) {
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

/** Check if source has a function with @toy attribute. */
function hasToyFunction(filePath: string, source: string): boolean {
  try {
    const modulePath = filePath
      .replace(/\.(wesl|wgsl)$/, "")
      .replace(/\//g, "::");
    const ast = parseSrcModule({
      modulePath,
      debugFilePath: filePath,
      src: source,
    });
    return ast.moduleElem.contents
      .filter((e): e is FnElem => e.kind === "fn")
      .some(hasToyAttribute);
  } catch {
    return false;
  }
}

function hasToyAttribute(fn: FnElem): boolean {
  for (const e of fn.attributes ?? []) {
    const attr = e.attribute;
    if (attr.kind === "@attribute" && attr.name === "toy") return true;
  }
  return false;
}
