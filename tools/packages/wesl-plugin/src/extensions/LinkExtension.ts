import path from "node:path";
import { LinkParams, noSuffix } from "wesl";
import { PluginExtension, PluginExtensionApi } from "../PluginExtension.ts";

export const linkBuildExtension: PluginExtension = {
  extensionName: "link",
  emitFn: emitLinkJs,
};

/** Emit a JavaScript LinkParams structure, ready for linking at runtime. */
async function emitLinkJs(
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

  const sanitizedDeps = dependencies.map(dep => dep.replaceAll("/", "_"));

  const bundleImports = dependencies
    .map((p, i) => `import ${sanitizedDeps[i]} from "${p}";`)
    .join("\n");

  const rootName = path.basename(rootModuleName);
  const paramsName = `link${rootName}Config`;

  const linkParams: LinkParams = {
    rootModuleName,
    weslSrc,
    debugWeslRoot,
  };

  const libsStr = `libs: [${sanitizedDeps.join(", ")}]`;
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
