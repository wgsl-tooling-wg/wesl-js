import { configDefaults, ViteUserConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const config: ViteUserConfig = {
  plugins: [tsconfigPaths()],
  test: {
    exclude: [...configDefaults.exclude, "**/testing*/**"],
  },
};

export default config;
