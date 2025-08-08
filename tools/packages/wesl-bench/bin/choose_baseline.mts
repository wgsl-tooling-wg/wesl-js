#! /usr/bin/env -S node --disable-warning=ExperimentalWarning

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

/**
 * Get an earlier version of the repo as a baseline for benchmark comparisons.
 *
 * Usage: choose_baseline <version>
 *
 * Archives the tools directory from the specified git version
 * into ../_baseline directory, then runs pnpm install.
 */
const version = process.argv[2];

if (!version) {
  const scriptName = process.argv[1]
    ? process.argv[1].split("/").pop()
    : "choose_baseline";
  console.error(`Usage: ${scriptName} <version>`);
  process.exit(1);
}
console.log("version:", version);

const __dirname = path.dirname(new URL(import.meta.url).pathname);
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
