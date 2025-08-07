import { fork } from "node:child_process";
import path from "node:path";
import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import type { RunnerOptions } from "./BenchRunner.ts";
import { createRunner, type KnownRunner } from "./CreateRunner.ts";
import { debugWorkerTiming, getElapsed, getPerfNow } from "./TimingUtils.ts";

/** Message sent to worker process to start a benchmark run. */
interface RunMessage {
  type: "run";
  spec: BenchmarkSpec;
  runnerName: KnownRunner;
  options: RunnerOptions;
  fnCode: string;
  params?: unknown;
}

/** Message returned from worker process with benchmark results. */
interface ResultMessage {
  type: "result";
  results: MeasuredResults[];
}

/** Message returned from worker process when benchmark fails. */
interface ErrorMessage {
  type: "error";
  error: string;
  stack?: string;
}

/** Log timing information when debugging is enabled */
const logTiming = debugWorkerTiming
  ? (message: string) => console.log(`[RunnerOrchestrator] ${message}`)
  : () => {};

interface RunBenchmarkParams<T = unknown> {
  spec: BenchmarkSpec<T>;
  runner: KnownRunner;
  options: RunnerOptions;
  useWorker?: boolean;
  params?: T;
}

/** Executes benchmarks either directly or in isolated worker processes. */
export async function runBenchmark<T = unknown>({
  spec,
  runner,
  options,
  useWorker = false,
  params,
}: RunBenchmarkParams<T>): Promise<MeasuredResults[]> {
  if (!useWorker) {
    const benchRunner = await createRunner(runner);
    return benchRunner.runBench(spec, options, params);
  }

  return runInWorker(spec, runner, options, params);
}

/** Runs benchmark in isolated worker process. */
async function runInWorker<T>(
  spec: BenchmarkSpec<T>,
  runnerName: KnownRunner,
  options: RunnerOptions,
  params?: T,
): Promise<MeasuredResults[]> {
  const startTime = getPerfNow();
  logTiming(`Starting worker for ${spec.name} with ${runnerName}`);

  return new Promise((resolve, reject) => {
    const workerStartTime = getPerfNow();
    const worker = createWorkerProcess();
    const workerCreateTime = getPerfNow();
    logTiming(
      `Worker process created in ${getElapsed(workerStartTime, workerCreateTime).toFixed(1)}ms`,
    );

    setupWorkerHandlers(
      worker,
      spec.name,
      results => {
        const totalTime = getElapsed(startTime);
        logTiming(
          `Total worker time for ${spec.name}: ${totalTime.toFixed(1)}ms`,
        );
        resolve(results);
      },
      reject,
    );

    const runMessage = createRunMessage(spec, runnerName, options, params);
    const messageTime = getPerfNow();
    worker.send(runMessage);
    logTiming(
      `Message sent to worker in ${getElapsed(workerCreateTime, messageTime).toFixed(1)}ms`,
    );
  });
}

/** Sets up worker event handlers with cleanup and promise resolution. */
function setupWorkerHandlers(
  worker: ReturnType<typeof createWorkerProcess>,
  specName: string,
  resolve: (results: MeasuredResults[]) => void,
  reject: (error: Error) => void,
) {
  const cleanup = createCleanup(worker, specName, reject);

  worker.on("message", (message: ResultMessage | ErrorMessage) => {
    cleanup();
    if (message.type === "result") {
      resolve(message.results);
    } else if (message.type === "error") {
      const error = new Error(
        `Benchmark "${specName}" failed: ${message.error}`,
      );
      if (message.stack) error.stack = message.stack;
      reject(error);
    }
  });

  worker.on("error", error => {
    cleanup();
    reject(
      new Error(
        `Worker process failed for benchmark "${specName}": ${error.message}`,
      ),
    );
  });

  worker.on("exit", (code, _signal) => {
    if (code !== 0 && code !== null) {
      cleanup();
      reject(
        new Error(
          `Worker process exited unexpectedly with code ${code} for benchmark "${specName}"`,
        ),
      );
    }
  });
}

/** Creates cleanup function that handles timeout and worker termination. */
function createCleanup(
  worker: ReturnType<typeof createWorkerProcess>,
  specName: string,
  reject: (error: Error) => void,
) {
  const timeoutId = setTimeout(() => {
    cleanup();
    reject(new Error(`Benchmark "${specName}" timed out after 60 seconds`));
  }, 60000);

  const cleanup = () => {
    clearTimeout(timeoutId);
    if (!worker.killed) {
      worker.kill("SIGTERM");
    }
  };

  return cleanup;
}

/** Creates worker process with proper configuration. */
function createWorkerProcess() {
  const workerPath = path.join(import.meta.dirname!, "WorkerScript.ts");
  return fork(workerPath, [], {
    execArgv: ["--expose-gc", "--allow-natives-syntax", "--import", "tsx"],
    silent: false,
    env: { ...process.env, NODE_OPTIONS: "" },
  });
}

/*
consider using these options for worker processes for more consistency (but less realism).
    "--no-compilation-cache",    // Prevent JIT compilation caching between runs
    "--max-old-space-size=512",  // Consistent memory limits
    "--no-lazy",                 // Consistent compilation behavior
*/

/** Creates run message for worker. */
function createRunMessage<T>(
  spec: BenchmarkSpec<T>,
  runnerName: KnownRunner,
  options: RunnerOptions,
  params?: T,
): RunMessage {
  return {
    type: "run",
    spec: spec as BenchmarkSpec,
    runnerName,
    options,
    fnCode: spec.fn.toString(),
    params,
  };
}
