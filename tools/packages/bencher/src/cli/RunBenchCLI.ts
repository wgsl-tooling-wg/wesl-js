import { hideBin } from "yargs/helpers";
import type { BenchGroup, BenchmarkSpec, BenchSuite } from "../Benchmark.ts";
import type { BenchmarkReport, ReportGroup } from "../BenchmarkReport.ts";
import { reportResults } from "../BenchmarkReport.ts";
import type { RunnerOptions } from "../runners/BenchRunner.ts";
import type { KnownRunner } from "../runners/CreateRunner.ts";
import { runBenchmark } from "../runners/RunnerOrchestrator.ts";
import { gcSection, runsSection, timeSection } from "../StandardSections.ts";
import {
  type ConfigureArgs,
  type DefaultCliArgs,
  parseCliArgs,
} from "./CliArgs.ts";

type BaseRunParams = {
  runner: KnownRunner;
  options: RunnerOptions;
  useWorker: boolean;
};

type SpecRunParams = BaseRunParams & {
  params: unknown;
  metadata?: Record<string, any>;
};

type SuiteRunParams = BaseRunParams & {
  suite: BenchSuite;
};

/** Run benchmarks from CLI with filtering and custom options */
export async function runBenchCLI<T = DefaultCliArgs>(
  suite: BenchSuite,
  configureArgs?: ConfigureArgs<T>,
): Promise<void> {
  const argv = hideBin(process.argv);
  return runBenchInternal(suite, argv, configureArgs);
}

/** CLI API for tests */
export async function runBenchCLITest<T = DefaultCliArgs>(
  suite: BenchSuite,
  args: string,
  configureArgs?: ConfigureArgs<T>,
): Promise<void> {
  const argv = args.split(/\s+/).filter(arg => arg.length > 0);
  return runBenchInternal(suite, argv, configureArgs);
}

/** Internal implementation for both public APIs */
async function runBenchInternal<T = DefaultCliArgs>(
  suite: BenchSuite,
  argv: string[],
  configureArgs?: ConfigureArgs<T>,
): Promise<void> {
  try {
    const args = parseCliArgs(argv, configureArgs) as T & DefaultCliArgs;
    const { filter, profile } = args;
    const { worker: useWorker, "observe-gc": observeGC } = args;
    const runner = profile ? "basic" : (args.runner as KnownRunner);
    const options = cliToRunnerOptions(args);
    const filtered = filterBenchmarks(suite, filter);
    const reportGroups = await runSuite({
      suite: filtered,
      runner,
      options,
      useWorker,
    });
    displayResults(reportGroups, observeGC);
  } catch (error) {
    console.error("Benchmark run failed:", error);
    process.exit(1);
  }
}

/** Filter benchmarks by name pattern */
export function filterBenchmarks(
  suite: BenchSuite,
  filter?: string,
): BenchSuite {
  if (!filter) return suite;
  const regex = createFilterRegex(filter);
  const groups = suite.groups.map(group => ({
    ...group,
    benchmarks: group.benchmarks.filter(bench => regex.test(bench.name)),
  }));
  validateFilteredSuite(groups, filter);
  return { name: suite.name, groups };
}

/** Create case-insensitive regex from filter */
function createFilterRegex(filter: string): RegExp {
  try {
    return new RegExp(filter, "i");
  } catch {
    return new RegExp(escapeRegex(filter), "i");
  }
}

/** Escape regex special chars */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Throw if no benchmarks match filter */
function validateFilteredSuite(groups: BenchGroup[], filter?: string): void {
  if (groups.every(g => g.benchmarks.length === 0)) {
    throw new Error(`No benchmarks match filter: "${filter}"`);
  }
}

/** Run all benchmarks in suite */
async function runSuite(params: SuiteRunParams): Promise<ReportGroup[]> {
  const { suite, runner, options, useWorker } = params;
  const reportGroups: ReportGroup[] = [];
  for (const group of suite.groups) {
    const groupResult = await runGroup(group, runner, options, useWorker);
    reportGroups.push(groupResult);
  }
  return reportGroups;
}

/** Run group benchmarks with setup params */
async function runGroup(
  group: BenchGroup,
  runner: KnownRunner,
  options: RunnerOptions,
  useWorker: boolean,
): Promise<ReportGroup> {
  const { benchmarks, baseline, setup, metadata } = group;
  const params = await setup?.();
  const runParams = { runner, options, useWorker, params, metadata };

  validateBenchmarkParameters(group);

  const baselineReport = baseline
    ? await runSingleBenchmark(baseline, runParams)
    : undefined;

  const reports = [];
  for (const benchmark of benchmarks) {
    reports.push(await runSingleBenchmark(benchmark, runParams));
  }

  return { reports, baseline: baselineReport };
}

/** Create benchmark report */
async function runSingleBenchmark(
  spec: BenchmarkSpec,
  runParams: SpecRunParams,
): Promise<BenchmarkReport> {
  const { runner, options, useWorker, params, metadata } = runParams;
  const benchParams = { spec, runner, options, useWorker, params };
  const [result] = await runBenchmark(benchParams);
  return { name: spec.name, measuredResults: result, metadata };
}

/** Validate parameterized benchmarks have setup */
function validateBenchmarkParameters(group: BenchGroup): void {
  const { name, setup, benchmarks, baseline } = group;
  if (setup) return;

  const allBenchmarks = baseline ? [...benchmarks, baseline] : benchmarks;
  for (const benchmark of allBenchmarks) {
    if (benchmark.fn.length > 0) {
      console.warn(
        `Benchmark "${benchmark.name}" in group "${name}" expects parameters but no setup() provided.`,
      );
    }
  }
}

/** Print results table to console */
function displayResults(groups: ReportGroup[], observeGc: boolean): void {
  const sections = [timeSection, runsSection] as const;
  const finalSections = observeGc ? [...sections, gcSection] : sections;
  const table = reportResults(groups, finalSections);
  console.log(table);
}

/** Convert CLI args to runner options */
export function cliToRunnerOptions(args: DefaultCliArgs): RunnerOptions {
  const { profile, collect, time, "observe-gc": observeGC } = args;

  // Profile mode: single iteration for external profiler attachment
  if (profile) {
    return { maxIterations: 1, warmupTime: 0, observeGC: false, collect };
  }
  return { minTime: time * 1000, observeGC, collect };
}
