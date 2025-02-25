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
  /** glob search strings to find .wesl/.wgsl files. Relative to the toml directory. */
  weslFiles: string[];

  /** base directory for wesl files. Relative to the toml directory. */
  weslRoot: string;
}

export interface WeslTomlInfo {
  /** The path to the toml file, relative to the cwd */
  tomlFile: string;

  /** The path to the directory that contains the toml.
   * Relative to the cwd. Paths inside the toml are relative to this. */
  tomlDir: string;

  /** The wesl root, relative to the cwd.
   * This lets us correctly do `path.resolve(resolvedWeslRoot, someShaderFile)` */
  resolvedWeslRoot: string;

  /** The underlying toml file */
  toml: WeslToml;
}

/** internal cache used by the plugin to avoid reloading files
 * The assumption is that the plugin is used for a single wesl.toml and set of shaders
 * (a plugin instance supports only one shader project)
 */
interface PluginCache {
  registry?: ParsedRegistry;
  weslToml?: WeslTomlInfo;
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
  const { extensions = [] } = options;
  const suffixes = filterMap(extensions, p => p.extensionName);
  return suffixes;
}

function pluginsByName(
  options: WeslPluginOptions,
): Record<string, PluginExtension> {
  const { extensions = [] } = options;
  const entries = filterMap(extensions, p => [p.extensionName, p]);
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
  unpluginCtx: UnpluginBuildContext & UnpluginContext,
): Promise<WeslTomlInfo> {
  const { cache, options } = context;
  if (cache.weslToml) return cache.weslToml;
  const { weslToml: tomlFile = "wesl.toml" } = options;

  let parsedToml: WeslToml;
  try {
    const tomlString = await fs.readFile(tomlFile, "utf-8");
    unpluginCtx.addWatchFile(tomlFile);
    parsedToml = toml.parse(tomlString) as WeslToml;
  } catch {
    console.log(`using defaults: no wesl.toml found at ${tomlFile}`);
    parsedToml = { weslFiles: ["shaders/**/*.w[eg]sl"], weslRoot: "shaders" };
  }
  const tomlDir = path.dirname(tomlFile);
  cache.weslToml = {
    tomlFile,
    tomlDir,
    resolvedWeslRoot: path.relative(
      ".",
      path.resolve(path.dirname(tomlFile), parsedToml.weslRoot),
    ),
    toml: parsedToml,
  };

  if (context.meta.watchMode) {
    // clear cache on wesl.toml change
    chokidar.watch(tomlFile).on("change", () => {
      cache.registry = undefined;
      cache.weslToml = undefined;
    });
  }

  return cache.weslToml;
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
  const { resolvedWeslRoot } = await getWeslToml(context, unpluginCtx);

  registry = parsedRegistry();
  parseIntoRegistry(loaded, registry);

  // The paths are relative to the weslRoot, but vite needs actual filesystem paths
  const fullPaths = Object.keys(loaded).map(p =>
    path.resolve(resolvedWeslRoot, p),
  );

  // trigger rebuild on shader file change
  fullPaths.forEach(f => unpluginCtx.addWatchFile(f));

  // trigger clearing cache on shader file change
  if (context.meta.watchMode) {
    fullPaths.forEach(f => {
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
  unpluginContext: UnpluginBuildContext & UnpluginContext,
): (baseId: string) => Promise<string> {
  return getWeslMain;

  async function getWeslMain(baseId: string): Promise<string> {
    const { resolvedWeslRoot } = await getWeslToml(context, unpluginContext);
    const main = path.relative(resolvedWeslRoot, baseId);
    return toUnixPath(main);
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
  unpluginCtx: UnpluginBuildContext & UnpluginContext,
): Promise<Record<string, string>> {
  const {
    toml: { weslFiles },
    resolvedWeslRoot,
    tomlDir,
  } = await getWeslToml(context, unpluginCtx);
  const futureFiles = weslFiles.map(g =>
    glob(g, { cwd: tomlDir, absolute: true }),
  );
  const files = (await Promise.all(futureFiles)).flat();
  // dlog({ files, weslRoot, tomlDir, globs });
  return await loadFiles(files, resolvedWeslRoot);
}

/** load a set of files, converting to paths relative to the  wesl root directory */
async function loadFiles(
  files: string[],
  weslRoot: string,
): Promise<Record<string, string>> {
  const loaded: [string, string][] = [];

  for (const fullPath of files) {
    const data = await fs.readFile(fullPath, "utf-8");
    const relativePath = path.relative(weslRoot, fullPath);
    loaded.push([toUnixPath(relativePath), data]);
  }
  return Object.fromEntries(loaded);
}

function toUnixPath(p: string): string {
  if (path.sep !== "/") {
    return p.replaceAll(path.sep, "/");
  } else {
    return p;
  }
}

export const unplugin = createUnplugin(
  (options: WeslPluginOptions, meta: UnpluginContextMeta) => {
    return weslPlugin(options, meta);
  },
);
export default unplugin;
