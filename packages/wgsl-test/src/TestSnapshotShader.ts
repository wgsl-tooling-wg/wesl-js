import type { ImageData } from "vitest-image-snapshot/core";
import type { LinkParams } from "wesl";
import { fullscreenTriangleVertex, simpleRender } from "wesl-gpu";
import {
  annotatedResourcesPlugin,
  type DiscoveredResource,
} from "wesl-reflect";
import weslBundle from "../lib/weslBundle.js";
import { compileShader, type ShaderContext } from "./CompileShader.ts";
import type {
  SnapshotFunctionInfo,
  TestFunctionInfo,
} from "./TestDiscovery.ts";
import type { TestResources } from "./TestResourceSetup.ts";

export interface SnapshotResult {
  passed: boolean;
  isNew: boolean;
  diffPixels?: number;
  diffPath?: string;
  message?: string;
}

export interface SnapshotTestParams {
  device: GPUDevice;
  shaderSrc: string;
  shaderContext: ShaderContext;
  resources: DiscoveredResource[];
  fragmentResources?: TestResources;
  allSnapshotFns: SnapshotFunctionInfo[];
  testFns: TestFunctionInfo[];
  conditions?: LinkParams["conditions"];
  constants?: LinkParams["constants"];
}

/** Render a @fragment @snapshot test and return ImageData. */
export async function renderSnapshotImage(
  snap: SnapshotFunctionInfo,
  params: SnapshotTestParams,
): Promise<ImageData> {
  const { device, shaderSrc, shaderContext, resources } = params;
  const { conditions, constants } = params;
  const { fragmentResources } = params;

  const wrapper = `
${shaderSrc}

${fullscreenTriangleVertex}
`;

  const plugins =
    resources.length > 0 ? [annotatedResourcesPlugin(resources, 1)] : undefined;

  const module = await compileShader({
    device,
    src: wrapper,
    libs: [weslBundle],
    shaderContext,
    conditions,
    constants,
    plugins,
  });

  let bindGroup: GPUBindGroup | undefined;
  let bindGroupLayout: GPUBindGroupLayout | undefined;
  if (fragmentResources) {
    bindGroupLayout = device.createBindGroupLayout({
      entries: fragmentResources.layoutEntries,
    });
    bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: fragmentResources.entries,
    });
  }

  const [width, height] = snap.extent;
  const pixelData = await simpleRender({
    device,
    module,
    size: [width, height],
    bindGroup,
    bindGroupLayout,
    fragmentEntryPoint: snap.name,
  });

  return pixelsToImageData(pixelData, width, height);
}

/** Render a snapshot test and compare against the saved reference image. */
export async function runSnapshotTest(
  snap: SnapshotFunctionInfo,
  params: SnapshotTestParams,
  testFilePath: string,
  updateSnapshot?: string,
): Promise<SnapshotResult> {
  const { compareImages, ImageSnapshotManager, pngBuffer } = await import(
    "vitest-image-snapshot/core"
  );

  const imageData = await renderSnapshotImage(snap, params);
  const manager = new ImageSnapshotManager(testFilePath, { updateSnapshot });
  const actualPng = pngBuffer(imageData);
  await manager.saveActual(actualPng, snap.snapshotName);

  const reference = await manager.loadReference(snap.snapshotName);
  if (!reference) {
    if (manager.shouldCreateNew()) {
      await manager.saveReference(actualPng, snap.snapshotName);
      return {
        passed: true,
        isNew: true,
        message: `Created: ${snap.snapshotName}`,
      };
    }
    return {
      passed: false,
      isNew: false,
      message: `No snapshot: ${snap.snapshotName}`,
    };
  }

  const comparison = await compareImages(reference, actualPng);
  if (!comparison.pass && comparison.diffBuffer) {
    await manager.saveDiff(comparison.diffBuffer, snap.snapshotName);
  }
  if (!comparison.pass && manager.shouldUpdate()) {
    await manager.saveReference(actualPng, snap.snapshotName);
    return {
      passed: true,
      isNew: false,
      message: `Updated: ${snap.snapshotName}`,
    };
  }

  return {
    passed: comparison.pass,
    isNew: false,
    diffPixels: comparison.mismatchedPixels,
    diffPath: comparison.pass ? undefined : manager.diffPath(snap.snapshotName),
    message: comparison.message,
  };
}

/** Convert float pixel data (rgba32float) to ImageData. */
function pixelsToImageData(
  data: number[],
  width: number,
  height: number,
): ImageData {
  const totalPixels = width * height;
  const uint8Data = new Uint8ClampedArray(totalPixels * 4);
  for (let i = 0; i < totalPixels * 4; i++) {
    const clamped = Math.max(0, Math.min(1, data[i]));
    uint8Data[i] = Math.round(clamped * 255);
  }
  return {
    data: uint8Data,
    width,
    height,
    colorSpace: "srgb" as const,
  } as ImageData;
}
