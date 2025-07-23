import { parentPort, Worker } from "node:worker_threads";
import { formatError } from "./BenchmarkErrors.ts";
import type { MeasureOptions } from "./mitata-util/MitataBench.ts";
import type { MeasuredResults } from "./mitata-util/MitataStats.ts";
import type { RunnerOptions } from "./runners/RunnerUtils.ts";
import type { WorkerMessage, WorkerResult } from "./WorkerBench.ts";

// Exports at the top

/** Execute a message in a worker thread */
export async function runInWorker<T>(
  workerScript: string,
  message: T,
): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const worker = createWorker(workerScript);
    setupWorkerStreams(worker);
    setupWorkerHandlers(worker, resolve, reject);
    worker.postMessage(message);
  });
}

/** Run a benchmark in a worker thread */
export async function runBenchmarkInWorkerThread(
  workerScript: string,
  message: WorkerMessage,
  onError?: (error: string) => void,
): Promise<MeasuredResults | undefined> {
  const result = (await runInWorker(workerScript, message)) as WorkerResult;

  if (result.error) {
    onError?.(result.error);
    return undefined;
  }

  return result.measured;
}

/** Create a unified message creator */
export function createBenchmarkMessage(
  config: BenchmarkRunConfig,
  messageData: Record<string, any>,
): WorkerMessage {
  const { name, opts, runner, runnerOpts, isBaseline } = config;
  const testName = isBaseline ? "--> baseline" : name;

  const { type, ...restMessageData } = messageData;

  return {
    type,
    runner,
    opts,
    isBaseline,
    testName,
    runnerOpts,
    ...restMessageData,
  };
}

/** Create runner options from measure options */
export function createRunnerOptions(
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

/** Send error result to parent worker */
export function sendErrorResult(error: unknown): void {
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

/** Reconstruct a function from its string representation */
export function reconstructFunction<T = unknown>(
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

/** Benchmark runner configuration */
export interface BenchmarkRunConfig {
  name: string;
  opts: MeasureOptions;
  runner: WorkerMessage["runner"];
  runnerOpts?: RunnerOptions;
  isBaseline: boolean;
}

// Private utilities at the bottom

/** Create worker with proper configuration */
function createWorker(workerScript: string): Worker {
  return new Worker(workerScript, {
    stdout: true,
    stderr: true,
  });
}

/** Setup stdout/stderr forwarding */
function setupWorkerStreams(worker: Worker): void {
  if (worker.stdout) {
    worker.stdout.on("data", data => {
      process.stdout.write(data);
    });
  }

  if (worker.stderr) {
    worker.stderr.on("data", data => {
      process.stderr.write(data);
    });
  }
}

/** Setup worker event handlers */
function setupWorkerHandlers(
  worker: Worker,
  resolve: (result: WorkerResult) => void,
  reject: (error: Error) => void,
): void {
  worker.on("message", (result: WorkerResult) => {
    worker.terminate();
    resolve(result);
  });

  worker.on("error", error => {
    worker.terminate();
    reject(error);
  });

  worker.on("exit", code => {
    if (code !== 0) {
      reject(new Error(`Worker stopped with exit code ${code}`));
    }
  });
}
