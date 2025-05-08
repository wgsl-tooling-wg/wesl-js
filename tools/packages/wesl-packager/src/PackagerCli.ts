import yargs from "yargs";
import { packageWgsl } from "./PackageWesl.js";

export type CliArgs = Awaited<ReturnType<typeof parseArgs>>;
let cliArgs: CliArgs;

export async function packagerCli(rawArgs: string[]): Promise<void> {
  cliArgs = await parseArgs(rawArgs);
  await packageWgsl(cliArgs);
}

async function parseArgs(args: string[]) {
  const appVersion = await versionFromPackageJson();
  return yargs(args)
    .command("$0", "create an npm package from WGSL/WESL files")
    .version(appVersion)
    .option("src", {
      type: "string",
      default: "./shaders/*.w[eg]sl",
      describe: "WGSL/WESL files to bundle in the package (glob syntax)",
    })
    .option("rootDir", {
      type: "string",
      default: "./shaders",
      describe: "base directory of WGSL/WESL files",
    })
    .option("projectDir", {
      type: "string",
      default: ".",
      describe: "directory containing package.json",
    })
    .option("multiBundle", {
      type: "boolean",
      default: false,
      describe: "make a shader bundle for each source file",
    })
    .option("exportName", {
      type: "string",
      default: ".",
      describe:
        "package.json export name for consolidated bundle (ignored for multiBundle)",
    })
    .option("updatePackageJson", {
      type: "boolean",
      default: true,
      describe: "add 'exports' entries into package.json",
    })
    .option("outDir", {
      type: "string",
      default: "dist",
      describe: "where to put bundled output files (relative to projectDir)",
    })
    .help()
    .parse();
}

async function versionFromPackageJson(): Promise<string> {
  const pkgJsonPath = new URL("../package.json", import.meta.url);
  const pkgModule = await import(pkgJsonPath.href, { with: { type: "json" } });
  const version = pkgModule.default.version;
  return version as string;
}
