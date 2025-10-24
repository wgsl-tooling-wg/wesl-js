import path from "node:path";
import { type LinkParams, noSuffix } from "wesl";
import type {
  PluginExtension,
  PluginExtensionApi,
} from "../PluginExtension.ts";

export const linkBuildExtension: PluginExtension = {
  extensionName: "link",
  emitFn: emitLinkJs,
};

/** Emit a JavaScript LinkParams structure, ready for linking at runtime. */
async function emitLinkJs(
  baseId: string,
  api: PluginExtensionApi,
): Promise<string> {
  const { resolvedRoot, tomlDir } = await api.weslToml();

  const weslSrc = await api.weslSrc();

  const rootModule = await api.weslMain(baseId);
  const rootModuleName = noSuffix(rootModule);

  const tomlRelative = path.relative(tomlDir, resolvedRoot);
  const debugWeslRoot = tomlRelative.replaceAll(path.sep, "/");

  const autoDeps = await api.weslDependencies();
  const sanitizedDeps = autoDeps.map(dep => dep.replaceAll("/", "_"));

  const bundleImports = autoDeps
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
