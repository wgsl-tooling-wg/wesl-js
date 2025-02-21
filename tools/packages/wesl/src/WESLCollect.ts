import { CollectContext, CollectPair, srcLog, tracing } from "mini-parse";
import {
  AbstractElem,
  AliasElem,
  Attribute,
  AttributeElem,
  ConstElem,
  ContainerElem,
  DeclarationElem,
  DeclIdentElem,
  FnElem,
  FnParamElem,
  GlobalVarElem,
  GrammarElem,
  LetElem,
  ModuleElem,
  NameElem,
  OverrideElem,
  RefIdentElem,
  SimpleMemberRef,
  StructElem,
  StructMemberElem,
  StuffElem,
  TextElem,
  TypedDeclElem,
  TypeRefElem,
  UnknownExpressionElem,
  VarElem,
} from "./AbstractElems.ts";
import {
  StableState,
  WeslAST,
  WeslParseContext,
  WeslParseState,
} from "./ParseWESL.ts";
import { DeclIdent, emptyScope, RefIdent, Scope } from "./Scope.ts";
import { ImportElem } from "./parse/ImportElems.ts";
import { DirectiveElem } from "./parse/DirectiveElem.ts";

/** add an elem to the .contents array of the currently containing element */
function addToOpenElem(cc: CollectContext, elem: AbstractElem): void {
  const weslContext: WeslParseContext = cc.app.context;
  const { openElems } = weslContext;
  if (openElems && openElems.length) {
    const open = openElems[openElems.length - 1];
    open.contents.push(elem);
  }
}

/** create reference Ident and add to context */
export function refIdent(cc: CollectContext): RefIdentElem {
  const { src, start, end } = cc;
  const app = cc.app as WeslParseState;
  const { scope } = app.context;
  const { srcModule } = app.stable;
  const originalName = src.slice(start, end);

  const kind = "ref";
  const ident: RefIdent = {
    kind,
    originalName,
    ast: cc.app.stable,
    scope,
    id: identId++,
    refIdentElem: null as any, // set below
  };
  const identElem: RefIdentElem = {
    kind,
    span: [start, end],
    srcModule,
    ident,
  };
  ident.refIdentElem = identElem;

  saveIdent(cc, identElem);
  addToOpenElem(cc, identElem);
  return identElem;
}

/** create declaration Ident and add to context */
export function declCollect(cc: CollectContext): DeclIdentElem {
  const { src, start, end } = cc;
  const app = cc.app as WeslParseState;
  const { scope } = app.context;
  const { srcModule } = app.stable;
  const originalName = src.slice(start, end);

  const kind = "decl";
  const declElem = null as any; // we'll set declElem later
  const ident: DeclIdent = {
    declElem,
    kind,
    originalName,
    scope,
    id: identId++,
    srcModule,
  };
  const identElem: DeclIdentElem = {
    kind,
    span: [start, end],
    srcModule,
    ident,
  };

  saveIdent(cc, identElem);
  addToOpenElem(cc, identElem);
  return identElem;
}

export const typedDecl = collectElem(
  "typeDecl",
  (cc: CollectContext, openElem: PartElem<TypedDeclElem>) => {
    const decl = cc.tags.decl_elem?.[0] as DeclIdentElem;
    const typeRef = cc.tags.typeRefElem?.[0] as TypeRefElem | undefined;
    const partial: TypedDeclElem = { ...openElem, decl, typeRef };
    const elem = withTextCover(partial, cc);
    //    elemToString(elem); //?

    return elem;
  },
);

let identId = 0;
/** add Ident to current open scope, add IdentElem to current open element */
function saveIdent(
  cc: CollectContext,
  identElem: RefIdentElem | DeclIdentElem,
) {
  const { ident } = identElem;
  ident.id = identId++;
  const weslContext: WeslParseContext = cc.app.context;
  weslContext.scope.idents.push(ident);
}

