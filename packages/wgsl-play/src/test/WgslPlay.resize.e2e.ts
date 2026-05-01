/** E2E tests for two-corner resize handles + corner-local hover-reveal. */
import { expect, type Page, test } from "@playwright/test";
import { waitForWgslPlay } from "./E2eHelpers.ts";

/** Get a resize handle's bounding box (in viewport coords) from inside shadow DOM. */
async function handleBox(page: Page, playerId: string, corner: "br" | "bl") {
  return page.evaluate(
    ([id, c]) => {
      const el = document.querySelector(id) as HTMLElement | null;
      const handle = el?.shadowRoot?.querySelector(
        `.resize-handle.${c}`,
      ) as HTMLElement | null;
      if (!handle) return null;
      const r = handle.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    },
    [playerId, corner] as const,
  );
}

/** Read computed opacity (numeric) of a resize handle. */
async function handleOpacity(
  page: Page,
  playerId: string,
  corner: "br" | "bl",
): Promise<number> {
  return page.evaluate(
    ([id, c]) => {
      const el = document.querySelector(id) as HTMLElement | null;
      const handle = el?.shadowRoot?.querySelector(
        `.resize-handle.${c}`,
      ) as HTMLElement | null;
      return handle ? Number(getComputedStyle(handle).opacity) : -1;
    },
    [playerId, corner] as const,
  );
}

/** Get an element's bounding box (in viewport coords). */
async function elBox(page: Page, selector: string) {
  return page.evaluate(sel => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, selector);
}

/** Drag from start to (start + dx, start + dy) via raw mouse events. */
async function dragBy(
  page: Page,
  startX: number,
  startY: number,
  dx: number,
  dy: number,
) {
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 8 });
  await page.mouse.up();
}

test("both handles render in shadow DOM with opacity 0 at rest", async ({
  page,
}) => {
  await page.goto("/resize.html");
  await waitForWgslPlay(page);

  expect(await handleOpacity(page, "#blockPlayer", "br")).toBe(0);
  expect(await handleOpacity(page, "#blockPlayer", "bl")).toBe(0);
});

test("BR handle reveals only on BR corner hover", async ({ page }) => {
  await page.goto("/resize.html");
  await waitForWgslPlay(page);

  const br = await handleBox(page, "#blockPlayer", "br");
  if (!br) throw new Error("br handle not found");
  await page.mouse.move(br.x + br.width / 2, br.y + br.height / 2);

  // opacity transitions over 0.15s — poll until past midpoint
  await expect
    .poll(() => handleOpacity(page, "#blockPlayer", "br"), { timeout: 2000 })
    .toBeGreaterThan(0.9);
  expect(await handleOpacity(page, "#blockPlayer", "bl")).toBe(0);
});

test("BL handle reveals only on BL corner hover", async ({ page }) => {
  await page.goto("/resize.html");
  await waitForWgslPlay(page);

  const bl = await handleBox(page, "#blockPlayer", "bl");
  if (!bl) throw new Error("bl handle not found");
  await page.mouse.move(bl.x + bl.width / 2, bl.y + bl.height / 2);

  await expect
    .poll(() => handleOpacity(page, "#blockPlayer", "bl"), { timeout: 2000 })
    .toBeGreaterThan(0.9);
  expect(await handleOpacity(page, "#blockPlayer", "br")).toBe(0);
});

test("canvas-interior hover does not reveal either handle", async ({
  page,
}) => {
  await page.goto("/resize.html");
  await waitForWgslPlay(page);

  const player = await elBox(page, "#blockPlayer");
  if (!player) throw new Error("player not found");
  // Center of the canvas, away from any corner.
  await page.mouse.move(
    player.x + player.width / 2,
    player.y + player.height / 2,
  );

  expect(await handleOpacity(page, "#blockPlayer", "br")).toBe(0);
  expect(await handleOpacity(page, "#blockPlayer", "bl")).toBe(0);
});

test("BR drag grows width and height", async ({ page }) => {
  await page.goto("/resize.html");
  await waitForWgslPlay(page);

  const before = await elBox(page, "#blockPlayer");
  const br = await handleBox(page, "#blockPlayer", "br");
  if (!before || !br) throw new Error("setup failed");

  await dragBy(page, br.x + br.width / 2, br.y + br.height / 2, 50, 50);

  const after = await elBox(page, "#blockPlayer");
  if (!after) throw new Error("missing after rect");
  expect(after.width).toBeGreaterThan(before.width + 40);
  expect(after.height).toBeGreaterThan(before.height + 40);
});

test("BL drag in flex layout grows play width, shrinks edit, pins right edge", async ({
  page,
}) => {
  await page.goto("/resize.html");
  await waitForWgslPlay(page);
  await page.locator("#flexPlayer").scrollIntoViewIfNeeded();

  const playBefore = await elBox(page, "#flexPlayer");
  const editBefore = await elBox(page, ".splitter > .edit");
  const bl = await handleBox(page, "#flexPlayer", "bl");
  if (!playBefore || !editBefore || !bl) throw new Error("setup failed");

  await dragBy(page, bl.x + bl.width / 2, bl.y + bl.height / 2, -50, 0);

  const playAfter = await elBox(page, "#flexPlayer");
  const editAfter = await elBox(page, ".splitter > .edit");
  if (!playAfter || !editAfter) throw new Error("missing after rect");

  expect(playAfter.width).toBeGreaterThan(playBefore.width + 40);
  expect(editAfter.width).toBeLessThan(editBefore.width - 40);
  // Right edge of the player stays pinned (flex container fills its parent).
  const playRightBefore = playBefore.x + playBefore.width;
  const playRightAfter = playAfter.x + playAfter.width;
  expect(Math.abs(playRightAfter - playRightBefore)).toBeLessThan(2);
});

test("min-size guard clamps width to 16px on aggressive shrink", async ({
  page,
}) => {
  await page.goto("/resize.html");
  await waitForWgslPlay(page);

  const before = await elBox(page, "#blockPlayer");
  const bl = await handleBox(page, "#blockPlayer", "bl");
  if (!before || !bl) throw new Error("setup failed");

  // Drag BL far to the right (shrinks width — clamps at 16).
  await dragBy(
    page,
    bl.x + bl.width / 2,
    bl.y + bl.height / 2,
    before.width + 200,
    0,
  );

  const after = await elBox(page, "#blockPlayer");
  if (!after) throw new Error("missing after rect");
  expect(after.width).toBeGreaterThanOrEqual(16);
  expect(after.width).toBeLessThan(32);
});

test("non-resizable element renders no visible handles", async ({ page }) => {
  await page.goto("/resize.html");
  await waitForWgslPlay(page);

  const display = await page.evaluate(() => {
    const el = document.querySelector("#plainPlayer") as HTMLElement | null;
    const h = el?.shadowRoot?.querySelector(
      ".resize-handle",
    ) as HTMLElement | null;
    return h ? getComputedStyle(h).display : "missing";
  });
  expect(display).toBe("none");
});
