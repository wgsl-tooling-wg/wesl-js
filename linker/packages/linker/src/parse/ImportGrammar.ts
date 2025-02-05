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
  span,
  Stream,
  tagScope,
  terminated,
  tracing,
  withSepPlus,
  yes,
} from "mini-parse";
import { mainTokens } from "../WESLTokens.js";
import {
  ImportCollection,
  ImportItem,
  ImportSegment,
  ImportStatement,
} from "./ImportStatement.js";
import { ImportElem } from "../AbstractElems.js";
import { importElem } from "../WESLCollect.js";
import { WeslToken } from "./WeslStream.js";
import { assertUnreachable } from "../Assertions.js";

const wordToken = kind(mainTokens.ident);

function segment(text: string) {
  return new ImportSegment(text);
}
function segments(
  ...values: (ImportSegment | ImportSegment[])[]
): ImportSegment[] {
  return values.flat();
}

// forward references for mutual recursion
let import_collection: Parser<
  Stream<WeslToken>,
  ImportCollection
> = null as any;

const import_path_or_item: Parser<Stream<WeslToken>, ImportStatement> = seq(
  wordToken,
  or(
    preceded(
      "::",
      or(
        fn(() => import_collection),
        fn(() => import_path_or_item),
      ),
    ),
    preceded("as", wordToken).map(v => new ImportItem("", v)),
    yes(), // Optional
  ),
).map((v): ImportStatement => {
  const name = v[0];
  const next = v[1];
  if (next === true) {
    // Nothing came after the word token
    return new ImportStatement([], new ImportItem(name));
  } else if (next instanceof ImportCollection) {
    return new ImportStatement([new ImportSegment(name)], next);
  } else if (next instanceof ImportStatement) {
    // more import path
    next.segments.unshift(new ImportSegment(name));
    return next;
  } else if (next instanceof ImportItem) {
    // as branch
    next.name = name;
    return new ImportStatement([], next);
  } else {
    assertUnreachable(next);
  }
});

import_collection = delimited(
  "{",
  withSepPlus(",", () => import_path_or_item).map(v => new ImportCollection(v)),
  "}",
);

const import_relative = or(
  terminated("package", "::").map(v => [segment(v)]),
  repeatPlus(terminated("super", "::").map(segment)),
);

const import_statement = span(
  delimited(
    "import",
    seq(
      opt(import_relative),
      req(or(import_collection, import_path_or_item)),
    ).map(v => {
      if (v[1] instanceof ImportStatement) {
        return new ImportStatement(
          segments(v[0] ?? [], v[1].segments),
          v[1].finalSegment,
        );
      } else {
        return new ImportStatement(v[0] ?? [], v[1]);
      }
    }),
    req(";"),
  ),
).map(
  (v): ImportElem => ({
    kind: "import",
    contents: [],
    imports: v.value,
    start: v.span[0],
    end: v.span[1],
  }),
);

/** parse a WESL style wgsl import statement. */
export const weslImport: Parser<Stream<WeslToken>, ImportElem> = tagScope(
  import_statement.ptag("owo").collect(importElem),
);

if (tracing) {
  const names: Record<string, Parser<Stream<WeslToken>, unknown>> = {
    import_collection,
    import_path_or_item,
    import_relative,
    import_statement,
    weslImport,
  };

  Object.entries(names).forEach(([name, parser]) => {
    parser.setTraceName(name);
  });
}
