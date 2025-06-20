import viteWesl from "wesl-plugin/vite";
import { staticBuildExtension } from "wesl-plugin";

export default {
  plugins: [viteWesl({ extensions: [staticBuildExtension] })],
};
