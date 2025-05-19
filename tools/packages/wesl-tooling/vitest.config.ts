import tsconfigPaths from "vite-tsconfig-paths";
import type { ViteUserConfig } from "vitest/config";

const config: ViteUserConfig = {
  plugins: [tsconfigPaths()],
};

export default config;
