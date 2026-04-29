import type { DiscoveredResource } from "wesl-reflect";
import {
  type BindResources,
  createBindResources,
  ResourceLoadError,
  type TextureBinding,
} from "./ResourceSetup.ts";

/** GPU resources created for annotated runtime vars (play/fragment contexts). */
export type PlayResources = BindResources;

/** Image-like value accepted by `copyExternalImageToTexture`. Structural to
 *  avoid pinning consumers to DOM lib types; at runtime pass an ImageBitmap,
 *  HTMLImageElement, HTMLCanvasElement, OffscreenCanvas, or similar. */
export interface UploadableImage {
  readonly width: number;
  readonly height: number;
}

/** Resolves a @texture(name) to an image source decoded and ready to upload.
 *  @return `null` if the source cannot be resolved */
export type ResolveUserTexture = (
  source: string,
) => Promise<UploadableImage | null>;

export interface PlayResourcesParams {
  device: GPUDevice;

  /** Annotated globals discovered in the WESL module (@buffer/@sampler/@texture). */
  resources: DiscoveredResource[];

  /** First binding index; uniform typically occupies binding 0. */
  startBinding?: number;

  /** Bind-group visibility for every entry. Defaults to COMPUTE | FRAGMENT so
   *  the same bind group works in either mode without a recompile. */
  visibility?: GPUShaderStageFlags;

  /** Looks up the host image for a @texture(name) annotation. */
  resolveTexture: ResolveUserTexture;
}

/** Create GPU resources for @buffer/@sampler/@texture vars in a play context. */
export async function createPlayResources(
  params: PlayResourcesParams,
): Promise<PlayResources> {
  const { resolveTexture, ...rest } = params;
  const visibility =
    rest.visibility ?? GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT;
  return createBindResources({ ...rest, visibility, textureHandler });

  function textureHandler(dev: GPUDevice, r: DiscoveredResource) {
    return loadUserTexture(dev, r, resolveTexture);
  }
}

/** Resolve and upload a host image for an @texture var. */
async function loadUserTexture(
  device: GPUDevice,
  r: DiscoveredResource,
  resolveTexture: ResolveUserTexture,
): Promise<TextureBinding> {
  if (r.kind === "test_texture") {
    throw new ResourceLoadError(
      `@test_texture(${r.source}) is not available at runtime — use @texture(name) with a matching host element instead (var '${r.varName}')`,
      r.source,
    );
  }
  if (r.kind !== "texture") {
    throw new Error(`unexpected resource kind for play: ${r.kind}`);
  }
  if (r.typeName !== "texture_2d") {
    throw new ResourceLoadError(
      `@texture(${r.source}): only texture_2d<f32> is supported; got '${r.typeName}' on var '${r.varName}'`,
      r.source,
    );
  }
  const image = await resolveTexture(r.source);
  if (!image) {
    throw new ResourceLoadError(
      `@texture(${r.source}): no source element found for var '${r.varName}' (expected <img data-texture="${r.source}"> or <img id="${r.source}">)`,
      r.source,
    );
  }
  const { width, height } = image;
  const { TEXTURE_BINDING, COPY_DST, RENDER_ATTACHMENT } = GPUTextureUsage;
  const texture = device.createTexture({
    label: `annotated-texture-${r.varName}`,
    format: "rgba8unorm",
    size: { width, height },
    usage: TEXTURE_BINDING | COPY_DST | RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: image as unknown as GPUCopyExternalImageSource },
    { texture },
    { width, height },
  );
  return { texture };
}
