import { afterAll, beforeAll, expect, test } from "vitest";
import { imageMatcher } from "vitest-image-snapshot";
import { findAnnotatedResources } from "wesl-reflect";
import { resolveShaderContext } from "../CompileShader.ts";
import { findSnapshotFunctions, findTestFunctions } from "../TestDiscovery.ts";
import { createTestResources } from "../TestResourceSetup.ts";
import {
  renderSnapshotImage,
  type SnapshotTestParams,
} from "../TestSnapshotShader.ts";
import { runWesl } from "../TestWesl.ts";
import { destroySharedDevice, getGPUDevice } from "../WebGPUTestSetup.ts";
import { loadFixture, parseTest } from "./TestSupport.ts";

imageMatcher();

let device: GPUDevice;

beforeAll(async () => {
  device = await getGPUDevice();
});

afterAll(() => {
  destroySharedDevice();
});

test("renders checkerboard snapshot", async () => {
  const src = loadFixture("snapshot_checker.wesl");
  const snapshotParams = await buildSnapshotParams(src);
  const snaps = snapshotParams.allSnapshotFns;
  expect(snaps).toHaveLength(1);
  expect(snaps[0].name).toBe("test_checker");
  expect(snaps[0].extent).toEqual([256, 256]);

  const imageData = await renderSnapshotImage(snaps[0], snapshotParams);
  expect(imageData.width).toBe(256);
  expect(imageData.height).toBe(256);
  await expect(imageData).toMatchImage("test_checker");
});

test("renders blend of two textures", async () => {
  const src = loadFixture("snapshot_multi_texture.wesl");
  const snapshotParams = await buildSnapshotParams(src);
  const snaps = snapshotParams.allSnapshotFns;
  expect(snaps).toHaveLength(1);

  const imageData = await renderSnapshotImage(snaps[0], snapshotParams);
  expect(imageData.width).toBe(256);
  expect(imageData.height).toBe(256);
  await expect(imageData).toMatchImage("test_blend");
});

test("renders multiple fragment tests from one file", async () => {
  const src = loadFixture("snapshot_multi_fn.wesl");
  const snapshotParams = await buildSnapshotParams(src);
  const snaps = snapshotParams.allSnapshotFns;
  expect(snaps).toHaveLength(2);

  const gradImage = await renderSnapshotImage(snaps[0], snapshotParams);
  expect(gradImage.width).toBe(64);
  await expect(gradImage).toMatchImage("test_gradient");

  const invertImage = await renderSnapshotImage(snaps[1], snapshotParams);
  expect(invertImage.width).toBe(64);
  await expect(invertImage).toMatchImage("test_inverted");
});

test("mixed compute and fragment tests", async () => {
  const src = loadFixture("snapshot_mixed.wesl");
  const results = await runWesl({ device, src });

  // Should have 1 compute + 1 snapshot result
  expect(results).toHaveLength(2);
  const computeResult = results.find(r => r.name === "compute_write");
  expect(computeResult?.passed).toBe(true);

  const snapResult = results.find(r => r.name === "test_visual");
  expect(snapResult?.passed).toBe(true);
  expect(snapResult?.snapshot).toBeDefined();
});

/** Parse source and prepare all GPU resources needed for snapshot rendering. */
async function buildSnapshotParams(src: string): Promise<SnapshotTestParams> {
  const ast = parseTest(src);
  const testFns = findTestFunctions(ast);
  const allSnapshotFns = findSnapshotFunctions(ast);
  const resources = findAnnotatedResources(ast);
  const shaderContext = await resolveShaderContext({
    src,
    virtualLibNames: [],
  });
  const fragmentResources =
    resources.length > 0
      ? await createTestResources(device, resources, 1)
      : undefined;

  return {
    device,
    shaderSrc: src,
    shaderContext,
    resources,
    fragmentResources,
    allSnapshotFns,
    testFns,
  };
}
