import yargs from "yargs";
import { packageWgsl } from "./packageWgsl.js";

export type CliArgs = ReturnType<typeof parseArgs>;
let cliArgs: CliArgs;

export async function packagerCli(rawArgs: string[]): Promise<void> {
  cliArgs = parseArgs(rawArgs);
  await packageWgsl(cliArgs);
}

function parseArgs(args: string[]) {
  return yargs(args)
    .command("$0", "create an npm package from WGSL/WESL files")
    .option("rootDir", {
      type: "string",
      default: ".",
      describe: "base directory of WGSL/WESL files",
    })
    .option("src", {
      type: "string",
      describe: "WGSL/WESL files to bundle in the package (glob syntax)",
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
    .option("updatePackageJson", {
      type: "boolean",
      default: true,
      describe: "add 'exports' entries into package.json",
    })
    .option("outDir", {
      type: "string",
      default: "dist",
      describe: "where to put bundled output files",
    })
    .help()
    .parseSync();
}
