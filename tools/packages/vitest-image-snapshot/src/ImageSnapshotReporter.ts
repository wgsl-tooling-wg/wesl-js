import * as path from "node:path";
import type {
  Reporter,
  TestCase,
  TestSpecification,
  Vitest,
} from "vitest/node";
import {
  clearDiffReport,
  generateDiffReport,
  type ImageSnapshotFailure,
} from "./DiffReport.ts";

/** metadata saved at failure for future report */
interface ImageSnapshotFailureData {
  actualPath: string;
  expectedPath: string;
  diffPath: string;
  mismatchedPixels: number;
  mismatchedPixelRatio: number;
}

export interface ImageSnapshotReporterOptions {
  /** Report directory (relative to config.root or absolute) */
  reportPath?: string;
  autoOpen?: boolean;
}

/** Vitest reporter that generates HTML diff reports for image snapshot failures */
export class ImageSnapshotReporter implements Reporter {
  private failuresByFile = new Map<string, ImageSnapshotFailure[]>();
  private vitest!: Vitest;
  private reportPath?: string;
  private autoOpen: boolean;

  constructor(options: ImageSnapshotReporterOptions = {}) {
    this.reportPath = options.reportPath;
    this.autoOpen =
      options.autoOpen ?? process.env.IMAGE_DIFF_AUTO_OPEN === "true";
  }

  onInit(vitest: Vitest) {
    this.vitest = vitest;
  }

  onTestRunStart(specifications: ReadonlyArray<TestSpecification>) {
    // Clear failures only for files that are about to run
    for (const spec of specifications) {
      this.failuresByFile.delete(spec.moduleId);
    }
  }

  onTestCaseResult(testCase: TestCase) {
    const result = testCase.result();
    if (result?.state !== "failed") return;

    const meta = testCase.meta() as {
      imageSnapshotFailure?: ImageSnapshotFailureData;
    };
    if (!meta.imageSnapshotFailure) return;

    const error = result.errors?.[0];
    const failure = captureFailure(
      testCase,
      meta.imageSnapshotFailure,
      error?.message || "",
    );
    const moduleId = testCase.module.moduleId;
    const existing = this.failuresByFile.get(moduleId) || [];
    this.failuresByFile.set(moduleId, [...existing, failure]);
  }

  async onTestRunEnd() {
    const reportDir = this.resolveReportDir();
    const allFailures = [...this.failuresByFile.values()].flat();
    if (allFailures.length === 0) {
      await clearDiffReport(reportDir);
      return;
    }
    await generateDiffReport(allFailures, {
      autoOpen: this.autoOpen,
      reportDir,
      configRoot: this.vitest.config.root,
    });
  }

  private resolveReportDir(): string {
    const configRoot = this.vitest.config.root;
    if (!this.reportPath) {
      return path.join(configRoot, "__image_diff_report__");
    }
    return path.isAbsolute(this.reportPath)
      ? this.reportPath
      : path.join(configRoot, this.reportPath);
  }
}

function captureFailure(
  testCase: TestCase,
  data: ImageSnapshotFailureData,
  message: string,
): ImageSnapshotFailure {
  const snapshotName = data.actualPath.match(/([^/]+)\.png$/)?.[1] || "unknown";

  return {
    testName: testCase.fullName || testCase.name,
    snapshotName,
    comparison: {
      pass: false,
      message,
      mismatchedPixels: data.mismatchedPixels,
      mismatchedPixelRatio: data.mismatchedPixelRatio,
    },
    paths: {
      reference: data.expectedPath,
      actual: data.actualPath,
      diff: data.diffPath,
    },
  };
}
