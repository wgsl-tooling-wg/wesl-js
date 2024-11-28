import { testParse, TestParseResult } from "mini-parse/test-util";
import { expect, TaskContext, test } from "vitest";
import { gleamImport, gleamImportTokens } from "../GleamImport.js";
import { WeslAST } from "../ParseWESL.js";

function expectParses(ctx: TaskContext): TestParseResult<void> {
  const state: WeslAST = { elems: [], scope: { kind: "module", parent: null, idents: [], children: [] } };
  const result = testParse(gleamImport, ctx.task.name, gleamImportTokens, state);
  expect(result.parsed).not.toBeNull();
  return result;
}
/* ------  success cases  -------   */

test("import ./foo/bar;", ctx => {
  const result = expectParses(ctx);
  expect(result.position).toBe(ctx.task.name.length); // consume semicolon (so that linking will remove it)
});

test("import foo-bar/boo", ctx => {
  expectParses(ctx);
});

/**  ----- extraction tests -----  */
test("import foo/bar", ctx => {
  const { appState } = expectParses(ctx);
  expect(appState.elems).toMatchInlineSnapshot(`
    [
      {
        "end": 14,
        "imports": ImportTree {
          "segments": [
            SimpleSegment {
              "args": undefined,
              "as": undefined,
              "name": "foo",
            },
            SimpleSegment {
              "args": undefined,
              "as": undefined,
              "name": "bar",
            },
          ],
        },
        "kind": "treeImport",
        "start": 0,
      },
    ]
  `);
});

test("import foo/* as b", ctx => {
  const { appState } = expectParses(ctx);
  expect(appState.elems).toMatchInlineSnapshot(`
    [
      {
        "end": 17,
        "imports": ImportTree {
          "segments": [
            SimpleSegment {
              "args": undefined,
              "as": undefined,
              "name": "foo",
            },
            Wildcard {
              "as": "b",
            },
          ],
        },
        "kind": "treeImport",
        "start": 0,
      },
    ]
  `);
});

test(`import a/{ b, c/{d, e}, f/* }`, ctx => {
  const { appState } = expectParses(ctx);
  expect(appState.elems).toMatchInlineSnapshot(`
    [
      {
        "end": 29,
        "imports": ImportTree {
          "segments": [
            SimpleSegment {
              "args": undefined,
              "as": undefined,
              "name": "a",
            },
            SegmentList {
              "list": [
                ImportTree {
                  "segments": [
                    SimpleSegment {
                      "args": undefined,
                      "as": undefined,
                      "name": "b",
                    },
                  ],
                },
                ImportTree {
                  "segments": [
                    SimpleSegment {
                      "args": undefined,
                      "as": undefined,
                      "name": "c",
                    },
                    SegmentList {
                      "list": [
                        ImportTree {
                          "segments": [
                            SimpleSegment {
                              "args": undefined,
                              "as": undefined,
                              "name": "d",
                            },
                          ],
                        },
                        ImportTree {
                          "segments": [
                            SimpleSegment {
                              "args": undefined,
                              "as": undefined,
                              "name": "e",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                ImportTree {
                  "segments": [
                    SimpleSegment {
                      "args": undefined,
                      "as": undefined,
                      "name": "f",
                    },
                    Wildcard {
                      "as": undefined,
                    },
                  ],
                },
              ],
            },
          ],
        },
        "kind": "treeImport",
        "start": 0,
      },
    ]
  `);
});

test("import ./foo/bar", ctx => {
  const { appState } = expectParses(ctx);
  expect(appState.elems).toMatchInlineSnapshot(`
    [
      {
        "end": 16,
        "imports": ImportTree {
          "segments": [
            SimpleSegment {
              "args": undefined,
              "as": undefined,
              "name": ".",
            },
            SimpleSegment {
              "args": undefined,
              "as": undefined,
              "name": "foo",
            },
            SimpleSegment {
              "args": undefined,
              "as": undefined,
              "name": "bar",
            },
          ],
        },
        "kind": "treeImport",
        "start": 0,
      },
    ]
  `);
});
