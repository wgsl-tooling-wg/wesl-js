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
    UnpluginOptions
} from "unplugin";
import { createUnplugin } from "unplugin";
import {
    Conditions,
    parsedRegistry,
    ParsedRegistry,
    parseIntoRegistry
} from "wesl";
import { PluginExtension, PluginExtensionApi } from "./PluginExtension.js";
import type { WeslPluginOptions } from "./WeslPluginOptions.js";

/** loaded (or synthesized) info from .toml */
export interface WeslToml {
  /** glob search strings to find .wesl/.wgsl files. Relative to the toml directory. */
  weslFiles: string[];

  /** base directory for wesl files. Relative to the toml directory. */
  weslRoot: string;

  /** names of directly referenced wesl shader packages (e.g. npm package names) */
  dependencies?: string[];
}

export interface WeslTomlInfo {
  /** The path to the toml file, relative to the cwd, undefined if no toml file */
  tomlFile: string | undefined;

  /** The absolute path to the directory that contains the toml.
   * Paths inside the toml are relative to this. */
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
    watchChange(id, change) {
      if (id.endsWith("wesl.toml")) {
        // The cache is shared for multiple imports
        cache.weslToml = undefined;
        cache.registry = undefined;
      } else {
        cache.registry = undefined;
      }
    },
  };
}

function pluginNames(options: WeslPluginOptions): string[] {
  return options.extensions?.map(p => p.extensionName) ?? [];
}

function pluginsByName(
  options: WeslPluginOptions,
): Record<string, PluginExtension> {
  const entries = options.extensions?.map(p => [p.extensionName, p]) ?? [];
  return Object.fromEntries(entries);
}

/** wesl plugins match import statements of the form:
 *
 *   foo/bar.wesl?link
 * or
 *   foo/bar.wesl COND=false ?static
 *
 * someday it'd be nice to support import attributes like:
 *    import "foo.bar.wesl?static" with { COND: false};
 * (but that doesn't seem supported to be supported in the the bundler plugins yet)
 */
const pluginMatch =
  /(^^)?(?<baseId>.*\.w[eg]sl)(?<cond>(\s*\w+(=\w+)?\s*)*)\?(?<pluginName>[\w_-]+)$/;

const resolvedPrefix = "^^";

/** build plugin entry for 'resolverId'
 * to validate our javascript virtual module imports (with e.g. ?static or ?link suffixes) */
function buildResolver(options: WeslPluginOptions): Resolver {
  const suffixes = pluginNames(options);
  return resolver;

  // vite calls resolver only for odd import paths.
  //   this doesn't call resolver: import wgsl from "../shaders/foo/app.wesl?static";
  //   but this does call resolver: import wgsl from "../shaders/foo/app.wesl MOBILE=true FUN SAFE=false ?static";

  /**
   * For imports with conditions, vite won't resolve the module-path part of the js import
   * so we do it here.
   *
   * To avoid recirculating on resolve(), we rewrite the resolution id to start with ^^
   * The loader will drop the prefix.
   */
  function resolver(
    this: UnpluginBuildContext & UnpluginContext,
    id: string,
    importer: string | undefined,
  ): string | null {
    if (id.startsWith(resolvedPrefix)) {
      return id;
    }
    const matched = pluginSuffixMatch(id, suffixes);
    if (matched) {
      const { importParams, baseId, pluginName } = matched;

      // resolve the path to the shader file
      const importerDir = path.dirname(importer!);
      const pathToShader = path.join(importerDir, baseId);
      const result =
        resolvedPrefix + pathToShader + importParams + "?" + pluginName;
      return result;
    }
    return matched ? id : null; // this case doesn't happen AFAIK
  }
}

interface PluginMatch {
  baseId: string;
  importParams?: string;
  pluginName: string;
}

function pluginSuffixMatch(id: string, suffixes: string[]): PluginMatch | null {
  const suffixMatch = id.match(pluginMatch);
  const pluginName = suffixMatch?.groups?.pluginName;
  if (!pluginName || !suffixes.includes(pluginName)) return null;
  return {
    pluginName,
    baseId: suffixMatch.groups!.baseId,
    importParams: suffixMatch.groups?.cond,
  };
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
      const { baseId, importParams } = matched;
      const conditions = importParamsToConditions(importParams);
      const shaderPath =
        baseId.startsWith(resolvedPrefix) ?
          baseId.slice(resolvedPrefix.length)
        : baseId;

      return await plugin.emitFn(shaderPath, buildPluginApi, conditions);
    }

    return null;
  }
}

