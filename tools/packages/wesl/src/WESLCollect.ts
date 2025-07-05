import { dlog } from "berry-pretty";
import {
  type CollectContext,
  type CollectPair,
  srcLog,
  tracing,
} from "mini-parse";
import type {
  AbstractElem,
  AliasElem,
  Attribute,
  AttributeElem,
  ConstAssertElem,
  ConstElem,
  ContainerElem,
  DeclarationElem,
  DeclIdentElem,
  DirectiveElem,
  DirectiveVariant,
  FnElem,
  FnParamElem,
  GlobalVarElem,
  GrammarElem,
  HasAttributes,
  IfAttribute,
  ImportElem,
  LetElem,
  ModuleElem,
  NameElem,
  OverrideElem,
  RefIdentElem,
  SimpleMemberRef,
  StandardAttribute,
  StatementElem,
  StructElem,
  StructMemberElem,
  StuffElem,
  SwitchClauseElem,
  TextElem,
  TypedDeclElem,
  TypeRefElem,
  UnknownExpressionElem,
  VarElem,
} from "./AbstractElems.ts";
import type {
  StableState,
  WeslAST,
  WeslParseContext,
  WeslParseState,
} from "./ParseWESL.ts";
import {
  type DeclIdent,
  emptyScope,
  type Ident,
  mergeScope,
  nextIdentId,
  type PartialScope,
  type RefIdent,
  type Scope,
} from "./Scope.ts";
import { filterMap } from "./Util.ts";

export function importElem(cc: CollectContext) {
  const importElems = cc.tags.owo?.[0] as ImportElem[]; // LATER ts typing
  for (const importElem of importElems) {
    (cc.app.stable as StableState).imports.push(importElem.imports);
    addToOpenElem(cc, importElem as AbstractElem);
  }
}

/** add an elem to the .contents array of the currently containing element */
function addToOpenElem(cc: CollectContext, elem: AbstractElem): void {
  const weslContext: WeslParseContext = cc.app.context;
  const { openElems } = weslContext;
  if (openElems?.length) {
    const open = openElems[openElems.length - 1];
    open.contents.push(elem);
  }
}

/** create reference Ident and add to context */
export function refIdent(cc: CollectContext): RefIdentElem {
  const { src, start, end } = cc;
  const app = cc.app as WeslParseState;
  const { srcModule } = app.stable;
  const originalName = src.slice(start, end);

  const kind = "ref";
  const ident: RefIdent = {
    kind,
    originalName,
    ast: cc.app.stable,
    id: nextIdentId(),
    refIdentElem: null as any, // set below
  };
  const identElem: RefIdentElem = { kind, start, end, srcModule, ident };
  ident.refIdentElem = identElem;

  saveIdent(cc, identElem);
  addToOpenElem(cc, identElem);
  return identElem;
}

/** create declaration Ident and add to context */
export function declCollect(cc: CollectContext): DeclIdentElem {
  return declCollectInternal(cc, false);
}

/** create global declaration Ident and add to context */
export function globalDeclCollect(cc: CollectContext): DeclIdentElem {
  return declCollectInternal(cc, true);
}

function declCollectInternal(
  cc: CollectContext,
  isGlobal: boolean,
): DeclIdentElem {
  const { src, start, end } = cc;
  const app = cc.app as WeslParseState;
  const { scope: containingScope } = app.context;
  const { srcModule } = app.stable;
  const originalName = src.slice(start, end);

  const kind = "decl";
  const declElem = null as any; // we'll set declElem later
  const ident: DeclIdent = {
    declElem,
    kind,
    originalName,
    containingScope,
    isGlobal,
    id: nextIdentId(),
    srcModule,
  };
  const identElem: DeclIdentElem = { kind, start, end, srcModule, ident };

  saveIdent(cc, identElem);
  addToOpenElem(cc, identElem);
  return identElem;
}

export const typedDecl = collectElem(
  "typeDecl",
  (cc: CollectContext, openElem: PartElem<TypedDeclElem>) => {
    const decl = cc.tags.decl_elem?.[0] as DeclIdentElem;
    const typeRef = cc.tags.typeRefElem?.[0] as TypeRefElem | undefined;
    const typeScope = cc.tags.decl_type?.[0] as PartialScope | undefined;

    const partial: TypedDeclElem = { ...openElem, decl, typeScope, typeRef };
    const elem = withTextCover(partial, cc);

    return elem;
  },
);

/** add Ident to current open scope, add IdentElem to current open element */
function saveIdent(
  cc: CollectContext,
  identElem: RefIdentElem | DeclIdentElem,
) {
  const { ident } = identElem;
  ident.id = nextIdentId();
  const weslContext: WeslParseContext = cc.app.context;
  weslContext.scope.contents.push(ident);
}

