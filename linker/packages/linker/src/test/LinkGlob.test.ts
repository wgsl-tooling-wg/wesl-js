/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { link2 } from "../Linker.js";

const wgsl1: Record<string, string> = import.meta.glob("./wgsl_1/*.wgsl", {
  query: "?raw",
  eager: true,
  import: "default",
});

const wgsl2: Record<string, string> = import.meta.glob("./wgsl_2/*.wgsl", {
  query: "?raw",
  eager: true,
  import: "default",
});

test("basic import glob", async () => {
  const linked = link2({ weslSrc: wgsl1, rootModuleName: "wgsl_1/main" });
  expect(linked.dest).toContain("fn bar()");
});

test("#import from path ./util", async () => {
  const linked = link2({ weslSrc: wgsl2, rootModuleName: "wgsl_2/main2" });
  expect(linked.dest).toContain("fn bar()");
});
