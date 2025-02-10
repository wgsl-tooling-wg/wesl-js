import chokidar from "chokidar";
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

/** convenient state for local functions */
interface PluginContext {
  cache: PluginCache;
  options: WeslPluginOptions;
  meta: UnpluginContextMeta;
}

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
  const context: PluginContext = { cache, meta, options };

  return {
    name: "wesl-plugin",
    resolveId: buildResolver(options),
    load: buildLoader(context),
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

  function resolver(
    this: UnpluginBuildContext & UnpluginContext,
    id: string,
  ): string | null {
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
  context: PluginContext,
  unpluginCtx: UnpluginBuildContext & UnpluginContext,
): PluginExtensionApi {
  return {
    weslToml: async () => getWeslToml(context, unpluginCtx),
    weslSrc: async () => loadWesl(context, unpluginCtx),
    weslRegistry: async () => getRegistry(context, unpluginCtx),
    weslMain: makeGetWeslMain(context, unpluginCtx),
  };
}

/** build plugin function for serving a javascript module in response to
 * an import of of our virtual import modules. */
function buildLoader(context: PluginContext): Loader {
  const { options } = context;
  const suffixes = pluginNames(options);
  const pluginsMap = pluginsByName(options);
  return loader;

  async function loader(
    this: UnpluginBuildContext & UnpluginContext,
    id: string,
  ) {
    const matched = pluginSuffixMatch(id, suffixes);
    if (matched) {
      const buildPluginApi = buildApi(context, this);
      const plugin = pluginsMap[matched.pluginName];
      return await plugin.emitFn(matched.baseId, buildPluginApi);
    }

    return null;
  }
}

/** load the wesl.toml  */
async function getWeslToml(
  context: PluginContext,
  unpluginCtx: UnpluginBuildContext,
): Promise<WeslToml> {
  const { cache, options } = context;
  let { weslToml } = cache;
  if (weslToml) return weslToml;
  const { weslToml: tomlFile = "wesl.toml" } = options;

  try {
    const tomlString = await fs.readFile(tomlFile, "utf-8");
    unpluginCtx.addWatchFile(tomlFile);
    weslToml = toml.parse(tomlString) as WeslToml;
  } catch {
    console.log(`using defaults: no wesl.toml found at ${tomlFile}`);
    weslToml = { weslFiles: ["shaders/**/*.w[eg]sl"], weslRoot: "shaders" };
  }
  cache.weslToml = weslToml;

  if (context.meta.watchMode) {
    // clear cache on wesl.toml change
    chokidar.watch(tomlFile).on("change", () => {
      cache.registry = undefined;
      cache.weslToml = undefined;
    });
  }

  return weslToml;
}

/** load and parse all the wesl files into a ParsedRegistry */
async function getRegistry(
  context: PluginContext,
  unpluginCtx: UnpluginBuildContext & UnpluginContext,
): Promise<ParsedRegistry> {
  const { cache } = context;
  let { registry } = cache;
  if (registry) return registry;

  // load wesl files into registry
  const loaded = await loadWesl(context, unpluginCtx);
  const { weslRoot } = await getWeslToml(context, unpluginCtx);
  const translatedEntries = Object.entries(loaded).map(([path, src]) => {
    const newPath = relativeUnix(weslRoot, path);
    return [newPath, src];
  });

  const translated = Object.fromEntries(translatedEntries);
  registry = parsedRegistry();
  parseIntoRegistry(translated, registry);

  // trigger rebuild on shader file change
  Object.keys(translated).forEach(f => unpluginCtx.addWatchFile(f));

  // trigger clearing cache on shader file change
  if (context.meta.watchMode) {
    Object.keys(loaded).forEach(f => {
      chokidar.watch(f).on("change", () => {
        console.log("resetting cache", f);
        cache.registry = undefined;
      });
    });
  }

  cache.registry = registry;
  return registry;
}

function makeGetWeslMain(
  context: PluginContext,
  unpluginContext: UnpluginBuildContext,
): (baseId: string) => Promise<string> {
  return getWeslMain;

  async function getWeslMain(baseId: string): Promise<string> {
    const { weslRoot } = await getWeslToml(context, unpluginContext);
    const main = relativeUnix(weslRoot, baseId);
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
  context: PluginContext,
  unpluginCtx: UnpluginBuildContext,
): Promise<Record<string, string>> {
  const { options } = context;
  const { weslFiles } = await getWeslToml(context, unpluginCtx);
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
    const relativePath = relativeUnix(weslRoot ?? ".", fullPath);
    loaded.push([relativePath, data]);
  }
  return Object.fromEntries(loaded);
}

export const unplugin = createUnplugin(
  (options: WeslPluginOptions, meta: UnpluginContextMeta) => {
    return weslPlugin(options, meta);
  },
);
export default unplugin;

function relativeUnix(from: string, to: string): string {
  return path.relative(from, to).replaceAll(path.sep, path.posix.sep);
}