/** start a new child lexical Scope */
function startScope(cc: CollectContext) {
  startSomeScope("scope", cc);
}

/** start a new child partial Scope */
function startPartialScope(cc: CollectContext) {
  startSomeScope("partial", cc);
}

/** start a new lexical or partial scope */
function startSomeScope(kind: Scope["kind"], cc: CollectContext): void {
  const { scope } = cc.app.context as WeslParseContext;
  const newScope = emptyScope(scope, kind);

  scope.contents.push(newScope);
  cc.app.context.scope = newScope;
}

/* close current Scope and set current scope to parent */
function completeScope(cc: CollectContext): Scope {
  return completeScopeInternal(cc, true);
}

function completeScopeNoIf(cc: CollectContext): Scope {
  return completeScopeInternal(cc, false);
}

function completeScopeInternal(cc: CollectContext, attachIfs: boolean): Scope {
  const weslContext = cc.app.context as WeslParseContext;
  const completedScope = weslContext.scope;

  const { parent } = completedScope;
  if (parent) {
    weslContext.scope = parent;
  } else if (tracing) {
    console.log("ERR: completeScope, no parent scope", completedScope.contents);
  }
  if (attachIfs) {
    const ifAttributes = collectIfAttributes(cc);
    completedScope.ifAttribute = ifAttributes?.[0];
  }
  return completedScope;
}

/** return @if attributes from the 'attribute' tag */
function collectIfAttributes(cc: CollectContext): IfAttribute[] | undefined {
  const attributes = cc.tags.attribute as AttributeElem[] | undefined;
  return filterIfAttributes(attributes);
}

function filterIfAttributes(
  attributes?: AttributeElem[],
): IfAttribute[] | undefined {
  if (!attributes) return;
  return filterMap(attributes, a =>
    a.attribute.kind === "@if" ? a.attribute : undefined,
  );
}

// prettier-ignore
export type OpenElem<T extends ContainerElem = ContainerElem> = Pick<
  T,
  "kind" | "contents"
>;

// prettier-ignore
export type PartElem<T extends ContainerElem = ContainerElem> = Pick<
  T,
  "kind" | "start" | "end" | "contents"
>;

// prettier-ignore
type VarLikeElem = GlobalVarElem | VarElem | LetElem | ConstElem | OverrideElem;

