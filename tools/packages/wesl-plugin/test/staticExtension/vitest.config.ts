import type { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { staticBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

const config: UserConfig = {
  plugins: [tsconfigPaths(), viteWesl({ extensions: [staticBuildExtension] })],
};

export default config;
