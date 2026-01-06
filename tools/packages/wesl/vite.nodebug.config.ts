import replace from "@rollup/plugin-replace";
import { defineConfig } from "vite";
import { baseViteConfig } from "./base.vite.config.ts";

const config = baseViteConfig();
config.build!.outDir = "dist-nodebug";
config.build!.emptyOutDir = true;
config.plugins = [
  ...(config.plugins || []),
  replace({
    preventAssignment: true,
    values: {
      "const debug = true": "const debug = false",
      "const validation = true": "const validation = false",
    },
  }),
];

export default defineConfig(config);
