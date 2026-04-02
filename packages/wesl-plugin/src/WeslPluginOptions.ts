import type { PluginExtension } from "./PluginExtension.ts";

export interface WeslPluginOptions {
  /** Path to wesl.toml config file (default: auto-detected from project root). */
  weslToml?: string;

  /** Custom plugin extensions for additional import suffixes or code generation. */
  extensions?: PluginExtension[];

  /** Log plugin activity to stderr for debugging. */
  debug?: boolean;
}
