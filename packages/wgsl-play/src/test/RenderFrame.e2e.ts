/** E2E test for the public `renderFrame()` capture hook. */
import { expect, test } from "@playwright/test";
import { waitForFrame, waitForWgslPlay } from "./E2eHelpers.ts";

test("renderFrame captures a PNG even when called mid-build", async ({
  page,
}) => {
  await page.goto("/basics.html");
  await waitForWgslPlay(page);
  await waitForFrame(page, "#basicPlayer");

  // Replace the shader and call renderFrame() synchronously after, without
  // awaiting any compile-success event. awaitIdleBuild must let the build
  // finish before the snapshot.
  const bytes = await page.evaluate(async () => {
    const el = document.querySelector("#basicPlayer") as HTMLElement & {
      shader: string;
      renderFrame: () => Promise<void>;
    };
    el.shader = `import env::u;
      @fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
        return vec4f(1.0, 0.0, 0.0, 1.0);
      }`;
    await el.renderFrame();
    const canvas = el.shadowRoot?.querySelector("canvas") as HTMLCanvasElement;
    const blob = await new Promise<Blob | null>(r =>
      canvas.toBlob(b => r(b), "image/png"),
    );
    if (!blob) throw new Error("toBlob returned null");
    return Array.from(new Uint8Array(await blob.arrayBuffer()).slice(0, 4));
  });
  expect(bytes).toEqual([0x89, 0x50, 0x4e, 0x47]);
});
