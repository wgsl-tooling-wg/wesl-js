import {
  delimited,
  kind,
  NoTags,
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
  TagRecord,
  tagScope,
  terminated,
  tracing,
  withSepPlus,
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

const wordToken = kind(mainTokens.ident);

function segment(text: string) {
  return new ImportSegment(text);
}
function segments(
  ...values: (ImportSegment | ImportSegment[])[]
): ImportSegment[] {
  return values.flat();
}

/** last simple segment is allowed to have an 'as' rename */
const item_import = seq(wordToken, opt(preceded("as", wordToken))).map(
  v => new ImportItem(v[0], v[1]),
);

// forward references for mutual recursion
let import_collection: Parser<
  Stream<WeslToken>,
  ImportCollection
> = null as any;

const import_path = seqObj({
  segments: repeatPlus(terminated(wordToken.map(segment), "::")),
  final: or(() => import_collection, item_import),
}).map(v => new ImportStatement(v.segments, v.final));

import_collection = delimited(
  "{",
  withSepPlus(",", () =>
    or(
      import_path,
      item_import.map(v => new ImportStatement([], v)),
    ),
  ).map(v => new ImportCollection(v)),
  "}",
);

const import_relative = seq(
  or("package", "super").map(segment),
  "::",
  repeat(terminated(or("super").map(segment), "::")),
).map(v => segments(v[0], v[2]));

const import_package = terminated(wordToken.map(segment), "::").map(segments);

/** parse a WESL style wgsl import statement. */
export const weslImport: Parser<Stream<WeslToken>, ImportElem> = tagScope(
  span(
    delimited(
      "import",
      req(
        seq(
          or(import_relative, import_package),
          or(import_collection, import_path, item_import),
        ),
      ).map(v => {
        if (v[1] instanceof ImportStatement) {
          return new ImportStatement(
            segments(v[0], v[1].segments),
            v[1].finalSegment,
          );
        } else {
          return new ImportStatement(v[0], v[1]);
        }
      }),
      req(";"),
    ),
  )
    .map(
      (v): ImportElem => ({
        kind: "import",
        contents: [],
        imports: v.value,
        start: v.span[0],
        end: v.span[1],
      }),
    )
    .ptag("owo")
    .collect(importElem),
);

if (tracing) {
  const names: Record<string, Parser<Stream<WeslToken>, unknown>> = {
    item_import,
    import_path,
    import_collection,
    import_relative,
    import_package,
    weslImport,
  };

  Object.entries(names).forEach(([name, parser]) => {
    parser.setTraceName(name);
  });
}
