import fs from "node:fs";
import path from "node:path";
import { createTwoFilesPatch } from "diff";
import { enableTracing, log } from "mini-parse";
import { astToString, link, noSuffix, scopeToString } from "wesl";
import yargs from "yargs";
import {
  parseIntoRegistry,
  parsedRegistry,
} from "../../wesl/src/ParsedRegistry.js"; // LATER fix import
import { loadModules, versionFromPackageJson } from "wesl-tooling";

type CliArgs = Awaited<ReturnType<typeof parseArgs>>;

export async function cli(rawArgs: string[]): Promise<void> {
  enableTracing(); // so we get more debug info
  const argv = await parseArgs(rawArgs);
  await linkNormally(argv);
}

async function parseArgs(args: string[]) {
  const toolDir = path.join(import.meta.url, "..");
  const appVersion = await versionFromPackageJson(toolDir);
  return yargs(args)
    .version(appVersion)
    .option("src", {
      type: "string",
      default: "./shaders/*.w[eg]sl",
      describe: "WGSL/WESL files to bundle in the package (glob syntax)",
    })
    .option("rootModule", {
      type: "string",
      default: "main",
      describe: "start linking from this module name",
    })
    .option("define", {
      type: "array",
      describe: "definitions for preprocessor and linking",
    })
    .option("baseDir", {
      requiresArg: true,
      type: "string",
      default: "./shaders",
      describe: "root directory for shaders",
    })
    .option("projectDir", {
      requiresArg: true,
      type: "string",
      default: ".",
      describe: "directory containing package.json",
    })
    .option("details", {
      type: "boolean",
      default: false,
      hidden: true,
      describe: "show details about parsed files",
    })
    .option("diff", {
      type: "boolean",
      default: false,
      hidden: true,
      describe: "show comparison with src file",
    })
    .option("emit", {
      type: "boolean",
      default: true,
      hidden: true,
      describe: "emit linked result",
    })
    .help()
    .parse();
}

async function linkNormally(argv: CliArgs): Promise<void> {
  const weslRoot = argv.baseDir || process.cwd();
  const weslSrc = await loadModules(argv.projectDir, weslRoot, argv.src);
  // LATER conditions
  // LATER external defines

  if (argv.emit) {
    const linked = await link({ weslSrc, rootModuleName: argv.rootModule });
    log(linked.dest);
  }

  if (argv.details) {
    const registry = parsedRegistry();
    try {
      parseIntoRegistry(weslSrc, registry, "package");
    } catch (e) {
      console.error(e);
    }
    Object.entries(registry.modules).forEach(([modulePath, ast]) => {
      log(`---\n${modulePath}`);
      log(`\n->ast`);
      log(astToString(ast.moduleElem));
      log(`\n->scope`);
      log(scopeToString(ast.rootScope));
      log();
    });
  }

  // LATER diff
  // if (argv.diff) printDiff(srcPath, origWgsl, linked);
}

function toUnixPath(p: string): string {
  if (path.sep !== "/") {
    return p.replaceAll(path.sep, "/");
  } else {
    return p;
  }
}

// // oxlint-disable-next-line eslint(no-unused-vars)
// function externalDefines(): Record<string, string> {
//   if (!argv.define) return {};
//   const pairs = argv.define.map(d => d.toString().split("="));

//   const badPair = pairs.find(p => p.length !== 2);
//   if (badPair) {
//     console.error("invalid define", badPair);
//     return {};
//   }

//   throw new Error("external defines Not implemented");
//   // const withParsedValues = pairs.map(([k, v]) => [k, parseDefineValue(v)]);
//   // return Object.fromEntries(withParsedValues);
// }

// oxlint-disable-next-line eslint(no-unused-vars)
function parseDefineValue(value: string): string | number | boolean {
  const v = value.toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  if (value === "NaN") return Number.NaN;
  const n = Number.parseFloat(value);
  if (!Number.isNaN(n)) return n;
  return value;
}

// oxlint-disable-next-line eslint(no-unused-vars)
function printDiff(modulePath: string, src: string, linked: string): void {
  if (src !== linked) {
    const patch = createTwoFilesPatch(modulePath, "linked", src, linked);
    log(patch);
  } else {
    log(`${modulePath}: linked version matches original source`);
  }
}
