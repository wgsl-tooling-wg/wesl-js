import { ParsedRegistry, WeslJsPlugin } from "wesl";
import { WeslToml } from "./weslPlugin.ts";

/** function type required for for emit extensions */
export type ExtensionEmitFn = (
  id: string,
  pluginApi: PluginExtensionApi,
) => Promise<string>;

/** an extension that runs inside the wesl-js build plugin */
export interface PluginExtension extends WeslJsPlugin {
  /** javascript imports with this suffix will trigger the plugin */
  extensionName: string;

  /** generate javascript text for js/ts importers to use.
   *   e.g. import myPluginJs from "./foo.wesl?myPlugin"; */
  emitFn: ExtensionEmitFn;
}

/** api supplied to plugin extensions */
export interface PluginExtensionApi {
  weslToml: () => Promise<WeslToml>;
  weslSrc: () => Promise<Record<string, string>>;
  weslRegistry: () => Promise<ParsedRegistry>;
  weslMain: (baseId: string) => Promise<string>;
}
