import {
  delimited,
  fn,
  kind,
  opt,
  or,
  Parser,
  preceded,
  repeatPlus,
  req,
  seq,
  seqObj,
  span,
  Stream,
  terminated,
  tracing,
  withSepPlus,
  yes,
} from "mini-parse";
import { assertUnreachable } from "../Assertions.ts";
import { WeslToken } from "./WeslStream.ts";
import {
  ImportSegment,
  ImportCollection,
  ImportItem,
  ImportStatement,
  ImportElem,
} from "./ImportElems.ts";
import { WeslParser } from "./BaseGrammar.ts";

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

const word = kind("word");

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
        "invalid import, expected '{' or name",
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
  terminated("package", req("::", "invalid import, expected '::'")).map(v => [
    makeSegment(v),
  ]),
  repeatPlus(
    terminated("super", req("::", "invalid import, expected '::'")).map(
      makeSegment,
    ),
  ),
);

export const import_statement: WeslParser<ImportElem> = span(
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
    req(";", "invalid import, expected ';'"),
  ),
).map(
  (v): ImportElem => ({
    kind: "import",
    attributes: [], // LATER Parse and fill in
    imports: v.value,
    span: v.span,
  }),
);

if (tracing) {
  const names: Record<string, Parser<Stream<WeslToken>, unknown>> = {
    import_collection,
    import_path_or_item,
    import_relative,
    import_statement,
  };

  Object.entries(names).forEach(([name, parser]) => {
    parser.setTraceName(name);
  });
}
