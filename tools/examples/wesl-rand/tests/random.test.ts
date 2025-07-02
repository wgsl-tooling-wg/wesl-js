import { expect, test } from "@playwright/test";

test("random image", async ({ page }) => {
  await page.goto("/");

  const canvas = await page.$("canvas");
  expect(canvas).not.toBeNull();
  const snapshot = await canvas!.screenshot();
  expect(snapshot).toMatchSnapshot("random.png");
});
