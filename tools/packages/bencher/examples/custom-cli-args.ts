#!/usr/bin/env -S node --expose-gc --allow-natives-syntax
import {
  type BenchGroup,
  type BenchSuite,
  defaultCliArgs,
  defaultReport,
  runBenchCLI,
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

const suite: BenchSuite = {
  name: "Custom Args Demo",
  groups: [mathGroup],
};

// Configure CLI with custom arguments
function configureCustomArgs(yargs: any) {
  return defaultCliArgs(yargs).option("verbose", {
    type: "boolean",
    default: false,
    describe: "enable verbose logging",
  });
}

// Run with custom CLI configuration
const results = await runBenchCLI({ suite, configureArgs: configureCustomArgs });
defaultReport(results, false);
