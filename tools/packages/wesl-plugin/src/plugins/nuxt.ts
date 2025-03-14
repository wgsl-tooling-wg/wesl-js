import { addVitePlugin, addWebpackPlugin, defineNuxtModule } from "@nuxt/kit";
import vite from "./vite";
import webpack from "./webpack";
import type { WeslPluginOptions } from "../WeslPluginOptions";
import "@nuxt/schema";

export interface ModuleOptions extends WeslPluginOptions {}

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
