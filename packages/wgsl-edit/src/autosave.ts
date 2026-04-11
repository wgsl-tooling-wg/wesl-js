import type { Plugin } from "vite";
import { pendingSaves, weslSaveMiddleware } from "./SaveMiddleware.ts";

export interface WgslEditAutosaveOptions {
  /** Disable the save endpoint without removing the plugin (default: enabled). */
  disabled?: boolean;
}

/** Vite dev plugin: lets <wgsl-edit autosave> persist edits to disk via the save endpoint. */
export default function wgslEditAutosave(
  options?: WgslEditAutosaveOptions,
): Plugin {
  return {
    name: "wgsl-edit-autosave",
    apply: "serve",
    configureServer(server) {
      if (options?.disabled) return;
      server.middlewares.use(weslSaveMiddleware(server.config.root));
    },
    hotUpdate({ file }) {
      if (pendingSaves.delete(file)) return [];
    },
  };
}
