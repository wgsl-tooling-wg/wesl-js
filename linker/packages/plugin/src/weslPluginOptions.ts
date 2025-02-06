import { PluginExtension } from "./PluginExtension.ts";

export interface WeslPluginOptions {
  weslToml?: string;
  buildPlugins?: PluginExtension[];
}
