/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const thisPath = fileURLToPath(import.meta.url);
const weslToml = path.join(path.dirname(thisPath), "wesl.toml");

const config: UserConfig = {
  plugins: [tsconfigPaths()],
};

export default config;
