import process from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type ParseArgsConfig, parseArgs } from "node:util";
import util from "node:util";
import glob from "fast-glob";
const exec = util.promisify(process.exec);

/*
 * copy the internal examples/ directory to separate projects in wesl-examples/ repo
 * - updates each example project's package.json file to reference the current version of wesl and wesl-plugin
 * - runs `pnpm install` in each example project 
 */

/** ignore these when copying examples */
const examplesIgnore = [".git/", "/node_modules", "dist/", "package-lock.json"];

interface Versions {
  wesl: string;
  weslPlugin: string;
  cli: string;
}

const toolsPath = path.join(fileURLToPath(import.meta.url), "../..");

main();

async function main() {
  const opts = args();
  const versions = await weslVersion();

  const targetDir =
    opts.targetDir || path.join(toolsPath, "../../wesl-examples");

  const examplesSrc = path.join(toolsPath, "examples");
  await copyDirectory(examplesSrc, targetDir, examplesIgnore);
  await setExampleVersions(targetDir, versions);
  await updatePkgLocks(targetDir);
}

function args(): Record<string, any> {
  const config: ParseArgsConfig = {
    options: {
      workspace: {
        type: "boolean",
      },
      targetDir: {
        type: "string",
        short: "o",
      },
    },
  };
  const args = parseArgs(config);
  return args.values;
}

async function weslVersion(): Promise<Versions> {
  const wesl = await packageVersion("wesl");
  const weslPlugin = await packageVersion("wesl-plugin");
  const cli = await packageVersion("wesl-link");
  console.log(`wesl version: ${wesl}`);
  console.log(`wesl-plugin version: ${weslPlugin}`);
  console.log(`wesl-link cli version: ${cli}`);

  return { wesl, weslPlugin, cli };
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

/**
 * Copy recursively,
 * ignoring any paths that include any of the ignore strings.
 */
async function copyDirectory(
  source: string,
  destination: string,
  ignore: string[] = [],
): Promise<void> {
  await fs.mkdir(destination, { recursive: true });
  await fs.cp(source, destination, {
    recursive: true,
    preserveTimestamps: true,
    dereference: true,
    filter: src => {
      const filtering = !ignore.some(skip => src.includes(skip));
      if (!filtering) {
        // console.log(`  copying: ${src}`);
      }
      return filtering;
    },
  });
}

/** rewrite the the example package.json dependencies to set the
 * wesl and wesl-plugin versions */
async function setExampleVersions(
  targetDir: string,
  versions: Versions,
): Promise<void> {
  const examples = await glob(targetDir + "/*/package.json");

  for (const packageJsonPath of examples) {
    const raw = await fs.readFile(packageJsonPath, { encoding: "utf8" });
    const json = JSON.parse(raw);
    const { wesl, weslPlugin, cli } = versions;
    const prefix = wesl.startsWith("workspace:") ? "" : "^";
    if (json.dependencies.wesl) {
      json.dependencies.wesl = `${prefix}${wesl}`;
    }
    if (json.devDependencies["wesl-plugin"]) {
      json.devDependencies["wesl-plugin"] = `${prefix}${weslPlugin}`;
    }
    if (json.devDependencies["wesl-link"]) {
      json.devDependencies["wesl-link"] = `${prefix}${cli}`;
    }
    await fs.writeFile(packageJsonPath, JSON.stringify(json, null, 2) + "\n");
  }
}

/** run `pnpm install` to update example pnpm-lock.yaml files and download dependencies */
async function updatePkgLocks(targetDir: string): Promise<void> {
  const pkgLocks = await glob(targetDir + "/**/pnpm-lock.yaml");
  console.log(`Updating pnpm-lock.yaml files: ${pkgLocks.join(", ")}`);

  for (const pkgLockPath of pkgLocks) {
    const dir = path.dirname(pkgLockPath);
    console.log(`Updating pnpm-lock in ${dir}`);
    // run pnpm install in the directory to update the pnpm-lock.yaml
    await exec(`pnpm install`, { cwd: dir });
  }
}
