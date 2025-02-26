import path from "node:path";
import { LinkParams, noSuffix } from "wesl";
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
  const { resolvedWeslRoot, toml } = await api.weslToml();
  const { dependencies = [] } = toml;
  const debugWeslRoot = resolvedWeslRoot.replaceAll(path.sep, "/");
  const weslSrc = await api.weslSrc();
  const rootModule = await api.weslMain(baseId);
  const rootModuleName = noSuffix(rootModule);
  const rootName = path.basename(rootModuleName);

  const bundleImports = dependencies
    .map(p => `import ${p} from "${p}";`)
    .join("\n");

  const paramsName = `link${rootName}Config`;

  const linkParams: LinkParams = {
    rootModuleName,
    weslSrc,
    debugWeslRoot,
  };

  const libsStr = `libs: [${dependencies.join(", ")}]`;
  const linkParamsStr = `{
    ${serializeFields(linkParams)},
    ${libsStr},
  }`;

  const src = `
    ${bundleImports}
    export const ${paramsName} = ${linkParamsStr};
    export default ${paramsName};
    `;

  return src;
}

function serializeFields(record: Record<string, any>) {
  return Object.entries(record)
    .map(([k, v]) => `    ${k}: ${JSON.stringify(v, null, 2)}`)
    .join(",\n");
}
