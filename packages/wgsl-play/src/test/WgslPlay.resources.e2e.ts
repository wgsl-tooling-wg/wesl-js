/** E2E tests for resources page (@texture, @sampler, @buffer). */
import { expect, test } from "@playwright/test";
import {
  expectCanvasSnapshot,
  waitForFrame,
  waitForNewFrame,
  waitForWgslPlay,
} from "./E2eHelpers.ts";

test("@texture single resolves <canvas data-texture> child", async ({
  page,
}) => {
  await page.goto("/resources.html");
  await waitForFrame(page, "#singleTexturePlayer");
  await expectCanvasSnapshot(page, "#singleTexturePlayer", "texture-grid.png");
});

test("@texture multi blends two host canvases", async ({ page }) => {
  await page.goto("/resources.html");
  await waitForFrame(page, "#multiTexturePlayer");
  await expectCanvasSnapshot(page, "#multiTexturePlayer", "texture-multi.png");
});

test("@buffer zero-init storage buffer renders deterministically", async ({
  page,
}) => {
  await page.goto("/resources.html");
  await waitForFrame(page, "#bufferPlayer");
  await expectCanvasSnapshot(page, "#bufferPlayer", "buffer-zero-init.png");
});

test("@texture from <img> decodes and rebuilds on src swap", async ({
  page,
}) => {
  await page.goto("/resources.html");
  await waitForFrame(page, "#imgTexturePlayer");
  await expectCanvasSnapshot(
    page,
    "#imgTexturePlayer",
    "texture-img-magenta.png",
  );

  await page.click("#swap-img-texture");
  await waitForNewFrame(page, "#imgTexturePlayer");
  await expectCanvasSnapshot(
    page,
    "#imgTexturePlayer",
    "texture-img-green.png",
  );
});

test("@test_texture is rejected with structured compile-error", async ({
  page,
}) => {
  await page.goto("/resources.html");
  await waitForWgslPlay(page);

  await page.waitForFunction(
    () =>
      (document.querySelector("#rejected-texture-status") as HTMLElement)
        ?.dataset.rejected === "true",
  );

  const text = await page.textContent("#rejected-texture-status");
  expect(text).toContain("rejected (resource)");
  expect(text).toContain("@test_texture");
});
