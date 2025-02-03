import {
  delimited2,
  fn2,
  makeTokenMatchers2,
  opt2,
  or2,
  orFail2,
  parser,
  Parser,
  Parser2,
  ParserContext,
  preceded2,
  repeat2,
  repeatPlus2,
  seq2,
  setTraceName,
  Stream,
  tagScope,
  terminated2,
  tracing,
  tryOr2,
  yes2,
} from "mini-parse";
import {
  ImportCollection,
  ImportItem,
  ImportSegment,
  ImportStatement,
} from "./parse/ImportTree.js";
import { ImportElem } from "./AbstractElems.js";
import { importElem } from "./WESLCollect.js";
import { WeslToken, WeslTokenKind } from "./parse/WeslStream.js";
import { assertUnreachable } from "../../mini-parse/src/assert.js";

function wrapParser2<O>(p: Parser2<Stream<WeslToken>, O, true>): Parser<O> {
  return parser(
    "wrapParser2",
    (ctx: ParserContext) => {
      const input: Stream<WeslToken> = ctx.lexer.stream as any;
      const result = p.parseNext(input);
      return result;
    },
    true,
  );
}
const { token, tryToken, eof, tryEof } = makeTokenMatchers2<
  Stream<WeslToken>,
  WeslTokenKind,
  string
>();

const wordToken = token("word");
const tryWordToken = tryToken("word");
const keyword = (value: string) => token("keyword", value);
const tryKeyword = (value: string) => tryToken("keyword", value);
const symbol = (value: string) => token("symbol", value);
const trySymbol = (value: string) => tryToken("symbol", value);

function segment(token: WeslToken) {
  return new ImportSegment(token.value);
}
function segments(
  ...values: (ImportSegment | ImportSegment[])[]
): ImportSegment[] {
  return values.flat();
}

const import_path_or_item: Parser2<
  Stream<WeslToken>,
  ImportStatement,
  false
> = seq2(
  wordToken,
  or2(
    preceded2(
      trySymbol("::"),
      or2(
        fn2(() => import_collection, true),
        orFail2(fn2(() => import_path_or_item, false)),
      ),
    ),
    preceded2(tryKeyword("as"), wordToken).map(
      v => new ImportItem("", v.value),
    ),
    orFail2(yes2()),
  ),
).map((v): ImportStatement => {
  const name = v[0].value;
  const next = v[1];
  if (next === null) {
    // fail branch
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

const import_collection: Parser2<
  Stream<WeslToken>,
  ImportCollection,
  true
> = delimited2(
  trySymbol("{"),
  seq2(
    import_path_or_item,
    repeat2(preceded2(trySymbol(","), import_path_or_item)),
    opt2(trySymbol(",")),
  ).map(v => new ImportCollection([v[0]].concat(v[1]))),
  symbol("}"),
);

const import_relative = seq2(
  tryOr2(tryKeyword("package"), tryKeyword("super")).map(segment),
  symbol("::"),
  repeat2(terminated2(tryKeyword("super").map(segment), symbol("::"))),
).map(v => segments(v[0], v[2]));

const import_package = terminated2(wordToken.map(segment), symbol("::")).map(
  segments,
);

/** parse a WESL style wgsl import statement. */
export const weslImport: Parser<ImportElem> = tagScope(
  wrapParser2(
    delimited2(
      tryKeyword("import"),
      seq2(
        or2(import_relative, orFail2(import_package)),
        or2(import_collection, orFail2(import_path_or_item)),
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
      symbol(";"),
    ).map(
      (v): ImportElem => ({
        kind: "import",
        contents: [],
        imports: v,
        start: 0, // TODO: Put actual values here
        end: 0,
      }),
    ),
  )
    .ptag("owo")
    .collect(importElem),
);

if (tracing) {
  const names: Record<string, Parser<unknown>> = {
    weslImport,
  };

  Object.entries(names).forEach(([name, parser]) => {
    setTraceName(parser, name);
  });
}
