import { withLogger } from "mini-parse";

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

export async function withLogSpy(fn: () => Promise<void>): Promise<string> {
  const catcher = logCatch();
  withLogger(c => catcher.log(c), fn);
  return catcher.logged();
}
