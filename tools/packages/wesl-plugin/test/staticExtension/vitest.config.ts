import path from "node:path";
import { fileURLToPath } from "node:url";
import { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { staticBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

const thisPath = fileURLToPath(import.meta.url);
const weslToml = path.join(path.dirname(thisPath), "wesl.toml");

const config: UserConfig = {
  plugins: [
    tsconfigPaths(),
    viteWesl({ weslToml, extensions: [staticBuildExtension] }),
  ],
};

export default config;
