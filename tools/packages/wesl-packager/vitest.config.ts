/// <reference types="vitest" />
import { UserConfig } from "vite";
import { configDefaults } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const config: UserConfig = {
  plugins: [tsconfigPaths()],
  test: {
    exclude: [...configDefaults.exclude, "**/testing*/**"],
  },
};

export default config;
