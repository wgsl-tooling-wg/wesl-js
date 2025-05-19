import { linkBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

const config = {
  plugins: [viteWesl({ extensions: [linkBuildExtension] })],
};

export default config;
