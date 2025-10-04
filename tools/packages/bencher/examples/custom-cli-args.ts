#!/usr/bin/env -S node --expose-gc --allow-natives-syntax
import {
  type BenchGroup,
  type BenchSuite,
  defaultCliArgs,
  defaultReport,
  parseBenchArgs,
  runBenchmarks,
} from "../src/index.ts";

// Example showing how to add custom CLI arguments to benchmarks

const mathGroup: BenchGroup<void> = {
  name: "Math Operations",
  benchmarks: [
    { name: "multiply", fn: () => 42 * 1337 },
    { name: "divide", fn: () => 1337 / 42 },
    { name: "power", fn: () => 2 ** 16 },
  ],
};

// Configure CLI with custom arguments
function configureCustomArgs(yargs: any) {
  return defaultCliArgs(yargs).option("size", {
    type: "number",
    default: 100,
    describe: "size of arrays to allocate and reduce",
  });
}

// Parse arguments with custom configuration
const args = parseBenchArgs(configureCustomArgs);

// Create a garbage-generating benchmark group
const garbageGroup: BenchGroup<void> = {
  name: "Garbage Generation",
  benchmarks: [
    {
      name: `array-reduce-${args.size}`,
      fn: () => {
        // Create array of arrays to generate garbage
        const arrays = [];
        for (let i = 0; i < args.size; i++) {
          // Each inner array has random values
          const innerArray: number[] = Array.from({ length: 100 });
          for (let j = 0; j < 100; j++) {
            innerArray[j] = Math.random() * 1000;
          }
          arrays.push(innerArray);
        }

        // Reduce all arrays to generate more garbage
        return arrays
          .map(arr => arr.reduce((sum, val) => sum + val, 0))
          .reduce((total, sum) => total + sum, 0);
      },
    },
  ],
};

console.log(`Testing with array size: ${args.size}`);

const suite: BenchSuite = {
  name: "Custom Args Demo",
  groups: [mathGroup, garbageGroup],
};

// Run benchmarks with parsed arguments
const results = await runBenchmarks(suite, args);
const report = defaultReport(results, args);
console.log(report);
