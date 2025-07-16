import {
  delimited,
  fn,
  not,
  opt,
  or,
  type Parser,
  preceded,
  repeat,
  repeatPlus,
  req,
  type Stream,
  seq,
  seqObj,
  span,
  tagScope,
  terminated,
  tracing,
  withSepPlus,
  yes,
} from "mini-parse";
import type {
  AttributeElem,
  ElseAttribute,
  IfAttribute,
  ImportCollection,
  ImportElem,
  ImportItem,
  ImportSegment,
  ImportStatement,
} from "../AbstractElems.ts";
import { assertUnreachable } from "../Assertions.ts";
import { importElem } from "../WESLCollect.ts";
import { else_attribute_base, if_attribute_base } from "./AttributeGrammar.ts";
import { keyword, word } from "./WeslBaseGrammar.ts";
import type { WeslToken } from "./WeslStream.ts";

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

const segment_blacklist = or("super", "package", "import", "as");

/** words allowed in an import segment (after the package:: or super::super:: part if any) */
const packageWord = preceded(not(segment_blacklist), or(word, keyword));

const import_path_or_item: Parser<Stream<WeslToken>, ImportStatement> = seq(
  packageWord,
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

const import_statement_base = delimited(
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
);

function wrapAttributes(
  rawAttributes: (IfAttribute | ElseAttribute)[],
): AttributeElem[] {
  return rawAttributes.map(attribute => ({
    kind: "attribute",
    attribute,
    contents: [],
    start: 0,
    end: 0,
  }));
}

const import_statement = span(
  seq(
    repeat(or(if_attribute_base, else_attribute_base)),
    import_statement_base,
  ),
).map(({ value: [rawAttributes, imports], span }): ImportElem => {
  const importElem: ImportElem = {
    kind: "import",
    imports,
    start: span[0],
    end: span[1],
  };

  if (rawAttributes.length > 0) {
    return { ...importElem, attributes: wrapAttributes(rawAttributes) };
  }
  return importElem;
});

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
