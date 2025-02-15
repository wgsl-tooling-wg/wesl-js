import {
  AbstractElem,
  AliasElem,
  AttributeElem,
  ConstElem,
  ContainerElem,
  DeclIdentElem,
  ExpressionElem,
  FnElem,
  GlobalVarElem,
  ImportElem,
  LetElem,
  ModuleElem,
  NameElem,
  OverrideElem,
  RefIdentElem,
  SimpleMemberRef,
  StructElem,
  StructMemberElem,
  SyntheticElem,
  TextElem,
  TypedDeclElem,
  TypeRefElem,
  TypeTemplateParameter,
  UnknownExpression,
  VarElem,
} from "../AbstractElems.ts";
import { importToString } from "./ImportToString.ts";
import { LineWrapper } from "./LineWrapper.ts";

const maxLineLength = 150;

export function astToString(elem: AbstractElem, indent = 0): string {
  const { kind, contents } = elem as ModuleElem;
  const str = new LineWrapper(indent, maxLineLength);
  str.add(kind);
  addElemFields(elem, str);
  let childStrings: string[] = [];
  if (contents) {
    childStrings = contents.map(e => astToString(e, indent + 2));
  }
  if (childStrings.length) {
    str.nl();
    str.addBlock(childStrings.join("\n"), false);
  }

  return str.result;
}

// TODO DRY with above
export function elemToString(elem: AbstractElem): string {
  const { kind } = elem as ModuleElem;
  const str = new LineWrapper(0, maxLineLength);
  str.add(kind);
  addElemFields(elem, str);
  let childStrings: string[] = [];
  if (childStrings.length) {
    str.nl();
    str.addBlock(childStrings.join("\n"), false);
  }
  return str.result;
}

type InferRest<T> =
  T extends (
    {
      [key: string]: (_: any, ...rest: infer Rest) => any;
    }
  ) ?
    Rest
  : never;
type InferReturn<T> =
  T extends (
    {
      [key: string]: (_: any, ...rest: any) => infer Return;
    }
  ) ?
    Return
  : never;

type DispatcherObj<T extends { kind: string }, Rest extends any[], Return> = {
  [K in T["kind"]]: (elem: T & { kind: K }, ...rest: Rest) => Return;
};

function dispatcher<T extends { kind: string }, Rest extends any[], Return>(
  obj: DispatcherObj<T, Rest, Return>,
): (elem: T, ...rest: Rest) => Return {
  return (elem, ...rest) => obj[elem.kind as T["kind"]](elem, ...rest);
}

function dispatcher2<T extends { kind: string }>(): <
  U extends DispatcherObj<T, any, any>,
>(
  obj: U,
) => (elem: T, ...rest: InferRest<U>) => InferReturn<U> {
  return obj =>
    (elem, ...rest) =>
      obj[elem.kind as T["kind"]](elem, ...rest);
}

function addElemFields(elem: AbstractElem, str: LineWrapper): void {
  let a = dispatcher2<AbstractElem>()({
    alias: addAliasFields,
    text: addTextFields,
    var: addVarishFields,
    let: addVarishFields,
    gvar: addVarishFields,
    const: addVarishFields,
    override: addVarishFields,
    struct: addStructFields,
    member: addStructMemberFields,
    name: addNameFields,
    memberRef: addMemberRef,
    fn: addFnFields,
    attribute: addAttributeFields,
    expression: addExpressionFields,
    type: addTypeRefFields,
    synthetic: addSynthetic,
    import: addImport,
    ref: addRefIdent,
    typeDecl: addTypedDeclIdent,
    decl: addDeclIdent,
    stuff: (a, b) => {
      return true;
    },
    assert: (a, b) => {},
    module: (a, b) => {},
    param: (a, b) => {},
    literal: (a, b) => {},
  });
  let b = a(elem, str);
}

function addAliasFields(elem: AliasElem, str: LineWrapper) {
  const { name, typeRef } = elem;
  const prefix = name.ident.kind === "decl" ? "%" : "";
  str.add(" " + prefix + name.ident.originalName);
  str.add("=" + typeRefElemToString(typeRef));
}

function addTextFields(elem: TextElem, str: LineWrapper) {
  const { srcModule, start, end } = elem;
  str.add(` '${srcModule.src.slice(start, end)}'`);
}

function addVarishFields(
  elem: VarElem | LetElem | GlobalVarElem | ConstElem | OverrideElem,
  str: LineWrapper,
) {
  addTypedDeclIdent(elem.name, str);
}

function addStructFields(elem: StructElem, str: LineWrapper) {
  str.add(" " + elem.name.ident.originalName);
}

function addStructMemberFields(elem: StructMemberElem, str: LineWrapper) {
  const { name, typeRef, attributes } = elem;
  if (attributes) {
    str.add(" " + attributes.map(a => "@" + (a && a.name)).join(" "));
  }
  str.add(" " + name.name);
  str.add(": " + typeRefElemToString(typeRef));
}

