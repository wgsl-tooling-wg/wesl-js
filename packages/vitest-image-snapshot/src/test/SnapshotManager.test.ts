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

test("handles invalid chars in snapshot name for all path types", () => {
  const testPath = path.join("/path/to/test.ts");
  const manager = new ImageSnapshotManager(testPath);

  expect(manager.referencePath("Category > test name")).toBe(
    path.join("/path/to", "__image_snapshots__", "Category _ test name.png"),
  );
  expect(manager.actualPath("Category > test name")).toBe(
    path.join("/path/to", "__image_actual__", "Category _ test name.png"),
  );
  expect(manager.diffPath("Category > test name")).toBe(
    path.join("/path/to", "__image_diffs__", "Category _ test name.png"),
  );
});

test("handles replaceable invalid chars in snapshot name", () => {
  const testPath = path.join("/path/to/test.ts");
  const manager = new ImageSnapshotManager(testPath);

  // since we've shown that all path types are passed through sanitizeName, it's
  // enough to stick to one type for these.

  // handles multiple replaceable chars
  expect(manager.referencePath("Category > test name > subtitle")).toBe(
    path.join(
      "/path/to",
      "__image_snapshots__",
      "Category _ test name _ subtitle.png",
    ),
  );

  // handles all known replaceable chars
  expect(manager.referencePath('Category <>:"/\\|?* test')).toBe(
    path.join("/path/to", "__image_snapshots__", "Category _________ test.png"),
  );

  // handles invalid chars at start
  expect(manager.referencePath("> test")).toBe(
    path.join("/path/to", "__image_snapshots__", "_ test.png"),
  );

  // handles invalid chars at end
  expect(manager.referencePath("test >")).toBe(
    path.join("/path/to", "__image_snapshots__", "test _.png"),
  );
});

test("handles unreplaceable invalid chars in snapshot name", () => {
  const testPath = path.join("/path/to/test.ts");
  const manager = new ImageSnapshotManager(testPath);

  // since we've shown that all path types are passed through sanitizeName, it's
  // enough to stick to one type for these.

  // handles unreplaceable chars
  expect(manager.referencePath("Category \x02 test name")).toBe(
    path.join("/path/to", "__image_snapshots__", "Category  test name.png"),
  );

  // handles multiple unreplaceable chars
  expect(manager.referencePath("Category \x02\x03 test name")).toBe(
    path.join("/path/to", "__image_snapshots__", "Category  test name.png"),
  );

  // handles unreplaceables at the beginning
  expect(manager.referencePath("\x02\x03word1 word2")).toBe(
    path.join("/path/to", "__image_snapshots__", "word1 word2.png"),
  );

  // handles unreplaceables at the end
  expect(manager.referencePath("word1 word2\x02\x03")).toBe(
    path.join("/path/to", "__image_snapshots__", "word1 word2.png"),
  );

  // handles extra space on the outside
  expect(manager.referencePath(" word1 word2 \x02 \x03 ")).toBe(
    path.join("/path/to", "__image_snapshots__", "word1 word2.png"),
  );

  // handles mixed invalid chars
  expect(manager.referencePath(" word1 >\x02<\x03 word2 \x02 \x03 ")).toBe(
    path.join("/path/to", "__image_snapshots__", "word1 __ word2.png"),
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
