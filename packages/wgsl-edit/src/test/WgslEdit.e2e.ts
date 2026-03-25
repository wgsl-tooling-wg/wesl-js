import { expect, type Page, test } from "@playwright/test";

async function waitForWgslEdit(page: Page) {
  await page.waitForFunction(() => customElements.get("wgsl-edit"));
}

const lintErrorSelector = ".cm-lintRange-error";

async function hasLintErrors(page: Page, id: string): Promise<boolean> {
  return page.evaluate(
    ([sel, marker]) =>
      !!document.querySelector(sel)?.shadowRoot?.querySelector(marker),
    [id, lintErrorSelector] as const,
  );
}

async function waitForLintErrors(page: Page, id: string) {
  await page.waitForFunction(
    ([sel, marker]) =>
      !!document.querySelector(sel)?.shadowRoot?.querySelector(marker),
    [id, lintErrorSelector] as const,
    { timeout: 10_000 },
  );
}

test("wgsl-edit component loads", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", err => errors.push(err.message));

  await page.goto("/");
  const defined = await page
    .waitForFunction(() => customElements.get("wgsl-edit"), { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (!defined) {
    const msg = errors.length
      ? `JS errors: ${errors.join("; ")}`
      : "No JS errors captured - check if module loaded";
    throw new Error(`wgsl-edit custom element not defined. ${msg}`);
  }

  const hasShadow = await page.evaluate(
    () => !!document.querySelector("#editor1")?.shadowRoot,
  );
  expect(hasShadow).toBe(true);
});

test("GPU lint shows error for type mismatch", async ({ page }) => {
  await page.goto("/");
  await waitForWgslEdit(page);
  await waitForLintErrors(page, "#editor1"); // throws on timeout if no errors
});

test("valid shader has no lint errors", async ({ page }) => {
  await page.goto("/");
  await waitForWgslEdit(page);

  // Wait enough time for linter to run (300ms delay + linking + GPU)
  await page.waitForTimeout(3000);

  const has = await hasLintErrors(page, "#editor2");
  expect(has).toBe(false);
});

test("WESL lint shows error for unresolved identifier", async ({ page }) => {
  await page.goto("/");
  await waitForWgslEdit(page);
  await waitForLintErrors(page, "#editor3"); // throws on timeout if no errors
});
