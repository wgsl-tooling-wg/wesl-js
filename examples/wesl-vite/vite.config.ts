import { defineConfig, type Plugin } from "vite";
import viteWesl from "wesl-plugin/vite";

export default defineConfig({
  build: { target: "es2024" },
  plugins: [viteWesl() as Plugin],
});
