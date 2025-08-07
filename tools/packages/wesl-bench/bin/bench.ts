#!/usr/bin/env -S node --expose-gc --allow-natives-syntax
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BenchSuite,
  reportResults,
  runBenchCLI,
  runsSection,
  timeSection,
} from "bencher";
import { _linkSync } from "wesl";
import { loadExamples, type WeslSource } from "../src/LoadExamples.ts";
import { locSection } from "../src/LocSection.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const examplesDir = join(__dirname, "..", "wesl-examples");

/** @return a benchmark group with metadata for lines/sec calculation */
function makeBenchmark(name: string, source: WeslSource) {
  return {
    name,
    benchmarks: [{
      name,
      fn: () => {
        const { weslSrc, rootModule } = source;
        _linkSync({ weslSrc, rootModuleName: rootModule });
      },
    }],
    metadata: { linesOfCode: source.lineCount ?? 0 },
  };
}

const examples = loadExamples(examplesDir);

const suite: BenchSuite = {
  name: "WESL Link Benchmarks",
  groups: [
    makeBenchmark("particle", examples.particle),
    makeBenchmark("reduceBuffer", examples.reduceBuffer),
    makeBenchmark("rasterize", examples.rasterize),
    makeBenchmark("unity", examples.unity),
    makeBenchmark("bevy_lighting", examples.bevy),
  ],
};

const results = await runBenchCLI({ suite });
const sections = [timeSection, runsSection, locSection];
const table = reportResults(results, sections);
console.log(table);