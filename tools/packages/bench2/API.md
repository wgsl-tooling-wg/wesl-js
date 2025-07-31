# Benchmarking API

The bench package supports benchmarking of any JavaScript/TypeScript code, not just WESL operations.

## Quick Start

```typescript
import type { BenchTest } from "bench/src/Benchmark.ts";
import { runBenchmarks, reportBenchmarkResults } from "bench/src/RunBenchmark.ts";

// Define your benchmark parameters
interface MyParams {
  size: number;
  algorithm: string;
}

// Create a benchmark test
const myBenchmark: BenchTest<MyParams> = {
  name: "My Algorithm Comparison",
  setup: () => ({ size: 1000, algorithm: "quick" }),
  benchmarks: [
    {
      name: "quicksort",
      fn: ({ size }) => quickSort(generateArray(size)),
      params: { size: 10000, algorithm: "quick" },
    },
    {
      name: "mergesort",
      fn: ({ size }) => mergeSort(generateArray(size)),
      params: { size: 10000, algorithm: "merge" },
      baseline: {
        fn: ({ size }) => Array.from({length: size}).sort(),
      }
    }
  ]
};

// Run benchmarks
const results = await runBenchmarks([myBenchmark], {
  runner: "standard",
  time: 1,
  useBaseline: true,
});

reportBenchmarkResults(results);
```

## Core Concepts

### BenchTest<T>

The main interface for defining a benchmark test suite:

- `name`: Test suite name
- `setup`: Optional function to prepare default parameters
- `benchmarks`: Array of individual benchmarks to run

### BenchmarkSpec<T>

Defines a single benchmark:

- `name`: Benchmark name
- `fn`: The function to benchmark
- `params`: Parameters to pass to the function
- `baseline`: Optional baseline comparison

### Runners

Available runners:
- `standard`: Default runner using mitata
- `vanilla-mitata`: Direct mitata integration
- `tinybench`: TinyBench runner
- `manual`: Manual timing runner

## Examples

See the `examples/` directory for complete examples:

- `string-operations.ts`: String manipulation benchmarks

## Using the API

The benchmarking API works for both WESL operations and general JavaScript/TypeScript code.

To benchmark your own functions:

1. Define your parameter type
2. Create benchmark specs with your functions
3. Use `runBenchmarks` to execute
4. Report results with `reportBenchmarkResults`

## Advanced Features

### Custom Runners

Implement the `Runner` interface:

```typescript
export interface Runner {
  name: string;
  runSingleBenchmark: <T>(
    spec: BenchmarkSpec<T>,
    options: RunnerOptions
  ) => Promise<MeasuredResults>;
}
```

### Baseline Comparisons

Add a `baseline` property to any benchmark spec:

```typescript
{
  name: "optimized-version",
  fn: optimizedAlgorithm,
  params: { size: 1000 },
  baseline: {
    fn: originalAlgorithm,
    // Uses same params as main function
  }
}
```

### Filtering

Use the `filter` option to run specific benchmarks:

```typescript
await runBenchmarks(tests, {
  runner: "standard",
  filter: "sort", // Only runs benchmarks with "sort" in the name
});
```

### Worker Thread Isolation

For better performance isolation, run benchmarks in worker threads:

```typescript
import { runBenchmarksInWorker } from "bench/src/WorkerBench.ts";

const results = await runBenchmarksInWorker(tests, {
  runner: "standard",
  time: 1,
  useBaseline: true,
});

// Display results
for (const report of results) {
  console.log(`${report.test.name}:`);
  // ... process results
}
```