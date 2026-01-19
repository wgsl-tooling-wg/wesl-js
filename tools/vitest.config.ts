import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/*",
      "packages/wesl-plugin/test/*",
      "!packages/wgsl-studio", // uses vscode-test, not vitest
    ],
    exclude: ["_baseline/**"],
  },
});
