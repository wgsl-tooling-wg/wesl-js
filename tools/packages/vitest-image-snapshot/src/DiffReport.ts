import { exec } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ComparisonResult } from "./ImageComparison.ts";

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
}

/** Generate HTML diff report for all failed image snapshots. */
export async function generateDiffReport(
  failures: ImageSnapshotFailure[],
  config: DiffReportConfig,
): Promise<void> {
  const { autoOpen = false, reportDir, configRoot } = config;

  if (failures.length === 0) return;

  await fs.promises.mkdir(reportDir, { recursive: true });

  const withCopiedImages = await copyImagesToReport(
    failures,
    reportDir,
    configRoot,
  );
  const html = createReportHTML(withCopiedImages);
  const outputPath = path.join(reportDir, "index.html");

  await fs.promises.writeFile(outputPath, html, "utf-8");

  console.log(`\n📊 Image diff report: ${outputPath}`);

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

function createReportHTML(failures: ImageSnapshotFailure[]): string {
  const timestamp = new Date().toLocaleString();
  const totalFailures = failures.length;

  const rows = failures
    .map(failure => {
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
      </tr>
    `;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Snapshot Failures - ${totalFailures} failed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      color: #d73027;
      margin-bottom: 10px;
    }
    .meta {
      color: #666;
      font-size: 14px;
    }
    .update-hint {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 12px;
      margin: 15px 0;
    }
    .update-hint code {
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th, td {
      padding: 15px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #333;
      text-align: center;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover {
      background: #fafafa;
    }
    .test-name {
      min-width: 200px;
      vertical-align: top;
    }
    .test-name strong {
      color: #333;
    }
    .test-name code {
      color: #666;
      font-size: 12px;
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .image-cell {
      text-align: center;
      vertical-align: top;
      width: 25%;
    }
    .image-cell a {
      display: block;
      text-decoration: none;
    }
    .image-cell img {
      max-width: 100%;
      height: auto;
      max-height: 300px;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .image-cell img:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .label {
      margin-top: 8px;
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }
    .no-diff {
      color: #999;
      font-size: 13px;
      font-style: italic;
      padding: 20px;
      text-align: center;
    }
    .stats {
      text-align: center;
      color: #d73027;
      font-size: 14px;
      vertical-align: top;
    }
    .stats div {
      margin: 5px 0;
    }
    footer {
      margin-top: 20px;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <header>
    <h1>🔴 Image Snapshot Failures</h1>
    <div class="meta">
      <strong>${totalFailures}</strong> test${totalFailures === 1 ? "" : "s"} failed •
      Generated: ${escapeHtml(timestamp)}
    </div>
    <div class="update-hint">
      💡 <strong>To update snapshots:</strong> Run <code>pnpm test -- -u</code> or <code>vitest -u</code>
    </div>
  </header>

  <table>
    <thead>
      <tr>
        <th>Test</th>
        <th>Expected</th>
        <th>Actual</th>
        <th>Diff</th>
        <th>Mismatch</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <footer>
    Click images to view full size •
    Diff images highlight mismatched pixels in yellow/red
  </footer>
</body>
</html>`;
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
