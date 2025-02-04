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
const item_import = seq(wordToken, opt(preceded("as", wordToken))).mapValue(
  v => new ImportItem(v[0], v[1]),
);

// forward references for mutual recursion
let import_collection: Parser<ImportCollection> = null as any;

const import_path = seqObj({
  segments: repeatPlus(terminated(wordToken.mapValue(segment), "::")),
  final: or(() => import_collection, item_import),
}).mapValue(v => new ImportStatement(v.segments, v.final));

import_collection = delimited(
  "{",
  withSepPlus(",", () =>
    or(
      import_path,
      item_import.mapValue(v => new ImportStatement([], v)),
    ),
  ).mapValue(v => new ImportCollection(v)),
  "}",
);

const import_relative = seq(
  or("package", "super").mapValue(segment),
  "::",
  repeat(terminated(or("super").mapValue(segment), "::")),
).mapValue(v => segments(v[0], v[2]));

const import_package = terminated(wordToken.mapValue(segment), "::").mapValue(
  segments,
);

/** parse a WESL style wgsl import statement. */
export const weslImport: Parser<ImportElem> = tagScope(
  delimited(
    "import",
    req(
      seq(
        or(import_relative, import_package),
        or(import_collection, import_path, item_import),
      ),
    ).mapValue(v => {
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
  )
    .map(
      (v): ImportElem => ({
        kind: "import",
        contents: [],
        imports: v.value,
        start: v.start,
        end: v.end,
      }),
    )
    .ptag("owo")
    .collect(importElem),
);

if (tracing) {
  const names: Record<string, Parser<unknown>> = {
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
