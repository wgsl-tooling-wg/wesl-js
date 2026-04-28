/** E2E tests for uniforms page (@uniforms controls, mouse). */
import { expect, test } from "@playwright/test";
import { expectCanvasSnapshot, waitForFrame } from "./E2eHelpers.ts";

test("@uniforms controls panel renders and responds", async ({ page }) => {
  await page.goto("/uniforms.html");
  await waitForFrame(page, "#uniformsPlayer");

  const hasError = await page.evaluate(
    () => (document.querySelector("#uniformsPlayer") as any)?.hasError ?? true,
  );
  expect(hasError).toBe(false);

  // Rewind so snapshot is deterministic (brightness set by page script on compile-success)
  // rewind() synchronously renders one frame, so no need to waitForNewFrame
  await page.evaluate(() => {
    (document.querySelector("#uniformsPlayer") as any)?.rewind();
  });
  await expectCanvasSnapshot(page, "#uniformsPlayer", "uniforms-initial.png");

  // Hover to reveal controls toggle, click to expand
  await page.locator("#uniformsPlayer").hover({ position: { x: 16, y: 16 } });
  await page.evaluate(() => {
    const el = document.querySelector("#uniformsPlayer");
    (el?.shadowRoot?.querySelector(".uniform-toggle") as HTMLElement)?.click();
  });

  // Verify controls panel expanded with 3 controls (brightness is plain, no UI)
  const controlCount = await page.evaluate(() => {
    const el = document.querySelector("#uniformsPlayer");
    const panel = el?.shadowRoot?.querySelector(".uniform-panel");
    const rows = panel?.querySelectorAll(".uniform-row");
    return {
      visible: panel?.checkVisibility() ?? false,
      count: rows?.length ?? 0,
    };
  });
  expect(controlCount.visible).toBe(true);
  expect(controlCount.count).toBe(3);

  // Adjust the frequency slider and verify re-render
  await page.evaluate(() => {
    const el = document.querySelector("#uniformsPlayer");
    const slider = el?.shadowRoot?.querySelector(
      'input[type="range"]',
    ) as HTMLInputElement;
    if (slider) {
      slider.value = "16";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await expectCanvasSnapshot(
    page,
    "#uniformsPlayer",
    "uniforms-slider-changed.png",
  );
});
