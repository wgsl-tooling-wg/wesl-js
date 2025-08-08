import type { BenchGroup, BenchSuite } from "../Benchmark.ts";

/** Filter benchmarks by name pattern */
export function filterBenchmarks(
  suite: BenchSuite,
  filter?: string,
): BenchSuite {
  if (!filter) return suite;
  const regex = createFilterRegex(filter);
  const groups = suite.groups
    .map(group => ({
      ...group,
      benchmarks: group.benchmarks.filter(bench => {
        const baseName = bench.name.replace(/ \[.*?\]$/, "");
        return regex.test(baseName);
      }),
    }))
    .filter(group => group.benchmarks.length > 0);
  validateFilteredSuite(groups, filter);
  return { name: suite.name, groups };
}

/** Create regex from filter (literal unless regex-like) */
function createFilterRegex(filter: string): RegExp {
  const looksLikeRegex =
    (filter.startsWith("/") && filter.endsWith("/")) ||
    filter.includes("*") ||
    filter.includes("?") ||
    filter.includes("[") ||
    filter.includes("|") ||
    filter.startsWith("^") ||
    filter.endsWith("$");

  if (looksLikeRegex) {
    const pattern =
      filter.startsWith("/") && filter.endsWith("/")
        ? filter.slice(1, -1)
        : filter;
    try {
      return new RegExp(pattern, "i");
    } catch {
      return new RegExp(escapeRegex(filter), "i");
    }
  }

  return new RegExp("^" + escapeRegex(filter), "i");
}

/** Escape regex special characters */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Ensure at least one benchmark matches filter */
function validateFilteredSuite(groups: BenchGroup[], filter?: string): void {
  if (groups.every(g => g.benchmarks.length === 0)) {
    throw new Error(`No benchmarks match filter: "${filter}"`);
  }
}
