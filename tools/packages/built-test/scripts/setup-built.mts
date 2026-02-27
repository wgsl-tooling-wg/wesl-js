#!/usr/bin/env node
import { execSync, spawn } from "node:child_process";
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
 * Packs packages into .tgz files, creates temp-built-test with pnpm overrides.
 *
 * Usage: node setup-built.mts [--skip-build]
 *   --skip-build  Skip building packages (use when build:all already ran)
 */

const skipBuild = process.argv.includes("--skip-build");

const packages = [
  "lezer-wesl",
  "wesl",
  "wesl-fetch",
  "wesl-gpu",
  "wesl-link",
  "wesl-packager",
  "wesl-plugin",
  "wesl-tooling",
  "wgsl-edit",
  "wgsl-play",
  "wgsl-test",
  "vitest-image-snapshot",
];

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

  console.log("Setting up temp-built-test and temp-packages directories...");
  cleanDir(tempBuiltTest);
  cleanDir(tempPackages);

  if (!skipBuild) {
    console.log("Building all packages...");
    run("pnpm build:all", join(packagesRoot, ".."));
  }

  console.log("Packing packages in parallel...");
  await Promise.all(
    packages.map(pkg => pack(pkg, timestamp, packagesRoot, tempPackages)),
  );

  copyProjectFiles(builtTestPackage, tempBuiltTest);
  updatePackageJson(tempBuiltTest, timestamp);
  run("pnpm install", tempBuiltTest);
}

async function pack(
  packageName: string,
  timestamp: string,
  packagesRoot: string,
  tempPackages: string,
): Promise<void> {
  const outputFile = join(tempPackages, `${packageName}-${timestamp}.tgz`);
  await runAsync(
    `pnpm --filter ${packageName} pack --out ${outputFile} 2>&1 | tail -1`,
    packagesRoot,
  );
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
  packageJson.pnpm.overrides = Object.fromEntries(
    packages.map(pkg => [pkg, `file:../temp-packages/${pkg}-${timestamp}.tgz`]),
  );

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

function runAsync(cmd: string, cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("sh", ["-c", cmd], { cwd, stdio: "inherit" });
    child.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`Failed to run: ${cmd}`));
    });
  });
}

function cleanDir(path: string) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}
