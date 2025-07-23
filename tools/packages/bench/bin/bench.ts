#!/usr/bin/env node
import { hideBin } from "yargs/helpers";
import { createConfig } from "../src/BenchConfig.ts";
import { reportResults } from "../src/BenchmarkReport.ts";
import { loadBenchTests } from "../src/LoadBenchTests.ts";
import { runProfileMode } from "../src/ProfileMode.ts";
import { runBenchmarks } from "../src/RunBenchmarkUnified.ts";
import { cliArgs } from "../src/wesl/CliArgs.ts";

// Entry point
const rawArgs = hideBin(process.argv);
main(rawArgs);

async function main(args: string[]): Promise<void> {
  const argv = cliArgs(args);
  
  // Validate that only one benchmark mode is selected
  const benchModes = ["mitata", "tinybench", "manual"].filter(
    mode => argv[mode],
  );
  if (benchModes.length > 1) {
    console.error(`Cannot use --${benchModes.join(" and --")} together`);
    process.exit(1);
  }
  
  // Create unified configuration
  const config = createConfig(argv);
  
  // Load tests based on configuration
  const tests = await loadBenchTests(config);
  
  // Run benchmarks based on mode
  if (config.mode === 'profile') {
    await runProfileMode(tests);
  } else {
    const results = await runBenchmarks(tests, config);
    reportResults(results, { cpu: config.showCpu });
  }
}