import type { Page } from "@playwright/test";

/** Wait for the wgsl-edit custom element to be defined. */
export async function waitForWgslEdit(page: Page) {
  await page.waitForFunction(() => customElements.get("wgsl-edit"));
}
