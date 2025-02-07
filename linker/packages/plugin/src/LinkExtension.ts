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
  const rootModule = rmPathPrefix(noSuffix(baseId), weslRoot);
  const rootName = path.basename(rootModule);

  const paramsName = `link${rootName}Config`;
  const src = `
    export const ${paramsName}= {
      rootModuleName: "${rootModule}",
      weslRoot: "${weslRoot}",  
      weslSrc: ${JSON.stringify(weslSrc, null, 2)},
    };

    export default ${paramsName};
    `;

  return src;
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
