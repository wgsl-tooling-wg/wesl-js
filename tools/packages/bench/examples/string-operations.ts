/**
 * Example of string manipulation benchmarks
 */

import type { BenchTest } from "../src/Benchmark.ts";
import { runBenchmarksInWorker } from "../src/WorkerBench.ts";

interface StringParams {
  text: string;
  pattern: string;
}

const stringBenchmarks: BenchTest<StringParams> = {
  name: "string-operations",

  setup: async () => {
    // Create a large text for benchmarking
    const words = [
      "the",
      "quick",
      "brown",
      "fox",
      "jumps",
      "over",
      "lazy",
      "dog",
    ];
    const text = Array.from(
      { length: 1000 },
      () => words[Math.floor(Math.random() * words.length)],
    ).join(" ");

    return {
      text,
      pattern: "fox",
    };
  },

  benchmarks: [
    {
      name: "indexOf",
      fn: (params: StringParams) => {
        let count = 0;
        let pos = 0;
        let found = params.text.indexOf(params.pattern, pos);
        while (found !== -1) {
          count++;
          pos = found + params.pattern.length;
          found = params.text.indexOf(params.pattern, pos);
        }
        return count;
      },
      params: null as any,
    },
    {
      name: "regex-match",
      fn: (params: StringParams) => {
        const regex = new RegExp(params.pattern, "g");
        const matches = params.text.match(regex);
        return matches ? matches.length : 0;
      },
      params: null as any,
    },
    {
      name: "split-join",
      fn: (params: StringParams) => {
        return params.text.split(" ").join("-");
      },
      params: null as any,
    },
    {
      name: "replace-all",
      fn: (params: StringParams) => {
        return params.text.replaceAll(params.pattern, "cat");
      },
      params: null as any,
    },
  ],
};

// Example with baseline comparison
const stringWithBaseline: BenchTest<StringParams> = {
  name: "string-search-comparison",

  setup: stringBenchmarks.setup,

  benchmarks: [
    {
      name: "optimized-search",
      fn: (params: StringParams) => {
        // Optimized version using indexOf
        let count = 0;
        let pos = 0;
        let found = params.text.indexOf(params.pattern, pos);
        while (found !== -1) {
          count++;
          pos = found + params.pattern.length;
          found = params.text.indexOf(params.pattern, pos);
        }
        return count;
      },
      params: null as any,
      baseline: {
        // Naive version using includes in a loop
        fn: (params: StringParams) => {
          let count = 0;
          for (
            let i = 0;
            i < params.text.length - params.pattern.length + 1;
            i++
          ) {
            if (
              params.text.substring(i, i + params.pattern.length) ===
              params.pattern
            ) {
              count++;
            }
          }
          return count;
        },
      },
    },
  ],
};

// Run benchmarks in worker mode for better isolation
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running string benchmarks in worker threads...\n");

  const results = await runBenchmarksInWorker(
    [stringBenchmarks, stringWithBaseline],
    {
      runner: "standard",
      time: 0.3,
      useBaseline: true,
    },
  );

  // Display results
  for (const report of results) {
    console.log(`\n${report.test.name}:`);
    for (const result of report.results) {
      if (result.mainResult) {
        const mainOps = Math.round(1000 / result.mainResult.time.avg);
        console.log(
          `  ${result.spec.name}: ${mainOps.toLocaleString()} ops/ms`,
        );

        if (result.baselineResult) {
          const baselineOps = Math.round(1000 / result.baselineResult.time.avg);
          const improvement = (
            ((mainOps - baselineOps) / baselineOps) *
            100
          ).toFixed(1);
          console.log(
            `    vs baseline: ${baselineOps.toLocaleString()} ops/ms (${improvement}% faster)`,
          );
        }
      }
    }
  }
}
