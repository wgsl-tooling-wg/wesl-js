#!/usr/bin/env node
// Measures realistic bundle size: what users pay when importing `link` from the package.
// Uses terser for minification. tsdown's built-in minifier (Oxc) is ~0.6% larger
// and still in alpha, but we may switch to it later.

import { execSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { brotliCompressSync } from "node:zlib";
import { build } from "vite";

const tmpDir = resolve(import.meta.dirname, "../.size-check-tmp");
const distNodebug = resolve(import.meta.dirname, "../dist-nodebug");

async function main() {
  // Ensure nodebug build exists
  try {
    statSync(resolve(distNodebug, "index.js"));
  } catch {
    console.log("Building nodebug first...");
    execSync("pnpm build:nodebug", {
      cwd: resolve(import.meta.dirname, ".."),
      stdio: "inherit",
    });
  }

  // Setup temp directory
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  // Create test entry that imports just `link`
  const entryFile = resolve(tmpDir, "entry.ts");
  writeFileSync(
    entryFile,
    `import { link } from "../dist-nodebug/index.js";\nexport { link };\n`,
  );

  // Bundle with vite + terser
  const outFile = "out.js";
  await build({
    configFile: false,
    logLevel: "warn",
    build: {
      lib: { entry: entryFile, formats: ["es"], fileName: () => outFile },
      outDir: tmpDir,
      emptyOutDir: false,
      minify: "terser",
      sourcemap: false,
      rollupOptions: { external: [] },
    },
  });

  const outPath = resolve(tmpDir, outFile);
  const raw = statSync(outPath).size;
  const brotli = brotliCompressSync(readFileSync(outPath)).length;

  console.log(
    `\nSize: ${(raw / 1024).toFixed(1)} kB raw, ${(brotli / 1024).toFixed(1)} kB brotli\n`,
  );

  // Cleanup
  rmSync(tmpDir, { recursive: true, force: true });
}

main().catch(console.error);
