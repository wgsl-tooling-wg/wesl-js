import { kind, seq } from "../ParserCombinator.ts";
import { FilterStream } from "../stream/FilterStream.ts";
import { MatchersStream, RegexMatchers } from "../stream/MatchersStream.ts";
import { matchOneOf } from "../stream/RegexHelpers.ts";

const src = "fn foo()";

const tokens = new RegexMatchers({
  ident: /[a-z]+/,
  ws: /\s+/,
  symbol: matchOneOf("( ) [ ] { } ; ,"),
});
const stream = new FilterStream(
  new MatchersStream(src, tokens),
  t => t.kind !== "ws",
);

// parsers
const ident = kind("ident");
const fnDecl = seq("fn", ident, "(", ")");

// parsing and extracing result
const result = fnDecl.parse({ stream });
if (result) {
  const foundIdent = result.value[1];
  console.log(`found fn name: ${foundIdent}`);
}
