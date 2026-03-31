import * as path from "node:path";
import { expect, test } from "vitest";
import { ImageSnapshotManager } from "../SnapshotManager.ts";

test("generates correct file paths", () => {
  const testPath = path.join("/path/to/test.ts");
  const manager = new ImageSnapshotManager(testPath);

  expect(manager.referencePath("my-snapshot")).toBe(
    path.join("/path/to", "__image_snapshots__", "my-snapshot.png"),
  );
  expect(manager.actualPath("my-snapshot")).toBe(
    path.join("/path/to", "__image_actual__", "my-snapshot.png"),
  );
  expect(manager.diffPath("my-snapshot")).toBe(
    path.join("/path/to", "__image_diffs__", "my-snapshot.png"),
  );
});

test("sanitizes invalid filename characters", () => {
  const manager = new ImageSnapshotManager(path.join("/path/to/test.ts"));
  const snap = (name: string) => manager.referencePath(name);
  const snapDir = path.join("/path/to", "__image_snapshots__");

  // filesystem-invalid chars replaced with underscores
  expect(snap("Category > test")).toBe(path.join(snapDir, "Category _ test.png"));
  expect(snap('a<>:"/\\|?*b')).toBe(path.join(snapDir, "a_________b.png"));

  // control chars removed, outer whitespace trimmed
  expect(snap("word1\x02word2")).toBe(path.join(snapDir, "word1word2.png"));
  expect(snap(" spaced ")).toBe(path.join(snapDir, "spaced.png"));

  // sanitization applied to all path types
  expect(manager.actualPath("a > b")).toBe(
    path.join("/path/to", "__image_actual__", "a _ b.png"),
  );
  expect(manager.diffPath("a > b")).toBe(
    path.join("/path/to", "__image_diffs__", "a _ b.png"),
  );
});

test("supports custom directory names", () => {
  const testPath = path.join("/path/to/test.ts");
  const manager = new ImageSnapshotManager(testPath, {
    snapshotDir: "custom-snapshots",
    diffDir: "custom-diffs",
    actualDir: "custom-actual",
  });

  expect(manager.referencePath("test")).toBe(
    path.join("/path/to", "custom-snapshots", "test.png"),
  );
  expect(manager.actualPath("test")).toBe(
    path.join("/path/to", "custom-actual", "test.png"),
  );
  expect(manager.diffPath("test")).toBe(
    path.join("/path/to", "custom-diffs", "test.png"),
  );
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
