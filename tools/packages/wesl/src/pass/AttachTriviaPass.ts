import { WeslAST } from "../Module.ts";
import { WeslStream } from "../parse/WeslStream.ts";

/**
 * Does a pass over the AST and attaches trivia tokens to it.
 * Expects the AST to still be properly sorted.
 */
function attachTrivia(module: WeslAST) {
  const stream = new WeslStream(module.srcModule.src);
  // stream.nextTriviaToken();
}
