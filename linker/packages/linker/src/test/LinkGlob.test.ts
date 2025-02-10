/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { link } from "../Linker.js";

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
  const linked = link({ weslSrc: wgsl1, rootModulePath: "wgsl_1/main.wgsl" });
  expect(linked.dest).toContain("fn bar()");
});

test("#import from path ./util", async () => {
  const linked = link({ weslSrc: wgsl2, rootModulePath: "wgsl_2/main2.wgsl" });
  expect(linked.dest).toContain("fn bar()");
});
