import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    projects: ["packages/*", "packages/wesl-plugin/test/*"],
  },
});
