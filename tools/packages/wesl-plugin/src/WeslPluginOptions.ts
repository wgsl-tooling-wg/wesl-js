import type { PluginExtension } from "./PluginExtension.ts";

export interface WeslPluginOptions {
  weslToml?: string;
  extensions?: PluginExtension[];
}
