import * as path from "node:path";
import type { Reporter, TestCase, Vitest } from "vitest/node";
import { generateDiffReport, type ImageSnapshotFailure } from "./DiffReport.ts";
import type { ImageSnapshotFailureData } from "./vitest.d.ts";

export interface ImageSnapshotReporterOptions {
  /** Report directory (relative to config.root or absolute) */
  reportPath?: string;
  autoOpen?: boolean;
}

/** Vitest reporter that generates HTML diff reports for image snapshot failures */
export class ImageSnapshotReporter implements Reporter {
  private failures: ImageSnapshotFailure[] = [];
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
    this.failures.push(failure);
  }

  async onTestRunEnd() {
    if (this.failures.length === 0) return;

    const reportDir = this.resolveReportDir();
    await generateDiffReport(this.failures, {
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
