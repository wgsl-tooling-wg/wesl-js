import { ViteUserConfig } from "vitest/config.js";

const config: ViteUserConfig = {
  test: {
    include: [], // test/linkExtension has its own vitest.config.ts
  },
};

export default config;
