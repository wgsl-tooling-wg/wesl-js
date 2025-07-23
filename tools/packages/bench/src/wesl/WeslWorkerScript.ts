import { parentPort } from "node:worker_threads";
import { formatError } from "../BenchmarkErrors.ts";
import type { MeasuredResults } from "../mitata-util/MitataStats.ts";
import { getRunner } from "../runners/RunnerFactory.ts";
import type { WorkerMessage, WorkerResult } from "../WorkerBench.ts";
import {
  createRunnerOptions,
  reconstructFunction,
  sendErrorResult,
} from "../WorkerHelpers.ts";
import {
  createVariantFunction,
  type ParserVariant,
} from "./BenchVariations.ts";
import type { BenchTest as WeslBenchTest } from "./WeslBenchmarks.ts";

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
  if (message.type === "simple") {
    return executeSimpleBenchmark(message, runnerName, options);
  } else {
    return executeWeslBenchmark(message, runnerName, options);
  }
}

// Execute simple benchmark
async function executeSimpleBenchmark(
  message: WorkerMessage,
  runnerName: string,
  options: RunnerOptions,
): Promise<MeasuredResults> {
  const { testName, simpleFn, weslSrc } = message;

  if (!simpleFn || !weslSrc) {
    throw new Error("Missing simpleFn or weslSrc for simple benchmark");
  }

  const fn = reconstructFunction(simpleFn);
  const runner = getRunner(
    runnerName as "standard" | "tinybench" | "manual" | "vanilla-mitata",
  );

  const spec = {
    name: testName,
    fn: () => fn(weslSrc),
    params: weslSrc,
  };

  return runner.runSingleBenchmark(spec, options);
}

// Execute WESL benchmark
async function executeWeslBenchmark(
  message: WorkerMessage,
  runnerName: string,
  options: RunnerOptions,
): Promise<MeasuredResults> {
  const { test, variant, isBaseline, testName } = message;

  if (!test || !variant) {
    throw new Error("Missing test or variant for WESL benchmark");
  }

  const fn = await getVariantFunction(variant, isBaseline ?? false);
  const { weslSrc, rootModuleName } = prepareBenchmarkData(test);
  const runner = getRunner(
    runnerName as "standard" | "tinybench" | "manual" | "vanilla-mitata",
  );

  const spec = {
    name: testName,
    fn: () => fn({ weslSrc, rootModuleName }),
    params: { weslSrc, rootModuleName },
  };

  return runner.runSingleBenchmark(spec, options);
}

async function getVariantFunction(
  variant: ParserVariant,
  isBaseline: boolean,
): Promise<
  (params: { weslSrc: Record<string, string>; rootModuleName: string }) => void
> {
  const variantFunctions = await createVariantFunction(variant, isBaseline);
  const fn = isBaseline ? variantFunctions.baseline : variantFunctions.current;

  if (!fn) {
    throw new Error(
      `No ${isBaseline ? "baseline" : "current"} function available for variant ${variant}`,
    );
  }
  return fn;
}

// Utility functions
function logBenchmarkStart(message: WorkerMessage, runner: string): void {
  const benchInfo = message.isBaseline ? "baseline" : "main";
  const prefix = message.type === "simple" ? "simple " : "standard ";

  console.log(
    `[Worker] Running ${prefix}${benchInfo} benchmark: ${message.testName} with ${runner} runner`,
  );
}

function prepareBenchmarkData(test: WeslBenchTest): {
  weslSrc: Record<string, string>;
  rootModuleName: string;
} {
  return {
    weslSrc: Object.fromEntries(test.files.entries()),
    rootModuleName: test.mainFile,
  };
}
