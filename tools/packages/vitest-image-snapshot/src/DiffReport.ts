import { exec } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ComparisonResult } from "./ImageComparison.ts";

const templatesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "templates",
);

/** Failed image snapshot with comparison results and file paths. */
export interface ImageSnapshotFailure {
  testName: string;
  snapshotName: string;
  comparison: ComparisonResult;
  paths: {
    reference: string;
    actual: string;
    diff: string;
  };
}

/** Configuration for HTML diff report generation. */
export interface DiffReportConfig {
  /** Auto-open report in browser. Default: false */
  autoOpen?: boolean;
  /** Directory path for generated HTML report (absolute or relative). */
  reportDir: string;
  /** Vitest config root for calculating relative paths when copying images */
  configRoot: string;
  /** Enable live reload script in HTML. Default: false */
  liveReload?: boolean;
}

/** Clear the diff report directory if it exists. */
export async function clearDiffReport(reportDir: string): Promise<void> {
  if (fs.existsSync(reportDir)) {
    await fs.promises.rm(reportDir, { recursive: true });
  }
}

/** Generate HTML diff report for image snapshot results. */
export async function generateDiffReport(
  failures: ImageSnapshotFailure[],
  config: DiffReportConfig,
): Promise<void> {
  const {
    autoOpen = false,
    reportDir,
    configRoot,
    liveReload = false,
  } = config;

  // Clear old report before generating new one to remove stale images
  await clearDiffReport(reportDir);
  await fs.promises.mkdir(reportDir, { recursive: true });

  // Copy CSS file to report directory
  const cssSource = path.join(templatesDir, "report.css");
  await fs.promises.copyFile(cssSource, path.join(reportDir, "report.css"));

  // Copy live-reload script if enabled
  if (liveReload) {
    const jsSource = path.join(templatesDir, "live-reload.js");
    await fs.promises.copyFile(jsSource, path.join(reportDir, "live-reload.js"));
  }

  const withCopiedImages =
    failures.length > 0
      ? await copyImagesToReport(failures, reportDir, configRoot)
      : [];
  const html = createReportHTML(withCopiedImages, liveReload);
  const outputPath = path.join(reportDir, "index.html");

  await fs.promises.writeFile(outputPath, html, "utf-8");

  // Only log file path if not using live reload server (which logs its own URL)
  if (failures.length > 0 && !liveReload) {
    console.log(`\n Image diff report: ${outputPath}`);
  }

  if (autoOpen) {
    const cmd =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "start"
          : "xdg-open";
    exec(`${cmd} "${outputPath}"`);
  }
}

/** Copy images to report dir, preserving directory structure relative to configRoot */
async function copyImagesToReport(
  failures: ImageSnapshotFailure[],
  reportDir: string,
  configRoot: string,
): Promise<ImageSnapshotFailure[]> {
  return Promise.all(
    failures.map(async failure => {
      const copiedPaths = await copyImageSet(
        failure.paths,
        reportDir,
        configRoot,
      );
      return { ...failure, paths: copiedPaths };
    }),
  );
}

async function copyImageSet(
  paths: { reference: string; actual: string; diff: string },
  reportDir: string,
  configRoot: string,
): Promise<{ reference: string; actual: string; diff: string }> {
  return {
    reference: await copyImage(paths.reference, reportDir, configRoot),
    actual: await copyImage(paths.actual, reportDir, configRoot),
    diff: await copyImage(paths.diff, reportDir, configRoot),
  };
}

/** Copy single image to report dir, preserving directory structure relative to configRoot */
async function copyImage(
  sourcePath: string,
  reportDir: string,
  configRoot: string,
): Promise<string> {
  if (!fs.existsSync(sourcePath)) return "";

  const relativePath = path.relative(configRoot, sourcePath);
  const destPath = path.join(reportDir, relativePath);
  const destDir = path.dirname(destPath);

  await fs.promises.mkdir(destDir, { recursive: true });
  await fs.promises.copyFile(sourcePath, destPath);
  return relativePath;
}

function loadTemplate(name: string): string {
  return fs.readFileSync(path.join(templatesDir, name), "utf-8");
}

/** Replace all {{key}} placeholders in template with values from data object. */
function renderTemplate(
  template: string,
  data: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }

  // Check for any unreplaced placeholders
  const unreplaced = result.match(/\{\{(\w+)\}\}/g);
  if (unreplaced) {
    const keys = unreplaced.map(m => m.slice(2, -2)).join(", ");
    throw new Error(`Template has unreplaced placeholders: ${keys}`);
  }

  return result;
}


function createReportHTML(
  failures: ImageSnapshotFailure[],
  liveReload: boolean,
): string {
  const timestamp = new Date().toLocaleString();
  const totalFailures = failures.length;
  const script = liveReload ? `<script src="live-reload.js"></script>` : "";

  if (totalFailures === 0) {
    return renderTemplate(loadTemplate("report-success.hbs"), {
      timestamp: escapeHtml(timestamp),
      script,
    });
  }

  const rows = failures.map(failure => createRowHTML(failure)).join("\n");

  return renderTemplate(loadTemplate("report-failure.hbs"), {
    totalFailures: String(totalFailures),
    testPlural: totalFailures === 1 ? "test" : "tests",
    timestamp: escapeHtml(timestamp),
    rows,
    script,
  });
}

function createRowHTML(failure: ImageSnapshotFailure): string {
  const { testName, snapshotName, comparison, paths } = failure;
  const { mismatchedPixels, mismatchedPixelRatio } = comparison;

  return `
      <tr>
        <td class="test-name">
          <strong>${escapeHtml(testName)}</strong><br>
          <code>${escapeHtml(snapshotName)}</code>
        </td>
        <td class="image-cell">
          <a href="${paths.reference}" target="_blank">
            <img src="${paths.reference}" alt="Expected" />
          </a>
          <div class="label">Expected</div>
        </td>
        <td class="image-cell">
          <a href="${paths.actual}" target="_blank">
            <img src="${paths.actual}" alt="Actual" />
          </a>
          <div class="label">Actual</div>
        </td>
        <td class="image-cell">
          ${diffCellHTML(paths.diff)}
        </td>
        <td class="stats">
          <div><strong>${mismatchedPixels}</strong> pixels</div>
          <div><strong>${(mismatchedPixelRatio * 100).toFixed(2)}%</strong></div>
        </td>
      </tr>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function diffCellHTML(diffPath: string): string {
  if (!diffPath) {
    return `<div class="no-diff">No diff image<br/>(dimension mismatch)</div>`;
  }
  return `<a href="${diffPath}" target="_blank">
            <img src="${diffPath}" alt="Diff" />
          </a>
          <div class="label">Diff</div>`;
}
