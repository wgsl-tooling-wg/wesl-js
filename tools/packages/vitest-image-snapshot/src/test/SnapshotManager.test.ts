import { expect, test } from "vitest";
import { ImageSnapshotManager } from "../SnapshotManager.ts";

test("generates correct file paths", () => {
  const manager = new ImageSnapshotManager("/path/to/test.ts");

  expect(manager.referencePath("my-snapshot")).toBe(
    "/path/to/__image_snapshots__/my-snapshot.png",
  );
  expect(manager.actualPath("my-snapshot")).toBe(
    "/path/to/__image_actual__/my-snapshot.png",
  );
  expect(manager.diffPath("my-snapshot")).toBe(
    "/path/to/__image_diffs__/my-snapshot.png",
  );
});

test("supports custom directory names", () => {
  const manager = new ImageSnapshotManager("/path/to/test.ts", {
    snapshotDir: "custom-snapshots",
    diffDir: "custom-diffs",
    actualDir: "custom-actual",
  });

  expect(manager.referencePath("test")).toBe(
    "/path/to/custom-snapshots/test.png",
  );
  expect(manager.actualPath("test")).toBe("/path/to/custom-actual/test.png");
  expect(manager.diffPath("test")).toBe("/path/to/custom-diffs/test.png");
});

test("detects update mode from environment", () => {
  const manager = new ImageSnapshotManager("/path/to/test.ts");

  const originalEnv = process.env.VITEST_UPDATE_SNAPSHOTS;

  try {
    // Test with env var (vitest sets to "1" when -u is used)
    process.env.VITEST_UPDATE_SNAPSHOTS = "1";
    expect(manager.shouldUpdate()).toBe(true);

    // Test without env var
    delete process.env.VITEST_UPDATE_SNAPSHOTS;
    expect(manager.shouldUpdate()).toBe(false);
  } finally {
    process.env.VITEST_UPDATE_SNAPSHOTS = originalEnv;
  }
});
