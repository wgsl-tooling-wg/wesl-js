import {
  ExportElem,
  ImportElem,
  StructElem,
  CallElem,
  FnElem,
  AbstractElem,
} from "./AbstractElems.js";
import { matchingLexer } from "./MatchingLexer.js";
import {
  directiveArgsTokens,
  lineCommentTokens,
  mainTokens,
} from "./MatchWgslD.js";
import {
  ExtendedResult,
  ParserContext,
  ParserStage,
  ParserStageArg,
  any,
  eof,
  fn,
  kind,
  not,
  opt,
  or,
  repeat,
  seq,
  tokens,
} from "./ParserCombinator.js";

/** parser that recognizes key parts of WGSL and also directives like #import */

const m = mainTokens;
const a = directiveArgsTokens;
const l = lineCommentTokens;

const eol = or("\n", eof());

/** ( <a> <,b>* ) */
const wordArgs: ParserStage<string[]> = seq(
  "(",
  withSep(",", kind(a.word)),
  ")"
)
  .map((r) => r.value[1])
  .traceName("wordArgs");

const wordNum = or(kind(a.word), kind(a.digits));

export const wordNumArgs: ParserStage<string[]> = seq("(", withSep(",", wordNum), ")")
  .map((r) => r.value[1])
  .traceName("wordNumArgs");

const comment = opt(fn(() => lineComment)); // LATER block comments too

/** match an optional series of elements separated by a delimiter (e.g. a comma) */
function withSep<T>(
  sep: ParserStageArg<any>,
  p: ParserStage<T>
): ParserStage<T[]> {
  // TODO add optional comments
  return seq(p.named("elem"), repeat(seq(sep, p.named("elem"))))
    .map((r) => r.named.elem as T[])
    .traceName("withSep");
}

/** foo <(A,B)> <as boo> <from bar>  EOL */
const importPhrase = seq(
  kind(a.word).named("name"),
  opt(wordArgs.named("args")),
  opt(seq("as", kind(a.word).named("as"))),
  opt(seq("from", kind(a.word).named("from")))
)
  .map((r) => {
    // flatten 'args' by putting it with the other extracted names
    const named: (keyof ImportElem)[] = ["name", "from", "as", "args"];
    return makeElem<ImportElem>("import", r, named, []);
  })
  .traceName("importElem");

export const importing = seq(
  "importing",
  seq(importPhrase.named("importing")),
  repeat(seq(",", importPhrase.named("importing")))
).traceName("importing");

/** #import foo <(a,b)> <as boo> <from bar>  EOL */
const importDirective = seq(
  "#import",
  tokens(directiveArgsTokens, seq(importPhrase.named("i"), eol))
)
  .map((r) => {
    const imp: ImportElem = r.named.i[0];
    imp.start = r.start; // use start of #import, not import phrase
    r.app.push(imp);
  })
  .traceName("import");

/** #export <foo> <(a,b)> <importing bar(a) <zap(b)>* > EOL */
// prettier-ignore
const exportDirective = seq(
  "#export",
  tokens(
    directiveArgsTokens,
    seq(
      opt(kind(a.word).named("name")), 
      opt(wordArgs.named("args")), 
      opt(importing), 
      eol
    )
  )
)
  .map((r) => {
    // flatten 'args' by putting it with the other extracted names
    const e = makeElem<ExportElem>("export", r, ["name", "args"], ["importing"]);
    r.app.push(e);
  })
  .traceName("export");

const ifDirective: ParserStage<any> = seq(
  "#if",
  tokens(
    directiveArgsTokens,
    seq(opt("!").named("invert"), kind(m.word).named("name"), eol)
  ).toParser((r) => {
    const { params } = r.appState as ParseState;
    const ifArg = r.named["name"]?.[0] as string;
    const invert = r.named["invert"]?.[0] === "!";
    const arg = !!params[ifArg];
    const truthy = invert ? !arg : arg;
    return ifBody(r, truthy);
  })
).traceName("#if");

