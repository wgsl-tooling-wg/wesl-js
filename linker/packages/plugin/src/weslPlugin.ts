import { glob } from "glob";
import fs from "node:fs/promises";
import toml from "toml";
import type { UnpluginContextMeta, UnpluginOptions } from "unplugin";
import { createUnplugin } from "unplugin";
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

export function weslPlugin(
  options: WeslPluginOptions = {},
  meta: UnpluginContextMeta,
): UnpluginOptions {
  return {
    name: "wesl-plugin",
    resolveId(id) {
      if (id.endsWith(".wesl?reflect")) {
        return id;
      }
      return null;
    },
    load: async id => {
      if (id.endsWith(".wesl?reflect")) {
        console.log("loading ?reflect", id);
        console.log("--options:", stringify(options));
        console.log("--meta:", stringify(meta));
        return await reflectTs(id);
      }
      return null;
    },
  };
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

async function getRegistry(): Promise<ParsedRegistry> {
  if (!registry) {
    registry = parsedRegistry();
    const { weslFiles, weslRoot } = await getWeslToml();
    const files = (await Promise.all(weslFiles.map(g => glob(g)))).flat();
    const loaded = await loadFiles(files, weslRoot);
    parseIntoRegistry(loaded, registry);
  }
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

async function reflectTs(id: string): Promise<string> {
  const { weslRoot } = await getWeslToml();
  const registry = await getRegistry();
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
