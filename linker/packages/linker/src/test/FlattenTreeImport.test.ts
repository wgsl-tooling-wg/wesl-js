import { expect, test } from "vitest";
import { flattenTreeImport } from "../FlattenTreeImport.ts";
import {
  ImportCollection,
  ImportItem,
  ImportSegment,
  ImportStatement,
} from "../ImportStatement.ts";

test("complex tree import", () => {
  const zap = new ImportSegment("zap");
  const foo = new ImportItem("foo", "bar"); // foo as bar
  const doh = new ImportItem("doh");
  const bib = new ImportSegment("bib");
  const bog = new ImportItem("bog");
  const subtree = new ImportStatement([bib], bog);
  const list = new ImportCollection([
    new ImportStatement([], foo),
    new ImportStatement([], doh),
    subtree,
  ]);

  const tree = new ImportStatement([zap], list);
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
