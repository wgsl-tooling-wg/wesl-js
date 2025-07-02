import { defineConfig } from "vite";
import { linkBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

export default defineConfig({
  build: { target: "es2024" },
  plugins: [viteWesl({ extensions: [linkBuildExtension] })],
});
