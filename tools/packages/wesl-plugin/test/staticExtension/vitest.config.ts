import { fileURLToPath } from "node:url";
import type { Plugin, UserConfig } from "vite";
import { staticBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

const weslToml = fileURLToPath(new URL("./wesl.toml", import.meta.url));

const config: UserConfig = {
  plugins: [
    viteWesl({ weslToml, extensions: [staticBuildExtension] }) as Plugin,
  ],
};

export default config;
