/** E2E tests for connect page (wgsl-edit connection, virtualLibs). */
import { expect, test } from "@playwright/test";
import {
  expectCanvasSnapshot,
  waitForFrame,
  waitForNewFrame,
  waitForWgslPlay,
} from "./E2eHelpers.ts";

test("connectToSource - multi-file from wgsl-edit renders", async ({
  page,
}) => {
  await page.goto("/connect.html");
  await waitForFrame(page, "#multifilePlayer");
  await expectCanvasSnapshot(
    page,
    "#multifilePlayer",
    "connect-source-multifile.png",
  );
});

test("connectToSource - condition toggle re-renders", async ({ page }) => {
  await page.goto("/connect.html");
  await waitForFrame(page, "#connectCondPlayer");

  await expectCanvasSnapshot(
    page,
    "#connectCondPlayer",
    "connect-conditions-green.png",
  );

  await page.click("#set-connect-red");
  await waitForNewFrame(page, "#connectCondPlayer");

  await expectCanvasSnapshot(
    page,
    "#connectCondPlayer",
    "connect-conditions-red.png",
  );
});

test("connectToSource - external deps are fetched", {
  tag: "@network",
}, async ({ page }) => {
  await page.goto("/connect.html");
  await page.waitForLoadState("networkidle");
  await waitForFrame(page, "#connectExtPlayer");

  // If discoverAndRebuild wasn't called, this would show an error overlay
  const hasError = await page.evaluate(
    () =>
      (document.querySelector("#connectExtPlayer") as any)?.hasError ?? true,
  );
  expect(hasError).toBe(false);
  await expectCanvasSnapshot(
    page,
    "#connectExtPlayer",
    "connect-source-external.png",
  );
});

test("connectToSource - dynamic npm package loading", {
  tag: "@network",
}, async ({ page }) => {
  await page.goto("/connect.html");
  await waitForFrame(page, "#dynamicNpmPlayer");

  await page.click("#inject-dynamic-npm");
  await page.waitForLoadState("networkidle");
  await waitForFrame(page, "#dynamicNpmPlayer");

  const hasError = await page.evaluate(
    () =>
      (document.querySelector("#dynamicNpmPlayer") as any)?.hasError ?? true,
  );
  expect(hasError).toBe(false);
  await expectCanvasSnapshot(
    page,
    "#dynamicNpmPlayer",
    "connect-dynamic-npm.png",
  );
});

test("editor.link() with virtualLibs resolves env:: module", async ({
  page,
}) => {
  await page.goto("/connect.html");
  await waitForWgslPlay(page);

  await page.click("#link-virtual-libs");
  await page.waitForFunction(
    () =>
      document.querySelector("#virtual-libs-output")?.textContent !==
      "Not linked yet",
  );

  const output = await page.textContent("#virtual-libs-output");
  expect(output).toContain("var<uniform>");
  expect(output).toContain("fs_main");
  expect(output).not.toContain("Error");
});
