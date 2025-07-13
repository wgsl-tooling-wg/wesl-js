import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, UserConfig } from "vite";
import { linkBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

const thisPath = fileURLToPath(import.meta.url);
const weslToml = path.join(path.dirname(thisPath), "wesl.toml");

const config: UserConfig = {
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/temp-packages/**"],
  },
  plugins: [
    viteWesl({
      weslToml,
      extensions: [linkBuildExtension],
    }) as Plugin,
  ],
};

export default config;