/** start a new child Scope */
function startScope(cc: CollectContext) {
  const { scope } = cc.app.context as WeslParseContext;
  const newScope = emptyScope(scope);
  scope.children.push(newScope);
  cc.app.context.scope = newScope;
  // srcLog(cc.src, cc.start, "startScope", newScope.id);
}

/* close current Scope and set current scope to parent */
function completeScope(cc: CollectContext): Scope {
  const weslContext = cc.app.context as WeslParseContext;
  const completedScope = weslContext.scope;
  // srcLog(cc.src, cc.start, "completeScope", completedScope.id);
  // console.log(scopeIdentTree(completedScope));
  const { parent } = completedScope;
  if (parent) {
    weslContext.scope = parent;
  } else if (tracing) {
    const { idents } = completedScope;
    console.log("ERR: completeScope, no parent scope", { idents });
  }
  return completedScope;
}

// prettier-ignore
export type OpenElem<T extends ContainerElem = ContainerElem> = 
  Pick< T, "kind" | "contents">;

// prettier-ignore
export type PartElem<T extends ContainerElem = ContainerElem > = 
  Pick< T, "kind" | "span" | "contents"> ;

// prettier-ignore
type VarLikeElem =
  | GlobalVarElem
  | VarElem
  | LetElem
  | ConstElem
  | OverrideElem;

export function collectVarLike<E extends VarLikeElem>(
  kind: E["kind"],
): CollectPair<E> {
  return collectElem(kind, (cc: CollectContext, openElem: PartElem<E>) => {
    const name = cc.tags.var_name?.[0] as TypedDeclElem;
    const decl_scope = cc.tags.decl_scope?.[0] as Scope;
    const partElem = { ...openElem, name } as E;
    const varElem = withTextCover(partElem, cc);
    (name.decl.ident as DeclIdent).declElem = varElem as DeclarationElem;
    name.decl.ident.scope = decl_scope;
    return varElem;
  });
}

export const aliasCollect = collectElem(
  "alias",
  (cc: CollectContext, openElem: PartElem<AliasElem>) => {
    const name = cc.tags.alias_name?.[0] as DeclIdentElem;
    const alias_scope = cc.tags.alias_scope?.[0] as Scope;
    const typeRef = cc.tags.typeRefElem?.[0] as TypeRefElem;
    const attributes: AttributeElem[] = cc.tags.attributes?.flat() ?? [];
    const partElem: AliasElem = { ...openElem, name, attributes, typeRef };
    const aliasElem = withTextCover(partElem, cc);
    name.ident.scope = alias_scope;
    name.ident.declElem = aliasElem;
    return aliasElem;
  },
);

export const collectFn = collectElem(
  "fn",
  (cc: CollectContext, openElem: PartElem<FnElem>) => {
    const name = cc.tags.fn_name?.[0] as DeclIdentElem;
    const body_scope = cc.tags.body_scope?.[0] as Scope;
    const params: FnParamElem[] = cc.tags.fnParam?.flat(3) ?? [];
    const attributes: AttributeElem[] | undefined =
      cc.tags.fn_attributes?.flat();
    const returnType: TypeRefElem | undefined = cc.tags.returnType?.flat(3)[0];
    const partElem: FnElem = {
      ...openElem,
      name,
      attributes,
      params,
      returnType,
      body: [],
    };
    const fnElem = withTextCover(partElem, cc);
    (name.ident as DeclIdent).declElem = fnElem;
    name.ident.scope = body_scope;

    return fnElem;
  },
);

export const collectFnParam = collectElem(
  "param",
  (cc: CollectContext, openElem: PartElem<FnParamElem>) => {
    const name = cc.tags.param_name?.[0]! as TypedDeclElem;
    const attributes: AttributeElem[] = cc.tags.attributes?.flat() ?? [];
    const elem: FnParamElem = { ...openElem, name, attributes };
    const paramElem = withTextCover(elem, cc);
    name.decl.ident.declElem = paramElem; // TODO is this right?

    return paramElem;
  },
);

