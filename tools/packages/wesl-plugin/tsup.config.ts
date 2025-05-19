import type { Options } from "tsup";

export default (<Options>{
  entry: ["src/plugins/*.ts", "src/pluginIndex.ts"],
  clean: true,
  format: ["esm"],
  dts: true,
  splitting: true,
});
