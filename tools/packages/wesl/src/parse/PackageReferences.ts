import { ParserInit, repeat } from "mini-parse";
import { import_statement } from "./ImportGrammar.ts";
import { WeslStream } from "./WeslStream.ts";
import { ImportElem } from "./ImportElems.ts";

/** Parse a wesl src string to find the names of referenced libraries.
 *
 * Works by parsing the import statements at the top of the src to find
 * import statements that import from library packages.
 */
export function packageReferences(src: string): string[] {
  const stream = new WeslStream(src);
  const init: ParserInit = { stream };

  // parse for import statements only at the top of the file
  let imports: ImportElem[] = (
    repeat(import_statement).parse(init) ?? { value: [] }
  ).value;

  // filter for any import statement references to libraries
  const importStarts = imports.map(imp => imp.imports.segments[0].name); // first segment of import path
  const packages = importStarts.filter(
    name => name !== "super" && name !== "package",
  );

  return packages;
}
