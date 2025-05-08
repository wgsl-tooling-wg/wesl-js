import { withLogger, withLoggerAsync } from "../mod.ts";

export interface LogCatcher {
  /** tests can use this to replace console.log with a log capturing function */
  // deno-lint-ignore no-explicit-any
  log: (...params: any[]) => void;
  logged: () => string;
}

export function logCatch(): LogCatcher {
  const lines: string[] = [];
  // deno-lint-ignore no-explicit-any
  function log(...params: any[]): void {
    lines.push(params.join(" "));
  }
  function logged(): string {
    return lines.join("\n");
  }
  return { log, logged };
}

export function withLogSpy(fn: () => void): string {
  const catcher = logCatch();
  withLogger((c) => catcher.log(c), fn);
  return catcher.logged();
}

export async function withLogSpyAsync(
  fn: () => Promise<void>,
): Promise<string> {
  const catcher = logCatch();
  await withLoggerAsync((c) => catcher.log(c), fn);
  return catcher.logged();
}
