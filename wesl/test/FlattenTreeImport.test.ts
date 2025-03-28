import type { ImportCollection, ImportStatement } from "../AbstractElems.ts";
import { flattenTreeImport } from "../FlattenTreeImport.ts";
import { assertSnapshot } from "@std/testing/snapshot";

Deno.test("complex tree import", async (t) => {
  const list: ImportCollection = {
    kind: "import-collection",
    subtrees: [
      {
        kind: "import-statement",
        segments: [],
        finalSegment: { kind: "import-item", name: "foo", as: "bar" },
      },
      {
        kind: "import-statement",
        segments: [],
        finalSegment: { kind: "import-item", name: "doh" },
      },
      {
        kind: "import-statement",
        segments: [{ kind: "import-segment", name: "bib" }],
        finalSegment: { kind: "import-item", name: "bog" },
      },
    ],
  };

  const tree: ImportStatement = {
    kind: "import-statement",
    segments: [
      {
        kind: "import-segment",
        name: "zap",
      },
    ],
    finalSegment: list,
  };
  const flattened = flattenTreeImport(tree);
  await assertSnapshot(t, flattened);
});
