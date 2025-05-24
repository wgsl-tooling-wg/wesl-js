import { defineConfig } from "tsdown";

const toBin = "./bin/wesl-link";

// workaround - ignoreWatch doesn't seem to work with relative paths,
// and loops forever unless we give a specific path
const thisPath = import.meta.url;
const binPath = new URL(toBin, thisPath).pathname;

export default defineConfig({
  entry: ["./src/main.ts"],
  target: "node22",
  clean: true,
  platform: "node",
  outputOptions: { dir: undefined, file: toBin },
  external: ["wesl", "wesl-tooling", "yargs", "yargs/helpers"],
  ignoreWatch: [binPath],
});
