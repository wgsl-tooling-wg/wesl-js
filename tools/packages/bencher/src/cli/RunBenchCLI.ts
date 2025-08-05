import type { BenchGroup, BenchSuite } from "../Benchmark.ts";
import type { BenchmarkReport, ReportGroup } from "../BenchmarkReport.ts";
import { reportResults } from "../BenchmarkReport.ts";
import type { RunnerOptions } from "../runners/BenchRunner.ts";
import type { KnownRunner } from "../runners/CreateRunner.ts";
import { runBenchmark } from "../runners/RunnerOrchestrator.ts";
import { gcSection, runsSection, timeSection } from "../StandardSections.ts";
import { type CliArgs, cliArgs } from "./CliArgs.ts";

/** Run benchmarks from CLI with filtering and custom options */
export async function runBenchCLI(
  suite: BenchSuite,
  argv?: string[],
): Promise<void> {
  try {
    const args = cliArgs(argv ?? process.argv.slice(2));
    const filtered = filterBenchmarks(suite, args.filter);

    validateFilteredSuite(filtered, args.filter);
    prepareGarbageCollection(args.collect);

    const options = cliToRunnerOptions(args);
    const reportGroups = await runFilteredBenchmarks(
      filtered,
      args.runner as KnownRunner,
      options,
      args.worker,
    );

    displayResults(reportGroups, args.observeGc);
  } catch (error) {
    console.error("Benchmark run failed:", error);
    process.exit(1);
  }
}

/** Filter benchmarks by name pattern (substring or regex) */
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

  return {
    name: suite.name,
    groups,
  };
}

/** Convert CLI args to runner options */
export function cliToRunnerOptions(args: CliArgs): RunnerOptions {
  const options: RunnerOptions = {
    minTime: args.time * 1000,
    observeGC: args.observeGc,
  };

  if (args.profile) {
    options.maxIterations = 1;
    options.minSamples = 1;
    options.warmupSamples = 0;
  }

  return options;
}

/** Create case-insensitive regex from filter string */
function createFilterRegex(filter: string): RegExp {
  try {
    return new RegExp(filter, "i");
  } catch {
    return new RegExp(escapeRegex(filter), "i");
  }
}

/** Escape regex special chars for literal matching */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Exit if no benchmarks match filter */
function validateFilteredSuite(suite: BenchSuite, filter?: string): void {
  const hasNoBenchmarks = suite.groups.every(g => g.benchmarks.length === 0);
  if (hasNoBenchmarks) {
    console.error(`No benchmarks match filter: "${filter}"`);
    process.exit(1);
  }
}

/** Run GC if requested and available */
function prepareGarbageCollection(shouldCollect: boolean): void {
  if (shouldCollect && global.gc) {
    global.gc();
  }
}

/** Print results table to console */
function displayResults(groups: ReportGroup[], observeGc: boolean): void {
  const sections = [timeSection, runsSection] as const;
  const finalSections = observeGc ? [...sections, gcSection] : sections;
  const table = reportResults(groups, finalSections);
  console.log(table);
}

/** Run all benchmarks in suite */
async function runFilteredBenchmarks(
  suite: BenchSuite,
  runner: KnownRunner,
  options: RunnerOptions,
  useWorker: boolean,
): Promise<ReportGroup[]> {
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
  const params = await group.setup?.();
  const reports: BenchmarkReport[] = [];

  // Run baseline if present
  let baseline: BenchmarkReport | undefined;
  if (group.baseline) {
    const baselineResults = await runBenchmark(
      group.baseline,
      runner,
      options,
      useWorker,
      params,
    );
    baseline = {
      name: group.baseline.name,
      measuredResults: baselineResults[0],
      metadata: group.metadata,
    };
  }

  // Run all benchmarks
  for (const benchmark of group.benchmarks) {
    const results = await runBenchmark(
      benchmark,
      runner,
      options,
      useWorker,
      params,
    );

    reports.push({
      name: benchmark.name,
      measuredResults: results[0],
      metadata: group.metadata,
    });
  }

  return { reports, baseline };
}
