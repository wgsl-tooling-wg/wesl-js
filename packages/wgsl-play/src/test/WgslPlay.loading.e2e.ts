/** E2E tests for loading page (npm CDN, shaderRoot, ?static, ?link). */
import { test } from "@playwright/test";
import {
  expectCanvasSnapshot,
  waitForFrame,
  waitForWgslPlay,
} from "./E2eHelpers.ts";

test("npm CDN - external imports work", { tag: "@network" }, async ({
  page,
}) => {
  await page.goto("/loading.html");
  await waitForWgslPlay(page);

  await page.click("#load-npm-shader");
  await page.waitForLoadState("networkidle");
  await waitForFrame(page, "#npmPlayer");

  // Rewind to time=0 for deterministic snapshot (rewind() renders synchronously)
  await page.click("#npm-rewind");
  await expectCanvasSnapshot(page, "#npmPlayer", "npm-cdn.png");
});

test("shaderRoot - package:: imports resolve", async ({ page }) => {
  await page.goto("/loading.html");
  await waitForWgslPlay(page);

  await page.click("#load-internal-shader");
  await waitForFrame(page, "#internalImportPlayer");

  await expectCanvasSnapshot(
    page,
    "#internalImportPlayer",
    "shader-root-internal.png",
  );
});

test("shaderRoot - src attribute with super:: and package:: imports", async ({
  page,
}) => {
  await page.goto("/loading.html");
  await waitForWgslPlay(page);

  await page.click("#load-src-shader");
  await waitForFrame(page, "#srcAttrPlayer");

  await expectCanvasSnapshot(page, "#srcAttrPlayer", "shader-root-src.png");
});

test("?static import - wesl-plugin build-time linking", async ({ page }) => {
  await page.goto("/loading.html");
  await waitForWgslPlay(page);

  await page.click("#load-static-shader");
  await waitForFrame(page, "#staticImportPlayer");

  await expectCanvasSnapshot(page, "#staticImportPlayer", "static-import.png");
});

test("?link import - wesl-plugin runtime linking", async ({ page }) => {
  await page.goto("/loading.html");
  await waitForWgslPlay(page);

  await page.click("#load-link-shader");
  await waitForFrame(page, "#linkImportPlayer");

  await expectCanvasSnapshot(page, "#linkImportPlayer", "link-import.png");
});
