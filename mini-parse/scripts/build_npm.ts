import { build, emptyDir } from "@deno/dnt";
import denoJson from "../deno.json" with { type: "json" };
import { ensureDir, expandGlob } from "jsr:@std/fs";
import * as path from "jsr:@std/path";

const outDir = "./dist";

await emptyDir(outDir);

await build({
  entryPoints: ["./mod.ts"],
  outDir,
  scriptModule: false,
  shims: {
    deno: true,
  },
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
    lib: ["ESNext", "DOM"],
  },

  async postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("../LICENSE-APACHE", outDir + "/LICENSE");
    Deno.copyFileSync("../LICENSE-MIT", outDir + "/LICENSE");
    Deno.copyFileSync("../README.md", outDir + "/README.md");

    for await (const snapshot of expandGlob("*/__snapshots__/*.snap")) {
      const resultPath = path.join(
        outDir,
        "esm",
        path.relative(".", snapshot.path).replace(
          /\.ts\.snap$/,
          ".js.snap.js",
        ),
      );

      await ensureDir(
        path.dirname(resultPath),
      );
      await Deno.copyFile(snapshot.path, resultPath);
    }
  },
});
