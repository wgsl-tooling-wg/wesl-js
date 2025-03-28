import { build, emptyDir } from "@deno/dnt";
import denoJson from "../deno.json" with { type: "json" };

const outDir = "./dist";

await emptyDir(outDir);

await build({
  entryPoints: ["./mod.ts"],
  outDir,
  scriptModule: false,
  shims: {
    deno: true,
  },
  // Tests are skipped because of https://github.com/denoland/dnt/issues/254
  test: false,
  importMap: "../deno.json",
  package: {
    // package.json properties
    name: "wesl",
    version: denoJson.version,
    description: "WESL for Node.js.",
    license: denoJson.license,
    repository: {
      type: "git",
      url: "git+https://github.com/wgsl-tooling-wg/wesl-js.git",
    },
    bugs: {
      url: "https://github.com/wgsl-tooling-wg/wesl-js/issues",
    },
  },
  compilerOptions: {
    target: "Latest",
    lib: ["ESNext", "DOM"],
  },

  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("../LICENSE-APACHE", outDir + "/LICENSE");
    Deno.copyFileSync("../LICENSE-MIT", outDir + "/LICENSE");
    Deno.copyFileSync("../README.md", outDir + "/README.md");
  },
});
