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

export function weslPlugin(
  options: WeslPluginOptions = {},
  meta: UnpluginContextMeta,
): UnpluginOptions {
  return {
    name: "wesl-plugin",
    resolveId(id) {
      console.log("resolveId(), id:", id);
      if (id.endsWith(".wesl?reflect")) {
        return id;
      }
      return null;
    },
    load: loader,
  };
}

async function loader(this: UnpluginBuildContext, id: string) {
  console.log("loader(), id:", id);
  if (id.endsWith(".wesl?reflect")) {
    const registry = await getRegistry(this);
    return await reflectTs(id, registry);
  }
  return null;
}

let registry: ParsedRegistry | undefined;

interface WeslToml {
  weslFiles: string[];
  weslRoot: string;
}

let weslToml: WeslToml | undefined;

async function getWeslToml(): Promise<WeslToml> {
  if (!weslToml) {
    const tomlString = await fs.readFile("wesl.toml", "utf-8");
    weslToml = toml.parse(tomlString) as WeslToml;
  }
  return weslToml;
}

// TODO figure how to handle reloading vs. mutated AST produced by transforms

async function getRegistry(ctx: UnpluginBuildContext): Promise<ParsedRegistry> {
  // if (!registry) {
  // load wesl files into registry
  registry = parsedRegistry();
  const { weslFiles, weslRoot } = await getWeslToml();
  const futureFiles = weslFiles.map(g => glob(g));
  const files = (await Promise.all(futureFiles)).flat();
  const loaded = await loadFiles(files, weslRoot);
  parseIntoRegistry(loaded, registry);

  // trigger recompilation on wesl files
  const cwd = process.cwd();
  const fullPaths = files.map(f => path.join(cwd, f));
  fullPaths.forEach(f => ctx.addWatchFile(f));
  // }
  return registry;
}

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

function localPath(fullPath: string, weslRoot: string): string {
  const rootStart = fullPath.indexOf(weslRoot);
  if (rootStart === -1) {
    throw new Error(`file ${fullPath} not in root ${weslRoot}`);
  }
  const pathWithSlashPrefix = fullPath.slice(rootStart + weslRoot.length);
  return "." + pathWithSlashPrefix;
}

async function reflectTs(
  id: string,
  registry: ParsedRegistry,
): Promise<string> {
  const { weslRoot } = await getWeslToml();
  const mainFile = id.slice(0, -"?reflect".length);
  const relativeMain = localPath(mainFile, weslRoot);
  let structsTs = "??";
  const linkConfig = bindingStructReflect(enableBindingStructs(), structs => {
    structsTs = bindingGroupLayoutTs(structs[0], false);
  });
  // TODO we don't need the linked output, make a new linker entry point
  const linked = linkRegistry(registry, relativeMain, {}, linkConfig);
  return structsTs;
}

function stringify(obj: any) {
  return JSON.stringify(obj, null, 2);
}

export const unplugin = /* #__PURE__ */ createUnplugin(weslPlugin);

export default unplugin;
