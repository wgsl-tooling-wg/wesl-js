#!/usr/bin/env node
import { execSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Create a test environment for verifying packed npm packages before publishing.
 * This script builds and packs mini-parse, wesl & wesl-plugin, then creates
 * a temp-built-test directory that uses the packed .tgz files instead of workspace
 * dependencies. This allows testing that the published packages will work correctly.
 */

main().catch(error => {
  console.error("Error:", error);
  process.exit(1);
});

async function main() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const weslJsRoot = join(__dirname, "../../../..");
  const packagesRoot = join(weslJsRoot, "tools/packages");
  const builtTestPackage = join(packagesRoot, "built-test");
  const tempBuiltTest = join(weslJsRoot, "temp-built-test");
  const tempPackages = join(weslJsRoot, "temp-packages");
  const timestamp = getTimestamp();

  console.log("Setting up temp-built-test and temp-packages directories...\n");

  cleanDir(tempBuiltTest);
  cleanDir(tempPackages);

  buildAndPack("mini-parse", timestamp, packagesRoot, tempPackages);
  buildAndPack("wesl", timestamp, packagesRoot, tempPackages);
  buildAndPack("wesl-plugin", timestamp, packagesRoot, tempPackages);

  copyProjectFiles(builtTestPackage, tempBuiltTest);

  updatePackageJson(tempBuiltTest, timestamp);

  run("pnpm install", tempBuiltTest);

  console.log("\nSetup complete! You can now:");
  console.log("     - Run tests in the temp-built-test directory");
}

function buildAndPack(
  packageName: string,
  timestamp: string,
  packagesRoot: string,
  tempPackages: string,
) {
  run(`pnpm --filter ${packageName} build`, packagesRoot);

  const outputFile = join(tempPackages, `${packageName}-${timestamp}.tgz`);
  run(`pnpm --filter ${packageName} pack --out ${outputFile}`, packagesRoot);
}

/** copy directory except .git,node_modules,scripts */
function copyProjectFiles(builtTestPackage: string, tempBuiltTest: string) {
  cpSync(builtTestPackage, tempBuiltTest, {
    recursive: true,
    filter: src => {
      const basename = src.split("/").pop() || "";
      if (basename === "node_modules") return false;
      if (basename === "scripts") return false;
      if (basename.startsWith(".") && basename !== ".") return false;
      return true;
    },
  });
}

/** Replace workspace dependencies with packed .tgz files and add required dev dependencies.  */
function updatePackageJson(tempBuiltTest: string, timestamp: string) {
  const packageJsonPath = join(tempBuiltTest, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

  // Use pnpm overrides instead of modifying dependencies directly
  if (!packageJson.pnpm) {
    packageJson.pnpm = {};
  }
  packageJson.pnpm.overrides = {
    "mini-parse": `file:../temp-packages/mini-parse-${timestamp}.tgz`,
    wesl: `file:../temp-packages/wesl-${timestamp}.tgz`,
    "wesl-plugin": `file:../temp-packages/wesl-plugin-${timestamp}.tgz`,
  };

  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}_${month}_${day}-${hours}_${minutes}_${seconds}`;
}

function run(cmd: string, cwd?: string) {
  try {
    return execSync(cmd, { cwd, stdio: "inherit" });
  } catch {
    throw new Error(`Failed to run: ${cmd}`);
  }
}

function cleanDir(path: string) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}
