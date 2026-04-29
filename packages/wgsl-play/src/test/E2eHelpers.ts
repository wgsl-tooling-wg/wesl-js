/** Shared Playwright helpers for wgsl-play e2e suites. */
import { expect, type Page } from "@playwright/test";

/** Wait for wgsl-play custom element to be defined and upgraded. */
export async function waitForWgslPlay(page: Page) {
  await page.waitForFunction(() => customElements.get("wgsl-play"));
}

/** Wait for a wgsl-play element to render at least one frame. */
export async function waitForFrame(page: Page, selector: string) {
  await page.waitForFunction(
    sel =>
      (document.querySelector(sel) as HTMLElement & { frameCount: number })
        ?.frameCount > 0,
    selector,
  );
}

/** Get current frameCount for a wgsl-play element. */
export async function getFrameCount(
  page: Page,
  selector: string,
): Promise<number> {
  return page.evaluate(
    sel =>
      (document.querySelector(sel) as HTMLElement & { frameCount: number })
        ?.frameCount ?? 0,
    selector,
  );
}

/** Wait for frameCount to increase from current value (for re-renders after changes). */
export async function waitForNewFrame(page: Page, selector: string) {
  const before = await getFrameCount(page, selector);
  await page.waitForFunction(
    ([sel, prev]) =>
      ((document.querySelector(sel) as HTMLElement & { frameCount: number })
        ?.frameCount ?? 0) > prev,
    [selector, before] as const,
  );
}

/** Get canvas bounding box from inside shadow DOM. */
export async function getCanvasBox(page: Page, playerId: string) {
  return page.evaluate(id => {
    const el = document.querySelector(id) as HTMLElement | null;
    const canvas = el?.shadowRoot?.querySelector("canvas");
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, playerId);
}

/** Read the structured table data from a player's compute results panel. */
export async function readResultsPanel(page: Page, playerId: string) {
  const data = await page.evaluate(id => {
    const el = document.querySelector(id) as HTMLElement | null;
    const panel = el?.shadowRoot?.querySelector(".results-panel");
    if (!panel) return null;
    return Array.from(panel.querySelectorAll("section.result")).map(s => ({
      caption: s.querySelector(".result-caption")?.textContent,
      headers: Array.from(s.querySelectorAll("thead th")).map(
        c => c.textContent,
      ),
      rows: Array.from(s.querySelectorAll("tbody tr")).map(r =>
        Array.from(r.querySelectorAll("td")).map(c => c.textContent),
      ),
    }));
  }, playerId);
  if (!data) throw new Error(`no results panel found for ${playerId}`);
  return data;
}

/** Wait for at least one results-panel table to be populated. */
export async function waitForResults(page: Page, playerId: string) {
  await page.waitForFunction(id => {
    const el = document.querySelector(id) as HTMLElement | null;
    const panel = el?.shadowRoot?.querySelector(".results-panel");
    return (
      !!panel &&
      !panel.hasAttribute("hidden") &&
      panel.querySelector("tbody tr") !== null
    );
  }, playerId);
}

/** Snapshot the structured DOM-text data from a results panel. */
export async function expectResultsPanelSnapshot(
  page: Page,
  playerId: string,
  name: string,
) {
  const data = await readResultsPanel(page, playerId);
  expect(data).toMatchSnapshot(name);
}

/** Scroll player into view and snapshot its shadow DOM canvas. */
export async function expectCanvasSnapshot(
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
