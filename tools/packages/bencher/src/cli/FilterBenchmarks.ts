import type { BenchGroup, BenchSuite } from "../Benchmark.ts";

/** Filter benchmarks by name pattern */
export function filterBenchmarks(
  suite: BenchSuite,
  filter?: string,
): BenchSuite {
  if (!filter) return suite;
  const regex = createFilterRegex(filter);
  const groups = suite.groups.map(group => ({
    ...group,
    benchmarks: group.benchmarks.filter(bench => regex.test(bench.name)),
  }));
  validateFilteredSuite(groups, filter);
  return { name: suite.name, groups };
}

/** Create case-insensitive regex from filter */
function createFilterRegex(filter: string): RegExp {
  try {
    return new RegExp(filter, "i");
  } catch {
    return new RegExp(escapeRegex(filter), "i");
  }
}

/** Escape regex special chars */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Throw if no benchmarks match filter */
function validateFilteredSuite(groups: BenchGroup[], filter?: string): void {
  if (groups.every(g => g.benchmarks.length === 0)) {
    throw new Error(`No benchmarks match filter: "${filter}"`);
  }
}
