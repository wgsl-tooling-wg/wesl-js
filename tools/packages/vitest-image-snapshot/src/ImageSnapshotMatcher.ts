import { expect } from "vitest";
import { getCurrentTest } from "vitest/suite";
import {
  type ComparisonOptions,
  compareImages,
  type ImageData,
} from "./ImageComparison.ts";
import { pngBuffer } from "./PNGUtil.ts";
import { ImageSnapshotManager } from "./SnapshotManager.ts";

/** Matcher context provided by Vitest to custom matchers via `this`.
 *
 * Based on MatcherState from @vitest/expect. The snapshotState property was
 * originally typed as `SnapshotState` (added in vitest PR #1378) but is now
 * commented out in the type definition to avoid circular dependencies between
 * @vitest/expect and @vitest/snapshot packages.
 *
 * The snapshotState is typed as `unknown` here because TypeScript won't allow us
 * to expose SnapshotState's private _updateSnapshot field in a structurally compatible
 * way. Use type assertion with SnapshotStateRuntime where needed.
 *
 * Historical context:
 * - PR #1378: Added snapshotState to MatcherState for jest-image-snapshot compatibility
 * - PR #6817: Changed SnapshotState counters from numbers to CounterMap for retry support
 * - Issue #7322: The CounterMap change broke jest-image-snapshot in vitest v3
 * - PR #7390: Added compatibility layer (valueOf(), getters/setters) for jest-image-snapshot
 */
interface MatcherContext {
  currentTestName?: string;
  testPath?: string;
  snapshotState?: unknown;
}

/** Runtime shape for accessing SnapshotState._updateSnapshot (private field) */
interface SnapshotStateRuntime {
  _updateSnapshot?: string;
}

export interface MatchImageOptions extends ComparisonOptions {
  name?: string;
}

/** Register toMatchImage() matcher with Vitest */
export function imageMatcher() {
  expect.extend({ toMatchImage });
}

/** Vitest matcher for image snapshots.
 *
 * see https://vitest.dev/guide/extending-matchers
 */
async function toMatchImage(
  this: MatcherContext,
  received: ImageData | Buffer,
  nameOrOptions?: string | MatchImageOptions,
): Promise<{
  pass: boolean;
  message: () => string;
  actual?: string;
  expected?: string;
}> {
  const setup = await testSetup(this, received, nameOrOptions);
  const { manager, actualBuffer, snapshotName, options } = setup;
  const referenceBuffer = await manager.loadReference(snapshotName);
  if (!referenceBuffer) {
    return missingSnapshot(manager, actualBuffer, snapshotName);
  }
  const comparison = await compareImages(referenceBuffer, received, options);

  if (!comparison.pass && comparison.diffBuffer) {
    await manager.saveDiff(comparison.diffBuffer, snapshotName);
  }

  if (!comparison.pass && manager.shouldUpdate()) {
    await manager.saveReference(actualBuffer, snapshotName);
    return { pass: true, message: () => `Updated snapshot: ${snapshotName}` };
  }

  // Store failure metadata for reporter
  if (!comparison.pass) {
    const currentTest = getCurrentTest();
    if (currentTest) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (currentTest.meta as any).imageSnapshotFailure = {
        actualPath: manager.actualPath(snapshotName),
        expectedPath: manager.referencePath(snapshotName),
        diffPath: manager.diffPath(snapshotName),
        mismatchedPixels: comparison.mismatchedPixels,
        mismatchedPixelRatio: comparison.mismatchedPixelRatio,
      };
    }
  }

  return {
    pass: comparison.pass,
    message: () => comparison.message,
    actual: `${manager.actualPath(snapshotName)}`,
    expected: `${manager.referencePath(snapshotName)}`,
  };
}

async function testSetup(
  self: MatcherContext,
  received: ImageData | Buffer,
  nameOrOptions?: string | MatchImageOptions,
): Promise<{
  manager: ImageSnapshotManager;
  actualBuffer: Buffer;
  snapshotName: string;
  options: MatchImageOptions;
}> {
  const isString = typeof nameOrOptions === "string";
  const snapshotName = isString
    ? nameOrOptions
    : (nameOrOptions?.name ?? self.currentTestName ?? "snapshot");
  const options = isString ? {} : (nameOrOptions ?? {});

  const testPath = self.testPath ?? process.cwd();
  const updateSnapshot = (self.snapshotState as SnapshotStateRuntime)
    ?._updateSnapshot;
  const manager = new ImageSnapshotManager(testPath, { updateSnapshot });

  const actualBuffer = Buffer.isBuffer(received)
    ? received
    : pngBuffer(received);
  await manager.saveActual(actualBuffer, snapshotName);

  return { manager, actualBuffer, snapshotName, options };
}

async function missingSnapshot(
  manager: ImageSnapshotManager,
  actualBuffer: Buffer,
  snapshotName: string,
) {
  if (manager.shouldCreateNew()) {
    await manager.saveReference(actualBuffer, snapshotName);
    return { pass: true, message: () => `Created snapshot: ${snapshotName}` };
  }
  return {
    pass: false,
    message: () => `No snapshot found: ${snapshotName}. Run with -u to create.`,
  };
}
