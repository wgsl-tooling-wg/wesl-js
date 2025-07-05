import { defineConfig, type Plugin } from "vite";
import { linkBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

export default defineConfig({
  build: { target: "es2024" },
  plugins: [viteWesl({ extensions: [linkBuildExtension] }) as Plugin],
});
