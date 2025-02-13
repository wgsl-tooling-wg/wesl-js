import { ParserInit } from "mini-parse";
import { blankWeslParseState } from "../ParseWESL.ts";
import { SrcModule } from "../Scope.ts";
import { weslImports } from "./ImportGrammar.ts";
import { WeslStream } from "./WeslStream.ts";

/** Parse a wesl src string to find the names of referenced libraries.
 * 
 * Works by parsing the import statements at the top of the src to find
 * import statements that import from library packages.
 */
export function packageReferences(src: string): string[] {
  // create fake boilerplate to setup parsing
  const srcModule: SrcModule = {
    modulePath: "package::packageImports",
    filePath: "./synthetic.wesl",
    src: src,
  };
  const appState = blankWeslParseState(srcModule);
  const stream = new WeslStream(src);
  const init: ParserInit = { stream, appState };

  // parse for import statements only at the top of the file
  weslImports.parse(init);

  // filter for any import statement references to libraries
  const imports = appState.stable.imports;
  const importStarts = imports.map(imp => imp.segments[0].name); // first segment of import path
  const packages = importStarts.filter(
    name => name !== "super" && name !== "package",
  );

  return packages;
}
