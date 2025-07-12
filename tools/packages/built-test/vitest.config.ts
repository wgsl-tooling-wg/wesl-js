import type { Plugin, UserConfig } from "vite";
import { linkBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

const config: UserConfig = {
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/temp-packages/**"],
  },
  plugins: [viteWesl({ extensions: [linkBuildExtension] }) as Plugin],
};

export default config;
