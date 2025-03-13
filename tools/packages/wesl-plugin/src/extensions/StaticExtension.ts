import path from "node:path";
import { link, noSuffix } from "wesl";
import { PluginExtension, PluginExtensionApi } from "../PluginExtension.ts";

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

  const weslSrc = await api.weslSrc();
  const rootModule = await api.weslMain(baseId);
  const rootModuleName = noSuffix(rootModule);

  const tomlRelative = path.relative(tomlDir, resolvedWeslRoot);
  const debugWeslRoot = tomlRelative.replaceAll(path.sep, "/");

  const result = await link({ weslSrc, rootModuleName, debugWeslRoot }); // TODO handle libs
  const wgsl = result.dest;

  const src = `
    export const wgsl = \`${wgsl}\`;
    export default wgsl;
    `;


  return src;
}
