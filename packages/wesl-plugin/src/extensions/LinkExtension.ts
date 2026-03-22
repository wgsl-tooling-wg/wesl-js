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
  _conditions?: Record<string, boolean>,
  options?: Record<string, string>,
): Promise<string> {
  const rootModule = await api.weslMain(baseId);
  const rootModuleName = noSuffix(rootModule);

  const [{ weslSrc, dependencies: autoDeps }, debugWeslRoot] =
    await Promise.all([
      api.fetchProject(rootModuleName, options),
      api.debugWeslRoot(),
    ]);

  const sanitizedDeps = autoDeps.map(dep => dep.replaceAll("/", "_"));

  const bundleImports = autoDeps
    .map((p, i) => `import ${sanitizedDeps[i]} from "${p}";`)
    .join("\n");

  const rootName = path.basename(rootModuleName).replace(/\W/g, "_");
  const paramsName = `link${rootName}Config`;

  const linkParams: LinkParams = { rootModuleName, weslSrc, debugWeslRoot };
  const libsStr = `libs: [${sanitizedDeps.join(", ")}]`;
  const linkParamsStr = `{
    ${serializeFields(linkParams)},
    ${libsStr},
  }`;

  return `
    ${bundleImports}
    export const ${paramsName} = ${linkParamsStr};
    export default ${paramsName};
    `;
}

function serializeFields(record: Record<string, any>) {
  return Object.entries(record)
    .map(([k, v]) => `    ${k}: ${JSON.stringify(v, null, 2)}`)
    .join(",\n");
}
