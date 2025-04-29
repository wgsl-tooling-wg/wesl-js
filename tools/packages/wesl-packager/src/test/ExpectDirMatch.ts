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

export function expectDirMatch(
  resultDir: string,
  expectDir: string,
  options?: Options,
): void {
  const compareOpts = { ...defaultOptions, ...options };
  const compareResult: Result = compareSync(resultDir, expectDir, compareOpts);
  const diffs = compareResult.diffSet!.filter(r => r.state !== "equal");
  diffs.forEach(reportDiff);
  if (diffs.length > 0) {
    expect.fail(`${resultDir} and ${expectDir} do not match`);
  }
}

function reportDiff(diff: Difference): void {
  const { name1, name2, path1, path2, state, relativePath } = diff;
  const relative =
    relativePath.endsWith("/") ? relativePath : `${relativePath}/`;
  if (state === "left") {
    console.warn(`Extra in result: ${relative}${name1}`);
  } else if (state === "right") {
    console.warn(`Missing in result: ${relative}${name2}`);
  } else {
    const resultPath = path.join(path1!, name1!);
    const expectPath = path.join(path2!, name2!);
    logFileDiff(resultPath, expectPath);
  }
}

function logFileDiff(resultPath: string, expectPath: string): void {
  const resultStr = fs.readFileSync(resultPath, "utf8");
  const expectStr = fs.readFileSync(expectPath, "utf8");
  const diffResult = diffChars(resultStr, expectStr);
  if (diffResult) {
    if (process.env.FORCE_COLOR) {
      diffResult.forEach(part => {
        const { value, added, removed } = part;
        let colored = value;
        if (added) {
          colored = pico.bold(pico.green(value));
        } else if (removed) {
          colored = pico.bold(pico.red(value));
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
        console.error(prefix + value);
      });
    }
  } else {
    console.log(`'${resultPath}' and '${expectPath}' match`);
  }
}
