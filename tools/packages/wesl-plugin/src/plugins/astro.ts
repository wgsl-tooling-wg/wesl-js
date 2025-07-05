import unplugin from "../WeslPlugin.js";
import type { WeslPluginOptions } from "../WeslPluginOptions.js";

export default (options: WeslPluginOptions): any => ({
  name: "wesl-plugin",
  hooks: {
    "astro:config:setup": async (astro: any) => {
      astro.config.vite.plugins ||= [];
      astro.config.vite.plugins.push(unplugin.vite(options));
    },
  },
});
