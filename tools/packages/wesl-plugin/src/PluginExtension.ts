import type { ParsedRegistry, WeslJsPlugin } from "wesl";
import type { WeslTomlInfo } from "wesl-tooling";

/** function type required for for emit extensions */
export type ExtensionEmitFn = (
  /** absolute path to the shader to which the extension is attached */
  shaderPath: string,

  /** support functions available to plugin extensions */
  pluginApi: PluginExtensionApi,

  /** static conditions specified on the js import */ // (currently used for ?static)
  conditions?: Record<string, boolean>,
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
  weslToml: () => Promise<WeslTomlInfo>;
  weslSrc: () => Promise<Record<string, string>>;
  weslRegistry: () => Promise<ParsedRegistry>;
  weslMain: (baseId: string) => Promise<string>;
  weslDependencies: () => Promise<string[]>;
}