export function collectVarLike<E extends VarLikeElem>(
  kind: E["kind"],
): CollectPair<E> {
  return collectElem(kind, (cc: CollectContext, openElem: PartElem<E>) => {
    const name = cc.tags.var_name?.[0] as TypedDeclElem;
    const decl_scope = cc.tags.decl_scope?.[0] as Scope;
    const attributes = cc.tags.attribute as AttributeElem[] | undefined;
    const partElem = { ...openElem, name, attributes } as E;
    const varElem = withTextCover(partElem, cc);
    const declIdent = name.decl.ident;
    declIdent.declElem = varElem as DeclarationElem;

    if (name.typeScope) {
      mergeScope(name.typeScope, decl_scope);
      declIdent.dependentScope = name.typeScope;
    } else {
      declIdent.dependentScope = decl_scope;
    }

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
    name.ident.dependentScope = alias_scope;
    name.ident.declElem = aliasElem;
    return aliasElem;
  },
);

/**
 * Collect a FnElem and associated scopes.
 *
 * Scope definition is a bit complicated in wgsl and wesl for fns.
 * Here's what we collect for scopes for this example function:
 *    @if(true) fn foo(a: u32) -> @location(x) R { let y = a; }
 *
 * -{ // partial scope in case the whole shebang is prefixed by an `@if`
 *   %foo
 *
 *   {<=%foo // foo decl references this header+returnType+body scope (for tracing dependencies from decls)
 *      x  // for @location(x) (contains no decls, so ok to merge for tracing)
 *      %a u32 // merged from header scope
 *      R // merged from return type (contains no decls, so ok to merge for tracing)
 *      %y a // merged body scope
 *   }
 * }
 */
export const fnCollect = collectElem(
  "fn",
  (cc: CollectContext, openElem: PartElem<FnElem>) => {
    // extract tags we care about
    const ourTags = fnTags(cc);
    const { name, headerScope, returnScope, bodyScope, body, params } = ourTags;
    const { attributes, returnAttributes, returnType, fnScope } = ourTags;

    // create the fn element
    const fnElem: FnElem = {
      ...openElem,
      ...{ name, attributes, params, returnAttributes, body, returnType },
    };

    // --- setup the various scopes --

    // attach ifAttributes to outermost partial scope
    fnScope.ifAttribute = filterIfAttributes(attributes)?.[0];

    // merge the header, return and body scopes into the one scope
    const mergedScope = headerScope;
    if (returnScope) mergeScope(mergedScope, returnScope);
    mergeScope(mergedScope, bodyScope);

    // rewrite scope contents to remove old scopes and add merged scope
    const filtered: (Ident | Scope)[] = [];
    for (const e of fnScope.contents) {
      if (e === headerScope || e === returnScope) {
        continue;
      } else if (e === bodyScope) {
        filtered.push(mergedScope);
      } else {
        filtered.push(e);
      }
    }
    fnScope.contents = filtered;

    name.ident.declElem = fnElem;
    name.ident.dependentScope = mergedScope;

    return fnElem;
  },
);

/** Fetch and cast the collection tags for fnCollect
 * LATER typechecking for collect! */
function fnTags(cc: CollectContext) {
  const { fn_attributes, fn_name, fn_param, return_attributes } = cc.tags;
  const { return_type } = cc.tags;
  const { header_scope, return_scope, body_scope, body_statement } = cc.tags;
  const { fn_partial_scope } = cc.tags;

  const name = fn_name?.[0] as DeclIdentElem;
  const headerScope = header_scope?.[0] as Scope;
  const returnScope = return_scope?.[0] as Scope | undefined;
  const bodyScope = body_scope?.[0] as Scope;
  const body = body_statement?.[0] as StatementElem;
  const params: FnParamElem[] = fn_param?.flat(3) ?? [];
  const attributes: AttributeElem[] | undefined = fn_attributes?.flat();
  const returnAttributes: AttributeElem[] | undefined =
    return_attributes?.flat();
  const returnType: TypeRefElem | undefined = return_type?.flat(3)[0];
  const fnScope = fn_partial_scope?.[0] as PartialScope;

  return {
    ...{ name, headerScope, returnScope, bodyScope, body, params },
    ...{ attributes, returnAttributes, returnType, fnScope },
  };
}

export const collectFnParam = collectElem(
  "param",
  (cc: CollectContext, openElem: PartElem<FnParamElem>) => {
    const name = cc.tags.param_name?.[0] as TypedDeclElem;
    const attributes: AttributeElem[] = cc.tags.attributes?.flat() ?? [];
    const elem: FnParamElem = { ...openElem, name, attributes };
    const paramElem = withTextCover(elem, cc);
    name.decl.ident.declElem = paramElem;

    return paramElem;
  },
);

export const collectStruct = collectElem(
  "struct",
  (cc: CollectContext, openElem: PartElem<StructElem>) => {
    const name = cc.tags.type_name?.[0] as DeclIdentElem;
    const members = cc.tags.members as StructMemberElem[];
    const attributes: AttributeElem[] = cc.tags.attributes?.flat() ?? [];
    name.ident.dependentScope = cc.tags.struct_scope?.[0] as Scope;
    const structElem = { ...openElem, name, attributes, members };
    const elem = withTextCover(structElem, cc);
    name.ident.declElem = elem as DeclarationElem;

    return elem;
  },
);

export const collectStructMember = collectElem(
  "member",
  (cc: CollectContext, openElem: PartElem<StructMemberElem>) => {
    const name = cc.tags.nameElem?.[0] as NameElem;
    const typeRef = cc.tags.typeRefElem?.[0];
    const attributes = cc.tags.attribute?.flat(3) as AttributeElem[];
    const partElem = { ...openElem, name, attributes, typeRef };
    return withTextCover(partElem, cc);
  },
);

export const specialAttribute = collectElem(
  "attribute",
  (cc: CollectContext, openElem: PartElem<AttributeElem>) => {
    const attribute = cc.tags.attr_variant?.[0] as Attribute;
    const attrElem: AttributeElem = { ...openElem, attribute };
    return attrElem;
  },
);

/** debug routine to log tags at collect() */
export function logCollect(msg?: string): (cc: CollectContext) => void {
  return function _log(cc: CollectContext) {
    dlog(msg ?? "log", { tags: [...Object.keys(cc.tags)] });
  };
}

export const assertCollect = attrElemCollect<ConstAssertElem>("assert");
export const statementCollect = attrElemCollect<StatementElem>("statement");
export const switchClauseCollect =
  attrElemCollect<SwitchClauseElem>("switch-clause");

/** @return a collector for container elem types that have only an attributes field */
function attrElemCollect<T extends ContainerElem & HasAttributes>(
  kind: T["kind"],
): CollectPair<T> {
  return collectElem(kind, (cc: CollectContext, openElem: PartElem<T>) => {
    const attributes = cc.tags.attribute?.flat(3) as AttributeElem[];
    const partElem = { ...openElem, attributes };
    return withTextCover(partElem as T, cc);
  });
}

export const collectAttribute = collectElem(
  "attribute",
  (cc: CollectContext, openElem: PartElem<AttributeElem>) => {
    const params = cc.tags.attrParam as UnknownExpressionElem[] | undefined;
    const name = cc.tags.name?.[0] as string;
    const kind = "@attribute";
    const stdAttribute: StandardAttribute = { kind, name, params };
    const attrElem: AttributeElem = { ...openElem, attribute: stdAttribute };
    return attrElem;
  },
);

export const typeRefCollect = collectElem(
  "type",
  // @ts-expect-error type mismatch
  (cc: CollectContext, openElem: PartElem<TypeRefElem>) => {
    const templateParamsTemp: any[] | undefined =
      cc.tags.templateParam?.flat(3);

    const typeRef = cc.tags.typeRefName?.[0] as string | RefIdentElem;
    const name = typeof typeRef === "string" ? typeRef : typeRef.ident;
    const partElem = {
      ...openElem,
      name,
      templateParams: templateParamsTemp as any[],
    };
    // @ts-expect-error type mismatch
    return withTextCover(partElem, cc);
  },
);

// LATER This creates useless unknown-expression elements
export const expressionCollect = collectElem(
  "expression",
  (cc: CollectContext, openElem: PartElem<UnknownExpressionElem>) => {
    const partElem = { ...openElem };
    return withTextCover(partElem, cc);
  },
);

export function globalAssertCollect(cc: CollectContext): void {
  const globalAssert = cc.tags.const_assert?.flat()[0];
  const ast = cc.app.stable as WeslAST;
  if (!ast.moduleAsserts) ast.moduleAsserts = [];
  ast.moduleAsserts.push(globalAssert);
}

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
    const member = component?.[0] as NameElem;
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
  const { start, end, src } = cc;
  const name = src.slice(start, end);
  const elem: NameElem = { kind: "name", start, end, name };
  addToOpenElem(cc, elem);
  return elem;
}

