import {
  anyThrough,
  kind,
  opt,
  or,
  repeat,
  req,
  seq,
  setTraceNames,
  tokens,
  tracing,
} from "mini-parse";
import { gleamImport } from "./GleamImport.js";
import {
  argsTokens,
  lineCommentTokens,
  mainTokens,
  moduleTokens,
} from "./MatchWgslD.js";
import { eolf, makeElem } from "./ParseSupport.js";

/* parse #directive enhancements to wgsl: #export, etc. */

const argsWord = kind(argsTokens.arg);
const fromWord = or(argsWord, kind(argsTokens.relPath));

const fromClause = seq(
  "from",
  or(fromWord.tag("from"), seq('"', fromWord.tag("from"), '"')),
);

/** #export <foo> <(a,b)> EOL */
export const exportDirective = seq(or("#export", "export"), opt(eolf)).map(
  r => {
    const e = makeElem("export", r, ["args"]);
    r.app.state.push(e);
  },
);

const moduleDirective = seq(
  or("module", "#module"),
  tokens(moduleTokens, req(kind(moduleTokens.moduleName).tag("name"))),
  eolf,
).map(r => {
  const e = makeElem("module", r);
  e.name = normalizeModulePath(r.tags.name[0]);
  r.app.state.push(e);
});

function normalizeModulePath(name: string): string {
  if (name.includes("::")) {
    const result = name.split("::").join("/");
    return result;
  }
  return name;
}

export const directive = tokens(
  argsTokens,
  seq(repeat("\n"), or(exportDirective, moduleDirective)),
);

const skipToEol = tokens(lineCommentTokens, anyThrough(eolf));

/** parse a line comment */
export const lineComment = seq(tokens(mainTokens, "//"), skipToEol);

if (tracing) {
  setTraceNames({
    fromClause,
    exportDirective,
    skipToEol,
    lineComment,
    moduleDirective,
    directive,
  });
}
