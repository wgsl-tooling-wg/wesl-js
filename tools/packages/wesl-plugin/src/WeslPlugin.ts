import path from "node:path";
import {
  createUnplugin,
  type ExternalIdResult,
  type Thenable,
  type TransformResult,
  type UnpluginBuildContext,
  type UnpluginContext,
  type UnpluginContextMeta,
  type UnpluginOptions,
} from "unplugin";
import type { Conditions, RecordResolver } from "wesl";
import type { WeslToml, WeslTomlInfo } from "wesl-tooling";
import { linkBuildExtension } from "./extensions/LinkExtension.ts";
import { staticBuildExtension } from "./extensions/StaticExtension.ts";
import { buildApi } from "./PluginApi.ts";
import type { PluginExtension } from "./PluginExtension.ts";
import type { WeslPluginOptions } from "./WeslPluginOptions.ts";

export type { WeslToml, WeslTomlInfo };

/** internal cache used by the plugin to avoid reloading files
 * The assumption is that the plugin is used for a single wesl.toml and set of shaders
 * (a plugin instance supports only one shader project)
 */
interface PluginCache {
  registry?: RecordResolver;
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
export interface PluginContext {
  cache: PluginCache;
  options: WeslPluginOptions;
  meta: UnpluginContextMeta;
  /** path to wesl.toml file (relative to cwd) */
  weslToml?: string;
}

type DebugLog = (msg: string, data?: Record<string, unknown>) => void;

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
const builtinExtensions = [staticBuildExtension, linkBuildExtension];

export function weslPlugin(
  options: WeslPluginOptions | undefined,
  meta: UnpluginContextMeta,
): UnpluginOptions {
  const o = options ?? {};
  const extensions = [...builtinExtensions, ...(o.extensions ?? [])];
  const opts = { ...o, extensions };
  const cache: PluginCache = {};
  const context: PluginContext = { cache, meta, options: opts };
  const log = opts.debug ? debugLog : noopLog;

  log("init", { extensions: opts.extensions.map(e => e.extensionName) });

  return {
    name: "wesl-plugin",
    resolveId: buildResolver(opts, context, log),
    load: buildLoader(context, log),
    watchChange(id, _change) {
      log("watchChange", { id });
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
 * Bundlers may add extra query params (e.g. Vite adds ?import for dynamic imports,
 * ?t=123 for cache busting), so we capture the full query and search within it.
 *
 * someday it'd be nice to support import attributes like:
 *    import "foo.bar.wesl?static" with { COND: false};
 * (but that doesn't seem supported to be supported in the the bundler plugins yet)
 */
const pluginMatch =
  /(^^)?(?<baseId>.*\.w[eg]sl)(?<cond>(\s*\w+(=\w+)?\s*)*)\?(?<query>.+)$/;

const resolvedPrefix = "^^";

/** build plugin entry for 'resolverId'
 * to validate our javascript virtual module imports (with e.g. ?static or ?link suffixes) */
function buildResolver(
  options: WeslPluginOptions,
  context: PluginContext,
  log: DebugLog,
): Resolver {
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
    if (id === context.weslToml) {
      return id;
    }
    const matched = pluginSuffixMatch(id, suffixes);
    log("resolveId", { id, matched: !!matched, suffixes });
    if (matched) {
      const { importParams, baseId, pluginName } = matched;

      // resolve the path to the shader file
      const importerDir = path.dirname(importer!);
      const pathToShader = path.join(importerDir, baseId);
      const result =
        resolvedPrefix + pathToShader + importParams + "?" + pluginName;
      log("resolveId resolved", { result });
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

/** Find matching plugin suffix in query string (handles ?import&static, ?t=123&static, etc.) */
function pluginSuffixMatch(id: string, suffixes: string[]): PluginMatch | null {
  const match = id.match(pluginMatch);
  const query = match?.groups?.query;
  if (!query) return null;

  // Query params are &-separated; find one that matches a configured suffix
  const segments = query.split("&");
  const pluginName = suffixes.find(s => segments.includes(s));
  if (!pluginName) return null;

  return {
    pluginName,
    baseId: match.groups!.baseId,
    importParams: match.groups?.cond,
  };
}

/** build plugin function for serving a javascript module in response to
 * an import of of our virtual import modules. */
function buildLoader(context: PluginContext, log: DebugLog): Loader {
  const { options } = context;
  const suffixes = pluginNames(options);
  const pluginsMap = pluginsByName(options);
  return loader;

  async function loader(
    this: UnpluginBuildContext & UnpluginContext,
    id: string,
  ) {
    const matched = pluginSuffixMatch(id, suffixes);
    log("load", { id, matched: matched?.pluginName ?? null });
    if (matched) {
      const buildPluginApi = buildApi(context, this);
      const plugin = pluginsMap[matched.pluginName];
      const { baseId, importParams } = matched;
      const conditions = importParamsToConditions(importParams);
      const shaderPath = baseId.startsWith(resolvedPrefix)
        ? baseId.slice(resolvedPrefix.length)
        : baseId;

      log("load emitting", { shaderPath, conditions });
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

function fmtDebugData(data?: Record<string, unknown>): string {
  return data ? " " + JSON.stringify(data) : "";
}

function debugLog(msg: string, data?: Record<string, unknown>): void {
  console.error(`[wesl-plugin] ${msg}${fmtDebugData(data)}`);
}

function noopLog(): void {}

export const unplugin = createUnplugin(
  (options: WeslPluginOptions, meta: UnpluginContextMeta) => {
    return weslPlugin(options, meta);
  },
);
export default unplugin;
