import { resolve } from "import-meta-resolve";
import path from "node:path";
import url from "node:url";
import { link, noSuffix } from "wesl";
import { PluginExtension, PluginExtensionApi } from "../PluginExtension.ts";

/**
 * a wesl-js ?static build extension that statically links from the root file
 * and emits a JavaScript file containing the linked wgsl string.
 *
 * use it like this:
 *   import wgsl from "./shaders/app.wesl?static";
 */
export const staticBuildExtension: PluginExtension = {
  extensionName: "static",
  emitFn: emitStaticJs,
};

/** Emit a JavaScript file containing the wgsl string */
async function emitStaticJs(
  baseId: string,
  api: PluginExtensionApi,
): Promise<string> {
  const { resolvedWeslRoot, toml, tomlDir } = await api.weslToml();
  const { dependencies = [] } = toml;

  // resolve relative to the file with the import statement
  const parentModule = url.pathToFileURL(baseId).toString();
  const libFileUrls = dependencies.map(d => resolve(d, parentModule));

  // load the lib modules
  const futureLibs = libFileUrls.map(f => import(f));
  const libModules = await Promise.all(futureLibs);
  const libs = libModules.map(m => m.default);

  // find weslSrc and rootModule
  const weslSrc = await api.weslSrc();
  const rootModule = await api.weslMain(baseId);
  const rootModuleName = noSuffix(rootModule);

  // find weslRoot
  const tomlRelative = path.relative(tomlDir, resolvedWeslRoot);
  const debugWeslRoot = tomlRelative.replaceAll(path.sep, "/");

  const result = await link({ weslSrc, rootModuleName, debugWeslRoot, libs });
  const wgsl = result.dest;

  const src = `
    export const wgsl = \`${wgsl}\`;
    export default wgsl;
  `;

  return src;
}
