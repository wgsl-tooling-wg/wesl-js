/** base logger. (can be overriden to a capturing logger for tests) */
export let log = console.log;

/** use temporary logger for tests */
export function withLogger<T>(logFn: typeof console.log, fn: () => T): T {
  const orig = log;
  try {
    log = logFn;
    return fn();
  } finally {
    log = orig;
  }
}

/** use temporary logger for tests */
export async function withLoggerAsync<T>(
  logFn: typeof console.log,
  fn: () => Promise<T>,
): Promise<T> {
  const orig = log;
  try {
    log = logFn;
    return await fn();
  } finally {
    log = orig;
  }
}
