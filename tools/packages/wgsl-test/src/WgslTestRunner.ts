import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import { findWeslToml, versionFromPackageJson } from "wesl-tooling";
import yargs from "yargs";
import { runWesl, type TestResult } from "./TestWesl.ts";
import { destroySharedDevice, getGPUDevice } from "./WebGPUTestSetup.ts";

interface RunArgs {
  files: string[];
  projectDir: string;
}

interface FileSummary {
  file: string;
  results: TestResult[];
  error?: string;
}

interface Summary {
  files: FileSummary[];
  passed: number;
  failed: number;
  total: number;
}

/** CLI entry point for wgsl-test runner. */
export async function cli(rawArgs: string[]): Promise<void> {
  const toolDir = new URL("..", import.meta.url).href;
  const appVersion = await versionFromPackageJson(toolDir);

  await yargs(rawArgs)
    .version(appVersion)
    .command(
      "run [files..]",
      "Run WESL tests",
      yargs =>
        yargs
          .positional("files", {
            type: "string",
            array: true,
            describe: "Test files to run (defaults to **/*.test.wesl)",
            default: [] as string[],
          })
          .option("projectDir", {
            type: "string",
            default: ".",
            describe: "Project directory containing wesl.toml or package.json",
          }),
      async argv => {
        await runCommand({
          files: argv.files ?? [],
          projectDir: argv.projectDir,
        });
      },
    )
    .demandCommand(1, "Please specify a command (e.g., wgsl-test run)")
    .help()
    .parse();
}

async function runCommand(args: RunArgs): Promise<void> {
  const summary = await runAllTests(args);
  printResults(summary);
  process.exit(summary.failed > 0 ? 1 : 0);
}

/** Discover test files matching **\/*.test.wesl pattern. */
async function discoverTestFiles(args: RunArgs): Promise<string[]> {
  const { files, projectDir } = args;
  if (files.length > 0) {
    return files.map(f => path.resolve(projectDir, f));
  }

  const tomlInfo = await findWeslToml(projectDir);
  const pattern = "**/*.test.wesl";
  const cwd = path.resolve(projectDir, tomlInfo.resolvedRoot);

  const found = await glob(pattern, { cwd, ignore: "node_modules/**" });
  return found.map(f => path.resolve(cwd, f));
}

/** Run all discovered test files and aggregate results. */
async function runAllTests(args: RunArgs): Promise<Summary> {
  const files = await discoverTestFiles(args);
  if (files.length === 0) {
    console.log("No test files found");
    return { files: [], passed: 0, failed: 0, total: 0 };
  }

  const device = await getGPUDevice();
  const fileSummaries: FileSummary[] = [];

  for (const file of files) {
    const summary = await runFileTests(file, device);
    fileSummaries.push(summary);
  }

  destroySharedDevice();

  const allResults = fileSummaries.flatMap(f => f.results);
  const passed = allResults.filter(r => r.passed).length;
  const errorCount = fileSummaries.filter(f => f.error).length;
  const failed = allResults.length - passed + errorCount;

  return { files: fileSummaries, passed, failed, total: passed + failed };
}

/** Run all @test functions in a single WESL file. */
async function runFileTests(
  file: string,
  device: GPUDevice,
): Promise<FileSummary> {
  try {
    const src = await fs.readFile(file, "utf8");
    const results = await runWesl({
      device,
      src,
      projectDir: path.dirname(file),
    });
    return { file, results };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { file, results: [], error };
  }
}

/** Print colored test results for a single file. */
function printFileResult(file: FileSummary): void {
  const relPath = path.relative(process.cwd(), file.file);
  const failures = file.results.filter(r => !r.passed);
  const passCount = file.results.length - failures.length;

  if (file.error) {
    console.log(` \x1b[31mERROR\x1b[0m ${relPath}`);
    console.log(`   ${file.error}`);
  } else if (failures.length === 0) {
    console.log(` \x1b[32mPASS\x1b[0m  ${relPath} (${passCount} tests)`);
  } else {
    console.log(
      ` \x1b[31mFAIL\x1b[0m  ${relPath} (${passCount} passed, ${failures.length} failed)`,
    );
    for (const f of failures) {
      console.log(`   \x1b[31mFAIL\x1b[0m  ${f.name}`);
      console.log(`     actual:   [${f.actual.join(", ")}]`);
      console.log(`     expected: [${f.expected.join(", ")}]`);
    }
  }
}

/** Print test summary with file results and aggregate counts. */
function printResults(summary: Summary): void {
  console.log();
  for (const file of summary.files) {
    printFileResult(file);
  }

  console.log();
  const filesPassed = summary.files.filter(
    f => !f.error && f.results.every(r => r.passed),
  ).length;
  const filesFailed = summary.files.length - filesPassed;

  if (summary.failed > 0) {
    console.log(
      `Tests: \x1b[31m${summary.failed} failed\x1b[0m, ${summary.passed} passed, ${summary.total} total`,
    );
  } else {
    console.log(
      `Tests: \x1b[32m${summary.passed} passed\x1b[0m, ${summary.total} total`,
    );
  }
  console.log(
    `Files: ${filesFailed > 0 ? `${filesFailed} failed, ` : ""}${filesPassed} passed, ${summary.files.length} total`,
  );
}
