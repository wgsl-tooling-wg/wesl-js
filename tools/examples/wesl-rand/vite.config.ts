import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { linkBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

export default defineConfig({
  plugins: [
    viteWesl({ extensions: [linkBuildExtension] }) as any,
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