function addNameFields(elem: NameElem, str: LineWrapper) {
  str.add(" " + elem.name);
}

function addMemberRef(elem: SimpleMemberRef, str: LineWrapper) {
  const { extraComponents } = elem;
  const extraText =
    extraComponents ? debugContentsToString(extraComponents) : "";
  str.add(` ${elem.name.ident.originalName}.${elem.member.name}${extraText}`);
}

function addFnFields(elem: FnElem, str: LineWrapper) {
  const { name, params, returnType, fnAttributes } = elem;

  str.add(" " + name.ident.originalName);

  str.add("(");
  const paramStrs = params
    .map(
      (
        p, // TODO DRY
      ) => {
        const { name } = p;
        const { originalName } = name.decl.ident;
        const typeRef = typeRefElemToString(name.typeRef!);
        return originalName + ": " + typeRef;
      },
    )
    .join(", ");
  str.add(paramStrs);
  str.add(")");

  fnAttributes?.forEach(a => {
    str.add(" @" + a?.name);
    if (a?.params) {
      str.add("(");
      str.add(a.params.map(expressionToString).join(", "));
      str.add(")");
    }
  });

  if (returnType) {
    str.add(" -> " + typeRefElemToString(returnType));
  }
}

function addAttributeFields(elem: AttributeElem, str: LineWrapper) {
  const { name, params } = elem;
  str.add(" @" + name);
  if (params) {
    str.add("(");
    str.add(params.map(expressionToString).join(", "));
    str.add(")");
  }
}

function addExpressionFields(elem: UnknownExpression, str: LineWrapper) {
  const contents = elem.contents
    .map(e => {
      if (e.kind === "text") {
        return "'" + e.srcModule.src.slice(e.start, e.end) + "'";
      } else {
        return elemToString(e);
      }
    })
    .join(" ");
  str.add(" " + contents);
}

function addTypeRefFields(elem: TypeRefElem, str: LineWrapper) {
  const { name } = elem;
  const nameStr = typeof name === "string" ? name : name.originalName;
  str.add(" " + nameStr);

  if (elem.templateParams !== undefined) {
    const paramStrs = elem.templateParams.map(templateParamToString).join(", ");
    str.add("<" + paramStrs + ">");
  }
}

function addSynthetic(elem: SyntheticElem, str: LineWrapper) {
  str.add(` '${elem.text}'`);
}

function addImport(elem: ImportElem, str: LineWrapper) {
  str.add(" " + importToString(elem.imports));
}

function addRefIdent(elem: RefIdentElem, str: LineWrapper) {
  str.add(" " + elem.ident.originalName);
}

function addTypedDeclIdent(elem: TypedDeclElem, str: LineWrapper) {
  const { decl, typeRef } = elem;
  str.add(" %" + decl.ident.originalName);
  if (typeRef) {
    str.add(" : " + typeRefElemToString(typeRef));
  }
}

function addDeclIdent(elem: DeclIdentElem, str: LineWrapper) {
  const { ident } = elem;
  str.add(" %" + ident.originalName);
}

function expressionToString(elem: ExpressionElem): string {
  // TODO: Temp hack while I clean up the expression parsing
  if ("contents" in elem) {
    // @ts-ignore
    const contents = elem.contents
      // @ts-ignore
      .map(e => {
        if (e.kind === "text") {
          return "'" + e.srcModule.src.slice(e.start, e.end) + "'";
        } else {
          return elemToString(e);
        }
      })
      .join(" ");
    return contents;
  }
  return elemToString(elem);
}

function templateParamToString(p: TypeTemplateParameter): string {
  if (typeof p === "string") {
    return p;
  } else if (p.kind === "type") {
    return typeRefElemToString(p);
  } else if (p.kind === "literal" || p.kind === "ref") {
    return expressionToString(p);
    // TODO: Temp hack while I clean up the expression parsing
    // @ts-ignore
  } else if (p.kind === "expression") {
    return expressionToString(p);
  } else {
    console.log("unknown template parameter type", p);
    return "??";
  }
}

function typeRefElemToString(elem: TypeRefElem): string {
  if (!elem) return "?type?";
  const { name } = elem;
  const nameStr = typeof name === "string" ? name : name.originalName;

  let params = "";
  if (elem.templateParams !== undefined) {
    const paramStrs = elem.templateParams.map(templateParamToString).join(", ");
    params = "<" + paramStrs + ">";
  }
  return nameStr + params;
}

export function debugContentsToString(elem: ContainerElem): string {
  const parts = elem.contents.map(c => {
    const { kind } = c;
    if (kind === "text") {
      return c.srcModule.src.slice(c.start, c.end);
    } else if (kind === "ref") {
      return c.ident.originalName; // not using the mapped to decl name, so this can be used for debug..
    } else {
      return `?${c.kind}?`;
    }
  });
  return parts.join(" ");
}
