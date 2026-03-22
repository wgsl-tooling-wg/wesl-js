import type { PluginExtension } from "./PluginExtension.ts";

export interface WeslPluginOptions {
  weslToml?: string;
  extensions?: PluginExtension[];

  /** Log plugin activity to stderr for debugging */
  debug?: boolean;
}
