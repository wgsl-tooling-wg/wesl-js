import tsconfigPaths from "vite-tsconfig-paths";
import { type ViteUserConfig, configDefaults } from "vitest/config";

const config: ViteUserConfig = {
  plugins: [tsconfigPaths()],
  test: {
    exclude: [...configDefaults.exclude, "**/testing*/**"],
  },
};

export default config;
