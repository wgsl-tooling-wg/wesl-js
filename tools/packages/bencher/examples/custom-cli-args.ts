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
  return defaultCliArgs(yargs).option("verbose", {
    type: "boolean",
    default: false,
    describe: "enable verbose logging",
  });
}

// Parse arguments with custom configuration
const args = parseBenchArgs(configureCustomArgs);

if (args.verbose) console.log("Verbose mode enabled");

const suite: BenchSuite = {
  name: "Custom Args Demo",
  groups: [mathGroup],
};

// Run benchmarks with parsed arguments
const results = await runBenchmarks(suite, args);
const report = defaultReport(results, args);
console.log(report);
