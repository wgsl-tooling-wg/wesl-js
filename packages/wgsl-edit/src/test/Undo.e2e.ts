import { expect, type Page, test } from "@playwright/test";
import { waitForWgslEdit } from "./E2eUtil.ts";

async function appendToActiveFile(
  page: Page,
  id: string,
  text: string,
): Promise<void> {
  await page.evaluate(
    ([sel, s]) => {
      const view = (document.querySelector(sel) as any).editorView;
      const end = view.state.doc.length;
      view.dispatch({
        changes: { from: end, insert: s },
        selection: { anchor: end + s.length },
        userEvent: "input.type",
      });
    },
    [id, text] as const,
  );
}

async function getFileSource(
  page: Page,
  id: string,
  file: string,
): Promise<string> {
  return page.evaluate(
    ([sel, f]) => {
      const el = document.querySelector(sel) as any;
      const saved = el.activeFile;
      el.activeFile = f;
      const src = el.source as string;
      el.activeFile = saved;
      return src;
    },
    [id, file] as const,
  );
}

async function setActiveFile(
  page: Page,
  id: string,
  file: string,
): Promise<void> {
  await page.evaluate(
    ([sel, f]) => {
      (document.querySelector(sel) as any).activeFile = f;
    },
    [id, file] as const,
  );
}

async function focusEditor(page: Page, id: string): Promise<void> {
  await page.evaluate(sel => {
    const host = document.querySelector(sel) as HTMLElement | null;
    const content = host?.shadowRoot?.querySelector(
      ".cm-content",
    ) as HTMLElement | null;
    content?.focus();
  }, id);
}

test("undo is scoped to the active file", async ({ page }) => {
  await page.goto("/");
  await waitForWgslEdit(page);

  const mainOrig = await getFileSource(page, "#editor6", "main.wesl");
  const shapeOrig = await getFileSource(page, "#editor6", "shape.wesl");

  await setActiveFile(page, "#editor6", "main.wesl");
  await appendToActiveFile(page, "#editor6", " // main-edit");

  await setActiveFile(page, "#editor6", "shape.wesl");
  await appendToActiveFile(page, "#editor6", " // shape-edit");

  await setActiveFile(page, "#editor6", "main.wesl");
  await focusEditor(page, "#editor6");
  await page.keyboard.press("ControlOrMeta+z");

  const active = await page.evaluate(
    () => (document.querySelector("#editor6") as any).activeFile,
  );
  expect(active).toBe("main.wesl");

  const mainNow = await getFileSource(page, "#editor6", "main.wesl");
  const shapeNow = await getFileSource(page, "#editor6", "shape.wesl");
  expect(mainNow).toBe(mainOrig);
  expect(shapeNow).toContain("// shape-edit");
  expect(shapeNow).not.toBe(shapeOrig);
});
