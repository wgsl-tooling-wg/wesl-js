#!/usr/bin/env node --experimental-strip-types
// Package/publish the VSIX, copying native deps into dist/ so vsce includes them.

import { execSync } from "node:child_process";
import { cpSync, mkdirSync, realpathSync, rmSync } from "node:fs";

const action = process.argv[2] ?? "package";
const nativeDeps = ["webgpu"];

// Copy native deps into dist/node_modules/ where Node's module resolution
// will find them (runTestCli.mjs lives in dist/, so it checks dist/node_modules/).
for (const dep of nativeDeps) {
  const real = realpathSync(`node_modules/${dep}`);
  const dest = `dist/node_modules/${dep}`;
  mkdirSync("dist/node_modules", { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  cpSync(real, dest, { recursive: true });
}

try {
  execSync(`npx vsce ${action} --no-dependencies`, { stdio: "inherit" });
} finally {
  rmSync("dist/node_modules", { recursive: true, force: true });
}
