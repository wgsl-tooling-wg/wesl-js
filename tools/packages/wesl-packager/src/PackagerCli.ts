import { versionFromPackageJson } from "wesl-tooling";
import yargs from "yargs";
import { packageWgsl } from "./PackageWesl.ts";

export type CliArgs = Awaited<ReturnType<typeof parseArgs>>;
let cliArgs: CliArgs;

export async function packagerCli(rawArgs: string[]): Promise<void> {
  cliArgs = await parseArgs(rawArgs);
  await packageWgsl(cliArgs);
}

async function parseArgs(args: string[]) {
  const projectDir = new URL("..", import.meta.url).href;
  const appVersion = await versionFromPackageJson(projectDir);
  return yargs(args)
    .command("$0", "create an npm package from WGSL/WESL files")
    .version(appVersion)
    .option("src", {
      type: "string",
      describe:
        "WGSL/WESL files to bundle in the package (glob syntax, defaults to wesl.toml or shaders/**/*.w[eg]sl)",
    })
    .option("rootDir", {
      deprecated: true,
      type: "string",
      describe: "use --baseDir instead",
    })
    .option("baseDir", {
      deprecated: true,
      type: "string",
      describe: "root directory for shaders (defaults to wesl.toml or shaders)",
    })
    .option("projectDir", {
      type: "string",
      default: ".",
      describe: "directory containing package.json and wesl.toml",
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
      default: false,
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
