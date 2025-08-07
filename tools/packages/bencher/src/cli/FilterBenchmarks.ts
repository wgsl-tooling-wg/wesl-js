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
    benchmarks: group.benchmarks.filter(bench => {
      // Extract base name without variant suffix for filtering
      const baseName = bench.name.replace(/ \[(tokenize|parse)\]$/, "");
      return regex.test(baseName);
    }),
  }));
  validateFilteredSuite(groups, filter);
  return { name: suite.name, groups };
}

/** Create regex from filter, treating as literal unless it looks like regex */
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
    // Strip surrounding slashes if present
    const pattern = filter.startsWith("/") && filter.endsWith("/") 
      ? filter.slice(1, -1) 
      : filter;
    try {
      return new RegExp(pattern, "i");
    } catch {
      return new RegExp(escapeRegex(filter), "i");
    }
  }
  
  // Treat as literal prefix match
  return new RegExp("^" + escapeRegex(filter), "i");
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
