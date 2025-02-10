import { expect, test } from "vitest";
import { ImportCollection, ImportStatement } from "../AbstractElems.ts";
import { flattenTreeImport } from "../FlattenTreeImport.ts";

test("complex tree import", () => {
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
  expect(flattened).toMatchInlineSnapshot(`
    [
      {
        "importPath": [
          "zap",
          "bar",
        ],
        "modulePath": [
          "zap",
          "foo",
        ],
      },
      {
        "importPath": [
          "zap",
          "doh",
        ],
        "modulePath": [
          "zap",
          "doh",
        ],
      },
      {
        "importPath": [
          "zap",
          "bib",
          "bog",
        ],
        "modulePath": [
          "zap",
          "bib",
          "bog",
        ],
      },
    ]
  `);
});
