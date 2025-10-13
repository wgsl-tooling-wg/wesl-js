import { defineConfig } from "tsdown";
import rawFileImporter from "./rollup-plugin-raw.ts";

const toBin = "./bin/wesl-packager";

// ignoreWatch doesn't seem to work with relative paths,
// and watch mode rebuilds in a loop on changes to the binary
// so we use an absolute path to the binary
const thisPath = import.meta.url;
const binPath = new URL(toBin, thisPath).pathname;

export default defineConfig({
  entry: ["./src/main.ts"],
  target: "node22",
  clean: true,
  platform: "node",
  outputOptions: { dir: undefined, file: toBin },
  external: ["wesl", "yargs", "yargs/helpers"],
  plugins: [rawFileImporter() as any],
  ignoreWatch: [binPath],
});
