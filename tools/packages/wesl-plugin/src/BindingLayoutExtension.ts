import { bindAndTransform, bindingStructsPlugin, LinkConfig } from "wesl";
import {
    bindingGroupLayoutTs,
    reportBindingStructsPlugin
} from "../../wesl/src/Reflection.ts"; // TODO fix import 
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
  const main = await api.weslMain(baseId);

  // partially link so we can reflect the translated binding structs
  let structsJs = "??";
  const config: LinkConfig = {
    plugins: [
      bindingStructsPlugin(),
      reportBindingStructsPlugin(structs => {
        structsJs = bindingGroupLayoutTs(structs[0], false);
      }),
    ],
  };
  bindAndTransform({ registry, rootModuleName: main, config });

  return structsJs;
}
