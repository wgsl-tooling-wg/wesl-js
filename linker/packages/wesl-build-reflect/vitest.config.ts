/// <reference types="vitest/config" />
import { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import viteWesl from "wesl-plugin/vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { wgslReflectExtension } from "./src/ReflectExtension.js";

const thisPath = fileURLToPath(import.meta.url);
const weslToml = path.join(path.dirname(thisPath), "wesl.toml");

const config: UserConfig = {
  plugins: [
    tsconfigPaths(),
    viteWesl({
      weslToml,
      buildPlugins: [wgslReflectExtension],
    }),
  ],
};

export default config;
