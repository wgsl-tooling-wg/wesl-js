/** E2E tests for basics page (inline shaders, conditions, autoplay). */
import { expect, test } from "@playwright/test";
import {
  expectCanvasSnapshot,
  waitForFrame,
  waitForNewFrame,
  waitForWgslPlay,
} from "./E2eHelpers.ts";

test("wgsl-play component loads", async ({ page }, testInfo) => {
  testInfo.setTimeout(10000); // Fast fail - 10s instead of 30s

  const errors: string[] = [];
  page.on("pageerror", err => errors.push(err.message));

  await page.goto("/basics.html");

  const defined = await page
    .waitForFunction(() => customElements.get("wgsl-play"), { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (!defined) {
    const msg = errors.length
      ? `JS errors: ${errors.join("; ")}`
      : "No JS errors captured - check if module loaded";
    throw new Error(`wgsl-play custom element not defined. ${msg}`);
  }

  const hasShadow = await page.evaluate(
    () => !!document.querySelector("#basicPlayer")?.shadowRoot,
  );
  expect(hasShadow).toBe(true);
});

test("basic shader renders", async ({ page }) => {
  await page.goto("/basics.html");
  await waitForWgslPlay(page);

  const basicPlayer = page.locator("#basicPlayer");
  await expect(basicPlayer).toBeVisible();

  const errorOverlay = basicPlayer.locator("text=Error");
  await expect(errorOverlay).not.toBeVisible();

  await expectCanvasSnapshot(page, "#basicPlayer", "basic-shader.png");
});

test("project.conditions - shows green initially, red after setting RED", async ({
  page,
}) => {
  await page.goto("/basics.html");
  await waitForFrame(page, "#conditionsPlayer");

  await expectCanvasSnapshot(
    page,
    "#conditionsPlayer",
    "conditions-initial-green.png",
  );

  await page.click("#load-red-condition");
  await waitForNewFrame(page, "#conditionsPlayer");

  await expectCanvasSnapshot(
    page,
    "#conditionsPlayer",
    "conditions-after-red.png",
  );
});

test("no critical console errors on basic load", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("favicon")) errors.push(text);
    }
  });

  await page.goto("/basics.html");
  await waitForFrame(page, "#basicPlayer");

  const criticalErrors = errors.filter(
    e => !e.includes("favicon") && !e.includes("404"),
  );
  expect(criticalErrors).toEqual([]);
});
