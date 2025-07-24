#!/usr/bin/env node
import { hideBin } from "yargs/helpers";
import { reportResults } from "../src/BenchmarkReport.ts";
import { runProfileMode } from "../src/ProfileMode.ts";
import { runBenchmarks } from "../src/RunBenchmarkUnified.ts";
import { cliArgs } from "../src/wesl/CliArgs.ts";
import { handleWeslWorkerBenchmarks } from "../src/wesl/WeslBenchmarkRunner.ts";
import { createWeslConfig } from "../src/wesl/WeslConfig.ts";
import { convertToWeslReports } from "../src/wesl/WeslReportConverter.ts";
import { WeslTestLoader } from "../src/wesl/WeslTestLoader.ts";

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
  
  // Create WESL-specific configuration
  const config = createWeslConfig(argv);
  
  // Load tests using WESL test loader
  const testLoader = new WeslTestLoader();
  const tests = await testLoader.loadTests(config);
  
  // Run benchmarks based on mode
  if (config.mode === 'profile') {
    await runProfileMode(tests);
  } else {
    const results = await runBenchmarks(tests, config, {
      workerHandler: handleWeslWorkerBenchmarks,
      reportConverter: convertToWeslReports,
    });
    reportResults(results, { cpu: config.showCpu });
  }
}