/**
 * Convert an import parameters string to a Conditions record.
 *
 * Import parameters are key=value pairs separated by spaces.
 * Values may be "true" or "false" or missing (default to true)
 * e.g. ' MOBILE=true FUN SAFE=false '
 */
function importParamsToConditions(
  importParams: string | undefined,
): Conditions | undefined {
  if (!importParams) return undefined;
  const params = importParams.trim().split(/\s+/);
  const condEntries = params.map(p => {
    const text = p.trim();
    const [cond, value] = text.split("=");
    if (value === undefined || value === "true") {
      return [cond, true] as const;
    } else {
      return [cond, false] as const;
    }
  });
  const conditions = Object.fromEntries(condEntries);
  return conditions;
}

export const defaultTomlMessage = `no wesl.toml found: assuming .wesl files are in ./shaders`;

/** load the wesl.toml  */
async function getWeslToml(
  context: PluginContext,
  unpluginCtx: UnpluginBuildContext & UnpluginContext,
): Promise<WeslTomlInfo> {
  const { cache } = context;
  if (cache.weslToml) return cache.weslToml;

  // find the wesl.toml file if it exists
  const specifiedToml = context.options.weslToml;
  let tomlFile: string | undefined;
  if (specifiedToml) {
    fs.access(specifiedToml);
    tomlFile = specifiedToml;
  } else {
    tomlFile = await fs
      .access("wesl.toml")
      .then(() => "wesl.toml")
      .catch(() => {
        return undefined;
      });
  }

  // load the toml contents
  let parsedToml: WeslToml;
  let tomlDir: string;
  if (tomlFile) {
    unpluginCtx.addWatchFile(tomlFile); // The cache gets cleared by the watchChange hook
    parsedToml = await loadWeslToml(tomlFile);
    tomlDir = path.dirname(tomlFile);
  } else {
    console.log(defaultTomlMessage);
    parsedToml = defaultWeslToml;
    tomlDir = process.cwd();
  }

  const tomlToWeslRoot = path.resolve(tomlDir, parsedToml.weslRoot);
  const resolvedWeslRoot = path.relative(process.cwd(), tomlToWeslRoot);
  cache.weslToml = { tomlFile, tomlDir, resolvedWeslRoot, toml: parsedToml };
  return cache.weslToml;
}

const defaultWeslToml: WeslToml = {
  weslFiles: ["shaders/**/*.w[eg]sl"],
  weslRoot: "shaders",
};

/**
 * Load and parse a wesl.toml file from the fs.
 * Provide default values for any required WeslToml fields.
 */
async function loadWeslToml(tomlFile: string): Promise<WeslToml> {
  const tomlString = await fs.readFile(tomlFile, "utf-8");
  const parsed = toml.parse(tomlString) as WeslToml;
  const weslToml = { ...defaultWeslToml, ...parsed };
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
  const { resolvedWeslRoot } = await getWeslToml(context, unpluginCtx);

  registry = parsedRegistry();
  parseIntoRegistry(loaded, registry);

  // The paths are relative to the weslRoot, but vite needs actual filesystem paths
  const fullPaths = Object.keys(loaded).map(p =>
    path.resolve(resolvedWeslRoot, p),
  );

  // trigger clearing cache on shader file change
  fullPaths.forEach(f => {
    unpluginCtx.addWatchFile(f);
  });

  cache.registry = registry;
  return registry;
}

function makeGetWeslMain(
  context: PluginContext,
  unpluginContext: UnpluginBuildContext & UnpluginContext,
): (baseId: string) => Promise<string> {
  return getWeslMain;

  /**
   * @param shaderPath is an absolute path to the shader file
   * @return the / separated path to the shader file, relative to the weslRoot
   */
  async function getWeslMain(shaderPath: string): Promise<string> {
    const { resolvedWeslRoot } = await getWeslToml(context, unpluginContext);
    await fs.access(shaderPath); // if file doesn't exist, report now when the user problem is clear.

    const absRoot = path.join(process.cwd(), resolvedWeslRoot);
    const weslRootToMain = path.relative(absRoot, shaderPath);
    return toUnixPath(weslRootToMain);
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

  // trigger rebuild on shader file change
  files.forEach(f => unpluginCtx.addWatchFile(f));

  return await loadFiles(files, resolvedWeslRoot);
}

/** load a set of shader files, converting to paths relative to the weslRoot directory */
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
