import { glob } from "glob";
import fs from "node:fs/promises";
import toml from "toml";
import type {
  UnpluginBuildContext,
  UnpluginContextMeta,
  UnpluginOptions,
} from "unplugin";
import { createUnplugin } from "unplugin";
import { dlog, dlogOpt } from "berry-pretty";
import {
  bindAndTransform,
  bindingStructReflect,
  enableBindingStructs,
  linkRegistry,
  parsedRegistry,
  ParsedRegistry,
  parseIntoRegistry,
} from "wesl";
import { bindingGroupLayoutTs } from "../../linker/src/Reflection.js";
import type { WeslPluginOptions } from "./weslPluginOptions.js";
import path from "node:path";

// TODO figure how to handle reloading & mutated AST produced by transforms

export function weslPlugin(
  options: WeslPluginOptions = {},
  meta: UnpluginContextMeta,
): UnpluginOptions {
  return {
    name: "wesl-plugin",
    resolveId: resolver,
    load: loader,
  };
}

async function resolver(this: UnpluginBuildContext, id: string) {
  console.log("resolveId(), id:", id);
  if (id.endsWith(".wesl?reflect")) {
    return id;
  }
  return null;
}

async function loader(this: UnpluginBuildContext, id: string) {
  console.log("loader(), id:", id);
  if (id.endsWith(".wesl?reflect")) {
    const registry = await getRegistry(this);
    const { weslRoot } = await getWeslToml();
    const mainFile = id.slice(0, -"?reflect".length);
    const main = localPath(mainFile, weslRoot);
    return await reflectTs(main, registry);
  }
  return null;
}

interface WeslToml {
  weslFiles: string[];
  weslRoot: string;
}

let weslToml: WeslToml | undefined;

async function getWeslToml(): Promise<WeslToml> {
  if (!weslToml) {
    // TODO consider supporting default if no wesl.toml is provided: e.g. './shaders'
    const tomlString = await fs.readFile("wesl.toml", "utf-8");
    weslToml = toml.parse(tomlString) as WeslToml;
  }
  return weslToml;
}

/** load and parse all the wesl files into a ParsedRegistry */
async function getRegistry(ctx: UnpluginBuildContext): Promise<ParsedRegistry> {
  // load wesl files into registry
  const registry = parsedRegistry();
  const { weslFiles, weslRoot } = await getWeslToml();
  const futureFiles = weslFiles.map(g => glob(g));
  const files = (await Promise.all(futureFiles)).flat();
  const loaded = await loadFiles(files, weslRoot);
  parseIntoRegistry(loaded, registry);

  // trigger recompilation on wesl files
  const cwd = process.cwd();
  const fullPaths = files.map(f => path.join(cwd, f)); // docs claim relative paths work, but didn't seem so
  fullPaths.forEach(f => ctx.addWatchFile(f));
  return registry;
}

/** load a set of files, converting to paths relative to the  wesl root directory */
async function loadFiles(
  files: string[],
  weslRoot: string,
): Promise<Record<string, string>> {
  const loaded: [string, string][] = [];

  for (const fullPath of files) {
    const data = await fs.readFile(fullPath, "utf-8");
    const relativePath = localPath(fullPath, weslRoot);
    loaded.push([relativePath, data]);
  }
  return Object.fromEntries(loaded);
}

/** convert a fs path to a path relative to the wesl root directory */
function localPath(fullPath: string, weslRoot: string): string {
  const rootStart = fullPath.indexOf(weslRoot);
  if (rootStart === -1) {
    throw new Error(`file ${fullPath} not in root ${weslRoot}`);
  }
  const pathWithSlashPrefix = fullPath.slice(rootStart + weslRoot.length);
  return "." + pathWithSlashPrefix;
}

/** produce reflection data by partially linking the wesl */
async function reflectTs(
  main: string,
  registry: ParsedRegistry,
): Promise<string> {
  let structsTs = "??";
  const linkConfig = bindingStructReflect(enableBindingStructs(), structs => {
    structsTs = bindingGroupLayoutTs(structs[0], false);
  });

  bindAndTransform(registry, main, {}, linkConfig);
  return structsTs;
}

export const unplugin = /* #__PURE__ */ createUnplugin(weslPlugin);

export default unplugin;
