import path from "node:path";
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
  const rootModulePath = rootModule;
  const rootName = path.parse(rootModulePath).name; // TODO: What if the file path has a - or a `foo.frag.wgsl` or ...

  const linkParams = {
    rootModulePath,
    weslRoot,
    weslSrc,
  };

  const paramsName = `link${rootName}Config`;
  const src = `
    export const ${paramsName} = ${JSON.stringify(linkParams, null, 2)};
    export default ${paramsName};
    `;

  return src;
}
