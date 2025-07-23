import { parentPort } from "node:worker_threads";
import { formatError } from "./BenchmarkErrors.ts";
import type { MeasureOptions } from "./mitata-util/MitataBench.ts";
import type { MeasuredResults } from "./mitata-util/MitataStats.ts";
import { getRunner } from "./runners/RunnerFactory.ts";
import type { RunnerOptions } from "./runners/RunnerUtils.ts";
import type { WorkerMessage, WorkerResult } from "./WorkerBench.ts";

if (!parentPort) {
  throw new Error("This script must be run in a worker thread");
}

parentPort.on("message", handleWorkerMessage);

// Main message handler
async function handleWorkerMessage(message: WorkerMessage): Promise<void> {
  try {
    await handleMessage(message);
  } catch (error) {
    sendErrorResult(error);
  }
}

// Handle all benchmark messages
async function handleMessage(message: WorkerMessage): Promise<void> {
  const { runner = "standard", runnerOpts = {} } = message;

  logBenchmarkStart(message, runner);
  const options = createRunnerOptions(message.opts, runnerOpts);

  const measured = await executeBenchmark(message, runner, options);

  const result: WorkerResult = { type: "result", measured };
  parentPort!.postMessage(result);
}

// Execute benchmark based on message type
async function executeBenchmark(
  message: WorkerMessage,
  runnerName: string,
  options: RunnerOptions,
): Promise<MeasuredResults> {
  if (message.type === "benchmark" && message.benchmarkSpec) {
    return executeBenchmarkSpec(message, runnerName, options);
  } else {
    // Handle any other message type through generic benchmark spec
    return executeGenericBenchmark(message, runnerName, options);
  }
}

// Execute a benchmark spec
async function executeBenchmarkSpec(
  message: WorkerMessage,
  runnerName: string,
  options: RunnerOptions,
): Promise<MeasuredResults> {
  const { benchmarkSpec } = message;

  if (!benchmarkSpec) {
    throw new Error("Missing benchmarkSpec for benchmark");
  }

  const runner = getRunner(
    runnerName as "standard" | "tinybench" | "manual" | "vanilla-mitata",
  );

  // Reconstruct function from string
  const fn = reconstructFunction(benchmarkSpec.fn);

  // Create a proper benchmark spec
  const spec = {
    name: benchmarkSpec.name,
    fn,
    params: benchmarkSpec.params,
  };

  return runner.runSingleBenchmark(spec, options);
}

// Execute generic benchmark through dynamic loading
async function executeGenericBenchmark(
  message: WorkerMessage,
  runnerName: string,
  options: RunnerOptions,
): Promise<MeasuredResults> {
  // WESL-specific implementations will provide a benchmarkSpec
  // with the function already serialized
  if (!message.benchmarkSpec) {
    throw new Error(
      "Generic benchmark requires benchmarkSpec with serialized function",
    );
  }

  return executeBenchmarkSpec(message, runnerName, options);
}

// Utility functions
function createRunnerOptions(
  opts: MeasureOptions,
  runnerOpts: RunnerOptions = {},
): RunnerOptions {
  return {
    time: opts.min_cpu_time ? opts.min_cpu_time / 1e9 : 1,
    cpuCounters: opts.cpuCounters,
    observeGc: opts.observeGC,
    ...runnerOpts,
  };
}

function logBenchmarkStart(message: WorkerMessage, runner: string): void {
  const isBaseline = message.benchmarkSpec?.isBaseline ?? false;
  const benchInfo = isBaseline ? "baseline" : "main";

  console.log(
    `[Worker] Running ${benchInfo} benchmark: ${message.testName} with ${runner} runner`,
  );
}

function sendErrorResult(error: unknown): void {
  const result: WorkerResult = {
    type: "result",
    measured: {} as MeasuredResults,
    error:
      error instanceof Error
        ? `${error.message}\n${error.stack}`
        : String(error),
  };
  parentPort!.postMessage(result);
}

/** Safely reconstruct a function from its string representation */
function reconstructFunction<T = unknown>(
  fnString: string,
): (params: T) => unknown {
  try {
    // Use Function constructor which is safer than eval
    // It creates functions in global scope, not local scope
    return new Function("return " + fnString)() as (params: T) => unknown;
  } catch (error) {
    throw new Error(`Failed to reconstruct function: ${formatError(error)}`);
  }
}
