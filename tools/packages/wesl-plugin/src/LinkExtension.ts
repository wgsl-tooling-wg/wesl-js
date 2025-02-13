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
  const { weslRoot } = await api.weslToml();
  const weslSrc = await api.weslSrc();
  const rootModule = await api.weslMain(baseId);
  const rootModuleName = noSuffix(rootModule);
  const rootName = path.basename(rootModuleName);
  const packages = scanForPackages(weslSrc);

  const bundleImports = packages
    .map(p => `import ${p} from "${p}";`)
    .join("\n");

  const paramsName = `link${rootName}Config`;

  const src = `
    ${bundleImports}
    export const ${paramsName} = {
      rootModuleName: "${rootModuleName}",
      weslRoot: "${weslRoot}",  
      weslSrc: ${JSON.stringify(weslSrc, null, 2)},
      dependencies: [${packages.join(", ")}],
    };

    export default ${paramsName};
    `;

  return src;
}

function scanForPackages(weslSrc: Record<string, string>): string[] {
  return Object.values(weslSrc).flatMap(packageReferences);
}
