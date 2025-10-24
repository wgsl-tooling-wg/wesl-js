import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import type { UnpluginBuildContext, UnpluginContext } from "unplugin";
import { type ParsedRegistry, parsedRegistry, parseIntoRegistry } from "wesl";
import {
  findWeslToml,
  parseDependencies,
  type WeslTomlInfo,
} from "wesl-tooling";
import type { PluginExtensionApi } from "./PluginExtension.ts";
import type { PluginContext } from "./WeslPlugin.ts";

export function buildApi(
  context: PluginContext,
  unpluginCtx: UnpluginBuildContext & UnpluginContext,
): PluginExtensionApi {
  return {
    weslToml: async () => getWeslToml(context, unpluginCtx),
    weslSrc: async () => loadWesl(context, unpluginCtx),
    weslRegistry: async () => getRegistry(context, unpluginCtx),
    weslMain: makeGetWeslMain(context, unpluginCtx),
    weslDependencies: async () => findDependencies(context, unpluginCtx),
  };
}

/** load the wesl.toml  */
export async function getWeslToml(
  context: PluginContext,
  unpluginCtx: UnpluginBuildContext & UnpluginContext,
): Promise<WeslTomlInfo> {
  const { cache } = context;
  if (cache.weslToml) return cache.weslToml;

  const specifiedToml = context.options.weslToml;
  const tomlInfo = await findWeslToml(process.cwd(), specifiedToml);

  if (tomlInfo.tomlFile) {
    unpluginCtx.addWatchFile(tomlInfo.tomlFile); // The cache gets cleared by the watchChange hook
    context.weslToml = tomlInfo.tomlFile;
  }

  cache.weslToml = tomlInfo;
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
  const { resolvedRoot } = await getWeslToml(context, unpluginCtx);

  registry = parsedRegistry();
  parseIntoRegistry(loaded, registry);

  // The paths are relative to the weslRoot, but vite needs actual filesystem paths
  const fullPaths = Object.keys(loaded).map(p => path.resolve(resolvedRoot, p));

  // trigger clearing cache on shader file change
  fullPaths.forEach(f => {
    unpluginCtx.addWatchFile(f);
  });

  cache.registry = registry;
  return registry;
}

/** if the dependency list includes "auto", fill in the missing dependencies
 * by parsing the source files to find references to packages
 * @return the list of dependencies with "auto" replaced by the found dependencies
 */
async function findDependencies(
  context: PluginContext,
  unpluginCtx: UnpluginBuildContext & UnpluginContext,
): Promise<string[]> {
  const { toml, tomlDir: projectDir } = await getWeslToml(context, unpluginCtx);
  const weslSrc = await loadWesl(context, unpluginCtx);
  const { dependencies = [] } = toml;
  const depsArray = Array.isArray(dependencies) ? dependencies : [dependencies];
  if (!depsArray.includes("auto")) return depsArray;

  const base = depsArray.filter(dep => dep !== "auto");
  const deps = parseDependencies(weslSrc, projectDir);
  const combined = new Set([...base, ...deps]);
  return [...combined];
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
    const { resolvedRoot } = await getWeslToml(context, unpluginContext);
    await fs.access(shaderPath); // if file doesn't exist, report now when the user problem is clear.

    const absRoot = path.join(process.cwd(), resolvedRoot);
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
    toml: { include },
    resolvedRoot,
    tomlDir,
  } = await getWeslToml(context, unpluginCtx);
  const futureFiles = include.map(g =>
    glob(g, { cwd: tomlDir, absolute: true }),
  );
  const files = (await Promise.all(futureFiles)).flat();

  // trigger rebuild on shader file change
  files.forEach(f => {
    unpluginCtx.addWatchFile(f);
  });

  return await loadFiles(files, resolvedRoot);
}

/** load a set of shader files, converting to paths relative to the weslRoot directory */
async function loadFiles(
  files: string[],
  weslRoot: string,
): Promise<Record<string, string>> {
  const loaded: [string, string][] = [];

  for (const fullPath of files) {
    const data = await fs.readFile(fullPath, "utf-8");
    const normalized = data.replace(/\r\n/g, "\n"); // normalize line endings to LF
    const relativePath = path.relative(weslRoot, fullPath);
    loaded.push([toUnixPath(relativePath), normalized]);
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
