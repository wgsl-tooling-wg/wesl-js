import type { Options } from "tsup";

export default <Options>{
  entry: ["src/plugins/*.ts"],
  clean: true,
  format: ["esm"],
  dts: true,
  splitting: true,
};
