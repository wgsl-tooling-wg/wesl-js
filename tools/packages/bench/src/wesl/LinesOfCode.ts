import type { BenchTest as WeslBenchTest } from "./WeslBenchmarks.ts";

/** Calculate lines of code from a WeslBenchTest */
export function calculateLinesOfCode(test: WeslBenchTest): number {
  return [...test.files.values()]
    .map(code => code.split("\n").length)
    .reduce((a, b) => a + b, 0);
}

/** Calculate lines of code from a record of file contents */
export function calculateLinesOfCodeFromFiles(
  files: Record<string, string>,
): number {
  return Object.values(files)
    .map(code => code.split("\n").length)
    .reduce((a, b) => a + b, 0);
}