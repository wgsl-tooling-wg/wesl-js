import { hideBin } from "yargs/helpers";
import type { BenchGroup, BenchmarkSpec, BenchSuite } from "../Benchmark.ts";
import type { BenchmarkReport, ReportGroup } from "../BenchmarkReport.ts";
import { reportResults } from "../BenchmarkReport.ts";
import type { RunnerOptions } from "../runners/BenchRunner.ts";
import type { KnownRunner } from "../runners/CreateRunner.ts";
import { runBenchmark } from "../runners/RunnerOrchestrator.ts";
import {
  adaptiveTimeSection,
  cpuSection,
  gcSection,
  runsSection,
  timeSection,
  totalTimeSection,
} from "../StandardSections.ts";
import {
  type ConfigureArgs,
  type DefaultCliArgs,
  parseCliArgs,
} from "./CliArgs.ts";
import { filterBenchmarks } from "./FilterBenchmarks.ts";

type RunParams = {
  runner: KnownRunner;
  options: RunnerOptions;
  useWorker: boolean;
  params: unknown;
  metadata?: Record<string, any>;
};

type SuiteParams = {
  runner: KnownRunner;
  options: RunnerOptions;
  useWorker: boolean;
  suite: BenchSuite;
};

/** Parse CLI with custom configuration */
export function parseBenchArgs<T = DefaultCliArgs>(
  configureArgs?: ConfigureArgs<T>,
): T & DefaultCliArgs {
  const argv = hideBin(process.argv);
  return parseCliArgs(argv, configureArgs) as T & DefaultCliArgs;
}

/** Run suite with CLI arguments */
export async function runBenchmarks(
  suite: BenchSuite,
  args: DefaultCliArgs,
): Promise<ReportGroup[]> {
  const { filter, profile, worker: useWorker } = args;
  const runner = profile ? "basic" : (args.runner as KnownRunner);
  const options = cliToRunnerOptions(args);
  const filtered = filterBenchmarks(suite, filter);

  const reportGroups = await runSuite({
    suite: filtered,
    runner,
    options,
    useWorker,
  });

  return reportGroups;
}

/** Execute all groups in suite */
async function runSuite(params: SuiteParams): Promise<ReportGroup[]> {
  const { suite, runner, options, useWorker } = params;
  const reportGroups: ReportGroup[] = [];

  for (const group of suite.groups) {
    const groupResult = await runGroup(group, runner, options, useWorker);
    reportGroups.push(groupResult);
  }
  return reportGroups;
}

/** Execute group with shared setup */
async function runGroup(
  group: BenchGroup,
  runner: KnownRunner,
  options: RunnerOptions,
  useWorker: boolean,
): Promise<ReportGroup> {
  const { benchmarks, baseline, setup, metadata } = group;
  const setupParams = await setup?.();
  const runParams = {
    runner,
    options,
    useWorker,
    params: setupParams,
    metadata,
  };

  validateBenchmarkParameters(group);

  const baselineReport = baseline
    ? await runSingleBenchmark(baseline, runParams)
    : undefined;

  const benchmarkReports = [];
  for (const benchmark of benchmarks) {
    benchmarkReports.push(await runSingleBenchmark(benchmark, runParams));
  }

  return { reports: benchmarkReports, baseline: baselineReport };
}

/** Run single benchmark and create report */
async function runSingleBenchmark(
  spec: BenchmarkSpec,
  runParams: RunParams,
): Promise<BenchmarkReport> {
  const { runner, options, useWorker, params, metadata } = runParams;
  const benchmarkParams = { spec, runner, options, useWorker, params };
  const [result] = await runBenchmark(benchmarkParams);
  return { name: spec.name, measuredResults: result, metadata };
}

/** Warn if parameterized benchmarks lack setup */
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

/** Generate table with standard sections */
export function defaultReport(
  groups: ReportGroup[],
  args: DefaultCliArgs,
): string {
  const { adaptive, "observe-gc": observeGC } = args;
  const hasCpuData = groups.some(({ reports }) =>
    reports.some(({ measuredResults }) => measuredResults.cpu !== undefined),
  );

  const sections = buildReportSections(adaptive, observeGC, hasCpuData);
  return reportResults(groups, sections);
}

/** Build report sections based on CLI options */
function buildReportSections(
  adaptive: boolean,
  observeGC: boolean,
  hasCpuData: boolean,
) {
  const sections = adaptive
    ? [adaptiveTimeSection, runsSection, totalTimeSection]
    : [timeSection, runsSection];

  if (observeGC) sections.push(gcSection);
  if (hasCpuData) sections.push(cpuSection);

  return sections;
}

/** Run benchmarks and display table */
export async function runDefaultBench(
  suite: BenchSuite,
  configureArgs?: ConfigureArgs<any>,
): Promise<void> {
  const args = parseBenchArgs(configureArgs);
  const results = await runBenchmarks(suite, args);
  const report = defaultReport(results, args);
  console.log(report);
}

/** Convert CLI args to runner options */
export function cliToRunnerOptions(args: DefaultCliArgs): RunnerOptions {
  const {
    profile,
    collect,
    time,
    cpu,
    "observe-gc": observeGC,
    adaptive,
  } = args;

  if (profile) {
    return createProfileOptions(collect);
  }

  if (adaptive) {
    return createAdaptiveOptions(args, time, observeGC, collect, cpu);
  }

  return { minTime: time * 1000, observeGC, collect, cpuCounters: cpu };
}

/** Create options for profiling mode */
function createProfileOptions(collect?: boolean): RunnerOptions {
  return { maxIterations: 1, warmupTime: 0, observeGC: false, collect };
}

/** Create options for adaptive mode */
function createAdaptiveOptions(
  args: DefaultCliArgs,
  time: number,
  observeGC: boolean,
  collect: boolean | undefined,
  cpu: boolean | undefined,
): RunnerOptions {
  return {
    minTime: time * 1000,
    maxTime: (args["max-time"] || 30) * 1000,
    observeGC,
    collect,
    cpuCounters: cpu,
    adaptive: true,
  } as any;
}
