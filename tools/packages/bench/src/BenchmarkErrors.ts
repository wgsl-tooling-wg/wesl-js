/** Format error messages consistently across the codebase */
export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Log benchmark errors with consistent formatting */
function logBenchmarkError(
  context: string,
  error: unknown,
  details?: Record<string, unknown>,
): void {
  const message = formatError(error);
  const detailsStr = details ? ` ${JSON.stringify(details)}` : "";
  console.error(`${context}: ${message}${detailsStr}`);
}

/** Handle worker errors consistently */
export function handleWorkerError(testName: string, error: unknown): null {
  logBenchmarkError(`${testName} worker failed`, error);
  return null;
}
