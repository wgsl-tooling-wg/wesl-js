import { matchingLexer } from "../MatchingLexer.js";
import { kind, seq } from "../ParserCombinator.js";
import { RegexMatchers } from "../stream/MatchersStream.js";
import { matchOneOf } from "../stream/RegexHelpers.js";

const src = "fn foo()";

// lexer
const tokens = new RegexMatchers({
  ident: /[a-z]+/,
  ws: /\s+/,
  symbol: matchOneOf("( ) [ ] { } ; ,"),
});
const lexer = matchingLexer(src, tokens);

// parsers
const ident = kind("ident");
const fnDecl = seq("fn", ident, "(", ")");

// parsing and extracing result
const result = fnDecl.parse({ lexer });
if (result) {
  const foundIdent = result.value[1];
  console.log(`found fn name: ${foundIdent}`);
}
