import path from "node:path";
import { enableTracing, log } from "mini-parse";
import { astToString, link, scopeToString } from "wesl";
import {
  dependencyBundles,
  loadModules,
  versionFromPackageJson,
} from "wesl-tooling";
import yargs from "yargs";
import {
  parsedRegistry,
  parseIntoRegistry,
} from "../../wesl/src/ParsedRegistry.ts"; // LATER fix import

type CliArgs = Awaited<ReturnType<typeof parseArgs>>;

export async function cli(rawArgs: string[]): Promise<void> {
  enableTracing(); // so we get more debug info
  const argv = await parseArgs(rawArgs);
  await linkNormally(argv);
}

async function parseArgs(args: string[]) {
  const toolDir = new URL("..", import.meta.url);
  const appVersion = await versionFromPackageJson(toolDir);
  return yargs(args)
    .version(appVersion)
    .command("$0 [module]", false, yargs => {
      yargs.positional("module", {
        type: "string",
        describe:
          "root module to link. Use :: for package references (lygia::utils), / for current package (utils/foo)",
      });
    })
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
    .option("conditions", {
      type: "array",
      describe: "settings for conditional compilation",
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
  const { baseDir, projectDir, module, rootModule } = argv;
  const weslRoot = baseDir || process.cwd();
  const weslSrc = await loadModules(projectDir, weslRoot, argv.src);
  const projectDirAbs = path.resolve(projectDir);
  const libs = await dependencyBundles(weslSrc, projectDirAbs);

  const conditionEntries = argv.conditions?.map(c => [c, true]) || [];
  const conditions = Object.fromEntries(conditionEntries);

  // Use positional module argument if provided, otherwise use --rootModule option (default "main")
  const rootModuleName = (module || rootModule || "main") as string;

  if (argv.emit) {
    const linked = await link({ weslSrc, rootModuleName, libs, conditions });
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
}
