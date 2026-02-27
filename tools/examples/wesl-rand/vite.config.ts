import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import viteWesl from "wesl-plugin/vite";

export default defineConfig({
  plugins: [
    viteWesl() as any,
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