const elseDirective = seq("#else", tokens(directiveArgsTokens, eol))
  .toParser((r) => {
    const { ifStack } = r.appState as ParseState;
    const ifState = ifStack.pop();
    if (ifState === undefined) console.warn("unmatched #else", r.start);
    return ifBody(r, !ifState);
  })
  .traceName("#else");

function ifBody(
  r: ExtendedResult<any>,
  truthy: boolean
): ParserStage<any> | undefined {
  const { ifStack } = r.appState as ParseState;
  ifStack.push(truthy);
  if (!truthy) return skipUntilElseEndif;
}

const endifDirective = seq("#endif", tokens(directiveArgsTokens, eol))
  .map((r) => {
    const { ifStack } = r.appState as ParseState;
    const ifState = ifStack.pop();
    if (ifState === undefined) console.warn("unmatched #endif", r.start);
  })
  .traceName("#endif");

export const directive = or(
  exportDirective,
  importDirective,
  ifDirective,
  elseDirective,
  endifDirective
).traceName("directive or");

/** // <#import|#export|any> */
export const lineComment = seq(
  "//",
  tokens(lineCommentTokens, or(directive, kind(l.notDirective)))
).traceName("lineComment");

// prettier-ignore
const skipUntilElseEndif = repeat(
  seq(
    or(
      lineComment, 
      seq(
        not("#else"), 
        not("#endif"),
        any()
      ), 
    )
  )
).traceName("skipTo #else/#endif");

const structDecl = seq(
  "struct",
  kind(m.word),
  "{",
  repeat(or(lineComment, seq(not("}"), any()))),
  "}"
).map((r) => {
  const e = makeElem<StructElem>("struct", r, ["name"]);
  r.app.push(e);
});

export const fnCall = seq(
  kind(m.word)
    .named("call")
    .map((r) => makeElem<CallElem>("call", r, ["call"]))
    .named("calls"), // we collect this in fnDecl, to attach to FnElem
  "("
);

const attribute = seq(kind(m.attr), opt(wordNumArgs));

const block: ParserStage<any> = seq(
  "{",
  repeat(
    or(
      lineComment,
      fnCall,
      fn(() => block),
      seq(not("}"), any())
    )
  ),
  "}"
).traceName("block");

export const fnDecl = seq(
  repeat(attribute),
  "fn",
  kind(a.word).named("name"),
  "(",
  repeat(or(lineComment, seq(not("{"), any()))),
  block
)
  .traceName("fnDecl")
  .map((r) => {
    const fn = makeElem<FnElem>("fn", r, ["name"]);
    fn.children = r.named.calls || [];
    r.app.push(fn);
  });

const unknown = any().map((r) => console.warn("???", r.value, r.start));

const rootDecl = or(fnDecl, directive, structDecl, lineComment, unknown);

const root = seq(repeat(rootDecl), eof());

interface ParseState {
  ifStack: boolean[];
  params: Record<string, any>;
}

export function parseWgslD(
  src: string,
  params: Record<string, any> = {}
): AbstractElem[] {
  const lexer = matchingLexer(src, mainTokens);
  const app: AbstractElem[] = [];

  const appState: ParseState = { ifStack: [], params };
  const context: ParserContext = { lexer, app, appState: appState };

  root(context);

  return context.app;
}

/** creat an AbstractElem by pulling fields from named parse results */
function makeElem<U extends AbstractElem>(
  kind: U["kind"],
  er: ExtendedResult<any>,
  named: (keyof U)[],
  namedArrays: (keyof U)[] = []
): U {
  const { start, end } = er;
  const nv = mapIfDefined(named, er.named as NameRecord<U>, true);
  const av = mapIfDefined(namedArrays, er.named as NameRecord<U>);
  return { kind, start, end, ...nv, ...av } as U;
}

type NameRecord<A> = Record<keyof A, string[]>;

function mapIfDefined<A>(
  keys: (keyof A)[],
  array: Record<keyof A, string[]>,
  firstElem?: boolean
): Partial<Record<keyof A, string>> {
  const entries = keys.flatMap((k) => {
    const ak = array[k];
    const v = firstElem ? ak?.[0] : ak;

    if (v === undefined) return [];
    else return [[k, v]];
  });
  return Object.fromEntries(entries);
}
