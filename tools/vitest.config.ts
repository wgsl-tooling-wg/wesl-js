import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "packages/wesl-plugin/test/*"],
    exclude: ["_baseline/**"],
  },
});
