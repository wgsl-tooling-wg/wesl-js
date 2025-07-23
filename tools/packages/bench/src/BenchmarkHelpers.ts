/** Check if baseline should be run for a benchmark */
export function shouldRunBaseline<T extends { baseline?: any }>(
  options: { useBaseline?: boolean },
  benchmark: T,
): boolean {
  return Boolean(options.useBaseline && benchmark.baseline);
}
