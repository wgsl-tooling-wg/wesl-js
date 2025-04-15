import viteWesl from "wesl-plugin/vite";
import { linkBuildExtension } from "wesl-plugin";

const config = {
  plugins: [viteWesl({ extensions: [linkBuildExtension] })],
};

export default config;
