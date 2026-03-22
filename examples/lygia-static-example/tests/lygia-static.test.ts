import { expect, test } from "@playwright/test";

test("linked code", async ({ page }) => {
  await page.goto("/");
  console.log("page loaded");
  await page.getByText("@compute @workgroup_size(1)");
  const src = await page.locator("#app").textContent();
  expect(src).toMatchSnapshot("lygia-static.wgsl");
});
