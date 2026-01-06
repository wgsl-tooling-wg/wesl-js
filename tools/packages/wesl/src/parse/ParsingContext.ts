import type { AbstractElem } from "../AbstractElems.ts";
import type { WeslParseContext, WeslParseState } from "../ParseWESL.ts";
import {
  type DeclIdent,
  emptyScope,
  type Ident,
  nextIdentId,
  type RefIdent,
  type Scope,
  type SrcModule,
} from "../Scope.ts";
import type { WeslStream } from "./WeslStream.ts";

/** Context for parsers to build AST and manage scopes. */
export class ParsingContext {
  src: string;
  srcModule: SrcModule;
  stream: WeslStream;
  state: WeslParseState;

  constructor(stream: WeslStream, state: WeslParseState) {
    this.stream = stream;
    this.state = state;
    this.srcModule = state.stable.srcModule;
    this.src = this.srcModule.src;
  }

  position(): number {
    return this.stream.checkpoint();
  }

  currentScope(): Scope {
    return this.state.context.scope;
  }

  addElem(elem: AbstractElem): void {
    const { openElems } = this.state.context;
    if (openElems.length > 0) {
      const open = openElems[openElems.length - 1];
      open.contents.push(elem);
    }
  }

  pushScope(kind: Scope["kind"] = "scope"): void {
    const { scope } = this.state.context;
    const newScope = emptyScope(scope, kind);
    scope.contents.push(newScope);
    this.state.context.scope = newScope;
  }

  popScope(): Scope {
    const weslContext = this.state.context as WeslParseContext;
    const completedScope = weslContext.scope;
    if (completedScope.parent) {
      weslContext.scope = completedScope.parent;
    }
    return completedScope;
  }

  isModuleScope(): boolean {
    let scope = this.currentScope();
    while (scope.kind === "partial" && scope.parent) {
      scope = scope.parent;
    }
    return scope.parent === null;
  }

  createRefIdent(name: string): RefIdent {
    return {
      kind: "ref",
      originalName: name,
      ast: this.state.stable,
      id: nextIdentId(),
      refIdentElem: null as any, // linked by caller
    };
  }

  createDeclIdent(name: string, isGlobal = false): DeclIdent {
    return {
      kind: "decl",
      originalName: name,
      containingScope: this.state.context.scope,
      isGlobal,
      id: nextIdentId(),
      srcModule: this.srcModule,
      declElem: null as any, // linked by caller
    };
  }

  saveIdent(ident: Ident): void {
    this.state.context.scope.contents.push(ident);
  }
}
