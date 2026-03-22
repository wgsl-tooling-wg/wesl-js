import { expect } from "vitest";
import { withLogger, withLoggerAsync } from "../Logging.ts";

export interface LogCatcher {
  /** tests can use this to replace console.log with a log capturing function */
  log: (...params: any[]) => void;
  logged: () => string;
}

export function logCatch(): LogCatcher {
  const lines: string[] = [];
  function log(...params: any[]): void {
    lines.push(params.join(" "));
  }
  function logged(): string {
    return lines.join("\n");
  }
  return { log, logged };
}

/** run a test function and expect that no error logs are produced */
export function expectNoLog<T>(fn: () => T): T {
  const { log, logged } = logCatch();
  let result: T | undefined;

  try {
    result = withLogger(log, fn);
  } finally {
    if (logged()) {
      console.log(logged());
    }
    expect(logged()).toBe("");
  }
  return result;
}

export async function expectNoLogAsync<T>(fn: () => Promise<T>): Promise<T> {
  const { log, logged } = logCatch();
  const result = await withLoggerAsync(log, fn);
  if (logged()) {
    console.log(logged());
  }
  expect(logged()).toBe("");
  return result;
}

export async function withLogSpyAsync(
  fn: () => Promise<void>,
): Promise<string> {
  const catcher = logCatch();
  await withLoggerAsync(catcher.log, fn);
  return catcher.logged();
}
