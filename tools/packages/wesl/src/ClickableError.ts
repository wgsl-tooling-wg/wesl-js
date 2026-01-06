import type { DeclIdentElem, RefIdent, RefIdentElem } from "wesl";
import { srcLog, tracing } from "./Logging.ts";
import { offsetToLineNumber } from "./Util.ts";
import { encodeVlq } from "./vlq/vlq.ts";

export interface ClickableErrorParams {
  /** url of the source file (e.g. `shaders/app.wesl`) */
  url: string;

  /** source text of the shader */
  text: string | null;

  /** line number in the source text (1 indexed) */
  lineNumber: number;

  /** line number in the source text (1 indexed) */
  lineColumn: number;

  /** number of characters in the error section */
  length: number;

  /** the original error */
  error: Error;
}

/** Throw an error with an embedded source map so that browser users can
 *  click on the error in the browser debug console and see the wesl source code.  */
export function throwClickableError(params: ClickableErrorParams): void {
  const { url, text, lineNumber, lineColumn, length, error } = params;

  // Based on https://stackoverflow.com/questions/65274147/sourceurl-for-css

  // We remap an error directly to where we need it to be
  // The fields are
  // 1. Generated column (aka 0)
  // 2. Index into sources list (aka 0)
  // 3. Original line number (zero based)
  // 4. Original column number (zero based)

  // So we need 2 mappings. One to map to the correct spot,
  // and another one to be the "length" (terminate the first mapping)
  const mappings =
    encodeVlq([
      0,
      0,
      Math.max(0, lineNumber - 1),
      Math.max(0, lineColumn - 1),
    ]) +
    "," +
    // Sadly no browser makes use of this info to map the error properly
    encodeVlq([
      18, // Arbitrary number that is high enough
      0,
      Math.max(0, lineNumber - 1),
      Math.max(0, lineColumn - 1) + length,
    ]);

  // And this is what our source map looks like
  const sourceMap = {
    version: 3,
    file: null,
    sources: [url],
    sourcesContent: [text ?? null],
    names: [],
    mappings,
  };

  let generatedCode = `throw new Error(${JSON.stringify(error.message + "")})`;
  // And redirect it to WESL
  generatedCode +=
    "\n//# sourceMappingURL=data:application/json;base64," +
    btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
  generatedCode += "\n//# sourceURL=" + sourceMap.sources[0];

  let oldLimit = 0;
  // Supported on Chrome https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stackTraceLimit
  if ("stackTraceLimit" in Error) {
    oldLimit = Error.stackTraceLimit as number;
    Error.stackTraceLimit = 1;
  }

  // Run the error-throwing file
  try {
    (0, eval)(generatedCode); // run eval() in global scope
  } catch (e: any) {
    if ("stackTraceLimit" in Error) {
      Error.stackTraceLimit = oldLimit;
    }
    error.message = "";
    if (tracing) e.cause = error; // users don't want to see this, but WESL developers might
    throw e;
  }
}

/** Warn the user about an identifier and throw a clickable exception */
export function failIdent(ident: RefIdent, msg?: string): void {
  const { refIdentElem, originalName } = ident;
  const baseMessage = msg ?? `'${originalName}'`;

  if (refIdentElem) {
    failIdentElem(refIdentElem, baseMessage);
  } else {
    throw new Error(baseMessage);
  }
}

/** Warn the user about an identifier and throw a clickable exception */
export function failIdentElem(
  identElem: DeclIdentElem | RefIdentElem,
  msg = "",
): void {
  const { srcModule, start, end } = identElem;
  const { debugFilePath, src } = srcModule;
  const detailedMessage = `${msg} in file: ${debugFilePath}`;
  srcLog(src, [start, end], detailedMessage);

  const [lineNumber, lineColumn] = offsetToLineNumber(start, src);
  const length = end - start;

  throwClickableError({
    url: debugFilePath,
    text: src,
    lineNumber,
    lineColumn,
    length,
    error: new Error(detailedMessage),
  });
}
