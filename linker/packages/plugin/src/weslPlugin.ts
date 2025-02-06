import { glob } from "glob";
import fs from "node:fs/promises";
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
import { dlog, dlogOpt } from "berry-pretty";
import {
  bindAndTransform,
  bindingStructsPlugin,
  filterMap,
  noSuffix,
  parsedRegistry,
  ParsedRegistry,
  parseIntoRegistry,
} from "wesl";
import {
  bindingGroupLayoutTs,
  reportBindingStructsPlugin,
} from "../../linker/src/Reflection.js";
import type { WeslPluginOptions } from "./weslPluginOptions.js";
import path from "node:path";
import { PluginExtension, PluginExtensionApi } from "./PluginExtension.js";

// TODO figure how to handle reloading & mutated AST produced by transforms

/** for now ?reflect is hardcoded */

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
  return {
    name: "wesl-plugin",
    resolveId: buildResolver(options),
    load: buildLoader(options),
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

function buildApi(options: WeslPluginOptions): PluginExtensionApi {
  return {
    weslToml: async () => getWeslToml(),
    weslSrc: async () => loadWesl(options, false),
    weslRegistry: async () => getRegistry(options),
  };
}

/** build plugin function for serving a javascript module in response to
 * an import of of our virtual import modules. */
function buildLoader(options: WeslPluginOptions): Loader {
  const suffixes = pluginNames(options);
  const pluginsMap = pluginsByName(options);
  const buildPluginApi = buildApi(options);
  return loader;

  async function loader(this: UnpluginBuildContext, id: string) {
    const matched = pluginSuffixMatch(id, suffixes);
    if (matched) {
      console.log("loader matched(), id:", id);
      const plugin = pluginsMap[matched.pluginName];
      return await plugin.emitFn(matched.baseId, buildPluginApi);
    }

    if (id.endsWith(".wesl?reflect")) {
      const registry = await getRegistry(this, options);
      const { weslRoot } = await getWeslToml(options.weslToml);
      const mainFile = id.slice(0, -"?reflect".length);
      const main = rmPathPrefix(mainFile, weslRoot);
      return await bindingStructJs(main, registry);
    }
    return null;
  }
}

export interface WeslToml {
  weslFiles: string[];
  weslRoot: string;
}

let weslToml: WeslToml | undefined;

/** load or the wesl.toml  */
async function getWeslToml(tomlFile = "wesl.toml"): Promise<WeslToml> {
  if (!weslToml) {
    // TODO consider supporting default if no wesl.toml is provided: e.g. './shaders'
    const tomlString = await fs.readFile(tomlFile, "utf-8");
    weslToml = toml.parse(tomlString) as WeslToml;
    // TODO watch wesl.toml file, and reload if it changes
  }
  return weslToml;
}

// TODO
// trigger recompilation on wesl files
// Object.keys(loaded).forEach(f => ctx.addWatchFile(f));

// TODO cache
/** load and parse all the wesl files into a ParsedRegistry */
async function getRegistry(
  options: WeslPluginOptions,
): Promise<ParsedRegistry> {
  // load wesl files into registry
  const loaded = await loadWesl(options);
  const registry = parsedRegistry();
  parseIntoRegistry(loaded, registry);

  return registry;
}

/**
 * Load the wesl files referenced in the wesl.toml file
 *
 * @return a record of wesl files with
 *    keys as wesl file paths, and
 *    values as wesl file contents.
 */
async function loadWesl(
  options: WeslPluginOptions,
  weslRootRelative = true,
): Promise<Record<string, string>> {
  const { weslFiles, weslRoot } = await getWeslToml(options.weslToml);
  const { weslToml } = options;
  const tomlDir = weslToml ? path.dirname(weslToml) : process.cwd();

  const globs = weslFiles.map(g => tomlDir + "/" + g);
  const futureFiles = globs.map(g => glob(g));
  const files = (await Promise.all(futureFiles)).flat();
  return loadFiles(files, weslRootRelative ? weslRoot : tomlDir);
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

/** convert a fs path to a path relative to the wesl root directory */
function rmPathPrefix(fullPath: string, weslRoot: string): string {
  const rootStart = fullPath.indexOf(weslRoot);
  if (rootStart === -1) {
    throw new Error(`file ${fullPath} not in root ${weslRoot}`);
  }
  const pathWithSlashPrefix = fullPath.slice(rootStart + weslRoot.length);
  return "." + pathWithSlashPrefix;
}

/** Produce javascript objects reflecting the wesl sources by partially linking the wesl
 * with the binding struct plugins */
async function bindingStructJs(
  main: string,
  registry: ParsedRegistry,
): Promise<string> {
  let structsJs = "??";
  const linkConfig = {
    plugins: [
      bindingStructsPlugin(),
      reportBindingStructsPlugin(structs => {
        structsJs = bindingGroupLayoutTs(structs[0], false);
      }),
    ],
  };

  bindAndTransform(registry, main, {}, linkConfig);
  return structsJs;
}


export const unplugin = createUnplugin(
  (options: WeslPluginOptions, meta: UnpluginContextMeta) => {
    return weslPlugin(options, meta);
  },
);
export default unplugin;
