import { bindAndTransform, bindingStructsPlugin } from "wesl";
import {
    bindingGroupLayoutTs,
    reportBindingStructsPlugin
} from "../../linker/src/Reflection.ts";
import { PluginExtension, PluginExtensionApi } from "./PluginExtension.ts";

export const bindingLayoutExtension: PluginExtension = {
  extensionName: "bindingLayout",
  emitFn: bindingLayoutJs,
};

/** Produce JavaScript objects for gpu layout by partially linking the wesl
 * with the binding struct plugins installed */
async function bindingLayoutJs(
  baseId: string,
  api: PluginExtensionApi,
): Promise<string> {
  const registry = await api.weslRegistry();
  const { weslRoot } = await api.weslToml();
  const main = rmPathPrefix(baseId, weslRoot);

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

/** convert a fs path to a path relative to the wesl root directory */
function rmPathPrefix(fullPath: string, weslRoot: string): string {
  const rootStart = fullPath.indexOf(weslRoot);
  if (rootStart === -1) {
    throw new Error(`file ${fullPath} not in root ${weslRoot}`);
  }
  const pathWithSlashPrefix = fullPath.slice(rootStart + weslRoot.length);
  return "." + pathWithSlashPrefix;
}
