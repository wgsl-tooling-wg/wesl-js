import type { Options } from "tsdown";

export default (<Options>{
  entry: ["src/plugins/*.ts", "src/pluginIndex.ts"],
  clean: true,
  format: ["esm"],
  dts: true,
  splitting: true,
});
