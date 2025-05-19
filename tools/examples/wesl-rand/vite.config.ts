import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { linkBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    viteWesl({ extensions: [linkBuildExtension] }),
    viteStaticCopy({
      targets: [
        {
          src: "./node_modules/@shoelace-style/shoelace/dist/assets",
          dest: "shoelace-assets",
        },
      ],
    }),
  ],
});
