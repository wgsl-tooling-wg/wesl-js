import glob from "fast-glob";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * update example package.json files to have the current version of wesl as dependencies
 */

interface Versions {
  wesl: string;
  weslPlugin: string;
}

const toolsPath = path.join(fileURLToPath(import.meta.url), "../..");

main();

async function main() {
  const versions = await weslVersion();
  setExampleVersions(versions);
}

async function weslVersion(): Promise<Versions> {
  const wesl = await packageVersion("wesl");
  const weslPlugin = await packageVersion("wesl-plugin");
  console.log(`WESL version: ${wesl}`);
  console.log(`WESL plugin version: ${weslPlugin}`);

  return { wesl, weslPlugin };
}

/** load the version from a package.json file in the packages/ di */
async function packageVersion(packageName: string): Promise<string> {
  const packagePath = path.join(
    toolsPath,
    `packages/${packageName}/package.json`,
  );
  const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"));
  return packageJson.version;
}

/** rewrite the the example package.json dependencies to set the
 * wesl and wesl-plugin versions */
async function setExampleVersions(versions: Versions): Promise<void> {
  const toolsPathPosix = path.posix.normalize(toolsPath);
  const examples = await glob(toolsPathPosix + "/examples/*/package.json");

  for (const packageJsonPath of examples) {
    const raw = await fs.readFile(packageJsonPath, { encoding: "utf8" });
    const json = JSON.parse(raw);
    if (json.dependencies.wesl) {
      json.dependencies.wesl = `^${versions.wesl}`;
    }
    if (json.devDependencies["wesl-plugin"]) {
      json.devDependencies["wesl-plugin"] = `^${versions.weslPlugin}`;
    }
    console.log(`Updating ${packageJsonPath}`);
    await fs.writeFile(packageJsonPath, JSON.stringify(json, null, 2) + "\n");
  }
}
