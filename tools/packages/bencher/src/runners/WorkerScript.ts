#!/usr/bin/env node
import type { BenchmarkFunction, BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import type { RunnerOptions } from "./BenchRunner.ts";
import { createRunner, type KnownRunner } from "./CreateRunner.ts";
import { debugWorkerTiming, getElapsed, getPerfNow } from "./TimingUtils.ts";

// Constants at the top
const workerStartTime = getPerfNow();
const maxLifetime = 5 * 60 * 1000; // 5 minutes

/** Message sent to worker process to start a benchmark run. */
export interface RunMessage {
  type: "run";
  spec: BenchmarkSpec;
  runnerName: KnownRunner;
  options: RunnerOptions;
  fnCode?: string; // Made optional - either fnCode or modulePath is required
  modulePath?: string; // Path to module for dynamic import
  exportName?: string; // Export name from module
  params?: unknown;
}

/** Message returned from worker process with benchmark results. */
export interface ResultMessage {
  type: "result";
  results: MeasuredResults[];
}

/** Message returned from worker process when benchmark fails. */
export interface ErrorMessage {
  type: "error";
  error: string;
  stack?: string;
}

export type WorkerMessage = RunMessage | ResultMessage | ErrorMessage;

/**
 * Worker process for isolated benchmark execution.
 * Uses eval() safely in isolated child process with trusted code.
 */
process.on("message", async (message: RunMessage) => {
  if (message.type !== "run") return;

  logTiming(`Processing ${message.spec.name} with ${message.runnerName}`);

  try {
    const start = getPerfNow();
    const runner = await createRunner(message.runnerName);
    logTiming("Runner created in", getElapsed(start));

    const fn = message.modulePath
      ? await importBenchmarkFunction(message.modulePath, message.exportName)
      : reconstructFunction(message.fnCode!);
    const spec: BenchmarkSpec = { ...message.spec, fn };

    const benchStart = getPerfNow();
    const results = await runner.runBench(
      spec,
      message.options,
      message.params,
    );
    logTiming("Benchmark execution took", getElapsed(benchStart));

    sendAndExit({ type: "result", results }, 0);
  } catch (error) {
    sendAndExit(createErrorMessage(error), 1);
  }
});

// Exit after 5 minutes to prevent zombie processes
setTimeout(() => {
  console.error("WorkerScript: Maximum lifetime exceeded, exiting");
  process.exit(1);
}, maxLifetime);

process.stdin.pause();

/** Log timing with consistent format */
const logTiming = debugWorkerTiming ? _logTiming : () => {};
function _logTiming(operation: string, duration?: number) {
  if (duration === undefined) {
    console.log(`[Worker] ${operation}`);
  } else {
    console.log(`[Worker] ${operation} ${duration.toFixed(1)}ms`);
  }
}

/** Send message and exit with duration log */
function sendAndExit(message: ResultMessage | ErrorMessage, exitCode: number) {
  process.send!(message, (err: Error | null) => {
    if (err) {
      const msgType = message.type === "result" ? "results" : "error message";
      console.error(`[Worker] Error sending ${msgType}:`, err);
    }
    const totalTime = getElapsed(workerStartTime);
    const suffix = exitCode === 0 ? "" : " (error)";
    logTiming(`Total worker duration${suffix}:`, totalTime);
    process.exit(exitCode);
  });
}

/** Import benchmark function from module path */
async function importBenchmarkFunction(
  modulePath: string,
  exportName?: string,
): Promise<BenchmarkFunction> {
  logTiming(
    `Importing from ${modulePath}${exportName ? ` (${exportName})` : ""}`,
  );
  const module = await import(modulePath);

  if (exportName) {
    const fn = module[exportName];
    if (typeof fn !== "function") {
      throw new Error(
        `Export '${exportName}' from ${modulePath} is not a function`,
      );
    }
    return fn;
  }

  const fn = module.default || module;
  if (typeof fn !== "function") {
    throw new Error(`Default export from ${modulePath} is not a function`);
  }
  return fn;
}

/** Reconstruct function from string code */
function reconstructFunction(fnCode: string): BenchmarkFunction {
  // biome-ignore lint/security/noGlobalEval: Necessary for worker process isolation, code is from trusted source
  const fn = eval(`(${fnCode})`); // eslint-disable-line no-eval
  if (typeof fn !== "function") {
    throw new Error("Reconstructed code is not a function");
  }
  return fn;
}

/** Create error message from exception */
function createErrorMessage(error: unknown): ErrorMessage {
  return {
    type: "error",
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
}
