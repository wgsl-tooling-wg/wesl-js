import unplugin from "../WeslPlugin.ts";
import type { WeslPluginOptions } from "../WeslPluginOptions.ts";

export default (options: WeslPluginOptions): any => ({
  name: "wesl-plugin",
  hooks: {
    "astro:config:setup": async (astro: any) => {
      astro.config.vite.plugins ||= [];
      astro.config.vite.plugins.push(unplugin.vite(options));
    },
  },
});
