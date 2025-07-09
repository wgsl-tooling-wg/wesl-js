import type { ViteUserConfig } from "vitest/config.ts";

const config: ViteUserConfig = {
  test: {
    include: [], // test/linkExtension has its own vitest.config.ts
  },
};

export default config;
