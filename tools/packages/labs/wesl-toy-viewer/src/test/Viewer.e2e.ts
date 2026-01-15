/** E2E tests for wesl-toy-viewer application using Playwright. */
import { expect, test } from "@playwright/test";

const randomWgslShaderUrl =
  "https://raw.githubusercontent.com/wgsl-tooling-wg/wesl-js/main/tools/packages/random_wgsl/shaders/randomTest.wgsl";

// Skip: npm packages use old `// @toy` comment format, but detection now looks for `@toy` attribute
test("loads default shader and renders", async ({ page }) => {
  await page.goto("/");

  // Wait for shader dropdown to populate (indicates packages loaded)
  await expect(page.getByRole("combobox", { name: "Shaders" })).not.toHaveText(
    "Loading...",
    { timeout: 10000 },
  );

  // Verify source code panel shows shader content
  const sourceCode = page.locator("#source-code");
  await expect(sourceCode).toContainText("@fragment", { timeout: 5000 });

  // Verify canvas exists in wgsl-play shadow DOM
  const canvas = page.locator("wgsl-play").locator("canvas");
  await expect(canvas).toBeVisible();
});

// Skip: npm packages use old `// @toy` comment format, but detection now looks for `@toy` attribute
test("loads shader from URL", async ({ page }) => {
  await page.goto("/");

  // Wait for initial load
  await expect(page.getByRole("combobox", { name: "Shaders" })).not.toHaveText(
    "Loading...",
    { timeout: 10000 },
  );

  // Enter custom shader URL
  const urlInput = page.getByRole("textbox", { name: "Or Shader URL" });
  await urlInput.fill(randomWgslShaderUrl);
  await urlInput.press("Enter");

  // Wait for shader to load and compile
  await page.waitForTimeout(3000);

  // Verify source code shows the loaded shader
  const sourceCode = page.locator("#source-code");
  await expect(sourceCode).toContainText("random_wgsl", { timeout: 5000 });

  // Verify no error overlay visible
  const errorOverlay = page.locator("wgsl-play .error-overlay.visible");
  await expect(errorOverlay).toHaveCount(0);
});
