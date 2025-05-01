import { diffChars, diffLines } from "diff";
import { compareSync, Difference, Options, Result } from "dir-compare";
import fs from "node:fs";
import path from "node:path";
import pico from "picocolors";
import { expect } from "vitest";

export const defaultOptions: Options = {
  compareContent: true,
  excludeFilter: "node_modules, .gitignore",
};

/**
 * Compare two directories recursively and asserts that their contents match.
 * Logs any differences found (extra, missing, or changed files).
 * Fails the test if any differences are detected.
 *
 * @param resultDir - Path to the directory containing actual results.
 * @param expectDir - Path to the directory containing expected results.
 * @param options - Optional dir-compare options to customize comparison.
 */
export function expectDirMatch(
  resultDir: string,
  expectDir: string,
  options?: Options,
): void {
  const compareOpts = { ...defaultOptions, ...options };
  const compareResult: Result = compareSync(resultDir, expectDir, compareOpts);
  const diffs = compareResult.diffSet!.filter(r => r.state !== "equal");
  diffs.forEach(logDiff);
  if (diffs.length > 0) {
    expect.fail(`${resultDir} and ${expectDir} do not match`);
  }
}

/** print a difference between two files or directories to the error log */
function logDiff(diff: Difference): void {
  const { name1, name2, path1, path2, state, relativePath } = diff;
  const relative =
    relativePath.endsWith("/") ? relativePath : `${relativePath}/`;
  if (state === "left") {
    console.error(`Extra in result: ${relative}${name1}`);
  } else if (state === "right") {
    console.error(`Missing in result: ${relative}${name2}`);
  } else {
    const resultPath = path.join(path1!, name1!);
    const expectPath = path.join(path2!, name2!);
    process.stderr.write(`\n--- File ${relative}${name1} is different: ---\n`);
    logFileDiff(resultPath, expectPath);
  }
}

/** error log a difference between two files */
function logFileDiff(resultPath: string, expectPath: string): void {
  const resultStr = fs.readFileSync(resultPath, "utf8");
  const expectStr = fs.readFileSync(expectPath, "utf8");
  const diffResult = diffChars(resultStr, expectStr);
  if (diffResult) {
    if (process.env.FORCE_COLOR) {
      diffResult.forEach(part => {
        const { value, added, removed } = part;
        let spaced = value;
        if (value.trim() === "") {
          spaced = value
            .replaceAll(" ", "█")
            .replaceAll("\n", "\\n")
            .replaceAll("\t", "→");
        }

        let colored = spaced;
        if (added) {
          colored = pico.bold(pico.green(spaced));
        } else if (removed) {
          colored = pico.bold(pico.red(spaced));
        }
        process.stderr.write(colored);
      });
    } else {
      const diffResult = diffLines(resultStr, expectStr);
      diffResult.forEach(part => {
        const { value, added, removed } = part;
        let prefix = "";
        if (added) {
          prefix = "+ ";
        } else if (removed) {
          prefix = "- ";
        }
        process.stderr.write(prefix + value + "\n");
      });
    }
  } else {
    console.log(`'${resultPath}' and '${expectPath}' match`);
  }
}