export const collectStruct = collectElem(
  "struct",
  (cc: CollectContext, openElem: PartElem<StructElem>) => {
    // dlog({ attributes: cc.tags.attributes?.flat(8).map(e => e && elemToString(e)) });
    const name = cc.tags.type_name?.[0] as DeclIdentElem;
    const members = cc.tags.members as StructMemberElem[];
    const attributes: AttributeElem[] = cc.tags.attributes?.flat() ?? [];
    name.ident.scope = cc.tags.struct_scope?.[0] as Scope;
    const structElem = { ...openElem, name, attributes, members };
    const elem = withTextCover(structElem, cc);
    (name.ident as DeclIdent).declElem = elem as DeclarationElem;

    return elem;
  },
);

export const collectStructMember = collectElem(
  "member",
  (cc: CollectContext, openElem: PartElem<StructMemberElem>) => {
    // dlog("structMember", { tags: [...Object.keys(cc.tags)] });
    const name = cc.tags.nameElem?.[0]!;
    const typeRef = cc.tags.typeRefElem?.[0];
    const attributes = cc.tags.attribute?.flat(3) as AttributeElem[];
    const partElem = { ...openElem, name, attributes, typeRef };
    return withTextCover(partElem, cc);
  },
);

export const collectAttribute = collectElem(
  "attribute",
  (cc: CollectContext, openElem: PartElem<AttributeElem>) => {
    const attribute = cc.tags.attribute?.[0] as Attribute | undefined;
    if (attribute !== undefined) {
      const partElem: AttributeElem = {
        ...openElem,
        attribute,
      };
      return partElem;
    } else {
      const params = (cc.tags.attrParam ?? []) as UnknownExpressionElem[];
      const name = cc.tags.name?.[0]! as string;
      const partElem: AttributeElem = {
        ...openElem,
        attribute: {
          kind: "attribute",
          name,
          params,
        },
      };
      return partElem;
    }
  },
);

export const typeRefCollect = collectElem(
  "type",
  // @ts-ignore
  (cc: CollectContext, openElem: PartElem<TypeRefElem>) => {
    let templateParamsTemp: any[] | undefined = cc.tags.templateParam?.flat(3);

    const typeRef = cc.tags.typeRefName?.[0] as string | RefIdentElem;
    const name = typeof typeRef === "string" ? typeRef : typeRef.ident;
    const partElem = {
      ...openElem,
      name,
      templateParams: templateParamsTemp as any[],
    };
    // dlog("typeRefCollect", { tags: [...Object.keys(cc.tags)] });
    // collectLog(cc, "typeRefCollect", elemToString(partElem));
    // dlog({ typeRefCollect: elemToString(partElem) });
    // @ts-ignore
    return withTextCover(partElem, cc);
  },
);

// TODO: This creates useless unknown-expression elements
export const expressionCollect = collectElem(
  "expression",
  (cc: CollectContext, openElem: PartElem<UnknownExpressionElem>) => {
    const partElem = { ...openElem };
    return withTextCover(partElem, cc);
  },
);

export const stuffCollect = collectElem(
  "stuff",
  (cc: CollectContext, openElem: PartElem<StuffElem>) => {
    const partElem = { ...openElem };
    return withTextCover(partElem, cc);
  },
);

export const memberRefCollect = collectElem(
  "memberRef",
  (cc: CollectContext, openElem: PartElem<SimpleMemberRef>) => {
    const { component, structRef, extra_components } = cc.tags;
    const member = component![0] as NameElem;
    const name = structRef?.flat()[0] as RefIdentElem;
    const extraComponents = extra_components?.flat()[0] as StuffElem;

    const partElem: SimpleMemberRef = {
      ...openElem,
      name,
      member,
      extraComponents,
    };
    return withTextCover(partElem, cc) as any;
  },
);

export function nameCollect(cc: CollectContext): NameElem {
  const { start, end, src, app } = cc;
  const name = src.slice(start, end);
  const elem: NameElem = { kind: "name", span: [start, end], name };
  addToOpenElem(cc, elem);
  return elem;
}

