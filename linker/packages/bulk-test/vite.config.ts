/// <reference types="vitest" />
import { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config: UserConfig = {
  plugins: [tsconfigPaths()],
  test: {
    testTimeout: 10000,
    maxWorkers: 20,
    sequence: {
      concurrent: true,
    },
  },
};

export default config;
