import { fork } from "node:child_process";
import path from "node:path";
import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import type { RunnerOptions } from "./BenchRunner.ts";
import { createRunner, type KnownRunner } from "./CreateRunner.ts";
import { debugWorkerTiming, getElapsed, getPerfNow } from "./TimingUtils.ts";
import type {
  ErrorMessage,
  ResultMessage,
  RunMessage,
} from "./WorkerScript.ts";

const logTiming = debugWorkerTiming
  ? (message: string) => console.log(`[RunnerOrchestrator] ${message}`)
  : () => {};

type WorkerParams<T = unknown> = {
  spec: BenchmarkSpec<T>;
  runner: KnownRunner;
  options: RunnerOptions;
  params?: T;
};

type WorkerHandlers = {
  resolve: (results: MeasuredResults[]) => void;
  reject: (error: Error) => void;
};

interface RunBenchmarkParams<T = unknown> {
  spec: BenchmarkSpec<T>;
  runner: KnownRunner;
  options: RunnerOptions;
  useWorker?: boolean;
  params?: T;
}

/** Execute benchmarks directly or in worker process */
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

  return runInWorker({ spec, runner, options, params });
}

/** Run benchmark in isolated worker process */
async function runInWorker<T>(
  workerParams: WorkerParams<T>,
): Promise<MeasuredResults[]> {
  const { spec, runner, options, params } = workerParams;
  const startTime = getPerfNow();
  logTiming(`Starting worker for ${spec.name} with ${runner}`);

  return new Promise((resolve, reject) => {
    const workerStartTime = getPerfNow();
    const worker = createWorkerProcess();
    const workerCreateTime = getPerfNow();
    logTiming(
      `Worker process created in ${getElapsed(workerStartTime, workerCreateTime).toFixed(1)}ms`,
    );

    const handlers = createWorkerHandlers(
      spec.name,
      startTime,
      resolve,
      reject,
    );
    setupWorkerHandlers(worker, spec.name, handlers);

    const runMessage = createRunMessage(spec, runner, options, params);
    const messageTime = getPerfNow();
    worker.send(runMessage);
    logTiming(
      `Message sent to worker in ${getElapsed(workerCreateTime, messageTime).toFixed(1)}ms`,
    );
  });
}

/** Setup worker event handlers with cleanup */
function setupWorkerHandlers(
  worker: ReturnType<typeof createWorkerProcess>,
  specName: string,
  handlers: WorkerHandlers,
) {
  const { resolve, reject } = handlers;
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

/** Create cleanup for timeout and termination */
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

/** Create worker process with configuration */
function createWorkerProcess() {
  const workerPath = path.join(import.meta.dirname!, "WorkerScript.ts");

  return fork(workerPath, [], {
    execArgv: ["--expose-gc", "--allow-natives-syntax", "--import", "tsx"],
    silent: false,
    env: {
      ...process.env,
      NODE_OPTIONS: "",
    },
  });
}

// Consider: --no-compilation-cache, --max-old-space-size=512, --no-lazy
// for consistency (less realistic)

function createWorkerHandlers(
  specName: string,
  startTime: number,
  resolve: (results: MeasuredResults[]) => void,
  reject: (error: Error) => void,
): WorkerHandlers {
  return {
    resolve: (results: MeasuredResults[]) => {
      const totalTime = getElapsed(startTime);
      logTiming(`Total worker time for ${specName}: ${totalTime.toFixed(1)}ms`);
      resolve(results);
    },
    reject,
  };
}

/** Create message for worker execution */
function createRunMessage<T>(
  spec: BenchmarkSpec<T>,
  runnerName: KnownRunner,
  options: RunnerOptions,
  params?: T,
): RunMessage {
  const { fn, ...specWithoutFn } = spec;
  const message: RunMessage = {
    type: "run",
    spec: specWithoutFn as BenchmarkSpec,
    runnerName,
    options,
    params,
  };

  if (spec.modulePath) {
    message.modulePath = spec.modulePath;
    message.exportName = spec.exportName;
  } else {
    message.fnCode = fn.toString();
  }

  return message;
}
