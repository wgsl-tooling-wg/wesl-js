/** E2E tests for compute page (single-workgroup compute + readback panel). */
import { expect, test } from "@playwright/test";
import {
  readResultsPanel,
  waitForResults,
  waitForWgslPlay,
} from "./E2eHelpers.ts";

test.beforeEach(async ({ page }) => {
  await page.goto("/compute.html");
  await waitForWgslPlay(page);
});

test("squares: single @buffer dispatched once", async ({ page }) => {
  await waitForResults(page, "#squaresPlayer");
  const data = await readResultsPanel(page, "#squaresPlayer");
  expect(data).toEqual([
    {
      caption: "result: array<f32, 8>",
      headers: ["", "value"],
      rows: [
        ["0", "0.0"],
        ["1", "1.0"],
        ["2", "4.0"],
        ["3", "9.0"],
        ["4", "16.0"],
        ["5", "25.0"],
        ["6", "36.0"],
        ["7", "49.0"],
      ],
    },
  ]);
});

test("two-buffers (input + output) — both zero-initialized", async ({
  page,
}) => {
  await waitForResults(page, "#prefixSumPlayer");
  const data = await readResultsPanel(page, "#prefixSumPlayer");
  const zeros4 = [
    ["0", "0.0"],
    ["1", "0.0"],
    ["2", "0.0"],
    ["3", "0.0"],
  ];
  expect(data).toEqual([
    { caption: "input: array<f32, 4>", headers: ["", "value"], rows: zeros4 },
    { caption: "output: array<f32, 4>", headers: ["", "value"], rows: zeros4 },
  ]);
});

test("struct array renders one column per field", async ({ page }) => {
  await waitForResults(page, "#particlesPlayer");
  const data = await readResultsPanel(page, "#particlesPlayer");
  expect(data).toEqual([
    {
      caption: "particles: array<Particle, 4>",
      headers: ["", "pos", "vel"],
      rows: [
        ["0", "(0.0, 0.0)", "(0.0, 0.0)"],
        ["1", "(1.0, 2.0)", "(0.1, 0.0)"],
        ["2", "(2.0, 4.0)", "(0.2, 0.0)"],
        ["3", "(3.0, 6.0)", "(0.3, 0.0)"],
      ],
    },
  ]);
});

test("slider drives re-dispatch", async ({ page }) => {
  await waitForResults(page, "#sliderPlayer");

  // Default `k` slider value puts each result at id * default_k. We just
  // assert that re-dispatch lands the right values after we move the slider.
  await page.evaluate(() => {
    const player = document.querySelector("#sliderPlayer") as HTMLElement;
    const input = player.shadowRoot?.querySelector(
      'input[type="range"]',
    ) as HTMLInputElement | null;
    if (!input) throw new Error("slider not found");
    input.value = "8";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // After re-run with k=8, expect result[7] === 7 * 8 === 56.0
  await page.waitForFunction(() => {
    const el = document.querySelector("#sliderPlayer") as HTMLElement;
    const cell = el?.shadowRoot?.querySelector(
      ".results-panel tbody tr:last-of-type td:last-child",
    );
    return cell?.textContent === "56.0";
  });

  const data = await readResultsPanel(page, "#sliderPlayer");
  expect(data).toEqual([
    {
      caption: "result: array<f32, 8>",
      headers: ["", "value"],
      rows: [
        ["0", "0.0"],
        ["1", "8.0"],
        ["2", "16.0"],
        ["3", "24.0"],
        ["4", "32.0"],
        ["5", "40.0"],
        ["6", "48.0"],
        ["7", "56.0"],
      ],
    },
  ]);
});

const rejections: { id: string; pattern: RegExp }[] = [
  {
    id: "#rejectedTwoComputePlayer",
    pattern: /compute mode requires exactly one @compute entry point/,
  },
  {
    id: "#rejectedMixedPlayer",
    pattern: /mixed compute and fragment entry points/,
  },
  {
    id: "#rejectedRuntimeArrayPlayer",
    pattern: /runtime-sized arrays are not supported/,
  },
  {
    id: "#rejectedMatrixPlayer",
    pattern: /matrices are not supported/,
  },
];

for (const { id, pattern } of rejections) {
  test(`rejection: ${id}`, async ({ page }) => {
    await page.waitForFunction(sel => {
      const status = document.querySelector(`${sel}-status`) as HTMLElement;
      return status?.dataset.rejected === "true";
    }, id);
    const status = await page.locator(`${id}-status`).textContent();
    expect(status).toMatch(pattern);
  });
}
