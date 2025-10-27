/* oxlint-disable no-unused-vars */
export * from "./DiffReport.ts";
export * from "./ImageComparison.ts";
export * from "./ImageSnapshotMatcher.ts";
export * from "./ImageSnapshotReporter.ts";
export * from "./PNGUtil.ts";
export * from "./SnapshotManager.ts";

import type {} from "vitest";
import type { MatchImageOptions } from "./ImageSnapshotMatcher.ts";

// Module augmentation for Vitest 3.2+ - automatically applied when this package is imported
declare module "vitest" {
  // biome-ignore lint/correctness/noUnusedVariables: T must match Vitest's Matchers<T> signature
  interface Matchers<T = any> {
    toMatchImage(nameOrOptions?: string | MatchImageOptions): Promise<void>;
  }
}
