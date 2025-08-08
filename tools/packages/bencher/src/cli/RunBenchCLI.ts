import { hideBin } from "yargs/helpers";
import type { BenchGroup, BenchmarkSpec, BenchSuite } from "../Benchmark.ts";
import type { BenchmarkReport, ReportGroup } from "../BenchmarkReport.ts";
import { reportResults } from "../BenchmarkReport.ts";
import type { RunnerOptions } from "../runners/BenchRunner.ts";
import type { KnownRunner } from "../runners/CreateRunner.ts";
import { runBenchmark } from "../runners/RunnerOrchestrator.ts";
import {
  cpuSection,
  gcSection,
  runsSection,
  timeSection,
} from "../StandardSections.ts";
import {
  type ConfigureArgs,
  type DefaultCliArgs,
  parseCliArgs,
} from "./CliArgs.ts";
import { filterBenchmarks } from "./FilterBenchmarks.ts";

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
async function runSuite(params: SuiteRunParams): Promise<ReportGroup[]> {
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

/** Run single benchmark and create report */
async function runSingleBenchmark(
  spec: BenchmarkSpec,
  runParams: SpecRunParams,
): Promise<BenchmarkReport> {
  const { runner, options, useWorker, params, metadata } = runParams;
  const benchParams = { spec, runner, options, useWorker, params };
  const [result] = await runBenchmark(benchParams);
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
  const hasCpuData = groups.some(({ reports }) =>
    reports.some(({ measuredResults }) => measuredResults.cpu !== undefined),
  );

  const sections = [timeSection, runsSection] as const;
  let finalSections: any[] = args["observe-gc"]
    ? [...sections, gcSection]
    : [...sections];

  if (hasCpuData) {
    finalSections = [...finalSections, cpuSection];
  }

  return reportResults(groups, finalSections);
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
  const { profile, collect, time, cpu, "observe-gc": observeGC } = args;
  if (profile) {
    // Single iteration for profiler attachment
    return { maxIterations: 1, warmupTime: 0, observeGC: false, collect };
  }
  return { minTime: time * 1000, observeGC, collect, cpuCounters: cpu };
}
