import fs from "node:fs";
import path from "node:path";
import { diffChars, diffLines } from "diff";
import {
  type Difference,
  type Options,
  type Result,
  compareSync,
} from "dir-compare";
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
  expectDir: string,
  resultDir: string,
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
  const relative = relativePath.endsWith("/")
    ? relativePath
    : `${relativePath}/`;
  if (state === "left") {
    console.error(`Extra in result: ${relative}${name1}`);
  } else if (state === "right") {
    console.error(`Missing in result: ${relative}${name2}`);
  } else {
    const resultPath = path.join(path1!, name1!);
    const expectPath = path.join(path2!, name2!);
    console.error(`\n--- File ${relative}${name1} is different: ---`);
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
      const messages: string[] = [];
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
        messages.push(colored);
      });
      console.error(messages.join(""));
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
        console.error(prefix + value);
      });
    }
  } else {
    console.log(`'${resultPath}' and '${expectPath}' match`);
  }
}
