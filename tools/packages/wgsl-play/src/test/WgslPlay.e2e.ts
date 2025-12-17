/** E2E tests for wgsl-play component using Playwright. */
import { expect, type Page, test } from "@playwright/test";

/** Wait for wgsl-play custom element to be defined and upgraded. */
async function waitForWgslPlay(page: Page) {
  await page.waitForFunction(() => customElements.get("wgsl-play"));
}

/** Wait for a wgsl-play element to render at least one frame. */
async function waitForFrame(page: Page, selector: string) {
  await page.waitForFunction(
    sel =>
      (document.querySelector(sel) as HTMLElement & { frameCount: number })
        ?.frameCount > 0,
    selector,
  );
}

/** Get current frameCount for a wgsl-play element. */
async function getFrameCount(page: Page, selector: string): Promise<number> {
  return page.evaluate(
    sel =>
      (document.querySelector(sel) as HTMLElement & { frameCount: number })
        ?.frameCount ?? 0,
    selector,
  );
}

/** Wait for frameCount to increase from current value (for re-renders after changes). */
async function waitForNewFrame(page: Page, selector: string) {
  const before = await getFrameCount(page, selector);
  await page.waitForFunction(
    ([sel, prev]) =>
      ((document.querySelector(sel) as HTMLElement & { frameCount: number })
        ?.frameCount ?? 0) > prev,
    [selector, before] as const,
  );
}

/** Get canvas bounding box from inside shadow DOM. */
async function getCanvasBox(page: Page, playerId: string) {
  return page.evaluate(id => {
    const el = document.querySelector(id) as HTMLElement | null;
    const canvas = el?.shadowRoot?.querySelector("canvas");
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, playerId);
}

/** Scroll player into view and snapshot its shadow DOM canvas. */
async function expectCanvasSnapshot(
  page: Page,
  playerId: string,
  name: string,
) {
  await page.locator(playerId).scrollIntoViewIfNeeded();
  const box = await getCanvasBox(page, playerId);
  if (!box) {
    const debug = await page.evaluate(id => {
      const el = document.querySelector(id);
      return { found: !!el, hasShadow: !!el?.shadowRoot };
    }, playerId);
    throw new Error(
      `Canvas not found for ${playerId}: ${JSON.stringify(debug)}`,
    );
  }
  await expect(page).toHaveScreenshot(name, {
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });
}

test("wgsl-play component loads", async ({ page }, testInfo) => {
  testInfo.setTimeout(10000); // Fast fail - 10s instead of 30s

  const errors: string[] = [];
  page.on("pageerror", err => errors.push(err.message));

  await page.goto("/");

  // Fails fast if module has syntax errors or component fails to register
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

  // Verify shadow DOM is created
  const hasShadow = await page.evaluate(
    () => !!document.querySelector("#player1")?.shadowRoot,
  );
  expect(hasShadow).toBe(true);
});

test("basic shader renders", async ({ page }) => {
  await page.goto("/");
  await waitForWgslPlay(page);

  const player1 = page.locator("#player1");
  await expect(player1).toBeVisible();

  // Check no error overlay
  const errorOverlay = player1.locator("text=Error");
  await expect(errorOverlay).not.toBeVisible();

  await expectCanvasSnapshot(page, "#player1", "basic-shader.png");
});

test("npm CDN - external imports work", async ({ page }) => {
  await page.goto("/");
  await waitForWgslPlay(page);

  await page.click("#load-npm");
  await page.waitForLoadState("networkidle");
  await waitForFrame(page, "#player2");

  // Rewind to time=0 for deterministic snapshot
  await page.click("#rewind2");
  await waitForNewFrame(page, "#player2");
  await expectCanvasSnapshot(page, "#player2", "npm-cdn.png");
});

test("shaderRoot - package:: imports resolve", async ({ page }) => {
  await page.goto("/");
  await waitForWgslPlay(page);

  await page.click("#load-internal");
  await waitForFrame(page, "#player3");

  await expectCanvasSnapshot(page, "#player3", "shader-root-internal.png");
});

test("shaderRoot - src attribute with super:: and package:: imports", async ({
  page,
}) => {
  await page.goto("/");
  await waitForWgslPlay(page);

  await page.click("#load-src");
  await waitForFrame(page, "#player4");

  await expectCanvasSnapshot(page, "#player4", "shader-root-src.png");
});

test("?static import - wesl-plugin build-time linking", async ({ page }) => {
  await page.goto("/");
  await waitForWgslPlay(page);

  await page.click("#load-static");
  await waitForFrame(page, "#player5");

  await expectCanvasSnapshot(page, "#player5", "static-import.png");
});

test("?link import - wesl-plugin runtime linking", async ({ page }) => {
  await page.goto("/");
  await waitForWgslPlay(page);

  await page.click("#load-link");
  await waitForFrame(page, "#player6");

  await expectCanvasSnapshot(page, "#player6", "link-import.png");
});

test("project.conditions - shows green initially, red after setting RED", async ({
  page,
}) => {
  await page.goto("/");
  await waitForFrame(page, "#player7");

  // Initial state: no conditions, should show green (@else branch)
  await expectCanvasSnapshot(page, "#player7", "conditions-initial-green.png");

  // Click to set RED condition
  await page.click("#load-conditions");
  await waitForNewFrame(page, "#player7");

  // After setting RED: should show red (@if branch)
  await expectCanvasSnapshot(page, "#player7", "conditions-after-red.png");
});

test("no critical console errors on basic load", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("favicon")) {
        errors.push(text);
      }
    }
  });

  await page.goto("/");
  await waitForFrame(page, "#player1");

  const criticalErrors = errors.filter(
    e => !e.includes("favicon") && !e.includes("404"),
  );
  expect(criticalErrors).toEqual([]);
});
