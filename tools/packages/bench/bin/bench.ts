#!/usr/bin/env node
import { hideBin } from "yargs/helpers";
import { reportResults } from "../src/BenchmarkReport.ts";
import { runProfileMode } from "../src/ProfileMode.ts";
import { runBenchmarks } from "../src/RunBenchmark.ts";
import { cliArgs } from "../src/wesl/CliArgs.ts";
import { handleWeslWorkerBenchmarks } from "../src/wesl/WeslBenchmarkRunner.ts";
import { createWeslConfig } from "../src/wesl/WeslConfig.ts";
import { convertToWeslReports } from "../src/wesl/WeslReportConverter.ts";
import { loadWeslTests } from "../src/wesl/WeslTestLoader.ts";

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

  const config = createWeslConfig(argv);
  const tests = await loadWeslTests(config);

  if (config.mode === "profile") {
    await runProfileMode(tests);
  } else {
    // Add handlers to config
    config.workerHandler = handleWeslWorkerBenchmarks;
    config.reportConverter = convertToWeslReports;
    
    const results = await runBenchmarks(tests, config);
    reportResults(results, { cpu: config.showCpu });
  }
}
