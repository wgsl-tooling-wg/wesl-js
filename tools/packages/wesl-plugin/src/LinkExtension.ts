import path from "node:path";
import { noSuffix, packageReferences } from "wesl";
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
  const { resolvedWeslRoot } = await api.weslToml();
  const debugWeslRoot = resolvedWeslRoot.replaceAll(path.sep, "/");
  const weslSrc = await api.weslSrc();
  const rootModule = await api.weslMain(baseId);
  const rootModuleName = noSuffix(rootModule);
  const rootName = path.basename(rootModuleName);
  const packages = scanForPackages(weslSrc);

  const bundleImports = packages
    .map(p => `import ${p} from "${p}";`)
    .join("\n");

  const paramsName = `link${rootName}Config`;

  const linkSettings = JSON.stringify(
    {
      rootModuleName,
      weslSrc,
      debugWeslRoot,
      dependencies: packages,
    },
    null,
    2,
  );

  const src = `
    ${bundleImports}
    export const ${paramsName} = ${linkSettings};
    export default ${paramsName};
    `;

  return src;
}

function scanForPackages(weslSrc: Record<string, string>): string[] {
  return Object.values(weslSrc).flatMap(packageReferences);
}
