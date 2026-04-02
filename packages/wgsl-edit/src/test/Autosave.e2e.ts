import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { saveEndpoint } from "../SaveEndpoint.ts";
import { waitForWgslEdit } from "./E2eUtil.ts";

// Tests share filesystem state, so run serially
test.describe.configure({ mode: "serial" });

const shadersDir = path.resolve(import.meta.dirname, "../../test-page/shaders");
const shaderPath = path.join(shadersDir, "save-test.wesl");
const autoPath = path.join(shadersDir, "auto-test.wesl");

const originalContent = `fn original() -> f32 {
  return 1.0;
}
`;

const autoContent = `fn auto_original() -> f32 {
  return 1.0;
}
`;

test.beforeEach(() => {
  fs.writeFileSync(shaderPath, originalContent);
  fs.writeFileSync(autoPath, autoContent);
});

test.afterEach(() => {
  fs.writeFileSync(shaderPath, originalContent);
  fs.writeFileSync(autoPath, autoContent);
});

test("autosave writes edits to disk", async ({ page }) => {
  await page.goto("/");
  await waitForWgslEdit(page);

  // type into the editor's CodeMirror instance inside shadow DOM
  await page.evaluate(() => {
    const el = document.querySelector("#editor4") as any;
    el.source = `fn edited() -> f32 {\n  return 2.0;\n}\n`;
  });

  // wait for debounce (500ms) + network round-trip
  await expect
    .poll(() => fs.readFileSync(shaderPath, "utf-8"), { timeout: 5000 })
    .toContain("fn edited()");
});

test("autosave does not write on tab switch", async ({ page }) => {
  await page.goto("/");
  await waitForWgslEdit(page);

  // add a second file, which triggers a tab switch
  await page.evaluate(() => {
    const el = document.querySelector("#editor4") as any;
    el.addFile("other.wesl", "fn other() {}");
  });

  // wait past the debounce window
  await page.waitForTimeout(1000);

  const content = fs.readFileSync(shaderPath, "utf-8");
  expect(content).toBe(originalContent);
});

test("autosave POST returns 403 for path traversal", async ({ page }) => {
  await page.goto("/");
  await waitForWgslEdit(page);

  const status = await page.evaluate(async (endpoint: string) => {
    const body = JSON.stringify({
      root: "../../../",
      file: "etc/evil.wesl",
      content: "pwned",
    });
    const headers = { "Content-Type": "application/json" };
    const res = await fetch(endpoint, { method: "POST", headers, body });
    return res.status;
  }, saveEndpoint);

  expect(status).toBe(403);
});

test("autosave saves when shaderRoot set via project property", async ({
  page,
}) => {
  await page.goto("/");
  await waitForWgslEdit(page);

  // editor5 has autosave attr; shaderRoot is set via project property in main.ts
  await page.evaluate(() => {
    const el = document.querySelector("#editor5") as any;
    el.source = `fn auto_edited() -> f32 {\n  return 2.0;\n}\n`;
  });

  await expect
    .poll(() => fs.readFileSync(autoPath, "utf-8"), { timeout: 5000 })
    .toContain("fn auto_edited()");
});
