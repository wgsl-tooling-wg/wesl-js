/// <reference types="wesl-plugin/suffixes" />

// This file is copied to temp-built-test by setup-built.mts along with all other files
// in tools/packages/built-test.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { link } from "wesl";
import linkParams from "../shaders/main.wesl?link";

test("verify link() function works with built packages", async () => {
  const result = await link(linkParams);
  expect(result).toBeDefined();

  const wgsl = result.dest;
  expect(wgsl).toContain("fn add");
  expect(wgsl).toContain("fn compute");
});

const externalTest = process.cwd().endsWith("temp-built-test");

test.skipIf(!externalTest)("typecheck this test file", () => {
  execSync(`pnpm tsgo`, { stdio: "inherit" });
});

// All published packages - check for TypeScript exports (Node.js can't run .ts in node_modules)
const packagesToCheck = [
  "wesl",
  "wesl-gpu",
  "wesl-link",
  "wesl-packager",
  "wesl-plugin",
  "wesl-tooling",
  "wgsl-test",
  "vitest-image-snapshot",
];

test.skipIf(!externalTest)("no TypeScript files in bin entries", () => {
  const errors: string[] = [];
  for (const pkg of packagesToCheck) {
    const pkgJsonPath = `node_modules/${pkg}/package.json`;
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    const bin = pkgJson.bin || {};
    for (const [name, path] of Object.entries(bin)) {
      if (typeof path === "string" && path.endsWith(".ts")) {
        errors.push(`${pkg} bin "${name}" points to TypeScript: ${path}`);
      }
    }
  }
  if (errors.length > 0) {
    throw new Error("TypeScript files in bin:\n" + errors.join("\n"));
  }
});

test.skipIf(!externalTest)("no TypeScript files in package exports", () => {
  const errors: string[] = [];
  for (const pkg of packagesToCheck) {
    const pkgJsonPath = `node_modules/${pkg}/package.json`;
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    const exports = pkgJson.exports || {};
    for (const [subpath, target] of Object.entries(exports)) {
      for (const path of extractImportPaths(target)) {
        if (path.endsWith(".ts") && !path.endsWith(".d.ts")) {
          errors.push(
            `${pkg} export "${subpath}" points to TypeScript: ${path}`,
          );
        }
      }
    }
  }
  if (errors.length > 0) {
    throw new Error(
      "TypeScript files in exports (Node.js can't run .ts from node_modules):\n" +
        errors.join("\n"),
    );
  }
});

/** Extract import paths from an export target (handles string or {import: ...}) */
function extractImportPaths(target: unknown): string[] {
  if (typeof target === "string") return [target];
  if (typeof target === "object" && target !== null) {
    const t = target as Record<string, unknown>;
    const paths: string[] = [];
    if (typeof t.import === "string") paths.push(t.import);
    if (typeof t.default === "string") paths.push(t.default);
    return paths;
  }
  return [];
}