export const collectModule = collectElem(
  "module",
  (cc: CollectContext, openElem: PartElem<ModuleElem>) => {
    const ccComplete = { ...cc, start: 0, end: cc.src.length }; // force module to cover entire source despite ws skipping
    const moduleElem: ModuleElem = withTextCover(openElem, ccComplete);
    const weslState: StableState = cc.app.stable;
    weslState.moduleElem = moduleElem;
    return moduleElem;
  },
);

export function directiveCollect(cc: CollectContext): DirectiveElem {
  const { start, end } = cc;
  const directive: DirectiveVariant = cc.tags.directive?.flat()[0];
  const attributes: AttributeElem[] | undefined = cc.tags.attribute?.flat();

  const kind = "directive";
  const elem: DirectiveElem = { kind, attributes, start, end, directive };
  addToOpenElem(cc, elem);
  return elem;
}

/**
 * Collect a LexicalScope.
 *
 * The scope starts encloses all idents and subscopes inside the parser to which
 * .collect is attached
 */
export const scopeCollect: CollectPair<Scope> = {
  before: startScope,
  after: completeScope,
};

/**
 * Collect a LexicalScope.
 *
 * The scope starts encloses all idents and subscopes inside the parser to which
 * .collect is attached
 *
 * '@if' attributes are not attached to the scope.
 */
export const scopeCollectNoIf: CollectPair<Scope> = {
  before: startScope,
  after: completeScopeNoIf,
};

/**
 * Collect a PartialScope.
 *
 * The scope starts encloses all idents and subscopes inside the parser to which
 * .collect is attached
 */
export const partialScopeCollect: CollectPair<Scope> = {
  before: startPartialScope,
  after: completeScope,
};

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
      // LATER refine start?
      const weslContext: WeslParseContext = cc.app.context;
      const partialElem = weslContext.openElems.pop() as PartElem<V>;
      console.assert(partialElem && partialElem.kind === kind);
      const elem = fn(cc, { ...partialElem, start: cc.start, end: cc.end });
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
  const { contents, end } = elem;
  const sorted = (contents as GrammarElem[]).sort((a, b) => a.start - b.start);

  const elems: GrammarElem[] = [];
  for (const elem of sorted) {
    if (pos < elem.start) {
      elems.push(makeTextElem(elem.start));
    }
    elems.push(elem);
    pos = elem.end;
  }
  if (pos < end) {
    elems.push(makeTextElem(end));
  }

  return elems;

  function makeTextElem(end: number): TextElem {
    return { kind: "text", start: pos, end, srcModule: ast.srcModule };
  }
}

/** for debugging */
// oxlint-disable-next-line eslint(no-unused-vars)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _collectLog(cc: CollectContext, ...messages: any[]): void {
  const { src, start, end } = cc;
  srcLog(src, [start, end], ...messages);
}
