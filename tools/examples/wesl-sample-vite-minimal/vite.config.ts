import viteWesl from "wesl-plugin/vite";
import { linkBuildExtension } from "wesl-plugin";

export default {
  plugins: [viteWesl({ extensions: [linkBuildExtension] })],
};
