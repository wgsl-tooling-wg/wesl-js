import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import toml from "toml";
import type { UnpluginBuildContext, UnpluginContext } from "unplugin";
import { type ParsedRegistry, parsedRegistry, parseIntoRegistry } from "wesl";
import { parseDependencies } from "wesl-tooling";
import type { PluginExtensionApi } from "./PluginExtension.ts";
import type { PluginContext, WeslToml, WeslTomlInfo } from "./WeslPlugin.ts";

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
    context.weslToml = tomlFile;
  } else {
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
  dependencies: ["auto"],
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
  const hasAuto = dependencies.includes("auto");
  if (!hasAuto) return dependencies;

  const base = dependencies.filter(dep => dep !== "auto");
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
  files.forEach(f => {
    unpluginCtx.addWatchFile(f);
  });

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
