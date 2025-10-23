import type { MatchImageOptions } from "./ImageSnapshotMatcher.ts";

export interface ImageSnapshotFailureData {
  actualPath: string;
  expectedPath: string;
  diffPath: string;
  mismatchedPixels: number;
  mismatchedPixelRatio: number;
}

declare module "vitest" {
  interface Assertion<_T = unknown> {
    toMatchImage(nameOrOptions?: string | MatchImageOptions): Promise<void>;
  }
  interface AsymmetricMatchersContaining {
    toMatchImage(nameOrOptions?: string | MatchImageOptions): Promise<void>;
  }
}

declare module "@vitest/runner" {
  interface TaskMeta {
    /** Image snapshot failure data (set by toMatchImage matcher) */
    imageSnapshotFailure?: ImageSnapshotFailureData;
  }
}
