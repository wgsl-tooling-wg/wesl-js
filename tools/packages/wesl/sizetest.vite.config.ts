import { resolve } from "node:path";
/// <reference types="vitest/config" />
import replace from "@rollup/plugin-replace";
import { defineConfig, type LibraryOptions, type Plugin } from "vite";
import { baseViteConfig } from "./base.vite.config.ts";

/** Strip error context strings from parser expect functions to reduce bundle size. */
function stripExpectContext(): Plugin {
  return {
    name: "strip-expect-context",
    transform(code, id) {
      if (!id.endsWith(".ts")) return null;
      let result = code;
      // expect(stream, "text", "context") -> expect(stream, "text")
      result = result.replace(
        /\bexpect\(([^,]+),\s*("[^"]*"),\s*("[^"]*"|`[^`]*`)\)/g,
        "expect($1, $2)",
      );
      // expectWord(stream, "msg") -> expectWord(stream, "")
      result = result.replace(
        /\bexpectWord\(([^,]+),\s*("[^"]*"|`[^`]*`)\)/g,
        'expectWord($1, "")',
      );
      // expectExpression(ctx, "msg") -> expectExpression(ctx)
      result = result.replace(
        /\bexpectExpression\(([^,]+),\s*("[^"]*"|`[^`]*`)\)/g,
        "expectExpression($1)",
      );
      // throwParseError(stream, "msg") -> throwParseError(stream, "")
      result = result.replace(
        /\bthrowParseError\(([^,]+),\s*("[^"]*"|`[^`]*`)\)/g,
        'throwParseError($1, "")',
      );
      if (result !== code) return { code: result, map: null };
      return null;
    },
  };
}

const config = baseViteConfig();
config.build!.minify = "terser";
config.build!.emptyOutDir = false;
config.plugins = [
  ...(config.plugins || []),
  // emulate a future prod build with less logging/validation
  replace({
    preventAssignment: true,
    values: {
      "const debug = true": "const debug = false",
      "const validation = true": "const validation = false",
    },
  }),
  stripExpectContext(),
];
const lib = config.build!.lib as LibraryOptions;
lib.fileName = "sized";
lib.entry = [resolve(__dirname, "src/Linker.ts")];
lib.formats = ["cjs"];

export default defineConfig(config);
