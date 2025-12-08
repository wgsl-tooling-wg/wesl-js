/** E2E tests for wgsl-play component using Playwright. */
import { expect, test } from "@playwright/test";

test("canvas renders correctly (visual regression)", async ({ page }) => {
  await page.goto("/");

  // Wait for WebGPU to initialize and render
  await page.waitForTimeout(1000);

  // Rewind to t=0 for consistent snapshot
  await page.getByRole("button", { name: "Rewind" }).click();
  await page.waitForTimeout(100);

  const player = page.locator("wgsl-play");
  await expect(player).toHaveScreenshot("gradient-t0.png", {
    maxDiffPixelRatio: 0.01,
  });
});

test("no critical console errors", async ({ page }) => {
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
  await page.waitForTimeout(2000);

  const criticalErrors = errors.filter(
    e => !e.includes("favicon") && !e.includes("404"),
  );
  expect(criticalErrors).toEqual([]);
});
