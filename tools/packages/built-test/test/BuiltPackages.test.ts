/// <reference types="wesl-plugin/suffixes" />

// This file is copied to temp-built-test by setup-built.mts along with all other files
// in tools/packages/built-test.

import { execSync } from "node:child_process";
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
  execSync(`pnpm tsgo`, { stdio: "pipe", encoding: "utf-8" });
});
