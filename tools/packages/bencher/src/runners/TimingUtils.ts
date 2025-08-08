export const debugWorkerTiming = false;

/** Get current time or 0 if debugging disabled */
export function getPerfNow(): number {
  return debugWorkerTiming ? performance.now() : 0;
}

/** Calculate elapsed milliseconds between marks */
export function getElapsed(startMark: number, endMark?: number): number {
  if (!debugWorkerTiming) return 0;
  const end = endMark ?? performance.now();
  return end - startMark;
}
