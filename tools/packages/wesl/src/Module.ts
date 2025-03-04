import { assertThat } from "./Assertions.ts";
import { ModuleElem } from "./parse/WeslElems.ts";

export type ModulePathString = string & { __modulePath: never };

/** An absolute path to a module. Is unique. */
export class ModulePath {
  constructor(public path: string[]) {
    assertThat(path.length > 0);
  }

  toString(): ModulePathString {
    let result: string = this.path.join("::");
    return result as ModulePathString;
  }
}

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
  modulePath: ModulePath;

  /** file path to the module for user error reporting e.g "rand_pkg:sub/foo.wesl", or "./sub/foo.wesl" */
  debugFilePath: string;

  /** original src for module */
  src: string;
}
