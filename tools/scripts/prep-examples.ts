import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type ParseArgsConfig, parseArgs } from "node:util";
import glob from "fast-glob";

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
  const opts = args();
  let versions: Versions;

  if (opts.workspace) {
    versions = { wesl: "workspace:*", weslPlugin: "workspace:*" };
  } else {
    versions = await weslVersion();
  }

  setExampleVersions(versions);
}

function args(): Record<string, any> {
  const config: ParseArgsConfig = {
    options: {
      workspace: {
        type: "boolean",
      },
    },
  };
  const args = parseArgs(config);
  return args.values;
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
    const { wesl, weslPlugin } = versions;
    const prefix = wesl.startsWith("workspace:") ? "" : "^";
    if (json.dependencies.wesl) {
      json.dependencies.wesl = `${prefix}${wesl}`;
    }
    if (json.devDependencies["wesl-plugin"]) {
      json.devDependencies["wesl-plugin"] = `${prefix}${weslPlugin}`;
    }
    console.log(`Updating ${packageJsonPath}`);
    await fs.writeFile(packageJsonPath, JSON.stringify(json, null, 2) + "\n");
  }
}
