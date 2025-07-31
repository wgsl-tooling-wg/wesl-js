import { addVitePlugin, addWebpackPlugin, defineNuxtModule } from "@nuxt/kit";
import type { WeslPluginOptions } from "../WeslPluginOptions.ts";
import vite from "./vite.ts";
import webpack from "./webpack.ts";
import "@nuxt/schema";

type ModuleOptions = WeslPluginOptions;

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-wesl-plugin",
    configKey: "unpluginStarter",
  },
  defaults: {
    // ...default options
  },
  setup(options, _nuxt) {
    addVitePlugin(() => vite(options));
    addWebpackPlugin(() => webpack(options));

    // ...
  },
});
