#! /usr/bin/env -S node --disable-warning=ExperimentalWarning

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

/**
 * a node script get an earlier copy of the repo as a baseline for benchmark comparisons
 *
 * Usage:
 * checkout_baseline <version>
 *
 * how it works:
 * uses git archive to copy the files from the specified version
 * of the tools directory of the repo into ../../../_baseline
 * e.g. for git version v0.6.6, the tool will run:
 *   git archive v0.6.6 tools
 *
 * (note that archive creates a tar file with the directory name tools, and we
 * want a directory named _baseline)
 * the contents of _baseline will be the contents of the tools directory at
 * after the contents are in place
 * run `pnpm install` in the _baseline directory
 */
const version = process.argv[2];

if (!version) {
  const scriptName = process.argv[1]
    ? process.argv[1].split("/").pop()
    : "checkout_baseline";
  console.error(`Usage: ${scriptName} <version>`);
  process.exit(1);
}
console.log("version:", version);

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
process.chdir(path.resolve(__dirname, "../../../../"));
const baselineDir = path.resolve("_baseline");

if (existsSync(baselineDir)) {
  console.log(`Removing existing baseline directory: ${baselineDir}`);
  rmSync(baselineDir, { recursive: true, force: true });
}

mkdirSync(baselineDir, { recursive: true });

console.log(`Archiving tools directory from version ${version}...`);
const tarPath = path.join(baselineDir, "tools.tar");
execSync(`git archive ${version} tools -o "${tarPath}"`, { stdio: "inherit" });

console.log("Extracting archive...");

execSync(`tar -xf "${tarPath}" -C "${baselineDir}"`, { stdio: "inherit" });
rmSync(tarPath);

const toolsDir = path.join(baselineDir, "tools");
execSync(`mv "${toolsDir}"/* "${baselineDir}/"`, { stdio: "inherit" });
rmSync(toolsDir, { recursive: true, force: true });

console.log("Running pnpm install in baseline directory...");
execSync("pnpm install", { cwd: baselineDir, stdio: "inherit" });

console.log("Baseline copy complete.");
