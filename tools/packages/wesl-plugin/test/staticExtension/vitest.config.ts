import { fileURLToPath } from "node:url";
import type { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { staticBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

const weslToml = fileURLToPath(new URL("./wesl.toml", import.meta.url));

const config: UserConfig = {
  plugins: [
    tsconfigPaths(),
    viteWesl({ weslToml, extensions: [staticBuildExtension] }),
  ],
};

export default config;
