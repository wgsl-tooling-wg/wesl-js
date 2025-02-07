import choikidar from "chokidar";
import { glob } from "glob";
import fs from "node:fs/promises";
import path from "node:path";
import toml from "toml";
import type {
  ExternalIdResult,
  Thenable,
  TransformResult,
  UnpluginBuildContext,
  UnpluginContext,
  UnpluginContextMeta,
  UnpluginOptions,
} from "unplugin";
import { createUnplugin } from "unplugin";
import {
  filterMap,
  parsedRegistry,
  ParsedRegistry,
  parseIntoRegistry,
} from "wesl";
import { PluginExtension, PluginExtensionApi } from "./PluginExtension.js";
import type { WeslPluginOptions } from "./weslPluginOptions.js";

/** loaded (or synthesized) info from .toml */
export interface WeslToml {
  /** glob search strings to find .wesl/.wgsl files */
  weslFiles: string[];

  /** base directory for wesl files */
  weslRoot: string;
}

/** internal cache used by the plugin to avoid reloading files
 * The assumption is that the plugin is used for a single wesl.toml and set of shaders
 * (a plugin instance supports only one shader project)
 */
interface PluginCache {
  registry?: ParsedRegistry;
  weslToml?: WeslToml;
}

/** some types from unplugin */
type Resolver = (
  this: UnpluginBuildContext & UnpluginContext,
  id: string,
  importer: string | undefined,
  options: {
    isEntry: boolean;
  },
) => Thenable<string | ExternalIdResult | null | undefined>;

type Loader = (
  this: UnpluginBuildContext & UnpluginContext,
  id: string,
) => Thenable<TransformResult>;

/**
 * A bundler plugin for processing WESL files.
 *
 * The plugin works by reading the wesl.toml file and possibly package.json
 *
 * The plugin is triggered by imports to special virtual module urls
 * two urls suffixes are supported:
 *  1. `import "./shaders/bar.wesl?reflect"` - produces a javascript file for binding struct reflection
 *  2. `import "./shaders/bar.wesl?link"` - produces a javascript file for preconstructed link functions
 */
export function weslPlugin(
  options: WeslPluginOptions = {},
  meta: UnpluginContextMeta,
): UnpluginOptions {
  const cache: PluginCache = {};

  return {
    name: "wesl-plugin",
    resolveId: buildResolver(options),
    load: buildLoader(cache, options),
  };
}

function pluginNames(options: WeslPluginOptions): string[] {
  const buildPlugins = options.buildPlugins || [];
  const suffixes = filterMap(buildPlugins, p => p.extensionName);
  return suffixes;
}

function pluginsByName(
  options: WeslPluginOptions,
): Record<string, PluginExtension> {
  const buildPlugins = options.buildPlugins || [];
  const entries = filterMap(buildPlugins, p => [p.extensionName, p]);
  return Object.fromEntries(entries);
}

const pluginSuffix = /(?<baseId>.*\.w[eg]sl)\?(?<pluginName>[\w_-]+)/;

/** build plugin entry for 'resolverId'
 * to validate our virtual import modules (with ?reflect or ?link suffixes) */
function buildResolver(options: WeslPluginOptions): Resolver {
  const suffixes = pluginNames(options);
  return resolver;

  function resolver(this: UnpluginBuildContext, id: string): string | null {
    if (id === options.weslToml || id === "wesl.toml") {
      return id;
    }
    const matched = pluginSuffixMatch(id, suffixes);
    return matched ? id : null;
  }
}
interface PluginMatch {
  baseId: string;
  pluginName: string;
}

function pluginSuffixMatch(id: string, suffixes: string[]): PluginMatch | null {
  const suffixMatch = id.match(pluginSuffix);
  const pluginName = suffixMatch?.groups?.pluginName;
  if (!pluginName || !suffixes.includes(pluginName)) return null;
  return { pluginName, baseId: suffixMatch.groups!.baseId };
}

function buildApi(
  cache: PluginCache,
  ctx: UnpluginBuildContext,
  options: WeslPluginOptions,
): PluginExtensionApi {
  return {
    weslToml: async () => getWeslToml(cache, ctx),
    weslSrc: async () => loadWesl(cache, ctx, options),
    weslRegistry: async () => getRegistry(cache, ctx, options),
    weslMain: makeGetWeslMain(cache, ctx, options),
  };
}

/** build plugin function for serving a javascript module in response to
 * an import of of our virtual import modules. */
function buildLoader(cache: PluginCache, options: WeslPluginOptions): Loader {
  const suffixes = pluginNames(options);
  const pluginsMap = pluginsByName(options);
  return loader;

  async function loader(this: UnpluginBuildContext, id: string) {
    const matched = pluginSuffixMatch(id, suffixes);
    if (matched) {
      const buildPluginApi = buildApi(cache, this, options);
      const plugin = pluginsMap[matched.pluginName];
      return await plugin.emitFn(matched.baseId, buildPluginApi);
    }

    return null;
  }
}

