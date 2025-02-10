import path from "node:path";
import { noSuffix } from "wesl";
import { PluginExtension, PluginExtensionApi } from "./PluginExtension.ts";

export const linkBuildPlugin: PluginExtension = {
  extensionName: "link",
  emitFn: emitLinkJs,
};

/** Emit a JavaScript LinkParams structure, ready for linking at runtime. */
async function emitLinkJs(
  baseId: string,
  api: PluginExtensionApi,
): Promise<string> {
  const { weslRoot } = await api.weslToml();
  const weslSrc = await api.weslSrc();
  const rootModule = await api.weslMain(baseId);

  const linkArgs = {
    rootModuleName: rootModule,
    weslRoot,
    weslSrc,
  };

  const src = `
    export const shaders = ${JSON.stringify(linkArgs, null, 2)};
    
    export default shaders;
    `;

  return src;
}
