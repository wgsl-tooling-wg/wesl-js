import { fileURLToPath } from "node:url";
import type { Plugin, UserConfig } from "vite";
import viteWesl from "wesl-plugin/vite";

const weslToml = fileURLToPath(new URL("./wesl.toml", import.meta.url));

const config: UserConfig = {
  plugins: [viteWesl({ weslToml }) as Plugin],
};

export default config;
