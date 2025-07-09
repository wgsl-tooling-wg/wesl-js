/// <reference types="vitest" />
import type { UserConfig } from "vite";

const config: UserConfig = {
  test: {
    testTimeout: 10000,
    maxWorkers: 20,
    sequence: {
      concurrent: true,
    },
  },
};

export default config;
