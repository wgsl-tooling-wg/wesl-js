import { configDefaults, type ViteUserConfig } from "vitest/config";

const config: ViteUserConfig = {
  test: {
    exclude: [...configDefaults.exclude, "**/testing*/**"],
  },
};

export default config;
