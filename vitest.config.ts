import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    projects: ["tools/packages/*", "tools/packages/wesl-plugin/test/*"],
    exclude: ["_baseline/**"],
  },
});
