import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import isCI from "is-ci";
import type {
  Reporter,
  TestCase,
  TestSpecification,
  Vitest,
} from "vitest/node";
import {
  type AutoOpen,
  autoOpenValues,
  generateDiffReport,
  type ImageSnapshotFailure,
} from "./DiffReport.ts";

/** Metadata captured when image snapshot test fails, used to generate HTML report. */
interface ImageSnapshotFailureData {
  actualPath: string;
  expectedPath: string;
  diffPath: string;
  mismatchedPixels: number;
  mismatchedPixelRatio: number;
}

export interface ImageSnapshotReporterOptions {
  /** Auto-open report in browser. Default: "failures" or "never" in CI */
  autoOpen?: AutoOpen;

  /** Report directory (relative to config.root or absolute) */
  reportPath?: string;

  /** Port for live-reload server. Set to 0 to disable. Default: 4343 */
  port?: number;
}

/** Vitest reporter that generates HTML diff reports for image snapshot failures */
export class ImageSnapshotReporter implements Reporter {
  private failuresByFile = new Map<string, ImageSnapshotFailure[]>();
  private vitest!: Vitest;
  private reportPath?: string;
  private autoOpen: AutoOpen;
  private port: number;
  private serverStarted = false;

  constructor(options: ImageSnapshotReporterOptions = {}) {
    this.reportPath = options.reportPath;
    this.port = options.port ?? 4343;
    this.autoOpen = this.resolveAutoOpen(options.autoOpen);
  }

  /** Resolve autoOpen setting with priority: CI override > env var > config option > default */
  private resolveAutoOpen(configValue?: AutoOpen): AutoOpen {
    if (isCI) return "never";
    return this.envAutoOpen() ?? configValue ?? "failures";
  }

  /** Parse and validate IMAGE_DIFF_AUTO_OPEN environment variable */
  private envAutoOpen(): AutoOpen | undefined {
    const envValue = process.env.IMAGE_DIFF_AUTO_OPEN;
    if (!envValue) return;

    const valid = autoOpenValues.find(v => v === envValue);
    if (!valid) {
      console.warn(
        `Unrecognised IMAGE_DIFF_AUTO_OPEN value: ${envValue} - Must be one of "failures", "always" or "never"`,
      );
    }
    return valid;
  }

  onInit(vitest: Vitest) {
    this.vitest = vitest;
    if (this.port > 0 && !isCI) {
      this.startServer();
    }
  }

  private startServer() {
    const reportDir = this.resolveReportDir();
    const server = http.createServer((req, res) => {
      const url = !req.url || req.url === "/" ? "/index.html" : req.url;
      const filePath = path.join(reportDir, url);

      fs.stat(filePath, (statErr, stats) => {
        if (statErr) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        const ext = path.extname(filePath);
        const mimeTypes: Record<string, string> = {
          ".html": "text/html",
          ".css": "text/css",
          ".png": "image/png",
          ".js": "text/javascript",
        };
        const contentType = mimeTypes[ext] ?? "application/octet-stream";
        const headers = {
          "Content-Type": contentType,
          "Last-Modified": stats.mtime.toUTCString(),
        };

        // For HEAD requests (used by live reload), just send headers
        if (req.method === "HEAD") {
          res.writeHead(200, headers);
          res.end();
          return;
        }

        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(500);
            res.end("Error reading file");
            return;
          }
          res.writeHead(200, headers);
          res.end(data);
        });
      });
    });

    server.listen(this.port, () => {
      this.serverStarted = true;
      console.log(`\n Image diff report: http://localhost:${this.port}`);
    });

    server.unref(); // Don't keep process alive just for this server
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

    type Meta = { imageSnapshotFailure?: ImageSnapshotFailureData };
    const { imageSnapshotFailure } = testCase.meta() as Meta;
    if (!imageSnapshotFailure) return;

    const message = result.errors?.[0]?.message || "";
    const failure = captureFailure(testCase, imageSnapshotFailure, message);
    const { moduleId } = testCase.module;
    const existing = this.failuresByFile.get(moduleId) || [];
    this.failuresByFile.set(moduleId, [...existing, failure]);
  }

  async onTestRunEnd() {
    const allFailures = [...this.failuresByFile.values()].flat();
    await generateDiffReport(allFailures, {
      autoOpen: this.autoOpen,
      reportDir: this.resolveReportDir(),
      configRoot: this.vitest.config.root,
      liveReload: this.serverStarted,
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

/** Build a failure record from test metadata for the diff report. */
function captureFailure(
  testCase: TestCase,
  data: ImageSnapshotFailureData,
  message: string,
): ImageSnapshotFailure {
  const snapshotName = data.actualPath.match(/([^/]+)\.png$/)?.[1] || "unknown";
  const { mismatchedPixels, mismatchedPixelRatio } = data;
  return {
    testName: testCase.fullName || testCase.name,
    snapshotName,
    comparison: {
      pass: false,
      message,
      mismatchedPixels,
      mismatchedPixelRatio,
    },
    paths: {
      reference: data.expectedPath,
      actual: data.actualPath,
      diff: data.diffPath,
    },
  };
}
