import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    exclude: ["**/*.integration.ts", "node_modules/**"],
  },
});
