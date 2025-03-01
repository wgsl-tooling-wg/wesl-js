import { ParserInit } from "mini-parse";
import { ModuleElem } from "./parse/WeslElems.ts";
import { weslRoot } from "./parse/WeslGrammar.ts";
import { WeslStream } from "./parse/WeslStream.ts";

/**
 * result of a parse for one wesl module (e.g. one .wesl file)
 */
export interface WeslAST {
  /** source text for this module */
  srcModule: SrcModule;

  /** root module element */
  moduleElem: ModuleElem;
}

export interface SrcModule {
  /** module path "rand_pkg::sub::foo", or "package::main" */
  modulePath: string;

  /** file path to the module for user error reporting e.g "rand_pkg:sub/foo.wesl", or "./sub/foo.wesl" */
  debugFilePath: string;

  /** original src for module */
  src: string;
}

/** Parse a WESL file. Throws on error. */
export function parseSrcModule(srcModule: SrcModule): WeslAST {
  const stream = new WeslStream(srcModule.src);
  const init: ParserInit = { stream };
  const parseResult = weslRoot.parse(init);
  if (parseResult === null) {
    throw new Error("parseWESL failed");
  }

  return { srcModule, moduleElem: parseResult.value };
}

// TODO: Move to test utils
export function parseWESL(src: string): WeslAST {
  const srcModule: SrcModule = {
    modulePath: "package::test",
    debugFilePath: "./test.wesl",
    src,
  };

  return parseSrcModule(srcModule);
}
