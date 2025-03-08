import {
  delimited,
  fn,
  opt,
  or,
  Parser,
  preceded,
  repeat,
  repeatPlus,
  req,
  seq,
  seqObj,
  span,
  Stream,
  tagScope,
  terminated,
  tracing,
  withSepPlus,
  yes,
} from "mini-parse";
import type {
  ImportCollection,
  ImportElem,
  ImportItem,
  ImportSegment,
  ImportStatement,
} from "../AbstractElems.js";
import { assertUnreachable } from "../Assertions.js";
import { importElem } from "../WESLCollect.js";
import { word } from "./WeslBaseGrammar.js";
import { WeslToken } from "./WeslStream.js";

function makeStatement(
  segments: ImportSegment[],
  finalSegment: ImportCollection | ImportItem,
): ImportStatement {
  return { kind: "import-statement", segments, finalSegment };
}
function makeSegment(name: string): ImportSegment {
  return { kind: "import-segment", name };
}
function makeCollection(subtrees: ImportStatement[]): ImportCollection {
  return {
    kind: "import-collection",
    subtrees,
  };
}
function makeItem(name: string, as?: string): ImportItem {
  return { kind: "import-item", name, as };
}
function prependSegments(
  segments: ImportSegment[],
  statement: ImportStatement,
): ImportStatement {
  statement.segments = segments.concat(statement.segments);
  return statement;
}

// forward references for mutual recursion
let import_collection: Parser<
  Stream<WeslToken>,
  ImportCollection
> = null as any;

const import_path_or_item: Parser<Stream<WeslToken>, ImportStatement> = seq(
  word,
  or(
    preceded(
      "::",
      req(
        or(
          fn(() => import_collection),
          fn(() => import_path_or_item),
        ),
        "invalid import, expected { or name",
      ),
    ),
    preceded("as", req(word, "invalid alias, expected name")).map(v =>
      makeItem("", v),
    ),
    yes().map(() => makeItem("")), // Optional
  ),
).map(([name, next]): ImportStatement => {
  if (next.kind === "import-collection") {
    return makeStatement([makeSegment(name)], next);
  } else if (next.kind === "import-statement") {
    return prependSegments([makeSegment(name)], next);
  } else if (next.kind === "import-item") {
    next.name = name;
    return makeStatement([], next);
  } else {
    assertUnreachable(next);
  }
});

import_collection = delimited(
  "{",
  withSepPlus(",", () => import_path_or_item).map(makeCollection),
  req("}", "invalid import collection, expected }"),
);

const import_relative = or(
  terminated("package", req("::", "invalid import, expected ::")).map(v => [
    makeSegment(v),
  ]),
  repeatPlus(
    terminated("super", req("::", "invalid import, expected ::")).map(
      makeSegment,
    ),
  ),
);

const import_statement = span(
  delimited(
    "import",
    seqObj({
      relative: opt(import_relative),
      collection_or_statement: req(
        or(import_collection, import_path_or_item),
        "invalid import, expected { or name",
      ),
    }).map(({ relative, collection_or_statement }): ImportStatement => {
      if (collection_or_statement.kind === "import-statement") {
        return prependSegments(relative ?? [], collection_or_statement);
      } else {
        return makeStatement(relative ?? [], collection_or_statement);
      }
    }),
    req(";", "invalid import, expected ;"),
  ),
).map(
  (v): ImportElem => ({
    kind: "import",
    imports: v.value,
    start: v.span[0],
    end: v.span[1],
  }),
);

/** parse a WESL style wgsl import statement. */
export const weslImports: Parser<Stream<WeslToken>, ImportElem[]> = tagScope(
  repeat(import_statement).ptag("owo").collect(importElem),
);

if (tracing) {
  const names: Record<string, Parser<Stream<WeslToken>, unknown>> = {
    import_collection,
    import_path_or_item,
    import_relative,
    import_statement,
    weslImports,
  };

  Object.entries(names).forEach(([name, parser]) => {
    parser.setTraceName(name);
  });
}