/** load the wesl.toml  */
async function getWeslToml(
  cache: PluginCache,
  ctx: UnpluginBuildContext,
  tomlFile = "wesl.toml",
): Promise<WeslToml> {
  let { weslToml } = cache;
  if (weslToml) return weslToml;

  try {
    const tomlString = await fs.readFile(tomlFile, "utf-8");
    ctx.addWatchFile(tomlFile);
    weslToml = toml.parse(tomlString) as WeslToml;
  } catch {
    console.log(`using defaults: no wesl.toml found at ${tomlFile}`);
    weslToml = { weslFiles: ["shaders/**/*.w[eg]sl"], weslRoot: "shaders" };
  }
  cache.weslToml = weslToml;

  // clear cache on wesl.toml change
  choikidar.watch(tomlFile).on("change", () => {
    cache.registry = undefined;
    cache.weslToml = undefined;
  });

  return weslToml;
}

/** load and parse all the wesl files into a ParsedRegistry */
async function getRegistry(
  cache: PluginCache,
  ctx: UnpluginBuildContext,
  options: WeslPluginOptions,
): Promise<ParsedRegistry> {
  let { registry } = cache;
  if (registry) return registry;

  // load wesl files into registry
  const loaded = await loadWesl(cache, ctx, options);
  const { weslRoot } = await getWeslToml(cache, ctx);
  const translatedEntries = Object.entries(loaded).map(([path, src]) => {
    const newPath = rmPathPrefix(path, weslRoot);
    return [newPath, src];
  });
  const translated = Object.fromEntries(translatedEntries);
  registry = parsedRegistry();
  parseIntoRegistry(translated, registry);

  // trigger rebuild on shader file change
  Object.keys(translated).forEach(f => ctx.addWatchFile(f));

  // trigger clearing cache on shader file change
  Object.keys(loaded).forEach(f => {
    choikidar.watch(f).on("change", () => {
      console.log("resetting cache", f);
      cache.registry = undefined;
    });
  });

  cache.registry = registry;
  return registry;
}

function makeGetWeslMain(
  cache: PluginCache,
  ctx: UnpluginBuildContext,
  options: WeslPluginOptions,
): (baseId: string) => Promise<string> {
  return getWeslMain;

  async function getWeslMain(baseId: string): Promise<string> {
    const { weslRoot } = await getWeslToml(cache, ctx, options.weslToml);
    const main = rmPathPrefix(baseId, weslRoot);
    return main;
  }
}

/**
 * Load the wesl files referenced in the wesl.toml file
 *
 * @return a record of wesl files with
 *    keys as wesl file paths, and
 *    values as wesl file contents.
 */
async function loadWesl(
  cache: PluginCache,
  ctx: UnpluginBuildContext,
  options: WeslPluginOptions,
): Promise<Record<string, string>> {
  const { weslFiles } = await getWeslToml(cache, ctx, options.weslToml);
  const { weslToml } = options;
  const tomlDir = weslToml ? path.dirname(weslToml) : process.cwd();

  const globs = weslFiles.map(g => tomlDir + "/" + g);
  const futureFiles = globs.map(g => glob(g));
  const files = (await Promise.all(futureFiles)).flat();
  // dlog({ files, weslRoot, tomlDir, globs });
  return loadFiles(files, tomlDir);
}

/** load a set of files, converting to paths relative to the  wesl root directory */
async function loadFiles(
  files: string[],
  weslRoot?: string,
): Promise<Record<string, string>> {
  const loaded: [string, string][] = [];

  for (const fullPath of files) {
    const data = await fs.readFile(fullPath, "utf-8");
    const relativePath = weslRoot ? rmPathPrefix(fullPath, weslRoot) : fullPath;
    loaded.push([relativePath, data]);
  }
  return Object.fromEntries(loaded);
}

// TODO DRY
/** convert a fs path to a path relative to the wesl root directory */
function rmPathPrefix(fullPath: string, weslRoot: string): string {
  const rootStart = fullPath.indexOf(weslRoot);
  if (rootStart === -1) {
    throw new Error(`file ${fullPath} not in root ${weslRoot}`);
  }
  const pathWithSlashPrefix = fullPath.slice(rootStart + weslRoot.length);
  return "." + pathWithSlashPrefix;
}

export const unplugin = createUnplugin(
  (options: WeslPluginOptions, meta: UnpluginContextMeta) => {
    return weslPlugin(options, meta);
  },
);
export default unplugin;
