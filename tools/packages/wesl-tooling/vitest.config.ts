import type { ViteUserConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const config: ViteUserConfig = {
  plugins: [tsconfigPaths()],
};

export default config;