export const collectModule = collectElem(
  "module",
  (cc: CollectContext, openElem: PartElem<ModuleElem>) => {
    const imports = cc.tags.import ?? ([] as ImportElem[]);
    const directives = cc.tags.directive ?? ([] as DirectiveElem[]);
    const ccComplete = { ...cc, start: 0, end: cc.src.length }; // force module to cover entire source despite ws skipping
    openElem.contents.unshift(...[...imports, ...directives]); // TODO: Remove this hack to get withTextCover to not cover the imports & directives
    const moduleElem: ModuleElem = withTextCover(
      {
        ...openElem,
        imports,
        directives,
        declarations: [], // TODO: Fill in the declarations
      },
      ccComplete,
    );
    moduleElem.contents = moduleElem.contents.filter(
      v => (v.kind as any) !== "import" && (v.kind as any) !== "directive",
    ); // TODO: Remove this hack to get withTextCover to not cover the imports & directives

    const weslState: StableState = cc.app.stable;
    weslState.moduleElem = moduleElem;
    return moduleElem;
  },
);

/** collect a scope start starts before and ends after a parser */
export function scopeCollect(): CollectPair<Scope> {
  return {
    before: startScope,
    after: completeScope,
  };
}

export function collectSimpleElem<V extends AbstractElem & ContainerElem>(
  kind: V["kind"],
): CollectPair<V> {
  return collectElem(kind, (cc, part) => withTextCover(part as V, cc) as V);
}

/** utility to collect an ElemWithContents
 * starts the new element as the collection point corresponding
 * to the start of the attached grammar and completes
 * the element in the at the end of the grammar.
 *
 * In between the start and the end, the new element is available
 * as an 'open' element in the collection context. While this element
 * is 'open', other collected are added to the 'contents' field of this
 * open element.
 */
function collectElem<V extends ContainerElem>(
  kind: V["kind"],
  fn: (cc: CollectContext, partialElem: PartElem<V>) => V,
): CollectPair<V> {
  return {
    before: (cc: CollectContext) => {
      const partialElem = { kind, contents: [] };
      const weslContext: WeslParseContext = cc.app.context;
      weslContext.openElems.push(partialElem);
    },
    after: (cc: CollectContext) => {
      // TODO refine start?
      const weslContext: WeslParseContext = cc.app.context;
      const partialElem = weslContext.openElems.pop()!;
      console.assert(partialElem && partialElem.kind === kind);
      const elem = fn(cc, { ...partialElem, span: [cc.start, cc.end] });
      if (elem) addToOpenElem(cc, elem as AbstractElem);
      return elem;
    },
  };
}

/**
 * @return a copy of the element with contents extended
 * to include TextElems to cover the entire range.
 */
function withTextCover<T extends ContainerElem>(
  elem: T,
  cc: CollectContext,
): T {
  const contents = coverWithText(cc, elem);
  return { ...elem, contents };
}

/** cover the entire source range with Elems by creating TextElems to
 * cover any parts of the source that are not covered by other elems
 * @returns the existing elems combined with any new TextElems, in src order */
function coverWithText(cc: CollectContext, elem: ContainerElem): GrammarElem[] {
  let { start: pos } = cc;
  const ast: WeslAST = cc.app.stable;
  const {
    contents,
    span: [_start, end],
  } = elem;
  const sorted = (contents as GrammarElem[]).sort(
    (a, b) => a.span[0] - b.span[0],
  );

  const elems: GrammarElem[] = [];
  for (const elem of sorted) {
    if (pos < elem.span[0]) {
      elems.push(makeTextElem(elem.span[0]));
    }
    elems.push(elem);
    pos = elem.span[1];
  }
  if (pos < end) {
    elems.push(makeTextElem(end));
  }

  return elems;

  function makeTextElem(end: number): TextElem {
    return {
      kind: "text",
      text: ast.srcModule.src.slice(pos, end),
      span: [pos, end],
    };
  }
}

function collectLog(cc: CollectContext, ...messages: any[]): void {
  const { src, start, end } = cc;
  srcLog(src, [start, end], ...messages);
}
