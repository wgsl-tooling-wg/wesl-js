#!/usr/bin/env node
import type { BenchmarkFunction, BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import type { RunnerOptions } from "./BenchRunner.ts";
import { createRunner, type KnownRunner } from "./CreateRunner.ts";
import { debugWorkerTiming, getElapsed, getPerfNow } from "./TimingUtils.ts";

interface RunMessage {
  type: "run";
  spec: BenchmarkSpec;
  runnerName: KnownRunner;
  options: RunnerOptions;
  fnCode: string;
  params?: unknown;
}

interface ResultMessage {
  type: "result";
  results: MeasuredResults[];
}

interface ErrorMessage {
  type: "error";
  error: string;
  stack?: string;
}

const workerStartTime = getPerfNow();

/**
 * Worker process entry point for isolated benchmark execution.
 *
 * Uses eval() to reconstruct functions - safe because:
 * - Isolated child process
 * - Code from trusted source
 * - Process exits after execution
 * - No network/file access
 */
process.on("message", async (message: RunMessage) => {
  if (message.type !== "run") return;

  logTiming(`Processing ${message.spec.name} with ${message.runnerName}`);

  try {
    const start = getPerfNow();
    const runner = await createRunner(message.runnerName);
    logTiming("Runner created in", getElapsed(start));

    const fn = reconstructFunction(message.fnCode);
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

// Keep the process alive to receive messages, but exit after 5 minutes to prevent zombie processes
const maxLifetime = 5 * 60 * 1000; // 5 minutes
setTimeout(() => {
  console.error("WorkerScript: Maximum lifetime exceeded, exiting");
  process.exit(1);
}, maxLifetime);

// Keep the process alive until we receive a first message
process.stdin.pause();

/** Log operation timing with consistent format */
const logTiming = debugWorkerTiming ? _logTiming : () => {};
function _logTiming(operation: string, duration?: number) {
  if (duration === undefined) {
    console.log(`[Worker] ${operation}`);
  } else {
    console.log(`[Worker] ${operation} ${duration.toFixed(1)}ms`);
  }
}

/** Send message and exit with total duration logging */
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

/** Reconstruct function from serialized code */
function reconstructFunction(fnCode: string): BenchmarkFunction {
  // biome-ignore lint/security/noGlobalEval: Necessary for worker process isolation, code is from trusted source
  const fn = eval(`(${fnCode})`);
  if (typeof fn !== "function") {
    throw new Error("Reconstructed code is not a function");
  }
  return fn;
}

/** Create error message from caught exception */
function createErrorMessage(error: unknown): ErrorMessage {
  return {
    type: "error",
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
}
