/** Shared timing utilities for worker debugging */

export const debugWorkerTiming = false;

/** Get current time in milliseconds, or 0 if timing is disabled */
export function getPerfNow(): number {
  return debugWorkerTiming ? performance.now() : 0;
}

/** Calculate elapsed time between marks */
export function getElapsed(startMark: number, endMark?: number): number {
  if (!debugWorkerTiming) return 0;
  const end = endMark ?? performance.now();
  return end - startMark;
}
